import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  QrCode,
  Edit3,
  FileWarning,
  FileCheck,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppointmentDetailsModal } from "./AppointmentDetailsModal";

export interface MissingForm {
  name: string;
  status: "missing" | "pending" | "completed";
}

export interface NextAppointmentProps {
  patientName: string;
  appointmentTime: Date;
  doctorName: string;
  reason: string;
  missingForms: MissingForm[];
  isUrgent?: boolean; // To highlight the whole card
}

// Dummy function to calculate time until appointment
const calculateTimeUntil = (time: Date): string => {
  const now = new Date();
  const diffMs = time.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins <= 0) return "Now";
  if (diffMins < 60) return `${diffMins} min`;
  return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
};

const getFormIcon = (status: MissingForm["status"]) => {
  switch (status) {
    case "missing":
      return (
        <FileWarning className="h-4 w-4 text-red-500 dark:text-red-400 mr-1.5 flex-shrink-0" />
      );
    case "pending":
      return (
        <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400 mr-1.5 flex-shrink-0" />
      );
    case "completed":
      return (
        <FileCheck className="h-4 w-4 text-green-500 dark:text-green-400 mr-1.5 flex-shrink-0" />
      );
    default:
      return null;
  }
};

export const NextAppointmentCard: React.FC<NextAppointmentProps> = (props) => {
  const {
    patientName,
    appointmentTime,
    doctorName,
    reason,
    missingForms,
    isUrgent = false,
  } = props;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const timeUntil = calculateTimeUntil(appointmentTime);

  const handleViewDetailsClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div
        className={cn(
          "bg-white dark:bg-gray-800 p-5 rounded-xl shadow-lg transition-all duration-300 ease-out mb-6",
          isUrgent
            ? "border-2 border-amber-400 dark:border-amber-500 shadow-amber-200/50 dark:shadow-amber-500/20 ring-4 ring-amber-100/50 dark:ring-amber-500/20"
            : "hover:shadow-xl hover:-translate-y-0.5"
        )}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-semibold text-medical-primary dark:text-white">
              Next Appointment
            </h3>
            <p className="text-sm text-medical-subtext dark:text-gray-400">
              {appointmentTime.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}{" "}
              at{" "}
              {appointmentTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          {timeUntil !== "Now" && (
            <Badge
              variant={
                isUrgent ||
                (timeUntil.includes("min") && parseInt(timeUntil) <= 15)
                  ? "destructive"
                  : "secondary"
              }
              className="text-sm"
            >
              <AlertCircle className="h-3.5 w-3.5 mr-1.5" /> Starts in{" "}
              {timeUntil}
            </Badge>
          )}
          {timeUntil === "Now" && (
            <Badge variant="destructive" className="text-sm">
              <AlertCircle className="h-3.5 w-3.5 mr-1.5" /> Happening Now
            </Badge>
          )}
        </div>

        <div className="mb-4">
          <h4 className="text-2xl font-bold text-gray-800 dark:text-white">{patientName}</h4>
          <p className="text-md text-gray-600 dark:text-gray-300">
            with {doctorName} - <span className="italic">{reason}</span>
          </p>
        </div>

        {missingForms.length > 0 && (
          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Required Forms:
            </h5>
            <ul className="space-y-1.5">
              {missingForms.map((form) => (
                <li
                  key={form.name}
                  className={cn(
                    "text-sm flex items-center",
                    form.status === "completed"
                      ? "text-green-600 dark:text-green-400"
                      : form.status === "pending"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {getFormIcon(form.status)}
                  {form.name}
                  {form.status === "pending" && (
                    <span className="text-xs ml-1 text-gray-500 dark:text-gray-400">(Sent)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-start gap-2 pt-3 border-t border-gray-200/80 dark:border-gray-600/80 mt-3">
          <Button variant="outline" size="sm" className="text-xs">
            <QrCode className="h-4 w-4 mr-1.5" /> Quick QR Print
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <Edit3 className="h-4 w-4 mr-1.5" /> e-Sign Link
          </Button>
          <Button
            size="sm"
            className="text-xs bg-medical-primary/90 hover:bg-medical-primary flex items-center"
            onClick={handleViewDetailsClick}
          >
            <Eye className="h-4 w-4 mr-1.5" /> View Details
          </Button>
        </div>
      </div>

      <AppointmentDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        appointment={props}
      />
    </>
  );
};
