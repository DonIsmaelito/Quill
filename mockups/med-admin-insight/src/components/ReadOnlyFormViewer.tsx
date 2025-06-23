import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';

interface FormField {
  id: string;
  label: string;
  type: string;
  value: any;
  required: boolean;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface FilledFormData {
  id: string;
  templateId: string;
  templateName: string;
  submittedAt: string;
  fields: FormField[];
  formValues: Record<string, any>;
}

const ReadOnlyFormViewer: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState<FilledFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (formId) {
      loadFilledForm(formId);
    }
  }, [formId]);

  const loadFilledForm = async (id: string) => {
    setIsLoading(true);
    try {
      // Load from the filled-forms directory in the frontend2 project
      const response = await fetch(`/api/filled-form/${id}`);
      
      if (!response.ok) {
        throw new Error(`Form not found: ${id} (Status: ${response.status})`);
      }
      
      const data = await response.json();
      setFormData(data);
      
    } catch (error) {
      console.error('Error loading filled form:', error);
      toast({
        title: "Error Loading Form",
        description: `Failed to load form "${id}". ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!formData) return;
    
    const dataStr = JSON.stringify(formData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${formData.templateName}_${formData.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderFieldValue = (field: FormField) => {
    const value = field.value;
    
    if (!value || value === '') {
      return <span className="text-gray-400 italic">Not provided</span>;
    }

    // Check if this is a table field
    const isTable = (field.position?.width === 600 && field.position?.height === 200) || 
                   (typeof value === 'string' && value.startsWith('['));
    
    if (isTable) {
      try {
        const tableFields: any[] = typeof value === 'string' ? JSON.parse(value) : [];
        return (
          <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {tableFields.map((col: any) => (
                      <th key={col.id} className="bg-gray-50 text-gray-700 font-medium text-center whitespace-nowrap px-4 py-2">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {tableFields.map((col: any) => (
                      <td key={col.id} className="bg-white whitespace-nowrap px-4 py-2 text-center">
                        {col.type === "checkbox" ? (
                          <span className={col.value ? "text-green-600" : "text-red-600"}>
                            {col.value ? "Yes" : "No"}
                          </span>
                        ) : (
                          <span>{col.value || "Not provided"}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      } catch (e) {
        console.error("Error parsing table data:", e);
        return <span className="text-gray-400 italic">Invalid table data</span>;
      }
    }

    switch (field.type) {
      case 'textarea':
        return <div className="whitespace-pre-wrap">{value}</div>;
      case 'checkbox':
        return <span className={value ? "text-green-600" : "text-red-600"}>
          {value ? "Yes" : "No"}
        </span>;
      case 'radio':
      case 'select':
        return <span>{value}</span>;
      case 'date':
        return <span>{new Date(value).toLocaleDateString()}</span>;
      default:
        return <span>{value}</span>;
    }
  };

  const renderField = (field: FormField) => {
    // Check if this is a header field (only based on position data)
    const isHeader = field.position?.width === 600 && (field.position?.height === 48 || field.position?.height === 36);
    const isSubheader = field.position?.height === 36;

    if (isHeader) {
      return (
        <div key={field.id} className={`${isSubheader ? 'mt-8' : 'mt-12'} mb-6`}>
          {!isSubheader && <hr className="border-blue-200 mb-6" />}
          <h2 className={`font-semibold ${isSubheader ? 'text-lg text-gray-700' : 'text-2xl text-blue-600'}`}>
            {field.label}
          </h2>
          {isSubheader && <hr className="border-blue-100 mt-2" />}
        </div>
      );
    }

    // Check if this is a table field (based on width and height, or JSON structure)
    const isTable = (field.position?.width === 600 && field.position?.height === 200) || 
                   (field.value && typeof field.value === 'string' && field.value.startsWith('['));
    
    if (isTable) {
      return (
        <div key={field.id} className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {renderFieldValue(field)}
        </div>
      );
    }

    // For regular fields, render in the standard format
    return (
      <div key={field.id} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
          {renderFieldValue(field)}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-white dark:bg-gray-900 shadow-sm">
          <div className="p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading form data...</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-white dark:bg-gray-900 shadow-sm">
          <div className="p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Form Not Found
            </h2>
            <p className="text-gray-600 mb-6">
              The requested form could not be found or loaded.
            </p>
            <Button onClick={() => navigate('/completed-forms')}>
              Back to Completed Forms
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="bg-white dark:bg-gray-900 shadow-sm">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                {formData.templateName}
              </h2>
              <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                Submitted on {new Date(formData.submittedAt).toLocaleString()}
              </p>
              <p className="text-sm text-gray-400">
                Form ID: {formData.id}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrint}
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8">
          <div className="space-y-6">
            {/* Render all fields in their original order to maintain hierarchy */}
            {(() => {
              const elements: React.ReactNode[] = [];
              let currentGridFields: FormField[] = [];
              
              formData.fields.forEach(field => {
                const isHeader = field.position?.width === 600 && (field.position?.height === 48 || field.position?.height === 36);
                const isTable = (field.position?.width === 600 && field.position?.height === 200) || 
                               (field.value && typeof field.value === 'string' && field.value.startsWith('['));
                
                if (isHeader || isTable) {
                  // If we have accumulated regular fields, render them in a grid first
                  if (currentGridFields.length > 0) {
                    elements.push(
                      <div key={`grid-${currentGridFields[0].id}`} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {currentGridFields.map(field => renderField(field))}
                      </div>
                    );
                    currentGridFields = [];
                  }
                  
                  // Render the header or table as full-width
                  elements.push(
                    <div key={field.id} className="w-full">
                      {renderField(field)}
                    </div>
                  );
                } else {
                  // Accumulate regular fields for grid rendering
                  currentGridFields.push(field);
                }
              });
              
              // Render any remaining regular fields in a grid
              if (currentGridFields.length > 0) {
                elements.push(
                  <div key={`grid-${currentGridFields[0].id}`} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {currentGridFields.map(field => renderField(field))}
                  </div>
                );
              }
              
              return elements;
            })()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-100 dark:border-gray-800">
          <Button
            variant="outline"
            onClick={() => navigate('/completed-forms')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Completed Forms
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ReadOnlyFormViewer; 