
import { FileText, CheckCircle, Clock, Users } from "lucide-react";
import { StatCard } from "./StatCard";

export function StatCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <StatCard 
        title="Forms Sent" 
        value="250" 
        change={40} 
        icon={<FileText className="h-5 w-5 text-medical-primary" />} 
        bgColor="bg-green-50" 
        textColor="text-medical-primary"
      />
      <StatCard 
        title="Completed Forms" 
        value="156" 
        change={35} 
        icon={<CheckCircle className="h-5 w-5 text-blue-500" />} 
        bgColor="bg-blue-50" 
        textColor="text-blue-500"
      />
      <StatCard 
        title="Patient Minutes Saved" 
        value="198" 
        change={-15} 
        icon={<Clock className="h-5 w-5 text-yellow-500" />} 
        bgColor="bg-yellow-50" 
        textColor="text-yellow-500"
      />
      <StatCard 
        title="Patients Logged In" 
        value="100" 
        change={25} 
        icon={<Users className="h-5 w-5 text-purple-500" />} 
        bgColor="bg-purple-70" 
        textColor="text-purple-500"
      />
    </div>
  );
}
