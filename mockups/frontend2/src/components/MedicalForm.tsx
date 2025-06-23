import React, { useState, useEffect, useRef } from 'react';
import FormField, { FieldType, FieldOption } from './FormField';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import FormReview from './FormReview';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';

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
  const [templateFields, setTemplateFields] = useState<FieldConfig[]>([]);
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
      let fields: any[] = [];
      if (template.fields) {
        if (typeof template.fields === 'string') {
          fields = JSON.parse(template.fields);
        } else {
          fields = template.fields;
        }
      }
      
      console.log('Parsed fields:', fields);
      
      // Convert FormField format to FieldConfig format
      const fieldConfigs: FieldConfig[] = fields.map((field: any) => ({
        id: field.id,
        label: field.label,
        type: field.type as FieldType,
        required: field.required || false,
        placeholder: field.placeholder || '',
        value: field.value || ''
      }));
      
      setTemplateFields(fieldConfigs);
      
      // Initialize form values
      const initialValues: Record<string, any> = {};
      fieldConfigs.forEach(field => {
        initialValues[field.id] = field.value || '';
      });
      setTemplateFormValues(initialValues);
      
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
          required: field.required
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

  const reviewFields = fields.map(field => ({
    id: field.id,
    label: field.label,
    value: formValues[field.id],
    autofilled: field.autofilled,
    autofillSource: field.autofillSource
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
        <div ref={formRef} className="grid grid-cols-1 md:grid-cols-2 gap-8">
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