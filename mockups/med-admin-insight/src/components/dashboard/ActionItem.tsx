import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  Bell,
  Send,
} from "lucide-react";

export type ActionItemStatus = "overdue" | "waiting" | "ready";

export interface ActionItemProps {
  id: string;
  title: string;
  patientName: string;
  dueDate?: string; // e.g., "Due Today", "2 days overdue"
  status: ActionItemStatus;
  month?: string; // Added for filtering by month (e.g., "Jan", "Feb")
  onRemind?: (id: string) => void;
  onMarkComplete?: (id: string) => void;
  onArchive?: (id: string) => void;
}

const statusConfig = {
  overdue: {
    icon: <AlertOctagon className="h-5 w-5 text-red-500" />,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-500",
    ctaLabel: "Address Now", // Or specific actions
  },
  waiting: {
    icon: <Bell className="h-5 w-5 text-amber-500" />,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-500",
    ctaLabel: "Remind Patient",
  },
  ready: {
    icon: <CheckCircle className="h-5 w-5 text-green-500" />,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-500",
    ctaLabel: "Mark Complete", // Or Archive
  },
};

export const ActionItem: React.FC<ActionItemProps> = ({
  id,
  title,
  patientName,
  dueDate,
  status,
  month,
  onRemind,
  onMarkComplete,
  onArchive,
}) => {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "p-4 rounded-lg border-l-4 flex items-center justify-between transition-all hover:shadow-md",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="flex items-center">
        <div className="mr-3 flex-shrink-0">{config.icon}</div>
        <div>
          <h4 className={cn("font-semibold", config.color)}>{title}</h4>
          <p className="text-sm text-gray-600">{patientName}</p>
          {dueDate && (
            <p className={cn("text-xs mt-0.5", config.color, "font-medium")}>
              {dueDate}
            </p>
          )}
        </div>
      </div>
      <div className="ml-4 flex-shrink-0 space-x-2">
        {status === "waiting" && onRemind && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemind(id)}
            className="text-xs"
          >
            <Bell className="h-3 w-3 mr-1.5" /> Remind
          </Button>
        )}
        {(status === "overdue" || status === "ready") && onMarkComplete && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMarkComplete(id)}
            className="text-xs"
          >
            <CheckCircle className="h-3 w-3 mr-1.5" /> Mark Complete
          </Button>
        )}
        {status === "ready" && onArchive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onArchive(id)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Archive
          </Button>
        )}
      </div>
    </div>
  );
};
