import React from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DoctorsTable } from "@/components/dashboard/DoctorsTable";
import { doctorsData } from "@/data/doctorsData";

export default function DoctorsDirectory() {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-medical-background to-blue-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-medical-primary drop-shadow-sm">
              Doctor Directory
            </h1>
            <p className="text-medical-subtext text-base mt-1">
              Manage and view doctor information
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
            <DoctorsTable doctors={doctorsData} />
          </div>
        </div>
      </div>
    </div>
  );
}
