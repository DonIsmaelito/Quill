import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { patientsData, Patient } from "@/data/patients"; // Assuming Patient type is exported from patients.ts
import { Search, UserPlus, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AssignTemplatePage() {
  const { templateId, templateName } = useParams<{ templateId: string; templateName?: string }>();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPatients, setFilteredPatients] =
    useState<Patient[]>(patientsData);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [loadingPatients, setLoadingPatients] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });

  // Decode the template name from URL, or fall back to a derived name from templateId
  const decodedTemplateName = templateName 
    ? decodeURIComponent(templateName) 
    : templateId 
      ? templateId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      : "Untitled Form";

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

  // Toast notification component
  const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 min-w-[300px] animate-in slide-in-from-right duration-300">
      {type === 'success' ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500" />
      )}
      <p className={cn(
        "text-sm font-medium",
        type === 'success' ? 'text-green-700' : 'text-red-700'
      )}>
        {message}
      </p>
      <button
        onClick={onClose}
        className="ml-auto text-gray-400 hover:text-gray-600"
      >
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );

  // Show toast function
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 5000);
  };

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
                {decodedTemplateName}
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
                          DOB: {patient.dob}
                        </p>
                      </div>
                    </div>
                    {sentRequests.has(patient.id) ? (
                      <div className="group relative inline-flex items-center justify-center h-9 px-3 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 w-[189px]">
                        <div className="flex items-center gap-1 text-green-600 group-hover:opacity-0 transition-opacity duration-200">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Sent</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loadingPatients.has(patient.id)}
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-full"
                          onClick={async () => {
                            if (!templateId) return;
                            
                            // Set loading state
                            setLoadingPatients(prev => new Set([...prev, patient.id]));
                            
                            // For demo purposes, use the specified email
                            const patientEmail = "fernandesi2244@gmail.com";
                            const formUrl = "http://localhost:5173/";
                            
                            // Get template name (you might want to load this from your templates data)
                            const templateName = decodedTemplateName;
                            
                            try {
                              // Send form request email
                              const emailRes = await fetch("/api/send-form-email", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  patientEmail,
                                  patientName: patient.name,
                                  templateName,
                                  templateId
                                }),
                              });

                              if (!emailRes.ok) {
                                const err = await emailRes.json();
                                throw new Error(err?.error || "Failed to send email");
                              }

                              const emailData = await emailRes.json();
                              
                              // Also save the assignment record (optional)
                              const assignment = {
                                templateId,
                                templateName: decodedTemplateName,
                                patientId: patient.id,
                                patientName: patient.name,
                                patientEmail,
                                assignedAt: new Date().toISOString(),
                              };

                              try {
                                const assignRes = await fetch("/api/assign", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify(assignment),
                                });

                                if (assignRes.ok) {
                                  const assignData = await assignRes.json();
                                  showToast(
                                    `Form request resent successfully to ${patient.name} (${patientEmail})!`,
                                    'success'
                                  );
                                }
                              } catch (assignError) {
                                // Assignment save failed, but email was sent
                                console.warn("Assignment save failed:", assignError);
                                showToast(
                                  `Form request resent successfully to ${patient.name} (${patientEmail})!`,
                                  'success'
                                );
                              }
                            } catch (error: any) {
                              console.error(error);
                              showToast(
                                `Error resending form request: ${error.message}`,
                                'error'
                              );
                            } finally {
                              // Clear loading state
                              setLoadingPatients(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(patient.id);
                                return newSet;
                              });
                            }
                          }}
                        >
                          {loadingPatients.has(patient.id) ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Resend
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loadingPatients.has(patient.id)}
                        className="w-[189px]"
                        onClick={async () => {
                          if (!templateId) return;
                          
                          // Set loading state
                          setLoadingPatients(prev => new Set([...prev, patient.id]));
                          
                          // For demo purposes, use the specified email
                          const patientEmail = "fernandesi2244@gmail.com";
                          const formUrl = "http://localhost:5173/";
                          
                          // Get template name (you might want to load this from your templates data)
                          const templateName = decodedTemplateName;
                          
                          try {
                            // Send form request email
                            const emailRes = await fetch("/api/send-form-email", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                patientEmail,
                                patientName: patient.name,
                                templateName,
                                templateId
                              }),
                            });

                            if (!emailRes.ok) {
                              const err = await emailRes.json();
                              throw new Error(err?.error || "Failed to send email");
                            }

                            const emailData = await emailRes.json();
                            
                            // Mark this patient as having been sent a request
                            setSentRequests(prev => new Set([...prev, patient.id]));
                            
                            // Also save the assignment record (optional)
                            const assignment = {
                              templateId,
                              templateName: decodedTemplateName,
                              patientId: patient.id,
                              patientName: patient.name,
                              patientEmail,
                              assignedAt: new Date().toISOString(),
                            };

                            try {
                              const assignRes = await fetch("/api/assign", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify(assignment),
                              });

                              if (assignRes.ok) {
                                const assignData = await assignRes.json();
                                showToast(
                                  `Form request sent successfully to ${patient.name} (${patientEmail})!`,
                                  'success'
                                );
                              }
                            } catch (assignError) {
                              // Assignment save failed, but email was sent
                              console.warn("Assignment save failed:", assignError);
                              showToast(
                                `Form request sent successfully to ${patient.name} (${patientEmail})!`,
                                'success'
                              );
                            }
                          } catch (error: any) {
                            console.error(error);
                            showToast(
                              `Error sending form request: ${error.message}`,
                              'error'
                            );
                          } finally {
                            // Clear loading state
                            setLoadingPatients(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(patient.id);
                              return newSet;
                            });
                          }
                        }}
                      >
                        {loadingPatients.has(patient.id) ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Send Form Request
                          </>
                        )}
                      </Button>
                    )}
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
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}
    </div>
  );
}
