import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileCheck, Search, Calendar, Filter } from "lucide-react";
import { FormStatusCard } from "@/components/dashboard/FormStatusCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function CompletedForms() {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-medical-background to-blue-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-medical-primary drop-shadow-sm">
              Completed Forms
            </h1>
            <p className="text-medical-subtext text-base mt-1">
              View and manage submitted forms
            </p>
          </div>

          <div className="mb-8 bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
            <h2 className="text-xl font-semibold text-medical-text mb-4">
              Completion Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Forms Completed Today
                  </CardTitle>
                  <FileCheck className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    This Week
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">42</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Completion Rate
                  </CardTitle>
                  <Filter className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">89%</div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mb-8 bg-white p-6 rounded-xl shadow-lg">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  className="pl-10 h-11 text-base"
                  placeholder="Search completed forms..."
                />
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <Select>
                  <SelectTrigger className="w-full md:w-[180px] h-11 text-base">
                    <SelectValue placeholder="Form Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registration">Registration</SelectItem>
                    <SelectItem value="medical">Medical History</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 w-full md:w-auto h-11 text-base"
                >
                  <Calendar className="h-4 w-4" />
                  Date Range
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
            <h2 className="text-xl font-semibold text-medical-text mb-4">
              Submitted Forms
            </h2>
            <div className="grid gap-4">
              <FormStatusCard
                title="Pre-Appointment Questionnaire"
                patientName="Robert Wilson"
                sentTime="4 days ago"
                icon={<FileCheck className="h-5 w-5 text-green-500" />}
                iconBg="bg-green-50"
                status="completed"
              />
              <FormStatusCard
                title="Medical History Update"
                patientName="Jennifer Miller"
                sentTime="2 days ago"
                icon={<FileCheck className="h-5 w-5 text-green-500" />}
                iconBg="bg-green-50"
                status="completed"
              />
              {/* Add more completed forms as needed */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
