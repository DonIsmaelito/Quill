import { Pill } from "lucide-react";
import { DepartmentCard } from "./DepartmentCard";

export function DepartmentSection() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-4">
      <h3 className="text-lg font-semibold text-medical-text dark:text-white mb-4">Top Departments</h3>
      <div className="space-y-3">
        <DepartmentCard 
          title="General Physician" 
          percentage={50} 
          icon={<Pill className="h-5 w-5 text-medical-primary dark:text-blue-400" />} 
          iconBg="bg-green-50 dark:bg-green-900/20"
        />
        <DepartmentCard 
          title="Dentist" 
          percentage={24} 
          icon={<Pill className="h-5 w-5 text-blue-500 dark:text-blue-400" />} 
          iconBg="bg-blue-50 dark:bg-blue-900/20"
        />
        <DepartmentCard 
          title="ENT" 
          percentage={15} 
          icon={<Pill className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />} 
          iconBg="bg-yellow-50 dark:bg-yellow-900/20"
        />
        <DepartmentCard 
          title="Cardiologist" 
          percentage={35} 
          icon={<Pill className="h-5 w-5 text-red-500 dark:text-red-400" />} 
          iconBg="bg-red-50 dark:bg-red-900/20"
        />
        <DepartmentCard 
          title="Ophthalmology" 
          percentage={20} 
          icon={<Pill className="h-5 w-5 text-purple-500 dark:text-purple-400" />} 
          iconBg="bg-purple-50 dark:bg-purple-900/20"
        />
      </div>
    </div>
  );
}
