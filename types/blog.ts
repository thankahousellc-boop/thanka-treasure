export type BlogStatus = "draft" | "published" | "scheduled";

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  status: BlogStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
