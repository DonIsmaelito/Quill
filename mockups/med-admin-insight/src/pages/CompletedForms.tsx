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
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-medical-background to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-medical-primary dark:text-white drop-shadow-sm">
              Completed Forms
            </h1>
            <p className="text-medical-subtext dark:text-gray-300 text-base mt-1">
              View and manage submitted forms
            </p>
          </div>

          <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
            <h2 className="text-xl font-semibold text-medical-text dark:text-white mb-4">
              Completion Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="dark:bg-gray-700 dark:border-gray-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium dark:text-gray-300">
                    Forms Completed Today
                  </CardTitle>
                  <FileCheck className="h-4 w-4 text-green-500 dark:text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold dark:text-white">8</div>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-700 dark:border-gray-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium dark:text-gray-300">
                    This Week
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold dark:text-white">42</div>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-700 dark:border-gray-600">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium dark:text-gray-300">
                    Completion Rate
                  </CardTitle>
                  <Filter className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold dark:text-white">89%</div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <Input
                  className="pl-10 h-11 text-base dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  placeholder="Search completed forms..."
                />
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <Select>
                  <SelectTrigger className="w-full md:w-[180px] h-11 text-base dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <SelectValue placeholder="Form Type" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                    <SelectItem value="registration" className="dark:text-white dark:hover:bg-gray-600">Registration</SelectItem>
                    <SelectItem value="medical" className="dark:text-white dark:hover:bg-gray-600">Medical History</SelectItem>
                    <SelectItem value="insurance" className="dark:text-white dark:hover:bg-gray-600">Insurance</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 w-full md:w-auto h-11 text-base dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Calendar className="h-4 w-4" />
                  Date Range
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
            <h2 className="text-xl font-semibold text-medical-text dark:text-white mb-4">
              Submitted Forms
            </h2>
            <div className="grid gap-4">
              <FormStatusCard
                title="Pre-Appointment Questionnaire"
                patientName="Robert Wilson"
                sentTime="4 days ago"
                icon={<FileCheck className="h-5 w-5 text-green-500 dark:text-green-400" />}
                iconBg="bg-green-50 dark:bg-green-900/30"
                status="completed"
              />
              <FormStatusCard
                title="Medical History Update"
                patientName="Jennifer Miller"
                sentTime="2 days ago"
                icon={<FileCheck className="h-5 w-5 text-green-500 dark:text-green-400" />}
                iconBg="bg-green-50 dark:bg-green-900/30"
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
