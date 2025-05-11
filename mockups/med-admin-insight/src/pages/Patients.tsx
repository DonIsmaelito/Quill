import React from "react";
import { PatientsTable } from "@/components/dashboard/PatientsTable";
import { patientsData } from "@/data/patients";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function Patients() {
  return (
    <div className="flex h-screen overflow-hidden bg-medical-background">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-medical-text">
            Patient Directory
          </h1>
          <p className="text-medical-subtext">
            Manage and view all patient records
          </p>
        </div>

        <PatientsTable patients={patientsData} />
      </div>
    </div>
  );
}
