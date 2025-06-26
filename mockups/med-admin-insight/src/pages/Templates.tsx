import {
  FileText,
  ArrowLeft,
  Edit,
  Tag,
  UploadCloud,
  PlusCircle,
  Search as SearchIcon,
  ChevronsUpDown,
  Plus,
  FileUp,
  Shield,
  UserCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/dashboard/Sidebar";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ragService } from "../../../frontend2/src/services/ragService";
import { FormField } from "../types/form";
import { DigitizedForm } from "../components/DigitizedForm";
import { processFormData } from "../utils/formProcessing";

interface LastEditedBy {
  name: string;
  avatarUrl?: string;
}

interface TemplateData {
  name: string;
  category: "Administrative" | "Clinical" | "Legal" | "Other";
  uses: number;
  pdfUrl: string;
  id: string;
  description?: string;
  tags?: string[];
  signatureFields?: string[];
  version: number;
  lastEditedBy?: LastEditedBy;
  lastEditedOn?: Date;
  complianceStatus: "ok" | "warning" | "error";
  missingConsentFields?: string[];
  fields?: any;
}

interface TableField {
  id: string;
  type: "text" | "checkbox" | "radio" | "select" | "date" | "signature";
  label: string;
  value: string | boolean;
}

const categoryColors: Record<TemplateData["category"], string> = {
  Administrative: "bg-blue-100 text-blue-700 border-blue-200",
  Clinical: "bg-green-100 text-green-700 border-green-200",
  Legal: "bg-purple-100 text-purple-700 border-purple-200",
  Other: "bg-gray-100 text-gray-700 border-gray-200",
};

// Helper function to calculate relative time (simplified)
const timeAgo = (date?: Date): string => {
  if (!date) return "";
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) return interval + "y ago";
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return interval + "mo ago";
  interval = Math.floor(seconds / 86400);
  if (interval > 1) return interval + "d ago";
  interval = Math.floor(seconds / 3600);
  if (interval > 1) return interval + "h ago";
  interval = Math.floor(seconds / 60);
  if (interval > 1) return interval + "m ago";
  return Math.floor(seconds) + "s ago";
};

// Helper function to load templates from JSON files
const loadTemplatesFromJson = async (): Promise<TemplateData[]> => {
  try {
    // Use Vite's import.meta.glob to dynamically import all JSON files
    const templateModules = import.meta.glob('../../temp/form-templates/*.json', { eager: true });
    
    console.log('Template modules found:', Object.keys(templateModules));
    
    const templates: TemplateData[] = [];
    
    for (const path in templateModules) {
      const template = (templateModules[path] as any).default || templateModules[path];
      console.log('Processing template:', path, template);
    
      // Parse the lastEditedOn date string to Date object
      const lastEditedOn = template.lastEditedOn ? new Date(template.lastEditedOn) : undefined;
      
      // Handle different lastEditedBy formats (object vs array)
      let lastEditedBy: LastEditedBy | undefined;
      if (template.lastEditedBy) {
        if (Array.isArray(template.lastEditedBy)) {
          lastEditedBy = template.lastEditedBy[0];
        } else {
          lastEditedBy = template.lastEditedBy;
        }
      }
      
      templates.push({
        ...template,
        lastEditedOn,
        lastEditedBy,
        signatureFields: [], // Add default empty array
        complianceStatus: "ok" as const, // Add default compliance status
        missingConsentFields: [], // Add default empty array
      } as TemplateData);
    }
    
    console.log('Loaded templates:', templates);
    return templates;
  } catch (error) {
    console.error("Error loading templates:", error);
    return [];
  }
};

export default function Templates() {
  const navigate = useNavigate();
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [extractedFields, setExtractedFields] = useState<FormField[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [isInPreviewMode, setIsInPreviewMode] = useState(false);
  const [isEditingFormName, setIsEditingFormName] = useState(false);
  const [editingFormName, setEditingFormName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to save uploaded template to form-templates folder
  const saveUploadedTemplateToFile = async (template: TemplateData, fields: FormField[]) => {
    try {
      // Generate a proper template ID from the template name (kebab-case)
      const templateId = template.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      // Create a clean template object for saving (remove temporary properties)
      const templateToSave = {
        id: templateId,
        name: template.name,
        category: template.category,
        uses: template.uses,
        pdfUrl: `/api/pdf/${templateId}`, // Use the server PDF URL
        description: template.description,
        tags: template.tags,
        version: template.version,
        lastEditedBy: template.lastEditedBy,
        lastEditedOn: template.lastEditedOn,
        fields: JSON.stringify(fields, null, 2) // Save fields as stringified JSON
      };

      // Save to form-templates directory
      const response = await fetch('/api/save-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: templateToSave.id,
          data: templateToSave
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      console.log(`Template saved: ${templateToSave.id}`);
      
      // Return the final template ID so we can update the state
      return templateId;
    } catch (error) {
      console.error('Error saving uploaded template:', error);
      return null;
    }
  };

  // Helper function to save template data back to JSON file
  const saveTemplateToFile = async (templateId: string, updatedData: any) => {
    try {
      // Try to use the development server API to update the file in place
      const response = await fetch('/api/update-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId,
          data: updatedData
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log(`Template ${templateId} updated in place via development server`);
          return true;
        } else {
          console.error('Server returned error:', result.error);
        }
      } else {
        console.warn('Development server API not available, falling back to download');
      }
      
      // Fallback: Create a download with instructions
      const jsonString = JSON.stringify(updatedData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${templateId}.json`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      // Show user instructions
      alert(`Template ${templateId} has been downloaded. Please replace the original file at temp/form-templates/${templateId}.json with this downloaded file.`);
      
      console.log(`Template ${templateId} downloaded (fallback mode)`);
      return true;
    } catch (error) {
      console.error('Error saving template:', error);
      
      // Final fallback: just download the file
      try {
        const jsonString = JSON.stringify(updatedData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${templateId}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert(`Template ${templateId} has been downloaded. Please replace the original file at temp/form-templates/${templateId}.json with this downloaded file.`);
        return true;
      } catch (downloadError) {
        console.error('Error downloading file:', downloadError);
        return false;
      }
    }
  };

  // Helper function to reload templates from JSON files
  const reloadTemplates = async () => {
    try {
      const loadedTemplates = await loadTemplatesFromJson();
      setTemplates(loadedTemplates);
      console.log('Templates reloaded successfully');
    } catch (error) {
      console.error('Error reloading templates:', error);
    }
  };

  // Helper function to update template data with new fields
  const updateTemplateFields = async (templateId: string, fields: FormField[]) => {
    try {
      setIsSaving(true);
      setSaveStatus("Saving changes...");
      
      // Get the current template
      const currentTemplate = templates.find(t => t.id === templateId);
      if (!currentTemplate) {
        console.error('Template not found:', templateId);
        setSaveStatus("Error: Template not found");
        return false;
      }
      
      // Create updated template data with the FormField array as stringified JSON
      const updatedTemplateData = {
        ...currentTemplate,
        fields: JSON.stringify(fields, null, 2), // Save FormField array as stringified JSON
        lastEditedOn: new Date().toISOString(),
        lastEditedBy: { name: "Current User" }
      };
      
      // Remove properties that shouldn't be in the JSON file
      delete updatedTemplateData.complianceStatus;
      delete updatedTemplateData.missingConsentFields;
      delete updatedTemplateData.signatureFields;
      
      // Save to file
      const success = await saveTemplateToFile(templateId, updatedTemplateData);
      
      if (success) {
        // Update the local state
        setTemplates(prev => prev.map(t => 
          t.id === templateId 
            ? { ...t, fields: JSON.stringify(fields, null, 2), lastEditedOn: new Date() }
            : t
        ));
        
        // Don't reload templates automatically as it can cause the preview to disappear
        // The local state update above is sufficient
        
        setSaveStatus("Changes saved successfully!");
        setTimeout(() => setSaveStatus(""), 3000);
      } else {
        setSaveStatus("Error saving changes");
      }
      
      return success;
    } catch (error) {
      console.error('Error updating template fields:', error);
      setSaveStatus("Error saving changes");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Function to update template name and save to file
  const updateTemplateName = async (templateId: string, newName: string, fields: FormField[]) => {
    try {
      setIsSaving(true);
      setSaveStatus("Saving name changes...");
      
      // Get the current template
      const currentTemplate = templates.find(t => t.id === templateId);
      if (!currentTemplate) {
        console.error('Template not found:', templateId);
        setSaveStatus("Error: Template not found");
        return false;
      }
      
      // Create updated template data with the new name and fields
      const updatedTemplateData = {
        ...currentTemplate,
        name: newName.trim(),
        fields: JSON.stringify(fields, null, 2), // Save FormField array as stringified JSON
        lastEditedOn: new Date().toISOString(),
        lastEditedBy: { name: "Current User" }
      };
      
      // Remove properties that shouldn't be in the JSON file
      delete updatedTemplateData.complianceStatus;
      delete updatedTemplateData.missingConsentFields;
      delete updatedTemplateData.signatureFields;
      
      // Save to file
      const success = await saveTemplateToFile(templateId, updatedTemplateData);
      
      if (success) {
        // Update the local state
        setTemplates(prev => prev.map(t => 
          t.id === templateId 
            ? { ...t, name: newName.trim(), fields: JSON.stringify(fields, null, 2), lastEditedOn: new Date() }
            : t
        ));
        
        setSaveStatus("Name updated successfully!");
        setTimeout(() => setSaveStatus(""), 3000);
      } else {
        setSaveStatus("Error saving name changes");
      }
      
      return success;
    } catch (error) {
      console.error('Error updating template name:', error);
      setSaveStatus("Error saving name changes");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Manual save function
  const handleManualSave = async () => {
    if (selectedTemplateId && extractedFields.length > 0) {
      // Check if this is an uploaded template (starts with "uploaded-")
      if (selectedTemplateId.startsWith("uploaded-")) {
        // For uploaded templates, just update the local state
        setTemplates(prev => prev.map(t => 
          t.id === selectedTemplateId 
            ? { ...t, fields: JSON.stringify(extractedFields, null, 2), lastEditedOn: new Date() }
            : t
        ));
        setSaveStatus("Changes saved to local template!");
        setTimeout(() => setSaveStatus(""), 3000);
      } else {
        // For regular templates, save to file
        await updateTemplateFields(selectedTemplateId, extractedFields);
      }
    }
  };

  // Function to handle form name updates
  const handleFormNameUpdate = async (newName: string) => {
    if (!selectedTemplateId || !newName.trim()) return;

    try {
      // Update the form header field if it exists
      const updatedFields = extractedFields.map(field => {
        if (field.id === "form-header") {
          return { ...field, label: newName.trim() };
        }
        return field;
      });

      setExtractedFields(updatedFields);

      // Save the changes
      if (selectedTemplateId.startsWith("uploaded-")) {
        // For uploaded templates, just update local state
        setTemplates(prev => prev.map(t => 
          t.id === selectedTemplateId 
            ? { ...t, name: newName.trim(), fields: JSON.stringify(updatedFields, null, 2), lastEditedOn: new Date() }
            : t
        ));
        setSaveStatus("Form name updated!");
        setTimeout(() => setSaveStatus(""), 3000);
      } else {
        // For regular templates, save to file with the new name
        await updateTemplateName(selectedTemplateId, newName, updatedFields);
      }

      setIsEditingFormName(false);
    } catch (error) {
      console.error('Error updating form name:', error);
      setSaveStatus("Error updating form name");
    }
  };

  // Load templates from JSON files on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        const loadedTemplates = await loadTemplatesFromJson();
        setTemplates(loadedTemplates);
      } catch (error) {
        console.error("Error loading templates:", error);
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, []);

  const handleUseTemplate = async (template: TemplateData) => {
    setSelectedPdfUrl(template.pdfUrl);
    setSelectedTemplateId(template.id);
    setIsInPreviewMode(true);
    setEditingFormName(template.name); // Set initial form name for editing
    
    // Don't reload templates here as it can cause the preview to disappear
    // The template data in state should be sufficient
    
    // If the template has fields data, process it
    if (template.fields) {
      try {
        let fields: FormField[];
        
        // Check if fields is a string (new format) or object (old format)
        if (typeof template.fields === 'string') {
          // New format: fields is a stringified FormField array
          fields = JSON.parse(template.fields);
        } else {
          // Old format: fields is a hierarchical object, need to process it
          fields = processFormData(template.fields);
        }
        
        // Only add default header if the form is truly empty (no fields at all)
        if (fields.length === 0) {
          const defaultHeader: FormField = {
            id: "form-header",
            type: "text",
            label: template.name,
            required: false,
            value: "",
            position: {
              x: 0,
              y: 0,
              width: 600,
              height: 48
            }
          };
          fields = [defaultHeader];
          
          // Save the default header to the template
          setTimeout(() => {
            if (template.id) {
              if (template.id.startsWith("uploaded-")) {
                // For uploaded templates, just update local state
                setTemplates(prev => prev.map(t => 
                  t.id === template.id 
                    ? { ...t, fields: JSON.stringify([defaultHeader], null, 2), lastEditedOn: new Date() }
                    : t
                ));
              } else {
                // For regular templates, save to file
                updateTemplateFields(template.id, [defaultHeader]);
              }
            }
          }, 100);
        }
        
        // Set the fields (either original or with default header)
        setExtractedFields(fields);
      } catch (error) {
        console.error("Error processing template fields:", error);
        
        // If there was an error, add a default header
        const defaultHeader: FormField = {
          id: "form-header",
          type: "text",
          label: template.name,
          required: false,
          value: "",
          position: {
            x: 0,
            y: 0,
            width: 600,
            height: 48
          }
        };
        setExtractedFields([defaultHeader]);
      }
    } else {
      // No fields data, add a default header with the template name
      const defaultHeader: FormField = {
        id: "form-header",
        type: "text",
        label: template.name,
        required: false,
        value: "",
        position: {
          x: 0,
          y: 0,
          width: 600,
          height: 48
        }
      };
      setExtractedFields([defaultHeader]);
      
      // Save the default header to the template
      setTimeout(() => {
        if (template.id) {
          if (template.id.startsWith("uploaded-")) {
            // For uploaded templates, just update local state
            setTemplates(prev => prev.map(t => 
              t.id === template.id 
                ? { ...t, fields: JSON.stringify([defaultHeader], null, 2), lastEditedOn: new Date() }
                : t
            ));
          } else {
            // For regular templates, save to file
            updateTemplateFields(template.id, [defaultHeader]);
          }
        }
      }, 100);
    }
  };

  const handleBackToTemplates = () => {
    setSelectedPdfUrl(null);
    setSelectedTemplateId(null);
    setIsInPreviewMode(false);
    setIsEditingFormName(false);
    setEditingFormName("");
  };

  const handleProceed = () => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      console.log('Selected template:', template); // Debug log
      
      if (!template) {
        console.error('Template not found for ID:', selectedTemplateId);
        alert('Template not found. Please try again.');
        return;
      }
      
      const templateName = template.name || "Untitled Form";
      console.log('Template name:', templateName); // Debug log
      
      // Encode the template name for URL safety, handling special characters
      const encodedTemplateName = encodeURIComponent(templateName);
      console.log('Encoded template name:', encodedTemplateName); // Debug log
      
      const url = `/assign-template/${selectedTemplateId}/${encodedTemplateName}`;
      console.log('Navigation URL:', url); // Debug log
      
      navigate(url);
    } else {
      console.error('No selected template ID');
      alert('No template selected. Please select a template first.');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      // Create object URL immediately for preview
      const objectUrl = URL.createObjectURL(file);
      const fileNameWithoutExtension = file.name.replace(/\.pdf$/i, "");
      
      // Generate a proper template ID (kebab-case)
      const templateId = fileNameWithoutExtension
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      // Create and add new template immediately
      const newTemplate: TemplateData = {
        id: `uploaded-${Date.now()}`, // Keep uploaded- prefix for temporary state
        name: fileNameWithoutExtension,
        category: "Other",
        uses: 0,
        pdfUrl: objectUrl, // Use object URL for immediate preview
        description: `Uploaded PDF form: ${fileNameWithoutExtension}`,
        tags: ["uploaded", "pdf"],
        signatureFields: [],
        version: 1,
        lastEditedBy: { name: "Current User" },
        lastEditedOn: new Date(),
        complianceStatus: "warning",
        missingConsentFields: ["Review Needed"],
      };
      
      // Show the popup immediately
      setTemplates((prevTemplates) => [newTemplate, ...prevTemplates]);
      setSelectedPdfUrl(objectUrl);
      setSelectedTemplateId(newTemplate.id);
      setIsInPreviewMode(true);
      setEditingFormName(fileNameWithoutExtension); // Set initial form name for uploaded templates
      setIsProcessing(true);

      try {
        // Process document using ragService
        const response = await ragService.processNewFormTemplate(file);
        console.log(response);
        
        // Process the hierarchical form data
        const fields = processFormData(response.extracted_info);
        setExtractedFields(fields);
        
        // Save the uploaded template to form-templates folder
        const finalTemplateId = await saveUploadedTemplateToFile(newTemplate, fields);
        
        if (finalTemplateId) {
          // Save the PDF file to server
          const pdfArrayBuffer = await file.arrayBuffer();
          const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfArrayBuffer)));
          
          const pdfResponse = await fetch('/api/save-pdf', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              templateId: finalTemplateId,
              pdfData: pdfBase64,
              fileName: file.name
            })
          });

          if (pdfResponse.ok) {
            const pdfData = await pdfResponse.json();
            
            // Update the selected template ID and PDF URL FIRST
            setSelectedTemplateId(finalTemplateId);
            setSelectedPdfUrl(pdfData.pdfUrl);
            
            // Then update the template in state with the final ID and proper PDF URL
            setTemplates(prev => prev.map(t => 
              t.id === newTemplate.id 
                ? { 
                    ...t, 
                    id: finalTemplateId, 
                    fields: JSON.stringify(fields, null, 2),
                    pdfUrl: pdfData.pdfUrl // Use the server URL
                  }
                : t
            ));
            
            console.log(`Template ID updated: ${newTemplate.id} -> ${finalTemplateId}`);
            console.log(`PDF URL updated: ${objectUrl} -> ${pdfData.pdfUrl}`);
            
            setSaveStatus("Template saved successfully!");
            setTimeout(() => setSaveStatus(""), 3000);
          } else {
            console.error('Failed to save PDF file');
            setSaveStatus("Template saved but PDF file failed to save");
          }
        } else {
          setSaveStatus("Error saving template");
        }
      } catch (error) {
        console.error("Error processing PDF:", error);
        alert("Error processing PDF. Please try again.");
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const filteredTemplates = useMemo(() => {
    if (!searchTerm.trim()) return templates;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(lowerSearchTerm) ||
        t.category.toLowerCase().includes(lowerSearchTerm) ||
        (t.description &&
          t.description.toLowerCase().includes(lowerSearchTerm)) ||
        (t.tags &&
          t.tags.some((tag) => tag.toLowerCase().includes(lowerSearchTerm))) ||
        (t.signatureFields &&
          t.signatureFields.some((field) =>
            field.toLowerCase().includes(lowerSearchTerm)
          ))
    );
  }, [templates, searchTerm]);

  // State for Modals
  const [isVersionHistoryModalOpen, setIsVersionHistoryModalOpen] =
    useState(false);
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);
  const [selectedTemplateForModal, setSelectedTemplateForModal] =
    useState<TemplateData | null>(null);

  const openVersionHistoryModal = (template: TemplateData) => {
    setSelectedTemplateForModal(template);
    setIsVersionHistoryModalOpen(true);
  };

  const openComplianceModal = (template: TemplateData) => {
    setSelectedTemplateForModal(template);
    setIsComplianceModalOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-medical-background to-blue-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">
          {isInPreviewMode && selectedPdfUrl ? (
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <Button
                variant="outline"
                onClick={handleBackToTemplates}
                className="mb-6 flex items-center gap-2 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Templates
              </Button>
              
              {/* Form Name Editor */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-medical-primary" />
                    <span className="text-sm font-medium text-gray-600">Form Name:</span>
                  </div>
                  {isEditingFormName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={editingFormName}
                        onChange={(e) => setEditingFormName(e.target.value)}
                        className="w-64 text-sm"
                        placeholder="Enter form name..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleFormNameUpdate(editingFormName);
                          } else if (e.key === 'Escape') {
                            setIsEditingFormName(false);
                            setEditingFormName(templates.find(t => t.id === selectedTemplateId)?.name || "");
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleFormNameUpdate(editingFormName)}
                        className="bg-medical-primary hover:bg-medical-primary/90 text-white"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsEditingFormName(false);
                          setEditingFormName(templates.find(t => t.id === selectedTemplateId)?.name || "");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-medical-text">
                        {templates.find(t => t.id === selectedTemplateId)?.name || "Untitled Form"}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingFormName(true)}
                        className="text-medical-primary hover:text-medical-primary hover:bg-medical-primary/10"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Original PDF View */}
                <div className="aspect-[8.5/11] w-full border rounded-lg overflow-hidden shadow-md">
                  <iframe
                    src={selectedPdfUrl}
                    title="Original Template"
                    width="100%"
                    height="100%"
                    className="border-0"
                  />
                </div>
                {/* Digitized Form View */}
                <div className="aspect-[8.5/11] w-full border rounded-lg overflow-hidden shadow-md bg-white">
                  {isProcessing ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-primary mx-auto mb-4"></div>
                        <p className="text-medical-text">Processing PDF...</p>
                      </div>
                    </div>
                  ) : (
                    <DigitizedForm 
                      fields={extractedFields} 
                      onDeleteField={async (fieldId) => {
                        const newFields = extractedFields.filter(field => field.id !== fieldId);
                        setExtractedFields(newFields);
                        
                        // Save changes to template if we have a selected template
                        if (selectedTemplateId) {
                          if (selectedTemplateId.startsWith("uploaded-")) {
                            // For uploaded templates, just update local state
                            setTemplates(prev => prev.map(t => 
                              t.id === selectedTemplateId 
                                ? { ...t, fields: JSON.stringify(newFields, null, 2), lastEditedOn: new Date() }
                                : t
                            ));
                          } else {
                            // For regular templates, save to file
                            await updateTemplateFields(selectedTemplateId, newFields);
                          }
                        }
                      }}
                      onAddField={async (newField, index) => {
                        const newFields = [...extractedFields];
                          newFields.splice(index, 0, newField);
                        setExtractedFields(newFields);
                        
                        // Save changes to template if we have a selected template
                        if (selectedTemplateId) {
                          if (selectedTemplateId.startsWith("uploaded-")) {
                            // For uploaded templates, just update local state
                            setTemplates(prev => prev.map(t => 
                              t.id === selectedTemplateId 
                                ? { ...t, fields: JSON.stringify(newFields, null, 2), lastEditedOn: new Date() }
                                : t
                            ));
                          } else {
                            // For regular templates, save to file
                            await updateTemplateFields(selectedTemplateId, newFields);
                          }
                        }
                      }}
                      onEditField={async (fieldId, updates) => {
                        const newFields = extractedFields.map(field => 
                            field.id === fieldId 
                              ? { ...field, ...updates }
                              : field
                        );
                        setExtractedFields(newFields);
                        
                        // Save changes to template if we have a selected template
                        if (selectedTemplateId) {
                          if (selectedTemplateId.startsWith("uploaded-")) {
                            // For uploaded templates, just update local state
                            setTemplates(prev => prev.map(t => 
                              t.id === selectedTemplateId 
                                ? { ...t, fields: JSON.stringify(newFields, null, 2), lastEditedOn: new Date() }
                                : t
                            ));
                          } else {
                            // For regular templates, save to file
                            await updateTemplateFields(selectedTemplateId, newFields);
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="text-center mt-6">
                <div className="flex items-center justify-center gap-4 mb-4">
                  {saveStatus && (
                    <div className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium",
                      saveStatus.includes("Error") 
                        ? "bg-red-100 text-red-700" 
                        : saveStatus.includes("saved successfully")
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    )}>
                      {saveStatus}
                    </div>
                  )}
                  {selectedTemplateId && extractedFields.length > 0 && (
                    <Button
                      onClick={handleManualSave}
                      disabled={isSaving}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" />
                          Save Template
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <Button
                  onClick={handleProceed}
                  className="bg-medical-primary hover:bg-medical-primary/90 px-8 py-3 text-base"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Proceed to Assign Patient"}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-medical-primary drop-shadow-sm leading-tight">
                    Form Templates
                  </h1>
                  <p className="text-medical-subtext text-base mt-1 leading-snug">
                    Manage and use your form templates
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative w-full sm:w-auto sm:min-w-[300px] md:max-w-xs">
                    <SearchIcon className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      type="search"
                      placeholder="Search name, category, tags..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-10 py-2 h-10 text-sm border-gray-300 rounded-lg focus:border-medical-primary focus:ring-1 focus:ring-medical-primary w-full shadow-sm hover:shadow-md transition-shadow"
                    />
                    <ChevronsUpDown className="absolute right-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 opacity-60 pointer-events-none" />
                  </div>
                  <Button
                    variant="outline"
                    className="h-10 text-sm flex items-center gap-2 border-medical-primary text-medical-primary hover:bg-medical-primary/10 shadow-sm hover:shadow-md transition-shadow"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileUp className="h-4 w-4" /> Upload Template
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf"
                    className="hidden"
                  />
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg">
                {isLoadingTemplates ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-primary mx-auto mb-4"></div>
                      <p className="text-medical-text">Loading templates...</p>
                    </div>
                  </div>
                ) : filteredTemplates.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="group bg-white rounded-xl shadow-lg hover:shadow-xl border border-gray-200/80 flex flex-col justify-between transition-all duration-300 ease-out min-h-[280px] relative overflow-hidden"
                      >
                        <div className="p-4 flex flex-col flex-grow">
                          <div className="flex items-start justify-between mb-2">
                            <div
                              className="p-2.5 rounded-lg bg-medical-primary/10 inline-block cursor-pointer hover:bg-medical-primary/20 transition-colors"
                              onClick={() => openVersionHistoryModal(template)}
                            >
                              <FileText className="h-5 w-5 text-medical-primary" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="cursor-pointer hover:bg-gray-200 text-xs"
                                onClick={() =>
                                  openVersionHistoryModal(template)
                                }
                              >
                                v{template.version}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs font-medium h-fit whitespace-nowrap",
                                  categoryColors[template.category]
                                )}
                              >
                                {template.category}
                              </Badge>
                            </div>
                          </div>
                          <h3 className="font-semibold text-medical-text text-base mb-1 leading-tight line-clamp-2">
                            {template.name}
                          </h3>
                          {template.description && (
                            <p className="text-xs text-gray-500 mb-3 leading-snug flex-grow line-clamp-3">
                              {template.description}
                            </p>
                          )}
                          <div className="mt-auto pt-2 flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-1.5">
                              {template.lastEditedBy ? (
                                <Avatar className="h-5 w-5">
                                  <AvatarImage
                                    src={template.lastEditedBy.avatarUrl}
                                    alt={template.lastEditedBy.name}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {template.lastEditedBy.name.substring(0, 1)}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <UserCircle className="h-5 w-5 text-gray-400" />
                              )}
                              <span>
                                {template.lastEditedOn
                                  ? timeAgo(template.lastEditedOn)
                                  : "Unknown edit time"}
                              </span>
                            </div>
                            <div
                              className="cursor-pointer"
                              onClick={() => openComplianceModal(template)}
                            >
                              <Shield
                                className={cn(
                                  "h-5 w-5",
                                  template.complianceStatus === "ok"
                                    ? "text-green-500"
                                    : template.complianceStatus === "warning"
                                    ? "text-yellow-500"
                                    : "text-red-500"
                                )}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="px-4 pb-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {template.uses} uses
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-medical-primary hover:text-medical-primary hover:bg-medical-primary/10 p-1.5 h-auto"
                            onClick={() => handleUseTemplate(template)}
                          >
                            <PlusCircle className="h-4 w-4 mr-1" /> Use
                          </Button>
                        </div>

                        <div
                          className="absolute bottom-0 left-0 right-0 bg-gray-50/90 backdrop-blur-sm p-2 border-t border-gray-200 
                                        opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out 
                                        translate-y-full group-hover:translate-y-0 flex justify-around items-center"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-600 hover:text-medical-primary h-7 w-7"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-600 hover:text-medical-primary h-7 w-7"
                          >
                            <Tag className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-600 hover:text-medical-primary h-7 w-7"
                          >
                            <UploadCloud className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="icon"
                            className="bg-medical-primary hover:bg-medical-primary/90 text-white h-7 w-7"
                            onClick={() => handleUseTemplate(template)}
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-16">
                    {templates.length === 0 
                      ? "No templates found. Upload a template to get started."
                      : "No templates found matching your search."
                    }
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {!selectedPdfUrl && (
          <Link to="/create-form" aria-label="Create New Template">
            <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-medical-primary hover:bg-medical-primary/90 text-white flex items-center justify-center p-0">
              <Plus className="h-7 w-7" />
            </Button>
          </Link>
        )}
      </div>

      {/* Modal Placeholders - will be implemented next */}
      {isVersionHistoryModalOpen && selectedTemplateForModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsVersionHistoryModalOpen(false)}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">
              Version History for: {selectedTemplateForModal.name} (v
              {selectedTemplateForModal.version})
            </h2>
            <p>
              Placeholder for version history, diff viewer, and rollback
              options.
            </p>
            <Button
              onClick={() => setIsVersionHistoryModalOpen(false)}
              className="mt-4"
            >
              Close
            </Button>
          </div>
        </div>
      )}
      {isComplianceModalOpen && selectedTemplateForModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsComplianceModalOpen(false)}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">
              Compliance Checklist for: {selectedTemplateForModal.name}
            </h2>
            <p className="mb-2">
              Status:{" "}
              <span
                className={cn(
                  selectedTemplateForModal.complianceStatus === "ok"
                    ? "text-green-600"
                    : selectedTemplateForModal.complianceStatus === "warning"
                    ? "text-yellow-600"
                    : "text-red-600",
                  "font-semibold"
                )}
              >
                {selectedTemplateForModal.complianceStatus.toUpperCase()}
              </span>
            </p>
            {selectedTemplateForModal.missingConsentFields &&
              selectedTemplateForModal.missingConsentFields.length > 0 && (
                <div className="mb-3">
                  <p className="font-medium text-sm">
                    Missing/Attention needed:
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {selectedTemplateForModal.missingConsentFields.map(
                      (field) => (
                        <li key={field}>{field}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
            <p>Placeholder for detailed compliance checklist items.</p>
            <Button
              onClick={() => setIsComplianceModalOpen(false)}
              className="mt-4"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
