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
        return "bg-blue-50 text-blue-600";
      case "Out Patient":
        return "bg-pink-50 text-pink-600";
      case "Emergency":
        return "bg-amber-50 text-amber-600";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold text-medical-text">
          Recent Patients
        </h2>
        <Button variant="link" className="text-medical-primary">
          Show all
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext uppercase tracking-wider">
                No
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext uppercase tracking-wider">
                Patient name
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext uppercase tracking-wider">
                Age
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext uppercase tracking-wider">
                Date of Birth
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext uppercase tracking-wider">
                Diagnosis
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext uppercase tracking-wider">
                Triage
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient, index) => (
              <tr key={patient.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm text-medical-text">
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
                    <span className="text-sm font-medium text-medical-text">
                      {patient.name}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="text-sm text-medical-text">
                    {patient.age}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="text-sm text-medical-text">
                    {patient.dob}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="text-sm text-medical-text">
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
                    <button className="text-blue-500 hover:text-blue-700">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-gray-500 hover:text-gray-700">
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
