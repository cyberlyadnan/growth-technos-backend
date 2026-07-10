import { Types } from 'mongoose';
import {
  ADMIN_ROLES,
  BlogPublicationStatus,
  CommentSortOrder,
  CommentStatus,
  Permission,
} from '@core/constants';
import { BadRequestError, AuthorizationError, NotFoundError } from '@core/errors';
import { loggers } from '@core/logger';
import { buildPaginationMeta, parsePaginationQuery } from '@core/pagination/pagination';
import { PaginationMeta } from '@core/types';
import { stripHtml } from '@core/utils/reading-time';
import { Author } from '@modules/authors/model/author.model';
import { BlogComment, CommentReport, IBlogComment } from '@modules/blogs/model/blog-comment.model';
import { blogRepository } from '@modules/blogs/repository/blog.repository';
import {
  commentRepository,
  resolveCommentSort,
} from '../repository/comment.repository';
import {
  CommentResponse,
  CreateCommentDto,
  ListCommentsQuery,
  ModerateCommentDto,
  ReportCommentDto,
  UpdateCommentDto,
} from '../types/comment.types';

type PopulatedUser = {
  id?: string;
  _id?: { toString(): string };
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
};

function userId(doc: PopulatedUser | undefined | null): string | undefined {
  if (!doc) return undefined;
  return doc.id ?? doc._id?.toString();
}

function sanitizeCommentContent(content: string): string {
  return stripHtml(content).replace(/\s+/g, ' ').trim();
}

function buildCommentTree(comments: CommentResponse[]): CommentResponse[] {
  const byParent = new Map<string | null, CommentResponse[]>();

  comments.forEach((comment) => {
    const key = comment.parentId ?? null;
    const bucket = byParent.get(key) ?? [];
    bucket.push({ ...comment, replies: [] });
    byParent.set(key, bucket);
  });

  const attachReplies = (comment: CommentResponse): CommentResponse => ({
    ...comment,
    replies: (byParent.get(comment.id) ?? []).map(attachReplies),
  });

  return (byParent.get(null) ?? []).map(attachReplies);
}

export class CommentService {
  private mapAuthor(
    comment: IBlogComment,
    exposeEmail = false,
  ): CommentResponse['author'] {
    const user = comment.user as unknown as PopulatedUser | undefined;

    if (user && userId(user)) {
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'User';
      return {
        id: userId(user),
        name,
        email: exposeEmail ? user.email : undefined,
        avatar: user.avatar,
        isGuest: false,
      };
    }

    return {
      name: comment.guestName ?? 'Guest',
      email: exposeEmail ? comment.guestEmail : undefined,
      isGuest: true,
    };
  }

  private toResponse(
    comment: IBlogComment,
    options: { exposeEmail?: boolean; currentUserId?: string } = {},
  ): CommentResponse {
    const likedByCurrentUser = options.currentUserId
      ? comment.likedBy.some((entry) => entry.toString() === options.currentUserId)
      : false;

    return {
      id: comment.id,
      blogId: comment.blog.toString(),
      parentId: comment.parent?.toString(),
      author: this.mapAuthor(comment, options.exposeEmail),
      content: comment.content,
      status: comment.status,
      likeCount: comment.likeCount,
      isPinned: comment.isPinned,
      isAdminReply: comment.isAdminReply,
      isAuthorReply: comment.isAuthorReply,
      isReported: comment.isReported,
      editedAt: comment.editedAt?.toISOString(),
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      likedByCurrentUser,
      replies: [],
    };
  }

  private async getPublishedBlogForComments(blogId: string) {
    const blog = await blogRepository.findById(blogId);
    if (!blog || blog.isDeleted) throw new NotFoundError('Blog');
    if (blog.publicationStatus !== BlogPublicationStatus.PUBLISHED) {
      throw new BadRequestError('Comments are only allowed on published blogs');
    }
    if (!blog.allowComments) {
      throw new BadRequestError('Comments are disabled for this blog');
    }
    return blog;
  }

  private async getCommentOrThrow(id: string): Promise<IBlogComment> {
    const comment = await commentRepository.findById(id);
    if (!comment || comment.isDeleted) throw new NotFoundError('Comment');
    return comment;
  }

  private userCanModerate(permissions: string[] = []): boolean {
    return permissions.includes(Permission.CONTENT_UPDATE);
  }

  private userIsAdmin(role?: string): boolean {
    return Boolean(role && ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]));
  }

  async listForBlog(blogId: string, currentUserId?: string): Promise<CommentResponse[]> {
    await this.getPublishedBlogForComments(blogId);
    const comments = await commentRepository.findByBlogId(blogId, CommentStatus.APPROVED);
    const mapped = comments.map((comment) =>
      this.toResponse(comment, { currentUserId }),
    );
    return buildCommentTree(mapped);
  }

  async listAdmin(
    query: ListCommentsQuery,
  ): Promise<{ comments: CommentResponse[]; meta: PaginationMeta }> {
    const { page, limit, skip } = parsePaginationQuery(query);
    const commentSort = resolveCommentSort(query.sort ?? CommentSortOrder.NEWEST);

    const [comments, total] = await Promise.all([
      commentRepository.findMany({
        skip,
        limit,
        sort: commentSort,
        blogId: query.blogId,
        status: query.status,
        search: query.search,
        includeTrash: query.includeTrash,
      }),
      commentRepository.count({
        blogId: query.blogId,
        status: query.status,
        search: query.search,
        includeTrash: query.includeTrash,
      }),
    ]);

    return {
      comments: comments.map((comment) => this.toResponse(comment, { exposeEmail: true })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async createForBlog(
    blogId: string,
    dto: CreateCommentDto,
    actor?: { id: string; role: string; permissions: string[] },
  ): Promise<CommentResponse> {
    const blog = await this.getPublishedBlogForComments(blogId);
    const content = sanitizeCommentContent(dto.content);
    if (!content) throw new BadRequestError('Comment content is required');

    let parent: IBlogComment | null = null;
    if (dto.parentId) {
      parent = await commentRepository.findById(dto.parentId);
      if (!parent || parent.blog.toString() !== blogId || parent.status !== CommentStatus.APPROVED) {
        throw new BadRequestError('Invalid parent comment');
      }
    }

    const isAdmin = actor ? this.userIsAdmin(actor.role) : false;
    const author = await Author.findById(blog.author).select('user').lean();
    const isAuthor =
      Boolean(actor && author?.user && author.user.toString() === actor.id) ||
      false;

    let guestName = dto.guestName?.trim();
    let guestEmail = dto.guestEmail?.trim().toLowerCase();
    const guestWebsite = dto.guestWebsite?.trim() || undefined;

    if (!actor) {
      if (!guestName || !guestEmail) {
        throw new BadRequestError('Name and email are required for guest comments');
      }
    }

    const status =
      isAdmin || isAuthor || (actor && this.userCanModerate(actor.permissions))
        ? CommentStatus.APPROVED
        : CommentStatus.PENDING;

    const comment = await commentRepository.create({
      blog: new Types.ObjectId(blogId),
      parent: dto.parentId ? new Types.ObjectId(dto.parentId) : undefined,
      user: actor ? new Types.ObjectId(actor.id) : undefined,
      guestName: actor ? undefined : guestName,
      guestEmail: actor ? undefined : guestEmail,
      guestWebsite: actor ? undefined : guestWebsite,
      content,
      status,
      isAdminReply: isAdmin,
      isAuthorReply: isAuthor,
      approvedAt: status === CommentStatus.APPROVED ? new Date() : undefined,
      createdBy: actor?.id ? new Types.ObjectId(actor.id) : undefined,
      updatedBy: actor?.id ? new Types.ObjectId(actor.id) : undefined,
    });

    loggers.admin.info('Blog comment created', {
      commentId: comment.id,
      blogId,
      status,
      actorId: actor?.id ?? 'guest',
    });

    return this.toResponse(comment, { currentUserId: actor?.id });
  }

  async update(id: string, dto: UpdateCommentDto, actor?: { id: string; permissions: string[] }) {
    const comment = await this.getCommentOrThrow(id);
    const content = sanitizeCommentContent(dto.content);
    if (!content) throw new BadRequestError('Comment content is required');

    const isOwner = actor && comment.user?.toString() === actor.id;
    const canModerate = actor ? this.userCanModerate(actor.permissions) : false;

    if (!isOwner && !canModerate) {
      throw new AuthorizationError('You can only edit your own comments');
    }

    if (comment.status === CommentStatus.TRASH) {
      throw new BadRequestError('Cannot edit a trashed comment');
    }

    const updated = await commentRepository.updateById(id, {
      content,
      editedAt: new Date(),
      updatedBy: actor?.id,
    });

    if (!updated) throw new NotFoundError('Comment');
    return this.toResponse(updated, { currentUserId: actor?.id, exposeEmail: canModerate });
  }

  async like(id: string, actor?: { id: string }) {
    const comment = await this.getCommentOrThrow(id);
    if (comment.status !== CommentStatus.APPROVED) {
      throw new BadRequestError('Only approved comments can be liked');
    }

    if (actor) {
      const alreadyLiked = await commentRepository.hasUserLiked(id, actor.id);
      if (alreadyLiked) {
        throw new BadRequestError('You have already liked this comment');
      }
    }

    const updated = await commentRepository.incrementLike(id, actor?.id);
    if (!updated) throw new NotFoundError('Comment');

    return {
      likeCount: updated.likeCount,
      likedByCurrentUser: Boolean(actor),
    };
  }

  async report(id: string, dto: ReportCommentDto, reporterIp?: string) {
    const comment = await this.getCommentOrThrow(id);

    await CommentReport.create({
      comment: comment.id,
      blog: comment.blog,
      reason: dto.reason?.trim() || undefined,
      reporterEmail: dto.reporterEmail?.trim().toLowerCase() || undefined,
      reporterIp,
    });

    await BlogComment.findByIdAndUpdate(comment.id, {
      $inc: { reportCount: 1 },
      isReported: true,
    });

    loggers.security.warn('Comment reported', { commentId: comment.id, reporterIp });

    return { reported: true };
  }

  async moderate(id: string, dto: ModerateCommentDto, actorId: string): Promise<CommentResponse> {
    await this.getCommentOrThrow(id);

    const updateData: Record<string, unknown> = {
      status: dto.status,
      updatedBy: actorId,
      ...(dto.isPinned !== undefined && { isPinned: dto.isPinned }),
    };

    if (dto.status === CommentStatus.APPROVED) {
      updateData.approvedAt = new Date();
      updateData.rejectedAt = null;
      updateData.isDeleted = false;
      updateData.deletedAt = null;
    }

    if (dto.status === CommentStatus.REJECTED) {
      updateData.rejectedAt = new Date();
    }

    if (dto.status === CommentStatus.TRASH) {
      updateData.isDeleted = true;
      updateData.deletedAt = new Date();
    }

    const updated = await commentRepository.updateById(id, updateData);
    if (!updated) throw new NotFoundError('Comment');

    loggers.admin.info('Comment moderated', {
      commentId: id,
      status: dto.status,
      actorId,
    });

    return this.toResponse(updated, { exposeEmail: true });
  }

  async remove(id: string, actorId: string): Promise<void> {
    await this.getCommentOrThrow(id);
    await commentRepository.softDeleteById(id, actorId);
    loggers.admin.info('Comment moved to trash', { commentId: id, actorId });
  }
}

export const commentService = new CommentService();
