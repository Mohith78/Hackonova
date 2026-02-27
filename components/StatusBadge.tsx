import { Badge } from "@/components/ui/badge";
import { IssueStatus } from "@/lib/types";
import { AlertCircle, CheckCircle2, Clock, Package, Loader2, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: IssueStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants: Record<IssueStatus, { label: string; className: string; icon: React.ReactNode }> = {
    reported: {
      label: "Reported",
      className: "bg-status-reported-bg text-status-reported border-2 border-status-reported shadow-sm font-medium",
      icon: <AlertCircle className="h-3.5 w-3.5" />,
    },
    assigned: {
      label: "Assigned",
      className: "bg-status-assigned-bg text-status-assigned border-2 border-status-assigned shadow-sm font-medium",
      icon: <Package className="h-3.5 w-3.5" />,
    },
    assigned_to_contractor: {
      label: "Assigned to Contractor",
      className: "bg-violet-100 text-violet-700 border-2 border-violet-300 shadow-sm font-medium",
      icon: <Package className="h-3.5 w-3.5" />,
    },
    resolved: {
      label: "Resolved",
      className: "bg-status-resolved-bg text-status-resolved border-2 border-status-resolved shadow-sm font-medium",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    in_progress: {
      label: "In Progress",
      className: "bg-blue-100 text-blue-700 border-2 border-blue-300 shadow-sm font-medium",
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    },
    closed: {
      label: "Closed",
      className: "bg-gray-100 text-gray-700 border-2 border-gray-300 shadow-sm font-medium",
      icon: <XCircle className="h-3.5 w-3.5" />,
    },
  };

  const variant = variants[status];

  return (
    <Badge variant="outline" className={`${variant.className} inline-flex items-center gap-1.5 px-3 py-1`}>
      {variant.icon}
      {variant.label}
    </Badge>
  );
}

