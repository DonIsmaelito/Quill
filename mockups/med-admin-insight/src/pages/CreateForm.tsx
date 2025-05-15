import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  CardFooter,
} from "@/components/ui/card";
import {
  FileText,
  List,
  Users,
  Wand2,
  Eye,
  Edit,
  Save,
  Send,
  CalendarDays,
  History,
  PlusCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

type FormCreationStep = "describe" | "editAI" | "send";

const formCategories = [
  "Administrative",
  "Clinical",
  "Legal",
  "Financial",
  "Consent",
  "Other",
];
const formAudiences = [
  "Patient",
  "Caregiver",
  "Internal Staff",
  "Referring Physician",
];

interface GeneratedField {
  id: string;
  label: string;
  type: string;
}

export default function CreateForm() {
  const [currentStep, setCurrentStep] = useState<FormCreationStep>("describe");

  const [formDescription, setFormDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedAudience, setSelectedAudience] = useState<string>("");

  const [mockPdfPreviewUrl, setMockPdfPreviewUrl] = useState<string | null>(
    null
  );
  const [generatedFields, setGeneratedFields] = useState<GeneratedField[]>([]);

  const [sendOption, setSendOption] = useState<string>("");
  const [trackFulfilment, setTrackFulfilment] = useState(true);

  const handleGenerateWithAI = () => {
    if (!formDescription.trim()) {
      alert("Please describe the form you need.");
      return;
    }
    console.log("Generating form with AI...", {
      formDescription,
      selectedCategory,
      selectedAudience,
    });
    setMockPdfPreviewUrl("/Patient_Intake_Form.pdf");
    setGeneratedFields([
      { id: "f1", label: "Full Name", type: "Text Input" },
      { id: "f2", label: "Date of Birth", type: "Date Picker" },
      { id: "f3", label: "Reason for Visit", type: "Text Area" },
      { id: "f4", label: "Primary Insurance", type: "Text Input" },
      { id: "f5", label: "Emergency Contact", type: "Text Input" },
      { id: "f6", label: "Patient Signature", type: "Signature" },
    ]);
    setCurrentStep("editAI");
  };

  const handleRegenerate = () => {
    console.log("Regenerating form...");
    const variations = [
      {
        id: "f1-v2",
        label: "Patient Full Name",
        type: "Text Input (Required)",
      },
      { id: "f2-v2", label: "DOB", type: "Date Field" },
      { id: "f3-v2", label: "Chief Complaint", type: "Large Text Box" },
    ];
    setGeneratedFields(variations);
    setMockPdfPreviewUrl("/Medical_History_Form.pdf");
  };

  const handleSaveAndSend = () => {
    console.log("Saving and sending form...", {
      sendOption,
      trackFulfilment,
      generatedFields,
    });
    alert("Form saved and (notionally) sent!");
    setCurrentStep("describe");
    setFormDescription("");
  };

  const handleSaveDraft = () => {
    console.log("Saving draft...", { generatedFields });
    alert("Form draft saved!");
  };

  const handleAddField = () => {
    setGeneratedFields((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        label: "New Custom Field",
        type: "Text Input",
      },
    ]);
  };

  const handleDeleteField = (fieldId: string) => {
    setGeneratedFields((prev) => prev.filter((f) => f.id !== fieldId));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-medical-background to-blue-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-medical-primary drop-shadow-sm leading-tight">
              Create New Form with AI
            </h1>
            <p className="text-medical-subtext text-base mt-1 leading-snug">
              Let MedMinute AI draft your form based on your needs.
            </p>
          </div>

          {currentStep === "describe" && (
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <Wand2 className="h-6 w-6 mr-2 text-medical-primary" /> Step
                  1: Describe Your Form
                </CardTitle>
                <CardDescription>
                  Tell our AI what kind of form you need. The more details you
                  provide, the better the draft will be.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label
                    htmlFor="formDescription"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Describe what you need{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    id="formDescription"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g., A pre-operative anesthesia assessment for adult knee replacement surgery, including current medications and allergy checks."
                    rows={6}
                    className="shadow-sm focus:ring-medical-primary focus:border-medical-primary"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="formCategory"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Category (Optional)
                    </label>
                    <Select
                      value={selectedCategory}
                      onValueChange={setSelectedCategory}
                    >
                      <SelectTrigger id="formCategory" className="shadow-sm">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {formCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label
                      htmlFor="formAudience"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Primary Audience (Optional)
                    </label>
                    <Select
                      value={selectedAudience}
                      onValueChange={setSelectedAudience}
                    >
                      <SelectTrigger id="formAudience" className="shadow-sm">
                        <SelectValue placeholder="Select primary audience" />
                      </SelectTrigger>
                      <SelectContent>
                        {formAudiences.map((aud) => (
                          <SelectItem key={aud} value={aud}>
                            {aud}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    size="lg"
                    onClick={handleGenerateWithAI}
                    disabled={!formDescription.trim()}
                    className="bg-medical-primary hover:bg-medical-primary/90 text-base px-8 py-3"
                  >
                    <Wand2 className="h-5 w-5 mr-2" /> Generate with AI
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === "editAI" && mockPdfPreviewUrl && (
            <div className="space-y-6">
              <Card className="shadow-xl">
                <CardHeader className="flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center text-2xl">
                      <Eye className="h-6 w-6 mr-2 text-medical-primary" /> Step
                      2: Review & Edit Draft
                    </CardTitle>
                    <CardDescription>
                      Here's a draft of your form. Review the preview and the
                      fields. You can regenerate or make edits.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep("describe")}
                  >
                    <Edit className="h-4 w-4 mr-2" /> Back to Description
                  </Button>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="lg:col-span-1 space-y-3">
                    <h4 className="text-lg font-medium text-gray-700">
                      Form Preview
                    </h4>
                    <div className="aspect-[8.5/11] w-full border rounded-lg overflow-hidden shadow-md bg-gray-100">
                      <iframe
                        src={mockPdfPreviewUrl}
                        title="Generated Form Preview"
                        width="100%"
                        height="100%"
                        className="border-0"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-1 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-medium text-gray-700">
                        Editable Fields ({generatedFields.length})
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddField}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" /> Add Field
                      </Button>
                    </div>
                    <ScrollArea className="h-[400px] border rounded-md p-3 bg-slate-50/50">
                      {generatedFields.length > 0 ? (
                        <ul className="space-y-2">
                          {generatedFields.map((field) => (
                            <li
                              key={field.id}
                              className="p-2.5 bg-white rounded-md shadow-sm border flex justify-between items-center hover:shadow-md transition-shadow"
                            >
                              <div>
                                <p className="font-medium text-sm text-gray-800">
                                  {field.label}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Type: {field.type}
                                </p>
                              </div>
                              <div className="space-x-1.5">
                                <Button
                                  variant="ghost"
                                  size="icon_sm"
                                  className="h-7 w-7 text-gray-500 hover:text-blue-600"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon_sm"
                                  className="h-7 w-7 text-gray-500 hover:text-red-600"
                                  onClick={() => handleDeleteField(field.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-center text-gray-500 py-4">
                          No fields generated yet.
                        </p>
                      )}
                    </ScrollArea>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center pt-6 border-t">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleRegenerate}
                    className="text-base"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => setCurrentStep("send")}
                    className="bg-medical-primary hover:bg-medical-primary/90 text-base px-8 py-3"
                  >
                    Proceed to Send/Save <Send className="h-4 w-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}

          {/* Step 3: Send / Save */}
          {currentStep === "send" && (
            <Card className="shadow-xl">
              <CardHeader className="flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="flex items-center text-2xl">
                    <Send className="h-6 w-6 mr-2 text-medical-primary" /> Step
                    3: Finalize & Send
                  </CardTitle>
                  <CardDescription>
                    Review send options and save or distribute your newly
                    created form.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("editAI")}
                >
                  <Edit className="h-4 w-4 mr-2" /> Back to Editing
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Simplified Send To Section - can be expanded based on original component */}
                <div>
                  <h4 className="text-lg font-medium text-gray-700 mb-2">
                    Recipients & Scheduling
                  </h4>
                  <div className="space-y-4 p-4 border rounded-md bg-slate-50/50">
                    <Button
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 py-3 text-base"
                    >
                      <Users className="h-5 w-5" /> Select Patients / Groups
                    </Button>
                    <div>
                      <label
                        htmlFor="sendOption"
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                      >
                        Send Rule
                      </label>
                      <Select value={sendOption} onValueChange={setSendOption}>
                        <SelectTrigger id="sendOption" className="shadow-sm">
                          <SelectValue placeholder="Choose when to send" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">
                            Send Immediately Upon Saving
                          </SelectItem>
                          <SelectItem value="manual">
                            Manual Send Only (Save as Draft)
                          </SelectItem>
                          <SelectItem value="before-appointment">
                            X Days Before Appointment (requires patient link)
                          </SelectItem>
                          <SelectItem value="scheduled">
                            Schedule for Specific Date/Time
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {/* TODO: Add conditional inputs for X days or date/time picker based on selection */}
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch
                        id="trackFulfilment"
                        checked={trackFulfilment}
                        onCheckedChange={setTrackFulfilment}
                      />
                      <label
                        htmlFor="trackFulfilment"
                        className="text-sm font-medium text-gray-700"
                      >
                        Track Form Fulfilment & Reminders
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between items-center pt-6 border-t">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleSaveDraft}
                  className="text-base"
                >
                  <Save className="h-4 w-4 mr-2" /> Save as Draft
                </Button>
                <Button
                  size="lg"
                  onClick={handleSaveAndSend}
                  className="bg-medical-primary hover:bg-medical-primary/90 text-base px-8 py-3"
                >
                  <Send className="h-4 w-4 mr-2" /> Confirm & Send/Save
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
