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

// Helper function to determine field type from key
const getFieldType = (key: string): FormField["type"] => {
  if (key.startsWith("text")) return "text";
  if (key.startsWith("boolean")) return "checkbox";
  if (key.startsWith("date")) return "date";
  return "text"; // default to text
};

// Helper function to process nested form data
const processFormData = (
  data: any,
  parentId: string = "",
  level: number = 0
): FormField[] => {
  const fields: FormField[] = [];
  let yOffset = 0;

  for (const [key, value] of Object.entries(data)) {
    const currentId = parentId ? `${parentId}-${key}` : key;
    
    // If the value is an object and not a field type (text, boolean, date, table)
    if (typeof value === "object" && value !== null && !key.match(/^(text|boolean|date|table)\d+$/)) {
      // Add header as a text field with special styling
      fields.push({
        id: currentId,
        type: "text",
        label: key,
        required: false,
        value: "",
        position: {
          x: 0,
          y: yOffset,
          width: 600,
          height: level === 0 ? 48 : 36
        }
      });
      yOffset += level === 0 ? 60 : 48;

      // Process children
      const childFields = processFormData(value, currentId, level + 1);
      fields.push(...childFields);
      yOffset += childFields.length * 48; // Approximate height for child fields
    } else if (key.match(/^(text|boolean|date|table)\d+$/)) {
      const fieldType = getFieldType(key);
      
      if (key.startsWith("table")) {
        // Process table fields
        const tableFields: TableField[] = [];
        for (const [colKey, colValue] of Object.entries(value)) {
          const colType = getFieldType(colKey);
          tableFields.push({
            id: `${currentId}-${colKey}`,
            type: colType,
            label: Object.keys(colValue)[0],
            value: colType === "checkbox" ? false : ""
          });
        }

        // Add table as a text field with table data
        fields.push({
          id: currentId,
          type: "text",
          label: "", // Empty label for table type
          required: false,
          value: JSON.stringify(tableFields), // Store table data as JSON string
          position: {
            x: 0,
            y: yOffset,
            width: 600,
            height: 200 // Height for table with one row
          }
        });
        yOffset += 220; // Table height + margin
      } else {
        // Process regular fields
        const fieldLabel = Object.keys(value)[0];
        fields.push({
          id: currentId,
          type: fieldType,
          label: fieldLabel,
          required: false,
          value: fieldType === "checkbox" ? false : "",
          position: {
            x: 0,
            y: yOffset,
            width: 300,
            height: 40
          }
        });
        yOffset += 48; // Field height + margin
      }
    }
  }

  return fields;
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
  const [templates, setTemplates] = useState<TemplateData[]>([
    {
      id: "medical-history-form",
      name: "Medical History Form",
      category: "Clinical",
      uses: 142,
      pdfUrl: "/Medical_History_Form.pdf",
      description:
        "Comprehensive medical history questionnaire for clinical assessment.",
      tags: ["history", "clinical assessment", "medical record"],
      signatureFields: ["patient"],
      version: 2,
      lastEditedBy: { name: "Bob Williams" },
      lastEditedOn: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      complianceStatus: "warning",
      missingConsentFields: ["Minor Consent Section"],
    },
    {
      id: "hippa-consent-treatment-form",
      name: "HIPAA Consent Treatment Form",
      category: "Legal",
      uses: 87,
      pdfUrl: "/HIPPA_Consent_Treatment_Form.pdf",
      description:
        "Ensures patient consent and acknowledgment of HIPAA policies.",
      tags: ["hipaa", "consent", "legal", "privacy"],
      signatureFields: ["patient", "witness"],
      version: 5,
      lastEditedBy: { name: "Carol Davis", avatarUrl: "/avatars/02.png" },
      lastEditedOn: new Date(Date.now() - 10 * 60 * 1000),
      complianceStatus: "ok",
    },
    {
      id: "caregiver-contact-form",
      name: "Caregiver Contact Form",
      category: "Administrative",
      uses: 98,
      pdfUrl: "/Caregiver_Contact_Form.pdf",
      description:
        "Collects contact information for designated patient caregivers.",
      tags: ["contact", "caregiver"],
      signatureFields: ["patient representative"],
      version: 1,
      lastEditedOn: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      complianceStatus: "error",
      missingConsentFields: ["Section A.1", "Section C.4"],
    },
    {
      id: "post-op-instructions",
      name: "Post-Operative Instructions",
      category: "Clinical",
      uses: 75,
      pdfUrl: "/Medical_History_Form.pdf",
      description:
        "Detailed instructions for patients after undergoing a surgical procedure.",
      tags: ["post-op", "instructions", "aftercare"],
      signatureFields: ["physician"],
      version: 2,
      lastEditedBy: { name: "Dr. Smith", avatarUrl: "/avatars/03.png" },
      lastEditedOn: new Date(Date.now() - 1 * 60 * 60 * 1000),
      complianceStatus: "ok",
    },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUseTemplate = (template: TemplateData) => {
    setSelectedPdfUrl(template.pdfUrl);
    setSelectedTemplateId(template.id);
  };

  const handleBackToTemplates = () => {
    setSelectedPdfUrl(null);
    setSelectedTemplateId(null);
  };

  const handleProceed = () => {
    if (selectedTemplateId) {
      navigate(`/assign-template/${selectedTemplateId}`);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      // Create object URL immediately
      const objectUrl = URL.createObjectURL(file);
      const fileNameWithoutExtension = file.name.replace(/\.pdf$/i, "");
      
      // Create and add new template immediately
      const newTemplate: TemplateData = {
        id: `uploaded-${Date.now()}`,
        name: fileNameWithoutExtension,
        category: "Other",
        uses: 0,
        pdfUrl: objectUrl,
        description: "Uploaded PDF form.",
        tags: ["uploaded"],
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
      setIsProcessing(true);

      try {
        // Process document using ragService
        const response = await ragService.processNewFormTemplate(file);
        console.log(response);
        
        // Process the hierarchical form data
        const fields = processFormData(response.extracted_info);
        setExtractedFields(fields);
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
          {selectedPdfUrl ? (
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <Button
                variant="outline"
                onClick={handleBackToTemplates}
                className="mb-6 flex items-center gap-2 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Templates
              </Button>
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
                  ) : extractedFields.length > 0 ? (
                    <DigitizedForm 
                      fields={extractedFields} 
                      onDeleteField={(fieldId) => {
                        setExtractedFields(prev => prev.filter(field => field.id !== fieldId));
                      }}
                      onAddField={(newField, index) => {
                        setExtractedFields(prev => {
                          const newFields = [...prev];
                          newFields.splice(index, 0, newField);
                          return newFields;
                        });
                      }}
                      onEditField={(fieldId, updates) => {
                        setExtractedFields(prev => 
                          prev.map(field => 
                            field.id === fieldId 
                              ? { ...field, ...updates }
                              : field
                          )
                        );
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">No form fields extracted yet</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-center mt-6">
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
                {filteredTemplates.length > 0 ? (
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
                    No templates found matching your search.
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
