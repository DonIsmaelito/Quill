import React from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { SearchBar } from "@/components/dashboard/SearchBar";
import { UserProfile } from "@/components/dashboard/UserProfile";
import { StatCards } from "@/components/dashboard/StatCards";
import { ChartSection } from "@/components/dashboard/ChartSection";
import { FormStatusSection } from "@/components/dashboard/FormStatusSection";
import { AppointmentsTable } from "@/components/dashboard/AppointmentsTable";
import { PatientsTable } from "@/components/dashboard/PatientsTable";
import { appointmentsData } from "@/data/appointments";
import { patientsData } from "@/data/patients";

export default function AdminDashboard() {
  return (
    <div className="flex h-screen overflow-hidden bg-medical-background">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Top bar */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-medical-text">
                Dashboard
              </h1>
              <p className="text-medical-subtext">Form Management Overview</p>
            </div>
            <div className="flex items-center gap-6">
              <SearchBar />
              <UserProfile />
            </div>
          </div>

          {/* Header */}
          <Header />

          {/* Stat Cards */}
          <StatCards />

          {/* Charts */}
          {/* <ChartSection /> */}

          {/* Form Status and Appointments */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-1">
              <FormStatusSection />
            </div>
            <div className="lg:col-span-2">
              <AppointmentsTable appointments={appointmentsData} />
            </div>
          </div>

          {/* Recent Patients */}
          <div className="mb-6">
            <PatientsTable patients={patientsData} />
          </div>
        </div>
      </div>
    </div>
  );
}
