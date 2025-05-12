
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
}

export function StatCard({ title, value, change, icon, bgColor, textColor }: StatCardProps) {
  const isPositive = change >= 0;
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm flex flex-col">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-medical-subtext text-sm font-medium">{title}</h3>
          <p className={`text-2xl font-semibold mt-1 ${textColor}`}>{value}</p>
        </div>
        <div className={cn("p-2.5 rounded-lg", bgColor)}>
          {icon}
        </div>
      </div>
      <div className="flex items-center mt-3 text-sm">
        <div className={cn("flex items-center", isPositive ? "text-green-500" : "text-red-500")}>
          {isPositive ? (
            <ArrowUp className="h-4 w-4 mr-1" />
          ) : (
            <ArrowDown className="h-4 w-4 mr-1" />
          )}
          <span>{Math.abs(change)}%</span>
        </div>
        <span className="text-medical-subtext ml-1">vs last month</span>
      </div>
    </div>
  );
}
