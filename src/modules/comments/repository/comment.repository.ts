import { UpdateQuery, Types } from 'mongoose';
import { CommentSortOrder, CommentStatus } from '@core/constants';
import { buildSearchFilter } from '@core/pagination/pagination';
import { BlogComment, IBlogComment } from '@modules/blogs/model/blog-comment.model';

export const COMMENT_POPULATE = [
  {
    path: 'user',
    select: 'firstName lastName email avatar',
  },
];

export interface FindCommentsOptions {
  skip: number;
  limit: number;
  sort: Record<string, 1 | -1>;
  blogId?: string;
  status?: CommentStatus;
  statuses?: CommentStatus[];
  search?: string;
  includeTrash?: boolean;
}

export class CommentRepository {
  private buildFilter(options: Omit<FindCommentsOptions, 'skip' | 'limit' | 'sort'>): Record<string, unknown> {
    const filter: Record<string, unknown> = {
      ...buildSearchFilter(options.search, ['content', 'guestName', 'guestEmail']),
    };

    if (options.includeTrash) {
      filter.status = CommentStatus.TRASH;
    } else if (options.statuses?.length) {
      filter.status = { $in: options.statuses };
    } else if (options.status) {
      filter.status = options.status;
    } else if (!options.includeTrash) {
      filter.status = { $ne: CommentStatus.TRASH };
    }

    if (options.blogId) filter.blog = options.blogId;

    return filter;
  }

  async findMany(options: FindCommentsOptions): Promise<IBlogComment[]> {
    const filter = this.buildFilter(options);
    return BlogComment.find(filter)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .populate(COMMENT_POPULATE)
      .exec();
  }

  async findByBlogId(blogId: string, status = CommentStatus.APPROVED): Promise<IBlogComment[]> {
    return BlogComment.find({
      blog: blogId,
      status,
      isDeleted: { $ne: true },
    })
      .sort({ isPinned: -1, likeCount: -1, createdAt: 1 })
      .populate(COMMENT_POPULATE)
      .exec();
  }

  async count(options: Omit<FindCommentsOptions, 'skip' | 'limit' | 'sort'>): Promise<number> {
    const filter = this.buildFilter(options);
    return BlogComment.countDocuments(filter).exec();
  }

  async findById(id: string): Promise<IBlogComment | null> {
    return BlogComment.findById(id).populate(COMMENT_POPULATE).exec();
  }

  async create(data: Partial<IBlogComment>): Promise<IBlogComment> {
    const comment = await BlogComment.create(data);
    return (await comment.populate(COMMENT_POPULATE)) as IBlogComment;
  }

  async updateById(id: string, data: UpdateQuery<IBlogComment>): Promise<IBlogComment | null> {
    return BlogComment.findByIdAndUpdate(id, data, { new: true }).populate(COMMENT_POPULATE).exec();
  }

  async softDeleteById(id: string, actorId: string): Promise<IBlogComment | null> {
    return BlogComment.findByIdAndUpdate(
      id,
      {
        status: CommentStatus.TRASH,
        isDeleted: true,
        deletedAt: new Date(),
        updatedBy: actorId,
      },
      { new: true },
    )
      .populate(COMMENT_POPULATE)
      .exec();
  }

  async incrementLike(id: string, userId?: string): Promise<IBlogComment | null> {
    const update: UpdateQuery<IBlogComment> = {
      $inc: { likeCount: 1 },
    };

    if (userId) {
      update.$addToSet = { likedBy: new Types.ObjectId(userId) };
    }

    return BlogComment.findByIdAndUpdate(id, update, { new: true }).populate(COMMENT_POPULATE).exec();
  }

  async hasUserLiked(id: string, userId: string): Promise<boolean> {
    const comment = await BlogComment.findById(id).select('likedBy').lean();
    if (!comment) return false;
    return comment.likedBy.some((entry) => entry.toString() === userId);
  }
}

export const commentRepository = new CommentRepository();

export function resolveCommentSort(sort?: CommentSortOrder): Record<string, 1 | -1> {
  switch (sort) {
    case CommentSortOrder.OLDEST:
      return { createdAt: 1 };
    case CommentSortOrder.MOST_LIKED:
      return { likeCount: -1, createdAt: -1 };
    case CommentSortOrder.NEWEST:
    default:
      return { createdAt: -1 };
  }
}
