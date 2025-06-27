import { FileText, Clock, CheckCircle } from "lucide-react";
import { FormStatusCard } from "./FormStatusCard";

export function FormStatusSection() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-4">
      <h3 className="text-lg font-semibold text-medical-text dark:text-white mb-4">Pending Forms</h3>
      <div className="space-y-3">
        <FormStatusCard 
          title="Patient Insurance Form" 
          patientName="Sarah Johnson"
          sentTime="2 days ago" 
          icon={<FileText className="h-5 w-5 text-medical-primary dark:text-blue-400" />} 
          iconBg="bg-green-50 dark:bg-green-900/20"
          status="pending"
        />
        <FormStatusCard 
          title="Consent Form" 
          patientName="Michael Brown"
          sentTime="3 days ago" 
          icon={<Clock className="h-5 w-5 text-blue-500 dark:text-blue-400" />} 
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          status="viewed"
        />
        <FormStatusCard 
          title="Medical History" 
          patientName="Emily Davis"
          sentTime="1 day ago" 
          icon={<FileText className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />} 
          iconBg="bg-yellow-50 dark:bg-yellow-900/20"
          status="pending"
        />
        <FormStatusCard 
          title="Pre-Appointment Questionnaire" 
          patientName="Robert Wilson"
          sentTime="4 days ago" 
          icon={<CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />} 
          iconBg="bg-green-50 dark:bg-green-900/20"
          status="completed"
        />
        <FormStatusCard 
          title="Prescription Refill Request" 
          patientName="Jennifer Miller"
          sentTime="Today" 
          icon={<Clock className="h-5 w-5 text-purple-500 dark:text-purple-400" />} 
          iconBg="bg-purple-50 dark:bg-purple-900/20"
          status="viewed"
        />
      </div>
    </div>
  );
}
