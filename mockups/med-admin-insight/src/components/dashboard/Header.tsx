import { Button } from "@/components/ui/button";
import { FileText, FilePlus } from "lucide-react";
import { Link } from "react-router-dom";

export function Header() {
  return (
    <div className="bg-medical-primary rounded-xl p-6 flex justify-between items-center text-white mb-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome to MedMinute, Ismael</h1>
        <p className="text-white/80 mt-1">
          Streamline your medical forms and reduce administrative workload
        </p>
        <div className="mt-4 flex gap-3">
          <Button
            asChild
            className="bg-white text-medical-primary hover:bg-white/90 flex items-center gap-2"
          >
            <Link to="/templates">
              <FileText className="h-4 w-4" />
              Form Templates
            </Link>
          </Button>
          <Button
            asChild
            className="bg-white text-medical-primary hover:bg-white/90 flex items-center gap-2"
          >
            <Link to="/create-form">
              <FilePlus className="h-4 w-4" />
              Create Form
            </Link>
          </Button>
        </div>
      </div>
      <div className="hidden md:block flex-shrink-0">
        <img
          src="/doctor.png"
          alt="Doctor illustration"
          className="h-32 w-32 object-cover rounded-lg"
        />
      </div>
    </div>
  );
}
