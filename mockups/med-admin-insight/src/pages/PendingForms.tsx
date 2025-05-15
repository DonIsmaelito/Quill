import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, Users, Bell } from "lucide-react";
import { FormStatusCard } from "@/components/dashboard/FormStatusCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function PendingForms() {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-medical-background to-blue-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-medical-primary drop-shadow-sm">
              Pending Forms
            </h1>
            <p className="text-medical-subtext text-base mt-1">
              Track and manage forms awaiting completion
            </p>
          </div>

          <div className="mb-8 bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
            <h2 className="text-xl font-semibold text-medical-text mb-4">
              Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Pending
                  </CardTitle>
                  <FileText className="h-4 w-4 text-medical-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Viewed by Patient
                  </CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">5</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Reminder Sent
                  </CardTitle>
                  <Bell className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Forms</TabsTrigger>
                <TabsTrigger value="urgent">Urgent</TabsTrigger>
                <TabsTrigger value="pre-appointment">
                  Pre-Appointment
                </TabsTrigger>
                <TabsTrigger value="insurance">Insurance</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <div className="grid gap-4">
                  <FormStatusCard
                    title="Patient Insurance Form"
                    patientName="Sarah Johnson"
                    sentTime="2 days ago"
                    icon={<FileText className="h-5 w-5 text-medical-primary" />}
                    iconBg="bg-green-50"
                    status="pending"
                  />
                  <FormStatusCard
                    title="Medical History"
                    patientName="Emily Davis"
                    sentTime="1 day ago"
                    icon={<Clock className="h-5 w-5 text-yellow-500" />}
                    iconBg="bg-yellow-50"
                    status="viewed"
                  />
                  <FormStatusCard
                    title="Consent Form"
                    patientName="Michael Brown"
                    sentTime="3 days ago"
                    icon={<Clock className="h-5 w-5 text-blue-500" />}
                    iconBg="bg-blue-50"
                    status="viewed"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
