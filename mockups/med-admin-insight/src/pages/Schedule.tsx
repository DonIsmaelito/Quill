import React from "react";
import { AppointmentsTable } from "@/components/dashboard/AppointmentsTable";
import { appointmentsData } from "@/data/appointments";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function Schedule() {
  return (
    <div className="flex h-screen overflow-hidden bg-medical-background">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-medical-text">
            Appointments
          </h1>
          <p className="text-medical-subtext">
            View and manage patient appointments
          </p>
        </div>

        <AppointmentsTable appointments={appointmentsData} />
      </div>
    </div>
  );
}
