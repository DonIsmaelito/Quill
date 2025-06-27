import { Button } from "@/components/ui/button";
import { FileText, FilePlus } from "lucide-react";
import { Link } from "react-router-dom";

export function Header() {
  return (
    <div className="bg-medical-primary dark:bg-blue-600 rounded-xl p-4 flex justify-between items-center text-white mb-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500 ease-out min-h-[120px]">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back, Dr. Smith!
        </h1>
        <p className="text-white/80 dark:text-white/90 mt-1">
          Streamline your medical forms and reduce administrative workload
        </p>
      </div>
      <div className="hidden md:block flex-shrink-0">
        <img
          src="/doctor.png"
          alt="Doctor illustration"
          className="h-24 w-24 object-cover rounded-lg"
        />
      </div>
    </div>
  );
}
