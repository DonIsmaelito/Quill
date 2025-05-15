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
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-medical-background to-blue-50">
      <Sidebar /> {/* Main application sidebar */}
      <div className="flex-1 overflow-y-auto">
        {" "}
        {/* Changed to overflow-y-auto */}
        <div className="p-6 md:p-8">
          {" "}
          {/* Added md:p-8 */}
          <div className="mb-8">
            {" "}
            {/* Increased mb */}
            <h1 className="text-3xl md:text-4xl font-bold text-medical-primary drop-shadow-sm">
              Settings
            </h1>
            <p className="text-medical-subtext text-base mt-1">
              Manage your application and account settings
            </p>
          </div>
          {/* Main Settings Card */}
          <div className="bg-white p-6 rounded-xl shadow-lg flex gap-6">
            {/* Settings Navigation */}
            <nav className="w-1/4 space-y-1.5">
              {" "}
              {/* Increased space-y */}
              {settingsNavItems.map((item) => {
                const isActive =
                  location.pathname === `/settings/${item.path}` ||
                  (location.pathname === "/settings" &&
                    item.path === "account") || // Default to account if path is /settings
                  (location.pathname === "/settings/" &&
                    item.path === "account"); // Also handle trailing slash
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 ease-in-out", // Increased padding, rounded-lg
                      isActive
                        ? "bg-medical-primary text-white shadow-sm"
                        : "text-medical-text hover:bg-medical-primary/10 hover:text-medical-primary"
                    )}
                  >
                    {React.cloneElement(item.icon, {
                      className: "h-5 w-5 flex-shrink-0",
                    })}{" "}
                    {/* Ensured icon size */}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Settings Content Area - The Outlet will render here */}
            {/* Removed bg-white, shadow-sm, p-6 from here as parent card handles it */}
            {/* Added a bit of padding to the Outlet container itself for spacing */}
            <div className="w-3/4 rounded-lg overflow-y-auto">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
