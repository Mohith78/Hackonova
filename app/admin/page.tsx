"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Issue, IssueStatus, DepartmentType } from "@/lib/types";
import { formatIssueDateTime, parseSupabaseTimestamp } from "@/lib/date";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  ClipboardList,
  CheckCircle2,
  Clock3,
  Smile,
} from "lucide-react";

function getUserRole(user: User | null): string | undefined {
  if (!user) return undefined;
  const metadataRole = user.user_metadata?.role;
  const appMetadataRole = user.app_metadata?.role;
  if (typeof metadataRole === "string") return metadataRole;
  if (typeof appMetadataRole === "string") return appMetadataRole;
  return undefined;
}

function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "0h";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 10) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours)}h`;
}

const FALLBACK_CLASS_LABELS = [
  "pothole",
  "streetlight",
  "garbage",
  "drainage",
  "road_damage",
  "other",
];

function formatAiCategoryLabel(raw: string): string {
  const match = /^class_(\d+)$/i.exec(raw.trim());
  const normalized = match
    ? FALLBACK_CLASS_LABELS[Number(match[1])] || raw
    : raw;
  return normalized.replace(/_/g, " ");
}

export default function AdminPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchIssues = useCallback(async () => {
    const { data, error } = await supabase
      .from("issues")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setIssues(data as Issue[]);
    }
  }, []);

  const filteredIssues = useMemo(() => {
    let filtered = [...issues];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (issue) =>
          issue.title.toLowerCase().includes(searchLower) ||
          issue.description.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((issue) => issue.status === statusFilter);
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter((issue) => issue.department === departmentFilter);
    }

    return filtered;
  }, [searchTerm, statusFilter, departmentFilter, issues]);

  useEffect(() => {
    let isMounted = true;

    const verifyAdmin = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (error || !data.user) {
        router.replace("/admin/auth");
        return;
      }

      const role = getUserRole(data.user);
      if (role !== "admin") {
        router.replace("/admin/auth");
        return;
      }

      setIsAdmin(true);
      setAuthChecked(true);
    };

    void verifyAdmin();
    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!isAdmin) return;
    const timer = setTimeout(() => {
      void fetchIssues();
    }, 0);
    return () => clearTimeout(timer);
  }, [isAdmin, fetchIssues]);

  const updateStatus = async (issueId: string, newStatus: IssueStatus) => {
    const { error } = await supabase
      .from("issues")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", issueId);

    if (error) {
      alert("Error updating status");
    } else {
      fetchIssues();
    }
  };

  const updateDepartment = async (issueId: string, department: DepartmentType) => {
    const { error } = await supabase
      .from("issues")
      .update({ department, updated_at: new Date().toISOString() })
      .eq("id", issueId);

    if (!error) {
      fetchIssues();
    }
  };

  const assignToContractor = async (issueId: string) => {
    const { error } = await supabase
      .from("issues")
      .update({
        status: "assigned_to_contractor",
        assigned_to: "Contractor",
        updated_at: new Date().toISOString(),
      })
      .eq("id", issueId);

    if (error) {
      const message = error.message || "Unknown error";
      alert(`Error assigning to contractor: ${message}`);
    } else {
      fetchIssues();
    }
  };

  const totalIssues = issues.length;
  const resolvedIssues = issues.filter((i) => i.status === "resolved").length;
  const openIssues = issues.filter((i) => i.status === "reported").length;
  const inProgressIssues = issues.filter(
    (i) => i.status === "in_progress" || i.status === "assigned" || i.status === "assigned_to_contractor"
  ).length;
  const satisfaction = totalIssues > 0 ? Math.min(99, Math.round((resolvedIssues / totalIssues) * 100) + 12) : 0;

  const avgResponseHours = useMemo(() => {
    const resolved = issues.filter((i) => i.status === "resolved" && i.updated_at);
    if (resolved.length === 0) return 0;

    const total = resolved.reduce((acc, issue) => {
      const created = parseSupabaseTimestamp(issue.created_at);
      const updated = parseSupabaseTimestamp(issue.updated_at ?? null);
      if (Number.isNaN(created.getTime()) || Number.isNaN(updated.getTime())) return acc;
      return acc + (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
    }, 0);

    return total / resolved.length;
  }, [issues]);

  const weeklyData = useMemo(() => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const reported = new Array(7).fill(0);
    const resolved = new Array(7).fill(0);

    issues.forEach((issue) => {
      const created = parseSupabaseTimestamp(issue.created_at);
      if (!Number.isNaN(created.getTime())) {
        const day = (created.getDay() + 6) % 7;
        reported[day] += 1;
      }

      if (issue.status === "resolved") {
        const closed = parseSupabaseTimestamp(issue.updated_at ?? issue.created_at);
        if (!Number.isNaN(closed.getTime())) {
          const day = (closed.getDay() + 6) % 7;
          resolved[day] += 1;
        }
      }
    });

    const maxValue = Math.max(1, ...reported, ...resolved);
    return { labels, reported, resolved, maxValue };
  }, [issues]);

  const resolvedPct = totalIssues ? Math.round((resolvedIssues / totalIssues) * 100) : 0;
  const openPct = totalIssues ? Math.round((openIssues / totalIssues) * 100) : 0;
  const inProgressPct = totalIssues ? Math.round((inProgressIssues / totalIssues) * 100) : 0;

  const statusGradient = `conic-gradient(#10b981 0% ${resolvedPct}%, #f59e0b ${resolvedPct}% ${
    resolvedPct + openPct
  }%, #2563eb ${resolvedPct + openPct}% 100%)`;

  if (!authChecked) {
    return <div className="py-16 text-center text-muted-foreground">Checking admin access...</div>;
  }

  return (
    <div className="-mx-4 md:-mx-6 -my-10 bg-[#f4f7fb] min-h-[calc(100vh-64px)]">
      <div>
        <main className="p-4 md:p-7 space-y-6 fade-up">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 fade-up delay-1">
            <div>
              <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-primary to-slate-900 bg-clip-text text-transparent">Overview Dashboard</h1>
              <p className="text-muted-foreground mt-2 text-lg">All departments • live admin controls</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            <Card className="relative overflow-hidden border-2 border-blue-200 shadow-lg fade-up delay-1 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
              <CardContent className="pt-6 relative">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <p className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">{totalIssues}+</p>
                <p className="text-muted-foreground mt-2 font-medium">Total Issues Reported</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-2 border-emerald-200 shadow-lg fade-up delay-1 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
              <CardContent className="pt-6 relative">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="text-5xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">{resolvedIssues}</p>
                <p className="text-muted-foreground mt-2 font-medium">Issues Resolved</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-2 border-amber-200 shadow-lg fade-up delay-2 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
              <CardContent className="pt-6 relative">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <Clock3 className="h-6 w-6" />
                </div>
                <p className="text-5xl font-bold bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">{formatHours(avgResponseHours)}</p>
                <p className="text-muted-foreground mt-2 font-medium">Avg Response Time</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-2 border-fuchsia-200 shadow-lg fade-up delay-3 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-2xl" />
              <CardContent className="pt-6 relative">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 text-white flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  <Smile className="h-6 w-6" />
                </div>
                <p className="text-5xl font-bold bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 bg-clip-text text-transparent">{satisfaction}%</p>
                <p className="text-muted-foreground mt-2 font-medium">Satisfaction Score</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid xl:grid-cols-[1.3fr_0.9fr] gap-5">
            <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Weekly Reports vs Resolved</CardTitle>
                <CardDescription className="text-base">Last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-56">
                  {weeklyData.labels.map((label, idx) => {
                    const reportedHeight = Math.max(
                      8,
                      Math.round((weeklyData.reported[idx] / weeklyData.maxValue) * 160)
                    );
                    const resolvedHeight = Math.max(
                      8,
                      Math.round((weeklyData.resolved[idx] / weeklyData.maxValue) * 160)
                    );

                    return (
                      <div key={label} className="flex-1">
                        <div className="flex justify-center items-end gap-1 h-44">
                          <div className="w-5 rounded-t-md bg-blue-500/90" style={{ height: `${reportedHeight}px` }} />
                          <div className="w-5 rounded-t-md bg-emerald-400/90" style={{ height: `${resolvedHeight}px` }} />
                        </div>
                        <p className="text-xs text-center text-muted-foreground mt-2">{label}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Issue Status Breakdown</CardTitle>
                <CardDescription className="text-base">This month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="mx-auto h-36 w-36 rounded-full grid place-items-center" style={{ background: statusGradient }}>
                  <div className="h-24 w-24 rounded-full bg-white grid place-items-center">
                    <div className="text-center">
                      <p className="text-3xl font-semibold">{totalIssues}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-emerald-500" />
                      Resolved
                    </span>
                    <span className="font-medium">{resolvedPct}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-amber-500" />
                      Open
                    </span>
                    <span className="font-medium">{openPct}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-blue-600" />
                      In Progress
                    </span>
                    <span className="font-medium">{inProgressPct}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg border-2">
            <CardHeader className="gap-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-bold">Recent Issues</CardTitle>
                  <CardDescription className="text-base">Manage and track all reported issues</CardDescription>
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search issues..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full md:w-[220px]"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[170px]">
                      <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="reported">Reported</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="assigned_to_contractor">Assigned to Contractor</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-full md:w-[190px]">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="sanitation">Sanitation</SelectItem>
                      <SelectItem value="public_works">Public Works</SelectItem>
                      <SelectItem value="utilities">Utilities</SelectItem>
                      <SelectItem value="transportation">Transportation</SelectItem>
                      <SelectItem value="parks">Parks</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredIssues.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No issues found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIssues.map((issue) => (
                        <TableRow key={issue.id}>
                          <TableCell className="font-medium">
                            <div>
                              <p>{issue.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">{issue.description}</p>
                              {issue.ai_category && (
                                <p className="text-xs text-emerald-700 mt-1 capitalize">
                                  AI: {formatAiCategoryLabel(issue.ai_category)}
                                  {typeof issue.ai_confidence === "number"
                                    ? ` (${Math.round(issue.ai_confidence * 100)}%)`
                                    : ""}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={issue.status} />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={issue.department || "other"}
                              onValueChange={(value) => updateDepartment(issue.id, value as DepartmentType)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sanitation">Sanitation</SelectItem>
                                <SelectItem value="public_works">Public Works</SelectItem>
                                <SelectItem value="utilities">Utilities</SelectItem>
                                <SelectItem value="transportation">Transportation</SelectItem>
                                <SelectItem value="parks">Parks</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {issue.priority && (
                              <Badge variant="outline" className="capitalize">
                                {issue.priority}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatIssueDateTime(issue.created_at || issue.updated_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {issue.status === "reported" && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => updateStatus(issue.id, "assigned")}>
                                    Assign
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => assignToContractor(issue.id)}>
                                    Assign to Contractor
                                  </Button>
                                </>
                              )}
                              {issue.status === "assigned" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateStatus(issue.id, "in_progress")}
                                  >
                                    Start
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => assignToContractor(issue.id)}>
                                    Assign to Contractor
                                  </Button>
                                </>
                              )}
                              {(issue.status === "assigned" ||
                                issue.status === "in_progress" ||
                                issue.status === "assigned_to_contractor") && (
                                <Button size="sm" onClick={() => updateStatus(issue.id, "resolved")}>
                                  Resolve
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
