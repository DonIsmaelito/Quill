import React, { useState } from "react";
import {
  Bell,
  ChevronDown,
  UserCog,
  BriefcaseMedical,
  UserSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { CheckCircle } from "lucide-react";

type UserRole = "Admin" | "Physician" | "Front-Desk" | "Billing";

interface RoleConfig {
  icon: React.ReactNode;
  name: UserRole;
}

const roles: RoleConfig[] = [
  { name: "Admin", icon: <UserCog className="h-4 w-4 mr-2" /> },
  { name: "Physician", icon: <BriefcaseMedical className="h-4 w-4 mr-2" /> },
  { name: "Front-Desk", icon: <UserSquare className="h-4 w-4 mr-2" /> },
  { name: "Billing", icon: <UserCog className="h-4 w-4 mr-2" /> },
];

export function UserProfile() {
  const [currentUserName, setCurrentUserName] = useState("Dr. Smith");
  const [currentRole, setCurrentRole] = useState<UserRole>("Admin");

  const handleSwitchRole = (newRole: UserRole) => {
    setCurrentRole(newRole);
  };

  const activeRoleConfig =
    roles.find((r) => r.name === currentRole) || roles[0];

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        className="text-medical-subtext hover:text-medical-primary"
      >
        <Bell className="h-5 w-5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-100/80 transition-colors"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src="/avatars/01.png" />
              <AvatarFallback>{currentUserName.substring(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start text-sm">
              <span className="font-medium text-medical-text leading-tight">
                {currentUserName}
              </span>
              <div className="flex items-center">
                {React.cloneElement(activeRoleConfig.icon, {
                  className: "h-3.5 w-3.5 text-medical-subtext mr-1",
                })}
                <span className="text-xs text-medical-subtext leading-tight">
                  {currentRole}
                </span>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-medical-subtext ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>My Account ({currentRole})</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-gray-500 px-2 py-1">
              Switch Role
            </DropdownMenuLabel>
            {roles.map((role) => (
              <DropdownMenuItem
                key={role.name}
                onClick={() => handleSwitchRole(role.name)}
                disabled={currentRole === role.name}
                className="flex items-center"
              >
                {React.cloneElement(role.icon, {
                  className: "h-4 w-4 mr-2 opacity-70",
                })}
                {role.name}
                {currentRole === role.name && (
                  <CheckCircle className="h-4 w-4 ml-auto text-medical-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-500 hover:!text-red-600 hover:!bg-red-50">
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
