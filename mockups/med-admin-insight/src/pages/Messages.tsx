import React from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function Messages() {
  return (
    <div className="flex h-screen overflow-hidden bg-medical-background">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-medical-text">Messages</h1>
          <p className="text-medical-subtext">Communication center</p>
        </div>

        <div className="grid gap-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-medical-subtext text-center py-8">
              Messages functionality will be implemented in the next iteration.
              <br />
              Please connect Supabase to enable the messaging feature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
