import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/dashboard/Sidebar"; // Assuming you want the main sidebar

// Placeholder icons (replace with actual icons if available)
import { User, Palette, Bell } from "lucide-react";

const settingsNavItems = [
  { name: "Account", path: "account", icon: <User size={20} /> },
  { name: "Appearance", path: "appearance", icon: <Palette size={20} /> },
  { name: "Notifications", path: "notifications", icon: <Bell size={20} /> },
];

export default function SettingsPage() {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-medical-background">
      <Sidebar /> {/* Main application sidebar */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-medical-text">Settings</h1>
          <p className="text-medical-subtext">
            Manage your application and account settings
          </p>
        </div>

        <div className="flex gap-6">
          {/* Settings Navigation */}
          <nav className="w-1/4 space-y-1">
            {settingsNavItems.map((item) => {
              const isActive =
                location.pathname === `/settings/${item.path}` ||
                (location.pathname === "/settings" && item.path === "account");
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-medical-primary/10 text-medical-primary"
                      : "text-medical-subtext hover:bg-gray-100 hover:text-medical-text"
                  )}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Settings Content */}
          <div className="w-3/4 bg-white rounded-xl shadow-sm p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
