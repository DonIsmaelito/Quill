import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { patientsData, Patient } from "@/data/patients"; // Assuming Patient type is exported from patients.ts
import { Search, UserPlus } from "lucide-react";

export default function AssignTemplatePage() {
  const { templateId } = useParams<{ templateId: string }>();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPatients, setFilteredPatients] =
    useState<Patient[]>(patientsData);

  useEffect(() => {
    if (searchTerm === "") {
      setFilteredPatients(patientsData);
    } else {
      setFilteredPatients(
        patientsData.filter((patient) =>
          patient.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [searchTerm]);

  // Find the template name based on templateId (optional, for display)
  // This assumes your templates array in Templates.tsx is accessible or you have another way to get names
  // For now, we'll just display the ID.

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-medical-background to-blue-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-medical-primary drop-shadow-sm">
              Assign Template to Patient
            </h1>
            <p className="text-medical-subtext text-base mt-1">
              Assigning template:{" "}
              <span className="font-medium text-medical-text">
                {templateId || "N/A"}
              </span>
            </p>
          </div>

          <div className="mb-8 bg-white p-4 rounded-xl shadow-lg max-w-2xl">
            <h2 className="text-lg font-semibold text-medical-text mb-3">
              Search Patients
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for a patient by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 text-base"
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
            <ul className="divide-y divide-gray-200">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <li
                    key={patient.id}
                    className="p-4 hover:bg-gray-100/50 transition-colors duration-150 flex justify-between items-center cursor-default"
                  >
                    <div className="flex items-center">
                      <img
                        src={patient.avatar}
                        alt={patient.name}
                        className="h-10 w-10 rounded-full mr-3"
                      />
                      <div>
                        <p className="text-sm font-medium text-medical-text">
                          {patient.name}
                        </p>
                        <p className="text-sm text-medical-subtext">
                          ID: {patient.id} - DOB: {patient.dob}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!templateId) return;
                        const assignment = {
                          templateId,
                          patientId: patient.id,
                          patientName: patient.name,
                          assignedAt: new Date().toISOString(),
                        };

                        try {
                          const res = await fetch(
                            "http://localhost:5173/api/assign",
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify(assignment),
                            }
                          );

                          if (!res.ok) {
                            const err = await res.json();
                            throw new Error(err?.error || "Failed to assign");
                          }

                          const data = await res.json();
                          alert(
                            `Template assigned successfully! Saved as ${data.filename}`
                          );
                        } catch (error: any) {
                          console.error(error);
                          alert(`Error assigning template: ${error.message}`);
                        }
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign
                    </Button>
                  </li>
                ))
              ) : (
                <li className="p-6 text-center text-medical-subtext text-lg">
                  No patients found.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
