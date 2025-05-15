import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  FileWarning,
  AlertCircle,
  FileCheck,
  Send,
  Eye,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { MissingForm, NextAppointmentProps } from "./NextAppointmentCard"; // Assuming types are exported

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Omit<
    NextAppointmentProps,
    "isUrgent" | "syncStatus" | "lastSync"
  >; // Use relevant props
}

const getFormStatusDetails = (status: MissingForm["status"]) => {
  switch (status) {
    case "missing":
      return {
        icon: (
          <FileWarning className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
        ),
        text: "Missing",
        textColor: "text-red-600",
        bgColor: "bg-red-50",
        needed: "Patient needs to complete and submit this form.",
      };
    case "pending":
      return {
        icon: (
          <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0" />
        ),
        text: "Pending",
        textColor: "text-amber-600",
        bgColor: "bg-amber-50",
        needed: "Form sent, awaiting patient submission or signature.",
      };
    case "completed":
      return {
        icon: (
          <FileCheck className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
        ),
        text: "Completed",
        textColor: "text-green-600",
        bgColor: "bg-green-50",
        needed: "Form submitted and on file.",
      };
    default:
      return {
        icon: null,
        text: "Unknown",
        textColor: "text-gray-500",
        bgColor: "bg-gray-50",
        needed: "Status unclear.",
      };
  }
};

export const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({
  isOpen,
  onClose,
  appointment,
}) => {
  const { toast } = useToast();
  const [forms, setForms] = useState(appointment.missingForms);

  const handleAssignForm = (formIndex: number) => {
    const updatedForms = [...forms];
    updatedForms[formIndex] = {
      ...updatedForms[formIndex],
      status: "pending",
    };
    setForms(updatedForms);

    toast({
      title: "Form Assigned",
      description: `${updatedForms[formIndex].name} has been assigned and sent to the patient.`,
      duration: 3000,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 md:p-8"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 ease-out scale-95 group-hover:scale-100"
        onClick={(e) => e.stopPropagation()} // Prevent click inside from closing modal
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-medical-primary">
              Appointment & Form Details
            </h2>
            <p className="text-sm text-medical-subtext">
              {appointment.patientName} -{" "}
              {appointment.appointmentTime.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
              ,{" "}
              {appointment.appointmentTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="p-5 sm:p-6 flex-grow overflow-y-auto space-y-5 bg-slate-50/70">
          <h3 className="text-lg font-medium text-gray-800 mb-3">
            Form Status Overview:
          </h3>
          {forms.length > 0 ? (
            <ul className="space-y-3">
              {forms.map((form, index) => {
                const statusDetails = getFormStatusDetails(form.status);
                return (
                  <li
                    key={index}
                    className={cn(
                      "p-4 rounded-lg border-l-4 shadow-sm transition-all hover:shadow-md",
                      statusDetails.bgColor,
                      `border-${statusDetails.textColor.replace("text-", "")}`
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center">
                        {statusDetails.icon}
                        <span
                          className={cn(
                            "font-semibold text-base",
                            statusDetails.textColor
                          )}
                        >
                          {form.name}
                        </span>
                      </div>
                      <Badge
                        variant={
                          form.status === "completed"
                            ? "default"
                            : form.status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                        className={cn(
                          "capitalize text-xs",
                          statusDetails.bgColor,
                          statusDetails.textColor,
                          `border-${statusDetails.textColor.replace(
                            "text-",
                            ""
                          )}/30 border`
                        )}
                      >
                        {statusDetails.text}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 ml-7 mb-2">
                      {statusDetails.needed}
                    </p>
                    <div className="ml-7 flex items-center gap-2">
                      {form.status === "pending" && (
                        <Button size="sm" variant="outline" className="text-xs">
                          <Send className="h-3.5 w-3.5 mr-1.5" /> Send Reminder
                        </Button>
                      )}
                      {form.status === "missing" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => handleAssignForm(index)}
                        >
                          <PlusCircle className="h-3.5 w-3.5 mr-1.5" />{" "}
                          Assign/Re-send Form
                        </Button>
                      )}
                      {form.status === "completed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" /> View Submitted
                          Form
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-gray-600 text-center py-4">
              All forms for this appointment are in order.
            </p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-gray-200 bg-gray-50 flex justify-end">
          <Button variant="outline" onClick={onClose} className="px-6">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
