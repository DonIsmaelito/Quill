import React from "react";
import { ChartSection } from "@/components/dashboard/ChartSection";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function Analytics() {
  return (
    <div className="flex h-screen overflow-hidden bg-medical-background">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-medical-text">
            Form Analytics
          </h1>
          <p className="text-medical-subtext">
            Track and analyze form performance
          </p>
        </div>

        <ChartSection />
      </div>
    </div>
  );
}
