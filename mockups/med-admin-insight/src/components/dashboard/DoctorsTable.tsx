import { Button } from "@/components/ui/button";
import {
  Edit,
  MoreVertical,
  Phone,
  PersonStanding,
  MapPin,
} from "lucide-react"; // Added Phone, PersonStanding, MapPin icons
import { Doctor } from "@/data/doctorsData"; // Import Doctor type

interface DoctorsTableProps {
  doctors: Doctor[];
}

export function DoctorsTable({ doctors }: DoctorsTableProps) {
  const getStatusClass = (status: string) => {
    switch (status) {
      case "Available":
        return "bg-green-100 text-green-700"; // Changed for better visibility
      case "Unavailable":
        return "bg-red-100 text-red-700"; // Changed for better visibility
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold text-medical-text">
          Doctor Directory
        </h2>
        <Button variant="link" className="text-medical-primary">
          Show all
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          {" "}
          {/* Added min-width for better responsiveness */}
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext uppercase tracking-wider">
                ID
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext uppercase tracking-wider">
                Doctor Name
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext uppercase tracking-wider">
                Specialty
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext uppercase tracking-wider">
                <MapPin className="inline-block h-4 w-4 mr-1" /> Room
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext uppercase tracking-wider">
                <Phone className="inline-block h-4 w-4 mr-1" /> Phone
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext uppercase tracking-wider">
                <PersonStanding className="inline-block h-4 w-4 mr-1" /> Status
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-medical-subtext uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((doctor) => (
              <tr key={doctor.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="text-sm text-medical-text">{doctor.id}</span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <img
                      src={doctor.avatar}
                      alt={doctor.name}
                      className="h-8 w-8 rounded-full mr-2"
                    />
                    <span className="text-sm font-medium text-medical-text">
                      {doctor.name}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="text-sm text-medical-text">
                    {doctor.specialty}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="text-sm text-medical-text">
                    {doctor.room}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="text-sm text-medical-text">
                    {doctor.phone}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(
                      doctor.status
                    )}`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full mr-1.5 ${
                        doctor.status === "Available"
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    ></span>
                    {doctor.status}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <button className="text-blue-500 hover:text-blue-700 p-1">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-gray-500 hover:text-gray-700 p-1">
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
