
import { Button } from "@/components/ui/button";
import { Edit, MoreVertical, Trash2 } from "lucide-react";

type Appointment = {
  id: string;
  patientName: string;
  doctor: {
    name: string;
    avatar: string;
  };
  time: string;
  disease: string;
};

interface AppointmentsTableProps {
  appointments: Appointment[];
}

export function AppointmentsTable({ appointments }: AppointmentsTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold text-medical-text">Upcoming Appointments</h2>
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
                Doctor
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext uppercase tracking-wider">
                Time
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext uppercase tracking-wider">
                Disease
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment, index) => (
              <tr key={appointment.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm text-medical-text">{appointment.id}</span>
                  </div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-medical-text">{appointment.patientName}</span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <img
                      src={appointment.doctor.avatar}
                      alt={appointment.doctor.name}
                      className="h-8 w-8 rounded-full mr-2"
                    />
                    <span className="text-sm text-medical-text">{appointment.doctor.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="text-sm text-medical-text">{appointment.time}</span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    appointment.disease === 'Fracture' 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'bg-green-50 text-green-600'
                  }`}>
                    {appointment.disease}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <button className="text-blue-500 hover:text-blue-700">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
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
