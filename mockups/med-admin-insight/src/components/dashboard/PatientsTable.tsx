import { Button } from "@/components/ui/button";
import { Edit, MoreVertical, FileDown, UploadCloud } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Patient = {
  id: string;
  name: string;
  avatar: string;
  age: number;
  dob: string;
  diagnosis: string;
  triage: "Non-Urgent" | "Out Patient" | "Emergency";
};

interface PatientsTableProps {
  patients: Patient[];
}

export function PatientsTable({ patients }: PatientsTableProps) {
  const getTriageClass = (triage: string) => {
    switch (triage) {
      case "Non-Urgent":
        return "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400";
      case "Out Patient":
        return "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400";
      case "Emergency":
        return "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400";
      default:
        return "bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
        <h2 className="text-lg font-semibold text-medical-text dark:text-white">
          Recent Patients
        </h2>
        <Button variant="link" className="text-medical-primary dark:text-blue-400">
          Show all
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext dark:text-gray-300 uppercase tracking-wider">
                No
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext dark:text-gray-300 uppercase tracking-wider">
                Patient name
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext dark:text-gray-300 uppercase tracking-wider">
                Age
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext dark:text-gray-300 uppercase tracking-wider">
                Date of Birth
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext dark:text-gray-300 uppercase tracking-wider">
                Diagnosis
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext dark:text-gray-300 uppercase tracking-wider">
                Triage
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient, index) => (
              <tr key={patient.id} className="border-b hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700">
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm text-medical-text dark:text-white">
                      {patient.id}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <img
                      src={patient.avatar}
                      alt={patient.name}
                      className="h-8 w-8 rounded-full mr-2"
                    />
                    <span className="text-sm font-medium text-medical-text dark:text-white">
                      {patient.name}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="text-sm text-medical-text dark:text-white">
                    {patient.age}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="text-sm text-medical-text dark:text-white">
                    {patient.dob}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="text-sm text-medical-text dark:text-white">
                    {patient.diagnosis}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs rounded-full ${getTriageClass(
                      patient.triage
                    )}`}
                  >
                    {patient.triage}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <button className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
