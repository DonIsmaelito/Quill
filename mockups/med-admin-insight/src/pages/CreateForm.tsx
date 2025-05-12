import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, List, Users } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function CreateForm() {
  return (
    <div className="flex h-screen overflow-hidden bg-medical-background">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-medical-text">
            Create New Form
          </h1>
          <p className="text-medical-subtext">
            Design and send forms to your patients
          </p>
        </div>

        <Tabs defaultValue="scratch" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="scratch" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Create from Scratch
            </TabsTrigger>
            <TabsTrigger value="template" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Use Template
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scratch">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Form Details</CardTitle>
                    <CardDescription>
                      Configure the basic settings for your new form
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-medical-text mb-1">
                        Form Name
                      </label>
                      <Input placeholder="e.g., Patient Intake Form" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-medical-text mb-1">
                        Form Type
                      </label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select form type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="registration">
                            Patient Registration
                          </SelectItem>
                          <SelectItem value="medical-history">
                            Medical History
                          </SelectItem>
                          <SelectItem value="insurance">
                            Insurance Information
                          </SelectItem>
                          <SelectItem value="consent">Consent Form</SelectItem>
                          <SelectItem value="pre-visit">
                            Pre-Visit Questionnaire
                          </SelectItem>
                          <SelectItem value="post-visit">
                            Post-Visit Survey
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-medical-text mb-1">
                        Description
                      </label>
                      <Input placeholder="Brief description of the form's purpose" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Form Fields</CardTitle>
                    <CardDescription>
                      Add and configure form fields
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 p-4 border-2 border-dashed rounded-lg text-center">
                      <p className="text-medical-subtext">
                        Drag and drop form fields here
                      </p>
                      <Button variant="outline" className="w-full">
                        Add Field
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Send To</CardTitle>
                    <CardDescription>
                      Select recipients for this form
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full flex items-center gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Select Patients
                    </Button>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-medical-text mb-1">
                        Auto-send Options
                      </label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose when to send" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">
                            Send Immediately
                          </SelectItem>
                          <SelectItem value="before-appointment">
                            Before Appointment
                          </SelectItem>
                          <SelectItem value="after-appointment">
                            After Appointment
                          </SelectItem>
                          <SelectItem value="schedule">
                            Schedule for Later
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Button className="w-full mt-6 bg-medical-primary hover:bg-medical-primary/90">
                  Create and Send Form
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="template">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Template options will be loaded here */}
              <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardHeader>
                  <CardTitle>Patient Registration</CardTitle>
                  <CardDescription>
                    Standard new patient registration form
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-medical-subtext">156 uses</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
