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
  MousePointer,
} from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ragService } from "../../../frontend2/src/services/ragService";
import { FormField } from "../types/form";
import { DigitizedForm } from "../components/DigitizedForm";
import { processFormData } from "../utils/formProcessing";
import { useNavigate } from "react-router-dom";

type FormCreationStep = "chooseMethod" | "describe" | "editAI" | "editManual" | "save";

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
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<FormCreationStep>("chooseMethod");

  const [formDescription, setFormDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedAudience, setSelectedAudience] = useState<string>("");
  const [manualFormDescription, setManualFormDescription] = useState("");
  const [isManuallyCreated, setIsManuallyCreated] = useState(false);

  const [mockPdfPreviewUrl, setMockPdfPreviewUrl] = useState<string | null>(
    null
  );
  const [generatedFields, setGeneratedFields] = useState<FormField[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [editableFormName, setEditableFormName] = useState<string>("");
  const [stateBackup, setStateBackup] = useState<FormField[]>([]);

  // State restoration from localStorage
  React.useEffect(() => {
    const savedFields = localStorage.getItem('createForm_fields');
    const savedStep = localStorage.getItem('createForm_step');
    const savedDescription = localStorage.getItem('createForm_description');
    const savedManualDescription = localStorage.getItem('createForm_manualDescription');
    const savedCategory = localStorage.getItem('createForm_category');
    const savedAudience = localStorage.getItem('createForm_audience');
    const savedFormName = localStorage.getItem('createForm_name');
    const savedIsManuallyCreated = localStorage.getItem('createForm_isManuallyCreated');

    // Only restore if we're starting fresh (chooseMethod step) and have saved data
    if (currentStep === "chooseMethod") {
      if (savedFields && savedFields !== '[]') {
        try {
          const parsedFields = JSON.parse(savedFields);
          if (parsedFields.length > 0) {
            setGeneratedFields(parsedFields);
            console.log('Restored fields from localStorage:', parsedFields);
          }
        } catch (error) {
          console.error('Error parsing saved fields:', error);
        }
      }

      if (savedStep && savedStep !== 'chooseMethod') {
        setCurrentStep(savedStep as FormCreationStep);
      }

      if (savedDescription) {
        setFormDescription(savedDescription);
      }

      if (savedManualDescription) {
        setManualFormDescription(savedManualDescription);
      }

      if (savedCategory) {
        setSelectedCategory(savedCategory);
      }

      if (savedAudience) {
        setSelectedAudience(savedAudience);
      }

      if (savedFormName) {
        setEditableFormName(savedFormName);
      }

      if (savedIsManuallyCreated) {
        setIsManuallyCreated(savedIsManuallyCreated === 'true');
      }
    }
  }, [currentStep]);

  // Save state to localStorage when it changes
  React.useEffect(() => {
    localStorage.setItem('createForm_fields', JSON.stringify(generatedFields));
    localStorage.setItem('createForm_step', currentStep);
    localStorage.setItem('createForm_description', formDescription);
    localStorage.setItem('createForm_manualDescription', manualFormDescription);
    localStorage.setItem('createForm_category', selectedCategory);
    localStorage.setItem('createForm_audience', selectedAudience);
    localStorage.setItem('createForm_name', editableFormName);
    localStorage.setItem('createForm_isManuallyCreated', isManuallyCreated.toString());
  }, [generatedFields, currentStep, formDescription, manualFormDescription, selectedCategory, selectedAudience, editableFormName, isManuallyCreated]);

  // Clear localStorage when component unmounts or when successfully saved
  React.useEffect(() => {
    return () => {
      // Only clear if we're not in the middle of saving
      if (!isSaving) {
        localStorage.removeItem('createForm_fields');
        localStorage.removeItem('createForm_step');
        localStorage.removeItem('createForm_description');
        localStorage.removeItem('createForm_manualDescription');
        localStorage.removeItem('createForm_category');
        localStorage.removeItem('createForm_audience');
        localStorage.removeItem('createForm_name');
        localStorage.removeItem('createForm_isManuallyCreated');
      }
    };
  }, [isSaving]);

  // Helper function to count editable fields (excluding headers/subheaders)
  const getEditableFieldCount = () => {
    return generatedFields.filter(field => 
      field.id.match(/^(text|boolean|date|table)\d+$/) || 
      field.id.includes('-text') || 
      field.id.includes('-boolean') || 
      field.id.includes('-date') || 
      field.id.includes('-table')
    ).length;
  };

  // Helper function to get the first header/subheader as default form name
  const getDefaultFormName = () => {
    const headerField = generatedFields.find(field => 
      !field.id.match(/^(text|boolean|date|table)\d+$/) && 
      !field.id.includes('-text') && 
      !field.id.includes('-boolean') && 
      !field.id.includes('-date') && 
      !field.id.includes('-table')
    );
    
    // For manually created forms, use the first header or a default name
    if (isManuallyCreated) {
      return headerField ? headerField.label : "Manually Created Form";
    }
    
    return headerField ? headerField.label : formDescription.trim() || "AI Generated Form";
  };

  // Update editable form name when fields change
  React.useEffect(() => {
    if (generatedFields.length > 0 && !editableFormName) {
      setEditableFormName(getDefaultFormName());
    }
  }, [generatedFields, editableFormName]);

  // Debug logging for state changes
  React.useEffect(() => {
    console.log('Current step:', currentStep);
    console.log('Generated fields count:', generatedFields.length);
    console.log('Generated fields:', generatedFields);
  }, [currentStep, generatedFields]);

  const handleGenerateWithAI = async () => {
    if (!formDescription.trim()) {
      alert("Please describe the form you need.");
      return;
    }

    setIsGenerating(true);

    try {
      console.log("Generating form with AI...", {
        formDescription,
        selectedCategory,
        selectedAudience,
      });

      // Call the new AI form generation endpoint
      const response = await ragService.generateFormFromDescription(
        formDescription,
        selectedCategory,
        selectedAudience
      );

      console.log("AI generated form response:", response);

      // Process the hierarchical form data
      const fields = processFormData(response.extracted_info);

      console.log("Processed fields:", fields);

      setGeneratedFields(fields);

      // Set a mock PDF preview URL for now (in a real implementation, this would be generated)
      setMockPdfPreviewUrl("/Patient_Intake_Form.pdf");

      setCurrentStep("editAI");
    } catch (error) {
      console.error("Error generating form with AI:", error);
      alert("Error generating form. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    console.log("Regenerating form...");
    setIsGenerating(true);

    try {
      // Call the AI generation again with the same parameters
      const response = await ragService.generateFormFromDescription(
        formDescription,
        selectedCategory,
        selectedAudience
      );

      // Process the hierarchical form data
      const fields = processFormData(response.extracted_info);
      setGeneratedFields(fields);

      // Update the mock PDF preview URL
      setMockPdfPreviewUrl("/Medical_History_Form.pdf");
    } catch (error) {
      console.error("Error regenerating form:", error);
      alert("Error regenerating form. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (generatedFields.length === 0) {
      alert("No form fields to save. Please generate a form first.");
      return;
    }

    if (!editableFormName.trim()) {
      alert("Please enter a form name.");
      return;
    }

    setIsSaving(true);
    setSaveStatus("Saving template...");

    try {
      // Use the editable form name
      const templateName = editableFormName.trim();
      
      // Generate a proper template ID from the template name (kebab-case)
      const templateId = templateName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      // Determine if this is a manually created form
      const formDesc = isManuallyCreated ? manualFormDescription : formDescription;
      
      // Create template data
      const templateData = {
        id: templateId,
        name: templateName,
        category: selectedCategory || "Other",
        uses: 0,
        pdfUrl: `/api/pdf/${templateId}`, // Placeholder URL
        description: formDesc || (isManuallyCreated ? "Manually created form" : "AI-generated form"),
        tags: ["ai-generated", selectedCategory?.toLowerCase() || "other"],
        version: 1,
        lastEditedBy: { name: "Current User" },
        lastEditedOn: new Date().toISOString(),
        fields: JSON.stringify(generatedFields, null, 2)
      };

      // Save template using the same API as Templates.tsx
      const response = await fetch('/api/save-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: templateData.id,
          data: templateData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      setSaveStatus("Template saved successfully!");
      
      // Clear localStorage after successful save
      localStorage.removeItem('createForm_fields');
      localStorage.removeItem('createForm_step');
      localStorage.removeItem('createForm_description');
      localStorage.removeItem('createForm_manualDescription');
      localStorage.removeItem('createForm_category');
      localStorage.removeItem('createForm_audience');
      localStorage.removeItem('createForm_name');
      localStorage.removeItem('createForm_isManuallyCreated');
      
      // Navigate to Templates page after a short delay
      setTimeout(() => {
        navigate('/templates');
      }, 1500);

    } catch (error) {
      console.error('Error saving template:', error);
      setSaveStatus("Error saving template");
      
      // Fallback: Create a download with instructions
      try {
        const templateName = editableFormName.trim();
        const templateId = templateName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        
        const formDesc = isManuallyCreated ? manualFormDescription : formDescription;
        
        const templateData = {
          id: templateId,
          name: templateName,
          category: selectedCategory || "Other",
          uses: 0,
          pdfUrl: `/api/pdf/${templateId}`,
          description: formDesc || (isManuallyCreated ? "Manually created form" : "AI-generated form"),
          tags: ["ai-generated", selectedCategory?.toLowerCase() || "other"],
          version: 1,
          lastEditedBy: { name: "Current User" },
          lastEditedOn: new Date().toISOString(),
          fields: JSON.stringify(generatedFields, null, 2)
        };

        const jsonString = JSON.stringify(templateData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${templateId}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert(`Template ${templateId} has been downloaded. Please place it in the temp/form-templates/ directory and refresh the Templates page.`);
        
        // Navigate to Templates page
        setTimeout(() => {
          navigate('/templates');
        }, 1000);
        
      } catch (downloadError) {
        console.error('Error downloading file:', downloadError);
        alert("Error saving template. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Backup state before navigation to save step
  const backupState = () => {
    if (generatedFields.length > 0) {
      setStateBackup([...generatedFields]);
      console.log('State backed up:', generatedFields);
    }
  };

  // Restore state if needed
  const restoreState = () => {
    if (stateBackup.length > 0 && generatedFields.length === 0) {
      setGeneratedFields([...stateBackup]);
      console.log('State restored from backup:', stateBackup);
    }
  };

  // Auto-restore state when navigating to editing steps
  React.useEffect(() => {
    if ((currentStep === "editAI" || currentStep === "editManual") && generatedFields.length === 0 && stateBackup.length > 0) {
      console.log('Auto-restoring state for editing step');
      setGeneratedFields([...stateBackup]);
    }
  }, [currentStep, generatedFields.length, stateBackup]);

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-medical-background to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-medical-primary dark:text-white drop-shadow-sm leading-tight">
              Create New Form with AI
            </h1>
            <p className="text-medical-subtext dark:text-gray-300 text-base mt-1 leading-snug">
              Let our AI draft your form based on your needs.
            </p>
          </div>

          {currentStep === "chooseMethod" && (
            <Card className="shadow-xl dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center text-2xl dark:text-white">
                  <Wand2 className="h-6 w-6 mr-2 text-medical-primary dark:text-blue-400" /> Step
                  1: Choose Method
                </CardTitle>
                <CardDescription className="dark:text-gray-300">
                  Choose between generating a form with AI or creating one manually.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="relative overflow-hidden border-2 border-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 bg-size-200 animate-gradient-x hover:from-blue-600 hover:via-purple-600 hover:to-blue-600 transition-all duration-300 cursor-pointer dark:from-blue-400 dark:via-purple-400 dark:to-blue-400 dark:hover:from-blue-500 dark:hover:via-purple-500 dark:hover:to-blue-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 bg-size-200 animate-gradient-x opacity-20"></div>
                    <CardContent className="p-6 relative z-10 bg-white dark:bg-gray-800 m-1 rounded-lg">
                      <div className="flex items-center mb-4">
                        <Wand2 className="h-8 w-8 text-medical-primary dark:text-blue-400 mr-3" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Generation</h3>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        Describe your form and let our AI create a draft for you to review and edit.
                      </p>
                      <Button
                        onClick={() => {
                          setIsManuallyCreated(false);
                          setCurrentStep("describe");
                        }}
                        className="w-full bg-medical-primary hover:bg-medical-primary/90"
                      >
                        Generate with AI
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-2 border-gray-200 hover:border-medical-primary/40 transition-colors cursor-pointer dark:border-gray-600 dark:hover:border-blue-400/40">
                    <CardContent className="p-6">
                      <div className="flex items-center mb-4">
                        <MousePointer className="h-8 w-8 text-gray-600 dark:text-gray-400 mr-3" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manual Creation</h3>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        Start with a blank form and build it step by step using our form builder.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsManuallyCreated(true);
                          setCurrentStep("editManual");
                        }}
                        className="w-full border-medical-primary text-medical-primary hover:bg-medical-primary hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400 dark:hover:text-white"
                      >
                        Create Manually
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === "describe" && (
            <Card className="shadow-xl dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="flex items-center text-2xl dark:text-white">
                    <Wand2 className="h-6 w-6 mr-2 text-medical-primary dark:text-blue-400" /> Step
                    2: Describe Your Form
                  </CardTitle>
                  <CardDescription className="dark:text-gray-300">
                    Tell our AI what kind of form you need. The more details you
                    provide, the better the draft will be.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("describe")}
                  className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Edit className="h-4 w-4 mr-2" /> Back to Description
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label
                    htmlFor="formDescription"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
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
                    className="shadow-sm focus:ring-medical-primary focus:border-medical-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="formCategory"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                    >
                      Category (Optional)
                    </label>
                    <Select
                      value={selectedCategory}
                      onValueChange={setSelectedCategory}
                    >
                      <SelectTrigger id="formCategory" className="shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                        {formCategories.map((cat) => (
                          <SelectItem key={cat} value={cat} className="dark:text-white dark:hover:bg-gray-600">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label
                      htmlFor="formAudience"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                    >
                      Primary Audience (Optional)
                    </label>
                    <Select
                      value={selectedAudience}
                      onValueChange={setSelectedAudience}
                    >
                      <SelectTrigger id="formAudience" className="shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <SelectValue placeholder="Select primary audience" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                        {formAudiences.map((aud) => (
                          <SelectItem key={aud} value={aud} className="dark:text-white dark:hover:bg-gray-600">
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
                    disabled={!formDescription.trim() || isGenerating}
                    className="bg-medical-primary hover:bg-medical-primary/90 text-base px-8 py-3"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />{" "}
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-5 w-5 mr-2" /> Generate with AI
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === "editAI" && mockPdfPreviewUrl && (
            <div className="space-y-6">
              <Card className="shadow-xl dark:bg-gray-800 dark:border-gray-700">
                <CardHeader className="flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center text-2xl dark:text-white">
                      <Eye className="h-6 w-6 mr-2 text-medical-primary dark:text-blue-400" /> Step
                      3: Review & Edit Draft
                    </CardTitle>
                    <CardDescription className="dark:text-gray-300">
                      Here's a draft of your form. Review the preview and the
                      fields. You can regenerate or make edits.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep("describe")}
                    className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <Edit className="h-4 w-4 mr-2" /> Back to Description
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                        Editable Fields ({getEditableFieldCount()})
                      </h4>
                    </div>
                    <div className="w-full border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden shadow-md bg-white dark:bg-gray-700">
                      {generatedFields && generatedFields.length > 0 ? (
                        <DigitizedForm
                          fields={generatedFields}
                          onDeleteField={(fieldId) => {
                            setGeneratedFields((prev) =>
                              prev.filter((field) => field.id !== fieldId)
                            );
                          }}
                          onAddField={(newField, index) => {
                            setGeneratedFields((prev) => {
                              const newFields = [...prev];
                              newFields.splice(index, 0, newField);
                              return newFields;
                            });
                          }}
                          onEditField={(fieldId, updates) => {
                            setGeneratedFields((prev) =>
                              prev.map((field) =>
                                field.id === fieldId
                                  ? { ...field, ...updates }
                                  : field
                              )
                            );
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-64">
                          <p className="text-gray-500 dark:text-gray-400">
                            No fields generated yet
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-600">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    className="text-base dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />{" "}
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
                      </>
                    )}
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => {
                      // Ensure we have fields before proceeding to save
                      if (generatedFields.length === 0) {
                        alert("No form fields to save. Please generate a form first.");
                        return;
                      }
                      backupState(); // Backup state before navigation
                      setCurrentStep("save");
                    }}
                    className="bg-medical-primary hover:bg-medical-primary/90 text-base px-8 py-3"
                  >
                    Save as Template <Save className="h-4 w-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}

          {/* Step 3: Manual Form Creation */}
          {currentStep === "editManual" && (
            <div className="space-y-6">
              <Card className="shadow-xl dark:bg-gray-800 dark:border-gray-700">
                <CardHeader className="flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center text-2xl dark:text-white">
                      <MousePointer className="h-6 w-6 mr-2 text-medical-primary dark:text-blue-400" /> Step
                      2: Create Form Manually
                    </CardTitle>
                    <CardDescription className="dark:text-gray-300">
                      Build your form from scratch. Add fields, headers, and sections as needed.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep("chooseMethod")}
                    className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <Edit className="h-4 w-4 mr-2" /> Back to Method Selection
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor="manualFormDescription"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                      >
                        Form Description (Optional)
                      </label>
                      <Textarea
                        id="manualFormDescription"
                        value={manualFormDescription}
                        onChange={(e) => setManualFormDescription(e.target.value)}
                        placeholder="Briefly describe what this form is for..."
                        rows={3}
                        className="shadow-sm focus:ring-medical-primary focus:border-medical-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                        Form Fields ({getEditableFieldCount()})
                      </h4>
                    </div>
                    <div className="w-full border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden shadow-md bg-white dark:bg-gray-700">
                      {generatedFields && generatedFields.length > 0 ? (
                        <DigitizedForm
                          fields={generatedFields}
                          onDeleteField={(fieldId) => {
                            setGeneratedFields((prev) =>
                              prev.filter((field) => field.id !== fieldId)
                            );
                          }}
                          onAddField={(newField, index) => {
                            setGeneratedFields((prev) => {
                              const newFields = [...prev];
                              newFields.splice(index, 0, newField);
                              return newFields;
                            });
                          }}
                          onEditField={(fieldId, updates) => {
                            setGeneratedFields((prev) =>
                              prev.map((field) =>
                                field.id === fieldId
                                  ? { ...field, ...updates }
                                  : field
                              )
                            );
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-64 p-8">
                          <PlusCircle className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                          <p className="text-gray-500 dark:text-gray-400 text-center mb-4">
                            Start building your form by adding fields
                          </p>
                          <Button
                            onClick={() => {
                              // Add a default header field to start
                              const defaultHeader: FormField = {
                                id: `header-${Date.now()}`,
                                type: "header",
                                label: "Form Title",
                                required: false,
                                value: "",
                                position: {
                                  x: 0,
                                  y: 0,
                                  width: 600,
                                  height: 48
                                }
                              };
                              setGeneratedFields([defaultHeader]);
                            }}
                            className="bg-medical-primary hover:bg-medical-primary/90"
                          >
                            <PlusCircle className="h-4 w-4 mr-2" /> Add First Field
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-600">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setCurrentStep("chooseMethod")}
                    className="text-base dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <Edit className="h-4 w-4 mr-2" /> Back to Method Selection
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => {
                      // Ensure we have fields before proceeding to save
                      if (generatedFields.length === 0) {
                        alert("No form fields to save. Please generate a form first.");
                        return;
                      }
                      backupState(); // Backup state before navigation
                      setCurrentStep("save");
                    }}
                    className="bg-medical-primary hover:bg-medical-primary/90 text-base px-8 py-3"
                  >
                    Save as Template <Save className="h-4 w-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}

          {/* Step 4: Save as Template */}
          {currentStep === "save" && (
            <Card className="shadow-xl dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="flex items-center text-2xl dark:text-white">
                    <Save className="h-6 w-6 mr-2 text-medical-primary dark:text-blue-400" /> Step
                    4: Save as Template
                  </CardTitle>
                  <CardDescription className="dark:text-gray-300">
                    Save your {isManuallyCreated ? "manually created" : "AI-generated"} form as a new template for future use.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Go back to the appropriate editing step
                    console.log('Back to editing clicked. Current fields:', generatedFields);
                    console.log('Is manually created:', isManuallyCreated);
                    
                    // Restore state if needed
                    restoreState();
                    
                    // Ensure we have fields before navigating back
                    if (generatedFields.length === 0 && stateBackup.length === 0) {
                      console.error('No fields found when trying to go back to editing');
                      alert('No form fields found. Please start over.');
                      setCurrentStep("chooseMethod");
                      return;
                    }
                    
                    if (isManuallyCreated) {
                      console.log('Navigating to editManual');
                      setCurrentStep("editManual");
                    } else {
                      console.log('Navigating to editAI');
                      setCurrentStep("editAI");
                    }
                  }}
                  className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Edit className="h-4 w-4 mr-2" /> Back to Editing
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Template Details
                  </h4>
                  <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-600 rounded-md bg-slate-50/50 dark:bg-gray-700/50">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Form Name
                      </label>
                      <Input
                        type="text"
                        value={editableFormName}
                        onChange={(e) => setEditableFormName(e.target.value)}
                        className="w-full text-sm"
                        placeholder="Enter form name..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Category
                      </label>
                      <Select
                        value={selectedCategory}
                        onValueChange={setSelectedCategory}
                      >
                        <SelectTrigger className="w-full text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                          {formCategories.map((cat) => (
                            <SelectItem key={cat} value={cat} className="dark:text-white dark:hover:bg-gray-600">
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Primary Audience
                      </label>
                      <Select
                        value={selectedAudience}
                        onValueChange={setSelectedAudience}
                      >
                        <SelectTrigger className="w-full text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <SelectValue placeholder="Select primary audience" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                          {formAudiences.map((aud) => (
                            <SelectItem key={aud} value={aud} className="dark:text-white dark:hover:bg-gray-600">
                              {aud}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Description
                      </label>
                      <Textarea
                        value={isManuallyCreated ? manualFormDescription : formDescription}
                        onChange={(e) => {
                          if (isManuallyCreated) {
                            setManualFormDescription(e.target.value);
                          } else {
                            setFormDescription(e.target.value);
                          }
                        }}
                        placeholder="Describe what this form is for..."
                        rows={3}
                        className="w-full text-sm shadow-sm focus:ring-medical-primary focus:border-medical-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                      />
                    </div>
                    {saveStatus && (
                      <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        saveStatus.includes("Error") 
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" 
                          : saveStatus.includes("successfully")
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      }`}>
                        {saveStatus}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-600">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    // Go back to the appropriate editing step
                    console.log('Back to editing clicked. Current fields:', generatedFields);
                    console.log('Is manually created:', isManuallyCreated);
                    
                    // Restore state if needed
                    restoreState();
                    
                    // Ensure we have fields before navigating back
                    if (generatedFields.length === 0 && stateBackup.length === 0) {
                      console.error('No fields found when trying to go back to editing');
                      alert('No form fields found. Please start over.');
                      setCurrentStep("chooseMethod");
                      return;
                    }
                    
                    if (isManuallyCreated) {
                      console.log('Navigating to editManual');
                      setCurrentStep("editManual");
                    } else {
                      console.log('Navigating to editAI');
                      setCurrentStep("editAI");
                    }
                  }}
                  className="text-base dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Edit className="h-4 w-4 mr-2" /> Back to Editing
                </Button>
                <Button
                  size="lg"
                  onClick={handleSaveAsTemplate}
                  disabled={isSaving || generatedFields.length === 0}
                  className="bg-medical-primary hover:bg-medical-primary/90 text-base px-8 py-3"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" /> Save as Template
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
