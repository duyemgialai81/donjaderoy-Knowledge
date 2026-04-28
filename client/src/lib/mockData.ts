// Type definitions for Knowledge Sharing Platform
// All data is fetched from the backend API - NO HARDCODED DATA

export interface User {
  id: string;
  name: string;
  avatar: string;
  email: string;
  role: 'student' | 'lecturer' | 'admin';
  major: string;
  class?: string;
  points: number;
  badges: Badge[];
  followers: number;
  following: number;
  postsCount: number;
  joinedDate: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  requiredPoints: number;
  color: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  tags: string[];
  major: string;
  subject?: string;
  topic: string;
  status: 'published' | 'draft' | 'pending';
  attachments?: Attachment[];
  videoUrl?: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  likes: number;
  commentsCount: number;
  isLiked?: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'pptx';
  size: string;
  url: string;
}
export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentId?: string;
  createdAt: string;
  likes: number;
  replies?: Comment[];
  isReported?: boolean;
}
export interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
}
export interface Major {
  id: string;
  name: string;
  code: string;
  subjects: Subject[];
}