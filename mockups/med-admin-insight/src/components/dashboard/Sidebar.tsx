import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  FileText,
  Settings,
  BarChart,
  FileSearch,
  FileCheck,
  FilePlus,
  Users2,
  PlusSquare,
} from "lucide-react";

type SidebarItemProps = {
  icon: React.ReactNode;
  title: string;
  active?: boolean;
  href: string;
};

const SidebarItem = ({ icon, title, active, href }: SidebarItemProps) => {
  return (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 hover:bg-medical-teal/30 transition-colors",
        active
          ? "bg-medical-primary text-white hover:bg-medical-primary"
          : "text-medical-text"
      )}
    >
      <div className="text-xl">{icon}</div>
      <span className="text-sm font-medium">{title}</span>
    </Link>
  );
};

const SidebarSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="mb-6">
      <h3 className="mb-2 px-3 text-xs uppercase text-medical-subtext">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
};

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="flex h-screen w-64 flex-col bg-white border-r border-gray-200 py-4 px-3">
      <div className="flex items-center gap-2 px-3 py-2 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-medical-primary text-white">
          <PlusSquare className="h-5 w-5" />
        </div>
        <div className="font-semibold text-lg text-medical-text">Flora</div>
      </div>

      <SidebarSection title="Form Management">
        <SidebarItem
          icon={<LayoutDashboard size={20} />}
          title="Dashboard"
          active={location.pathname === "/"}
          href="/"
        />
        <SidebarItem
          icon={<FileText size={20} />}
          title="Form Templates"
          active={location.pathname === "/templates"}
          href="/templates"
        />
        <SidebarItem
          icon={<FilePlus size={20} />}
          title="Create Form"
          active={location.pathname === "/create-form"}
          href="/create-form"
        />
        <SidebarItem
          icon={<FileSearch size={20} />}
          title="Pending Forms"
          active={location.pathname === "/pending-forms"}
          href="/pending-forms"
        />
        <SidebarItem
          icon={<FileCheck size={20} />}
          title="Completed Forms"
          active={location.pathname === "/completed-forms"}
          href="/completed-forms"
        />
      </SidebarSection>

      <SidebarSection title="Patients & Communications">
        <SidebarItem
          icon={<Users size={20} />}
          title="Patient Directory"
          active={location.pathname === "/patients"}
          href="/patients"
        />
        <SidebarItem
          icon={<Users2 size={20} />}
          title="Doctor Directory"
          active={location.pathname === "/doctors-directory"}
          href="/doctors-directory"
        />
        <SidebarItem
          icon={<Calendar size={20} />}
          title="Appointments"
          active={location.pathname === "/schedule"}
          href="/schedule"
        />
        <SidebarItem
          icon={<MessageSquare size={20} />}
          title="Messages"
          active={location.pathname === "/messages"}
          href="/messages"
        />
      </SidebarSection>

      <SidebarSection title="Management">
        <SidebarItem
          icon={<BarChart size={20} />}
          title="Form Analytics"
          href="/analytics"
        />
        <SidebarItem
          icon={<Settings size={20} />}
          title="Settings"
          href="/settings"
        />
      </SidebarSection>
    </aside>
  );
}
