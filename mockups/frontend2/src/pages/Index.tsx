import React, { useState, useRef, useEffect } from 'react';
import { AssistantPanel } from '../components/AssistantPanel';
import MedicalForm from '../components/MedicalForm';
import { FieldType, FieldOption } from '../components/FormField';
import { useSearchParams } from 'react-router-dom';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  success: boolean;
}

interface FormField {
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

// Add FieldConfig interface to match what MedicalForm passes
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

export default function Index() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [highlightedFields, setHighlightedFields] = useState<string[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [isFormFieldsLoading, setIsFormFieldsLoading] = useState(true);
  const [formStructureKey, setFormStructureKey] = useState<string>("default");
  const [searchParams] = useSearchParams();

  // Get template ID from URL parameter
  const templateId = searchParams.get("template");
  
  console.log('Index component - Template ID from URL:', templateId);

  useEffect(() => {
    // Loading precedence:
    // 1. If template is specified in URL, wait for MedicalForm to load it
    // 2. If no template in URL, load default form fields from curr_form.json
    if (!templateId) {
      console.log('No template specified in URL, loading default form fields');
      // Load form fields from JSON file
      fetch('../../temp/curr_form.json')
        .then(response => response.json())
        .then(data => {
          console.log('Loaded default form fields:', data.formFields.length, 'fields');
          setFormFields(data.formFields);
          setIsFormFieldsLoading(false);
        })
        .catch(error => {
          console.error('Error loading form fields:', error);
          setIsFormFieldsLoading(false);
        });
    } else {
      console.log('Template specified in URL, waiting for template to load');
      // Don't load default form fields if template is specified
      // The MedicalForm component will handle template loading
      setIsFormFieldsLoading(true);
    }
  }, [templateId]);

  // Update form values when form fields change (for template loading)
  useEffect(() => {
    if (formFields.length > 0) {
      const initialValues: Record<string, any> = {};
      formFields.forEach(field => {
        // Only set initial value if not already set
        if (formValues[field.id] === undefined) {
          initialValues[field.id] = field.value || '';
        }
      });
      
      if (Object.keys(initialValues).length > 0) {
        setFormValues(prev => ({ ...prev, ...initialValues }));
      }
    }
  }, [formFields]);

  // Generate a stable key for form structure changes
  useEffect(() => {
    if (formFields.length > 0) {
      const fieldIds = formFields.map(f => f.id).sort().join('-');
      const newKey = `form-${formFields.length}-${fieldIds}`;
      setFormStructureKey(newKey);
    }
  }, [formFields]);

  const handleFileUpload = (files: File[]) => {
    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type,
      success: true
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleFormChange = (values: Record<string, any>) => {
    console.log('Form values updated in Index:', values);
    setFormValues(values);
  };

  const handleFieldsMentioned = (fieldIds: string[]) => {
    console.log('Fields mentioned:', fieldIds);
    setHighlightedFields(fieldIds);
    setTimeout(() => {
      setHighlightedFields(current => {
        if (JSON.stringify(current.sort()) === JSON.stringify(fieldIds.sort())) {
          return [];
        }
        return current;
      });
    }, 5000);
  };

  const handleFieldsUpdated = (updates: { id: string; value: string }[]) => {
    console.log('Fields updated in Index:', updates);
    setFormValues(prev => {
      const newValues = { ...prev };
      updates.forEach(update => {
        // Find the corresponding field to determine its type
        const field = formFields.find(f => f.id === update.id);
        
        // Convert value based on field type
        if (field && (field.type as string) === 'checkbox') {
          // Convert string to boolean for checkbox fields
          // Accept "true"/"false" and "yes"/"no" (case-insensitive)
          const valueStr = update.value.toString().toLowerCase();
          const boolValue = valueStr === 'true' || valueStr === 'yes';
          console.log(`Converting checkbox field ${update.id} from "${update.value}" to ${boolValue}`);
          newValues[update.id] = boolValue;
        } else {
          // Keep as string for other field types
          console.log(`Setting field ${update.id} to "${update.value}" (type: ${field?.type})`);
          newValues[update.id] = update.value;
        }
      });
      return newValues;
    });
    
    const fieldIds = updates.map(update => update.id);
    setHighlightedFields(fieldIds);
    setTimeout(() => {
      setHighlightedFields([]);
    }, 5000);
  };

  const handleTemplateFieldsLoaded = (fields: FieldConfig[], formValues: Record<string, any>) => {
    console.log('Template fields loaded in Index:', fields, formValues);
    
    // Convert FieldConfig[] format to FormField[] format for consistency
    const convertedFields: FormField[] = fields.map(field => ({
      id: field.id,
      label: field.label,
      type: field.type,
      options: field.options,
      placeholder: field.placeholder,
      autofilled: field.autofilled,
      autofillSource: field.autofillSource,
      unfillable: field.unfillable,
      required: field.required,
      value: field.value
    }));
    
    console.log('Converted template fields:', convertedFields);
    console.log('Setting form fields in Index state:', convertedFields.length, 'fields');
    setFormFields(convertedFields);
    setFormValues(formValues);
    setIsFormFieldsLoading(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <AssistantPanel 
          key={formStructureKey}
          onFileUpload={handleFileUpload}
          formFields={formFields}
          formTitle="Patient Registration Form"
          formValues={formValues}
          onFieldsMentioned={handleFieldsMentioned}
          onFieldsUpdated={handleFieldsUpdated}
          isFormFieldsLoading={isFormFieldsLoading}
        />
      </div>
      <div className="w-2/3 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        <div className="max-w-5xl mx-auto px-8 py-6">
          <MedicalForm 
            uploadedFiles={uploadedFiles}
            fields={formFields}
            formValues={formValues}
            onChange={handleFormChange}
            highlightedFields={highlightedFields}
            onTemplateFieldsLoaded={handleTemplateFieldsLoaded}
          />
        </div>
      </div>
    </div>
  );
}