import React from "react";
import { ShieldCheck, DatabaseZap, ListChecks } from "lucide-react"; // Using DatabaseZap for Audit Trail, ListChecks for SOC2

export const ComplianceTicker: React.FC = () => {
  const complianceItems = [
    {
      name: "HIPAA",
      icon: <ShieldCheck className="h-4 w-4 mr-1.5 text-green-600" />,
      status: "Compliant",
    },
    {
      name: "SOC 2 Type II",
      icon: <ListChecks className="h-4 w-4 mr-1.5 text-green-600" />,
      status: "Certified",
    },
    {
      name: "Audit Trail",
      icon: <DatabaseZap className="h-4 w-4 mr-1.5 text-green-600" />,
      status: "Active",
    },
  ];

  return (
    <div className="mt-auto pt-4 pb-2 border-t border-gray-200/80 bg-slate-50/50 rounded-b-xl">
      <div className="flex items-center justify-center space-x-6 text-xs text-gray-600">
        {complianceItems.map((item) => (
          <div key={item.name} className="flex items-center">
            {item.icon}
            <span>
              {item.name}:{" "}
              <span className="font-semibold text-gray-700">{item.status}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
