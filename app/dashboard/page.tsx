"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Issue } from "@/lib/types";
import { useIssueStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { IssueCard } from "@/components/IssueCard";
import { MapView } from "@/components/MapView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Bot, CheckCircle2, Clock, MapIcon, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function getUserRole(user: User | null): string | undefined {
  if (!user) return undefined;
  const metadataRole = user.user_metadata?.role;
  const appMetadataRole = user.app_metadata?.role;
  if (typeof metadataRole === "string") return metadataRole;
  if (typeof appMetadataRole === "string") return appMetadataRole;
  return undefined;
}

export default function DashboardPage() {
  const router = useRouter();
  const { issues, setIssues } = useIssueStore();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const fetchIssues = useCallback(async () => {
    const { data, error } = await supabase
      .from("issues")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setIssues(data as Issue[]);
    }
    setLoading(false);
  }, [setIssues]);

  useEffect(() => {
    let isMounted = true;
    const verifyRole = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      const role = getUserRole(data.user);
      if (role === "admin") {
        setBlocked(true);
        router.replace("/admin");
        return;
      }

      setAuthChecked(true);
    };

    void verifyRole();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!authChecked || blocked) return;
    const timer = setTimeout(() => {
      void fetchIssues();
    }, 0);
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel("issues")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "issues" },
        (payload) => {
          console.log("Change received!", payload);
          fetchIssues();
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [authChecked, blocked, fetchIssues]);

  if (!authChecked) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Checking citizen access...
      </div>
    );
  }

  const reported = issues.filter((i) => i.status === "reported").length;
  const assigned = issues.filter(
    (i) => i.status === "assigned" || i.status === "in_progress" || i.status === "assigned_to_contractor"
  ).length;
  const resolved = issues.filter((i) => i.status === "resolved").length;

  return (
    <div className="space-y-8 fade-up">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between fade-up delay-1">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Civic Issue Dashboard</h1>
          <p className="text-muted-foreground mt-2">Monitor and track civic issues in real-time</p>
        </div>
        <Link href="/dashboard/assistant" className="self-start md:self-auto">
          <Button className="rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 px-5 py-5 text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl soft-pulse">
            <Bot className="mr-2 h-5 w-5" />
            AI Assistant
            <Sparkles className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="fade-up delay-1 hover:-translate-y-1 transition-all duration-300 border-2 hover:border-primary/30 shadow-md hover:shadow-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-semibold">Total Issues</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MapIcon className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{issues.length}</div>
            <p className="text-sm text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="fade-up delay-1 hover:-translate-y-1 transition-all duration-300 border-2 hover:border-status-reported/30 shadow-md hover:shadow-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-semibold">Reported</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertCircle className="h-5 w-5 text-status-reported" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-status-reported">
              {reported}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Awaiting assignment</p>
          </CardContent>
        </Card>

        <Card className="fade-up delay-2 hover:-translate-y-1 transition-all duration-300 border-2 hover:border-status-assigned/30 shadow-md hover:shadow-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-semibold">Assigned</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="h-5 w-5 text-status-assigned" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-status-assigned">
              {assigned}
            </div>
            <p className="text-sm text-muted-foreground mt-1">In progress</p>
          </CardContent>
        </Card>

        <Card className="fade-up delay-3 hover:-translate-y-1 transition-all duration-300 border-2 hover:border-status-resolved/30 shadow-md hover:shadow-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-semibold">Resolved</CardTitle>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-5 w-5 text-status-resolved" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-status-resolved">
              {resolved}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for List and Map View */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 p-1 h-12 bg-gradient-to-r from-slate-100 to-slate-50 shadow-sm">
          <TabsTrigger value="list" className="data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">List View</TabsTrigger>
          <TabsTrigger value="map" className="data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">Map View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-5 mt-8 fade-in">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="py-8">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : issues.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <MapIcon className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-lg font-medium text-slate-600">No issues reported yet.</p>
                <p className="text-sm text-muted-foreground mt-2">Start by reporting your first civic issue.</p>
              </CardContent>
            </Card>
          ) : (
            issues.map((issue, idx) => (
              <div key={issue.id} className="fade-up" style={{ animationDelay: `${idx * 50}ms` }}>
                <IssueCard issue={issue} />
              </div>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="map" className="mt-8 fade-in">
          <Card className="border-2 shadow-xl overflow-hidden">
            <MapView issues={issues} className="h-[600px] rounded-lg" />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

