export interface ForumComment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  images?: string[];
  attachments?: string[];
  tags?: string[];
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
  views?: number;
  comments: ForumComment[];
}

export interface CreatePostRequest {
  title: string;
  content: string;
  imageUrl?: string | null;
  images?: string[];
  attachments?: string[];
  tags?: string[];
}

export interface CreateCommentRequest {
  content: string;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  imageUrl?: string | null;
}
