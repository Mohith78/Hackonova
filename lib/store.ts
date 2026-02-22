import { create } from "zustand";
import { Issue, IssueFilters } from "./types";

interface IssueStore {
  issues: Issue[];
  filters: IssueFilters;
  setIssues: (issues: Issue[]) => void;
  addIssue: (issue: Issue) => void;
  updateIssue: (id: string, updates: Partial<Issue>) => void;
  setFilters: (filters: IssueFilters) => void;
  filteredIssues: () => Issue[];
}

export const useIssueStore = create<IssueStore>((set, get) => ({
  issues: [],
  filters: {},
  
  setIssues: (issues) => set({ issues }),
  
  addIssue: (issue) => set((state) => ({ issues: [issue, ...state.issues] })),
  
  updateIssue: (id, updates) =>
    set((state) => ({
      issues: state.issues.map((issue) =>
        issue.id === id ? { ...issue, ...updates } : issue
      ),
    })),
  
  setFilters: (filters) => set({ filters }),
  
  filteredIssues: () => {
    const { issues, filters } = get();
    let filtered = [...issues];

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter((issue) =>
        filters.status!.includes(issue.status)
      );
    }

    if (filters.department && filters.department.length > 0) {
      filtered = filtered.filter(
        (issue) => issue.department && filters.department!.includes(issue.department)
      );
    }

    if (filters.priority && filters.priority.length > 0) {
      filtered = filtered.filter(
        (issue) => issue.priority && filters.priority!.includes(issue.priority)
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (issue) =>
          issue.title.toLowerCase().includes(searchLower) ||
          issue.description.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  },
}));
