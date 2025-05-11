
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface DepartmentCardProps {
  title: string;
  percentage: number;
  icon: React.ReactNode;
  iconBg: string;
}

export function DepartmentCard({ title, percentage, icon, iconBg }: DepartmentCardProps) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm flex items-center justify-between">
      <div className="flex items-center">
        <div className={cn("p-2.5 rounded-lg mr-3", iconBg)}>
          {icon}
        </div>
        <div>
          <h3 className="text-medical-text font-medium">{title}</h3>
          <p className="text-medical-subtext text-sm">{percentage}%</p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-medical-subtext" />
    </div>
  );
}
