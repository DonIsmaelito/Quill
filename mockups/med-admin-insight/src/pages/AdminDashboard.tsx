import React, { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { SearchBar } from "@/components/dashboard/SearchBar";
import { UserProfile } from "@/components/dashboard/UserProfile";
import { StatCards } from "@/components/dashboard/StatCards";
import { ChartSection } from "@/components/dashboard/ChartSection";
import { ActionCenter } from "@/components/dashboard/ActionCenter";
import { AppointmentsTable } from "@/components/dashboard/AppointmentsTable";
import { PatientsTable } from "@/components/dashboard/PatientsTable";
import { appointmentsData } from "@/data/appointments";
import { patientsData } from "@/data/patients";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, FilePlus } from "lucide-react";
import {
  NextAppointmentCard,
  MissingForm,
} from "@/components/dashboard/NextAppointmentCard";
import { ComplianceTicker } from "@/components/dashboard/ComplianceTicker";

export default function AdminDashboard() {
  const nextAppointmentData = {
    patientName: "Jonathan Doe",
    appointmentTime: new Date(Date.now() + 12 * 60000),
    doctorName: "Dr. Smith",
    reason: "First Time Patient Check-up",
    missingForms: [
      {
        name: "New Patient Registration Form",
        status: "missing" as MissingForm["status"],
      },
      {
        name: "Medical History Update",
        status: "pending" as MissingForm["status"],
      },
      { name: "HIPAA Consent", status: "completed" as MissingForm["status"] },
    ],
    isUrgent: true,
  };

  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string | null>(
    null
  );

  const handleMonthSelect = (month: string | null) => {
    setSelectedMonthFilter(month);
  };

  const clearMonthFilter = () => {
    setSelectedMonthFilter(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-medical-background to-blue-50">
      <Sidebar />

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8 flex flex-col min-h-full">
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-medical-primary drop-shadow-sm leading-tight">
                Dashboard
              </h1>
              <p className="text-medical-subtext text-base mt-1 leading-snug">
                Form Management Overview & Key Metrics
              </p>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 mt-4 sm:mt-0">
              <SearchBar />
              <UserProfile />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="space-y-8">
            {/* Header component - can be styled or animated */}
            <Header />

            {/* New Compact Toolbar */}
            <div className="flex gap-4 mb-4">
              <Button
                asChild
                variant="outline"
                className="border-medical-primary text-medical-primary hover:bg-medical-primary/10 flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Link to="/create-form">
                  <FilePlus className="h-4 w-4" />
                  New Form
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Link to="/templates">
                  <FileText className="h-4 w-4" />
                  View Templates
                </Link>
              </Button>
            </div>

            {/* Next Appointment Card */}
            <NextAppointmentCard {...nextAppointmentData} />

            {/* Stat Cards - can have hover effects or entrance animations */}
            <StatCards />

            {/* Charts - now uncommented */}
            <ChartSection onMonthSelect={handleMonthSelect} />

            {/* Form Status and Appointments - can be styled as distinct cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 ease-out flex flex-col min-h-[400px]">
                <ActionCenter
                  selectedMonthFilter={selectedMonthFilter}
                  onClearMonthFilter={clearMonthFilter}
                />
              </div>
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 ease-out min-h-[400px]">
                <AppointmentsTable appointments={appointmentsData} />
              </div>
            </div>

            {/* Recent Patients - can be styled as a distinct card */}
            <div className="mb-6 bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 ease-out">
              <PatientsTable patients={patientsData} />
            </div>
          </div>

          {/* Compliance Ticker - Placed at the bottom of the content area */}
          <ComplianceTicker />
        </div>
      </div>
    </div>
  );
}
