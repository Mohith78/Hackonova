"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { Issue } from "@/lib/types";
import { MapPin, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { formatIssueDateTime } from "@/lib/date";

interface IssueCardProps {
  issue: Issue;
  onClick?: () => void;
}

export function IssueCard({ issue, onClick }: IssueCardProps) {
  const [address, setAddress] = useState<string>("");
  const formattedDate = formatIssueDateTime(issue.created_at || issue.updated_at);
  const lat = Number(issue.latitude);
  const lng = Number(issue.longitude);
  const hasValidCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const coordinateFallback = hasValidCoords
    ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    : "Location unavailable";

  useEffect(() => {
    let cancelled = false;
    if (!hasValidCoords) {
      return () => {
        cancelled = true;
      };
    }

    const loadAddress = async () => {
      try {
        const response = await fetch(
          `/api/reverse-geocode?lat=${lat}&lng=${lng}`
        );

        if (!response.ok) {
          if (!cancelled) {
            setAddress(coordinateFallback);
          }
          return;
        }

        const data = (await response.json()) as { readable?: string };
        if (!cancelled) {
          setAddress(data.readable || coordinateFallback);
        }
      } catch {
        if (!cancelled) {
          setAddress(coordinateFallback);
        }
      }
    };

    void loadAddress();
    return () => {
      cancelled = true;
    };
  }, [hasValidCoords, lat, lng, coordinateFallback]);

  return (
    <Card className="group relative overflow-hidden border-2 hover:border-primary/30 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1" onClick={onClick}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="pb-3 relative">
        <div className="flex justify-between items-start gap-4">
          <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">{issue.title}</CardTitle>
          <StatusBadge status={issue.status} />
        </div>
        <CardDescription className="flex items-center gap-2 mt-2 text-sm">
          <Calendar className="w-4 h-4" />
          {formattedDate}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 relative">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{issue.description}</p>
        
        <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-slate-50 group-hover:bg-slate-100 transition-colors">
          <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <span className="text-sm text-slate-700 break-words leading-relaxed">
            {hasValidCoords ? address || "Resolving address..." : "Location unavailable"}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {issue.department && (
            <Badge variant="secondary" className="capitalize shadow-sm">
              {issue.department.replace("_", " ")}
            </Badge>
          )}

          {issue.assigned_to && (
            <Badge variant="outline" className="border-2">
              Assigned: {issue.assigned_to}
            </Badge>
          )}

          {issue.ai_category && (
            <Badge variant="outline" className="capitalize border-2 border-emerald-200 bg-emerald-50 text-emerald-700">
              AI: {issue.ai_category}
              {typeof issue.ai_confidence === "number" ? ` (${Math.round(issue.ai_confidence * 100)}%)` : ""}
            </Badge>
          )}
        </div>

        {issue.image_url && (
          <div className="mt-4 relative h-48 w-full overflow-hidden rounded-xl shadow-md group-hover:shadow-lg transition-shadow">
            <Image
              src={`https://aayezfpwrvtxnxeywtjn.supabase.co/storage/v1/object/public/issue-images/${issue.image_url}`}
              alt={issue.title}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
