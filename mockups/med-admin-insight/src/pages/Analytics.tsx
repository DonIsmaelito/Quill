import React from "react";
import { ChartSection } from "@/components/dashboard/ChartSection";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function Analytics() {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-medical-background to-blue-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-medical-primary drop-shadow-sm">
              Form Analytics
            </h1>
            <p className="text-medical-subtext text-base mt-1">
              Track and analyze form performance
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
            <ChartSection />
          </div>
        </div>
      </div>
    </div>
  );
}
