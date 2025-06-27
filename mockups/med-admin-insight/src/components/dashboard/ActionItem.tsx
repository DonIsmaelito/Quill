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
    icon: <AlertOctagon className="h-5 w-5 text-red-500 dark:text-red-400" />,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-500 dark:border-red-400",
    ctaLabel: "Address Now", // Or specific actions
  },
  waiting: {
    icon: <Bell className="h-5 w-5 text-amber-500 dark:text-amber-400" />,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-500 dark:border-amber-400",
    ctaLabel: "Remind Patient",
  },
  ready: {
    icon: <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-500 dark:border-green-400",
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
        "p-4 rounded-lg border-l-4 flex items-center justify-between transition-all hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="flex items-center">
        <div className="mr-3 flex-shrink-0">{config.icon}</div>
        <div>
          <h4 className={cn("font-semibold", config.color)}>{title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">{patientName}</p>
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
            className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Bell className="h-3 w-3 mr-1.5" /> Remind
          </Button>
        )}
        {(status === "overdue" || status === "ready") && onMarkComplete && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMarkComplete(id)}
            className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <CheckCircle className="h-3 w-3 mr-1.5" /> Mark Complete
          </Button>
        )}
        {status === "ready" && onArchive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onArchive(id)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Archive
          </Button>
        )}
      </div>
    </div>
  );
};
