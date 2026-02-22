export type IssueStatus =
  | "reported"
  | "assigned"
  | "assigned_to_contractor"
  | "resolved"
  | "in_progress"
  | "closed";

export type IssuePriority = "low" | "medium" | "high" | "critical";

export type DepartmentType = "sanitation" | "public_works" | "utilities" | "transportation" | "parks" | "other";

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority?: IssuePriority;
  department?: DepartmentType;
  ai_category?: string | null;
  ai_confidence?: number | null;
  image_url: string | null;
  latitude: number;
  longitude: number;
  user_id: string;
  assigned_to?: string | null;
  created_at: string;
  updated_at?: string;
  resolved_at?: string | null;
}

export interface User {
  id: string;
  email: string;
  role?: "citizen" | "staff" | "admin";
}

export interface IssueFilters {
  status?: IssueStatus[];
  department?: DepartmentType[];
  priority?: IssuePriority[];
  search?: string;
}
