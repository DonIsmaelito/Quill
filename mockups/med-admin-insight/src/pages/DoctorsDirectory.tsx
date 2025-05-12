import React from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DoctorsTable } from "@/components/dashboard/DoctorsTable";
import { doctorsData } from "@/data/doctorsData";

export default function DoctorsDirectory() {
  return (
    <div className="flex h-screen overflow-hidden bg-medical-background">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-medical-text">
            Doctor Directory
          </h1>
          <p className="text-medical-subtext">
            Manage and view doctor information
          </p>
        </div>
        <div className="mb-6">
          <DoctorsTable doctors={doctorsData} />
        </div>
      </div>
    </div>
  );
}
