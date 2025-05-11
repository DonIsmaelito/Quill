
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface FormStatusCardProps {
  title: string;
  patientName: string;
  sentTime: string;
  icon: React.ReactNode;
  iconBg: string;
  status: "pending" | "viewed" | "completed";
}

export function FormStatusCard({ title, patientName, sentTime, icon, iconBg, status }: FormStatusCardProps) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
      <div className="flex items-center">
        <div className={cn("p-2.5 rounded-lg mr-3", iconBg)}>
          {icon}
        </div>
        <div>
          <h3 className="text-medical-text font-medium">{title}</h3>
          <div className="flex items-center gap-2">
            <p className="text-medical-subtext text-sm">{patientName}</p>
            <span className="text-medical-subtext text-xs">•</span>
            <p className="text-medical-subtext text-sm">{sentTime}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-xs px-2 py-1 rounded-full",
          status === "pending" && "bg-yellow-100 text-yellow-700",
          status === "viewed" && "bg-blue-100 text-blue-700",
          status === "completed" && "bg-green-100 text-green-700",
        )}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        <ChevronRight className="h-5 w-5 text-medical-subtext" />
      </div>
    </div>
  );
}
