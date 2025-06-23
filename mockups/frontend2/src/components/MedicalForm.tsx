import React, { useState, useEffect, useRef } from 'react';
import FormField, { FieldType, FieldOption } from './FormField';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import FormReview from './FormReview';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
// Import the DigitizedForm component from med-admin-insight
import { DigitizedForm } from '../../../med-admin-insight/src/components/DigitizedForm';
// Import the processFormData function from med-admin-insight
import { processFormData } from '../../../med-admin-insight/src/utils/formProcessing';

// Import the FormField type from med-admin-insight
interface FormField {
  id: string;
  type: "text" | "checkbox" | "radio" | "select" | "date" | "signature" | "table";
  label: string;
  required: boolean;
  value?: string | boolean;
  options?: string[];
  placeholder?: string;
  columns?: Array<{
    id: string;
    label: string;
    type: "text" | "checkbox" | "date";
    value: string | boolean;
  }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface TableField {
  id: string;
  type: "text" | "checkbox" | "radio" | "select" | "date" | "signature";
  label: string;
  value: string | boolean;
}

// Helper function to determine field type from key
const getFieldType = (key: string): FormField["type"] => {
  if (key.startsWith("text")) return "text";
  if (key.startsWith("boolean")) return "checkbox";
  if (key.startsWith("date")) return "date";
  return "text"; // default to text
};

// Helper function to determine column type from key (for table fields)
const getColumnType = (key: string): "text" | "checkbox" | "radio" | "select" | "date" | "signature" => {
  if (key.startsWith("text")) return "text";
  if (key.startsWith("date")) return "date";
  if (key.startsWith("boolean")) return "checkbox";
  return "text"; // default to text
};

interface FormData {
  [key: string]: any;
}

interface FieldConfig {
  id: string;
  label: string;
  type: FieldType;
  options?: FieldOption[];
  placeholder?: string;
  autofilled?: boolean;
  autofillSource?: string;
  unfillable?: boolean;
  required?: boolean;
  value?: any;
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  success: boolean;
}

interface MedicalFormProps {
  uploadedFiles?: UploadedFile[];
  fields?: FieldConfig[];
  formValues?: Record<string, any>;
  onChange?: (values: Record<string, any>) => void;
  highlightedFields?: string[];
  onTemplateFieldsLoaded?: (fields: FieldConfig[], formValues: Record<string, any>) => void;
}

// Patient-specific form rendering component (no editing features)
interface PatientFormRendererProps {
  fields: FormField[];
  formValues: Record<string, any>;
  onFieldChange: (id: string, value: any) => void;
  highlightedFields?: string[];
}

const PatientFormRenderer: React.FC<PatientFormRendererProps> = ({
  fields,
  formValues,
  onFieldChange,
  highlightedFields = []
}) => {
  let isFirstHeader = true;

  const renderField = (field: FormField) => {
    // Check if this is a header field (based on width and height)
    const isHeader = field.position.width === 600 && (field.position.height === 48 || field.position.height === 36);
    const isSubheader = field.position.height === 36;

    if (isHeader) {
      const headerElement = (
        <div key={field.id} className={`${isSubheader ? 'mt-8' : 'mt-12'} mb-6`}>
          {!isSubheader && !isFirstHeader && <hr className="border-blue-200 mb-6" />}
          <h2 className={`font-semibold ${isSubheader ? 'text-lg text-gray-700' : 'text-2xl text-blue-600'}`}>
            {field.label}
          </h2>
          {isSubheader && <hr className="border-blue-100 mt-2" />}
        </div>
      );
      
      if (!isSubheader) {
        isFirstHeader = false;
      }
      
      return headerElement;
    }

    // Check if this is a table field (based on width and height, or if it contains table data)
    const isTable = (field.position.width === 600 && field.position.height === 200) || 
                   (field.value && typeof field.value === 'string' && field.value.startsWith('['));
    
    if (isTable) {
      try {
        const tableFields: any[] = typeof field.value === 'string' ? JSON.parse(field.value) : [];
        return (
          <div key={field.id} className="mb-6">
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
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
                        <td key={col.id} className="bg-white whitespace-nowrap px-4 py-2">
                          {col.type === "checkbox" ? (
                            <div className="flex justify-center">
                              <input 
                                type="checkbox"
                                checked={col.value as boolean} 
                                onChange={(e) => {
                                  const newValue = e.target.checked;
                                  const updatedFields = tableFields.map((f: any) => 
                                    f.id === col.id ? { ...f, value: newValue } : f
                                  );
                                  onFieldChange(field.id, JSON.stringify(updatedFields));
                                }}
                                className="border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                              />
                            </div>
                          ) : col.type === "date" ? (
                            <input 
                              type="date" 
                              value={col.value as string} 
                              onChange={(e) => {
                                const newValue = e.target.value;
                                const updatedFields = tableFields.map((f: any) => 
                                  f.id === col.id ? { ...f, value: newValue } : f
                                );
                                onFieldChange(field.id, JSON.stringify(updatedFields));
                              }}
                              className="w-full border border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 px-2 py-1 rounded bg-white"
                            />
                          ) : (
                            <input 
                              type="text" 
                              value={col.value as string} 
                              onChange={(e) => {
                                const newValue = e.target.value;
                                const updatedFields = tableFields.map((f: any) => 
                                  f.id === col.id ? { ...f, value: newValue } : f
                                );
                                onFieldChange(field.id, JSON.stringify(updatedFields));
                              }}
                              className="w-full border border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 px-2 py-1 rounded bg-white"
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      } catch (e) {
        console.error("Error parsing table data:", e);
        return null;
      }
    }

    // For regular fields, render appropriate input types
    switch (field.type) {
      case "text":
        return (
          <div key={field.id} className="mb-4">
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              id={field.id}
              type="text"
              placeholder={field.placeholder}
              required={field.required}
              value={formValues[field.id] || ''}
              onChange={(e) => onFieldChange(field.id, e.target.value)}
              className="w-full border border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 px-3 py-2 rounded-md bg-white"
              data-highlighted={highlightedFields.includes(field.id)}
            />
          </div>
        );
      case "checkbox":
        return (
          <div key={field.id} className="flex items-center space-x-2 mb-4">
            <input 
              id={field.id} 
              type="checkbox"
              required={field.required} 
              checked={formValues[field.id] as boolean || false} 
              onChange={(e) => onFieldChange(field.id, e.target.checked)}
              className="border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-200 focus:border-blue-400" 
            />
            <label htmlFor={field.id} className="text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          </div>
        );
      case "radio":
        return (
          <div key={field.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`${field.id}-${option}`}
                    name={field.id}
                    value={option}
                    required={field.required}
                    checked={formValues[field.id] === option}
                    onChange={(e) => onFieldChange(field.id, e.target.value)}
                    className="border-2 border-gray-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  />
                  <label htmlFor={`${field.id}-${option}`} className="text-sm text-gray-700">
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </div>
        );
      case "select":
        return (
          <div key={field.id} className="mb-4">
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              id={field.id}
              required={field.required}
              value={formValues[field.id] || ''}
              onChange={(e) => onFieldChange(field.id, e.target.value)}
              className="w-full border border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 px-3 py-2 rounded-md bg-white"
            >
              <option value="">{field.placeholder || "Select an option"}</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );
      case "date":
        return (
          <div key={field.id} className="mb-4">
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              id={field.id}
              type="date"
              required={field.required}
              value={formValues[field.id] || ''}
              onChange={(e) => onFieldChange(field.id, e.target.value)}
              className="w-full border border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 px-3 py-2 rounded-md bg-white"
            />
          </div>
        );
      case "signature":
        return (
          <div key={field.id} className="mb-4">
            <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-gray-300 transition-colors">
              <p className="text-sm text-gray-500">Click to sign</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Render fields with proper layout
  const regularFields: FormField[] = [];
  const fullWidthElements: React.ReactNode[] = [];
  
  fields.forEach(field => {
    const isHeader = field.position.width === 600 && (field.position.height === 48 || field.position.height === 36);
    const isTable = (field.position.width === 600 && field.position.height === 200) || 
                   (field.value && typeof field.value === 'string' && field.value.startsWith('['));
    
    if (isHeader || isTable) {
      fullWidthElements.push(renderField(field));
    } else {
      regularFields.push(field);
    }
  });

  return (
    <div className="space-y-6">
      {/* Render all fields in their original order to maintain hierarchy */}
      {(() => {
        const elements: React.ReactNode[] = [];
        let currentGridFields: FormField[] = [];
        
        fields.forEach(field => {
          const isHeader = field.position.width === 600 && (field.position.height === 48 || field.position.height === 36);
          const isTable = (field.position.width === 600 && field.position.height === 200) || 
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
  );
};

const MedicalForm: React.FC<MedicalFormProps> = ({ 
  uploadedFiles = [], 
  fields: propFields = [], 
  formValues: propFormValues = {},
  onChange: propOnChange,
  highlightedFields = [],
  onTemplateFieldsLoaded
}) => {
  const { toast } = useToast();
  const [reviewOpen, setReviewOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  
  // State for template-based form
  const [templateFields, setTemplateFields] = useState<FormField[]>([]);
  const [templateFormValues, setTemplateFormValues] = useState<Record<string, any>>({});
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState<string>('');

  // Get template ID from URL parameter
  const templateId = searchParams.get('template');

  // Load template when component mounts or templateId changes
  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    }
  }, [templateId]);

  const loadTemplate = async (id: string) => {
    setIsLoadingTemplate(true);
    try {
      console.log('Loading template with ID:', id);
      
      // Use the new API endpoint to fetch template files
      const response = await fetch(`/api/templates/${id}`);
      
      if (!response.ok) {
        throw new Error(`Template not found: ${id} (Status: ${response.status})`);
      }
      
      const template = await response.json();
      console.log('Loaded template:', template);
      
      setTemplateName(template.name || `Template: ${id}`);
      
      // Parse the fields from the template
      let fields: FormField[] = [];
      if (template.fields) {
        if (typeof template.fields === 'string') {
          // New format: fields is a stringified FormField array
          fields = JSON.parse(template.fields);
        } else {
          // Old format: fields is a hierarchical object, need to process it
          fields = processFormData(template.fields);
        }
      }
      
      console.log('Parsed fields:', fields);
      
      // Initialize form values
      const initialValues: Record<string, any> = {};
      fields.forEach(field => {
        initialValues[field.id] = field.value || '';
      });
      
      setTemplateFields(fields);
      setTemplateFormValues(initialValues);
      
      // Convert FormField format to FieldConfig format for backward compatibility
      const fieldConfigs: FieldConfig[] = fields.map((field: FormField) => ({
        id: field.id,
        label: field.label,
        type: field.type as FieldType,
        required: field.required || false,
        placeholder: field.placeholder || '',
        value: field.value || '',
        options: field.options?.map(opt => ({ value: opt, label: opt })) || []
      }));
      
      // Notify parent component about the loaded fields
      if (onTemplateFieldsLoaded) {
        onTemplateFieldsLoaded(fieldConfigs, initialValues);
      }
      
    } catch (error) {
      console.error('Error loading template:', error);
      toast({
        title: "Error Loading Template",
        description: `Failed to load template "${id}". ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  // Use template fields if available, otherwise use prop fields
  const fields = templateId ? templateFields : propFields;
  const formValues = templateId ? templateFormValues : propFormValues;

  // Handle field changes
  const handleFieldChange = (id: string, value: any) => {
    console.log(`Field ${id} changed in MedicalForm to:`, value);
    if (templateId) {
      setTemplateFormValues(prev => ({ ...prev, [id]: value }));
    } else if (propOnChange) {
      propOnChange({ ...formValues, [id]: value });
    }
  };

  // Add effect to scroll to first highlighted field
  useEffect(() => {
    if (highlightedFields.length > 0 && formRef.current) {
      // Find the first highlighted field element
      const firstHighlightedField = formRef.current.querySelector('[data-highlighted="true"]');
      if (firstHighlightedField) {
        // Scroll the field into view with smooth behavior and some offset from the top
        firstHighlightedField.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [highlightedFields]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Validate required fields
    const missingFields = fields
      .filter(field => field.required && !formValues[field.id])
      .map(field => field.label);

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in the following required fields: ${missingFields.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    console.log('Form submitted:', formValues);

    try {
      // Save the filled form data
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const formId = templateId ? `${templateId}_${timestamp}` : `form_${timestamp}`;
      
      const filledFormData = {
        id: formId,
        templateId: templateId,
        templateName: templateName,
        submittedAt: new Date().toISOString(),
        fields: fields.map(field => ({
          id: field.id,
          label: field.label,
          type: field.type,
          value: formValues[field.id],
          required: field.required,
          position: field.position
        })),
        formValues: formValues
      };

      // Save to filled-forms directory
      const saveResponse = await fetch('/api/save-filled-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: formId,
          data: filledFormData
        })
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save form data');
      }

      // Send email notification to clinician
      const emailResponse = await fetch('/api/notify-clinician', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: formId,
          templateName: templateName,
          templateId: templateId,
          submittedAt: filledFormData.submittedAt
        })
      });

      if (!emailResponse.ok) {
        console.warn('Failed to send clinician notification, but form was saved');
      }

      toast({
        title: "Form Submitted Successfully",
        description: templateId 
          ? `Your ${templateName} form has been submitted successfully. The clinician has been notified.`
          : "Your patient registration has been submitted successfully.",
      });

    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Submission Error",
        description: "There was an error submitting your form. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleReview = () => {
    console.log('Reviewing form data:', formValues);
    setReviewOpen(true);
  };

  const handleCloseReview = () => {
    setReviewOpen(false);
  };

  const reviewFields = (templateId && templateFields.length > 0 ? templateFields : fields as any[]).map(field => ({
    id: field.id,
    label: field.label,
    value: formValues[field.id],
    autofilled: false,
    autofillSource: ""
  }));

  if (isLoadingTemplate) {
    return (
      <Card className="bg-white dark:bg-gray-900 shadow-sm">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Loading Form...</h2>
        </div>
        <div className="p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading form template...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-900 shadow-sm">
      <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
          {templateId ? templateName : 'New Patient Registration'}
        </h2>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
          {templateId 
            ? 'Please fill out all required fields marked with an asterisk (*)'
            : 'Please fill out all required fields marked with an asterisk (*)'
          }
        </p>
      </div>
      <form onSubmit={handleSubmit} className="p-8">
        <div ref={formRef}>
          {templateId && templateFields.length > 0 ? (
            // Use the PatientFormRenderer for template-based forms
            <PatientFormRenderer
              fields={templateFields}
              formValues={templateFormValues}
              onFieldChange={handleFieldChange}
              highlightedFields={highlightedFields}
            />
          ) : (
            // Use the original FormField components for prop-based forms
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {fields.map(field => (
                <FormField
                  key={field.id}
                  id={field.id}
                  label={field.label}
                  type={field.type}
                  options={field.options}
                  placeholder={field.placeholder}
                  value={formValues[field.id]}
                  autofilled={field.autofilled}
                  autofillSource={field.autofillSource}
                  unfillable={field.unfillable}
                  required={field.required}
                  onChange={handleFieldChange}
                  isHighlighted={highlightedFields.includes(field.id)}
                  data-highlighted={highlightedFields.includes(field.id)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-between mt-10 pt-6 border-t border-gray-100 dark:border-gray-800">
          <Button
            type="button"
            variant="outline"
            onClick={handleReview}
            className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Review {templateId ? 'Form' : 'Registration'}
          </Button>
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90"
          >
            Submit {templateId ? 'Form' : 'Registration'}
          </Button>
        </div>
      </form>

      <FormReview 
        isOpen={reviewOpen}
        onClose={handleCloseReview}
        fields={reviewFields}
        onSubmit={handleSubmit}
      />
    </Card>
  );
};

export default MedicalForm;