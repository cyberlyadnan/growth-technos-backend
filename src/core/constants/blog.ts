export enum BlogPublicationStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum BlogDifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum BlogContentFormat {
  TIPTAP = 'tiptap',
  EDITORJS = 'editorjs',
  HTML = 'html',
}

export enum CommentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  TRASH = 'trash',
}

export enum CommentSortOrder {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  MOST_LIKED = 'most_liked',
}

export enum MediaStorageProvider {
  LOCAL = 'local',
  S3 = 's3',
  FIREBASE = 'firebase',
}
