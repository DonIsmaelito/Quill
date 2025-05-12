import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/dashboard/Sidebar";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface TemplateData {
  name: string;
  category: string;
  uses: number;
  pdfUrl: string;
  id: string;
}

export default function Templates() {
  const navigate = useNavigate();
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  const templates: TemplateData[] = [
    {
      id: "patient-intake-form",
      name: "Patient Intake Form",
      category: "Administrative",
      uses: 156,
      pdfUrl: "/Patient_Intake_Form.pdf",
    },
    {
      id: "medical-history-form",
      name: "Medical History Form",
      category: "Clinical",
      uses: 142,
      pdfUrl: "/Medical_History_Form.pdf",
    },
    {
      id: "hippa-consent-treatment-form",
      name: "HIPPA Consent Treatment Form",
      category: "Legal",
      uses: 87,
      pdfUrl: "/HIPPA_Consent_Treatment_Form.pdf",
    },
    {
      id: "caregiver-contact-form",
      name: "Caregiver Contact Form",
      category: "Administrative",
      uses: 98,
      pdfUrl: "/Caregiver_Contact_Form.pdf",
    },
  ];

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

  return (
    <div className="flex h-screen overflow-hidden bg-medical-background">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        {selectedPdfUrl ? (
          <div>
            <Button
              variant="outline"
              onClick={handleBackToTemplates}
              className="mb-4 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Templates
            </Button>
            <div className="mb-4 aspect-[8.5/11] w-full max-w-4xl mx-auto">
              <iframe
                src={selectedPdfUrl}
                title="Selected Template"
                width="100%"
                height="100%"
                className="border rounded-md"
              />
            </div>
            <div className="text-center">
              <Button
                onClick={handleProceed}
                className="bg-medical-primary hover:bg-medical-primary/90"
              >
                Proceed to Assign Patient
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-medical-text">
                Form Templates
              </h1>
              <p className="text-medical-subtext">
                Manage and use your form templates
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {templates.map((template) => (
                <div
                  key={template.name}
                  className="bg-white p-4 rounded-xl shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-medical-primary/10">
                        <FileText className="h-5 w-5 text-medical-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-medical-text">
                          {template.name}
                        </h3>
                        <p className="text-sm text-medical-subtext">
                          {template.category}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-medical-subtext mb-3">
                      {/* Placeholder for a short description if needed */}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-sm text-medical-subtext">
                      {template.uses} uses
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUseTemplate(template)}
                    >
                      Use Template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
