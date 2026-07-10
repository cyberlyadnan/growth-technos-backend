import { CommentSortOrder, CommentStatus } from '@core/constants';

export interface CommentAuthor {
  id?: string;
  name: string;
  email?: string;
  avatar?: string;
  isGuest: boolean;
}

export interface CommentResponse {
  id: string;
  blogId: string;
  parentId?: string;
  author: CommentAuthor;
  content: string;
  status: CommentStatus;
  likeCount: number;
  isPinned: boolean;
  isAdminReply: boolean;
  isAuthorReply: boolean;
  isReported: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
  likedByCurrentUser: boolean;
  replies: CommentResponse[];
}

export interface ListCommentsQuery {
  page?: number;
  limit?: number;
  sort?: CommentSortOrder;
  status?: CommentStatus;
  blogId?: string;
  search?: string;
  includeTrash?: boolean;
}

export interface CreateCommentDto {
  content: string;
  parentId?: string | null;
  guestName?: string;
  guestEmail?: string;
  guestWebsite?: string;
}

export interface UpdateCommentDto {
  content: string;
}

export interface ReportCommentDto {
  reason?: string;
  reporterEmail?: string;
}

export interface ModerateCommentDto {
  status: CommentStatus;
  isPinned?: boolean;
}
