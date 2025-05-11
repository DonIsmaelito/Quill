
import { Pill } from "lucide-react";
import { DepartmentCard } from "./DepartmentCard";

export function DepartmentSection() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
      <h3 className="text-lg font-semibold text-medical-text mb-4">Top Departments</h3>
      <div className="space-y-3">
        <DepartmentCard 
          title="General Physician" 
          percentage={50} 
          icon={<Pill className="h-5 w-5 text-medical-primary" />} 
          iconBg="bg-green-50"
        />
        <DepartmentCard 
          title="Dentist" 
          percentage={24} 
          icon={<Pill className="h-5 w-5 text-blue-500" />} 
          iconBg="bg-blue-50"
        />
        <DepartmentCard 
          title="ENT" 
          percentage={15} 
          icon={<Pill className="h-5 w-5 text-yellow-500" />} 
          iconBg="bg-yellow-50"
        />
        <DepartmentCard 
          title="Cardiologist" 
          percentage={35} 
          icon={<Pill className="h-5 w-5 text-red-500" />} 
          iconBg="bg-red-50"
        />
        <DepartmentCard 
          title="Ophthalmology" 
          percentage={20} 
          icon={<Pill className="h-5 w-5 text-purple-500" />} 
          iconBg="bg-purple-50"
        />
      </div>
    </div>
  );
}
