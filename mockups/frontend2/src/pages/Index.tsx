import React, { useState, useRef, useEffect } from 'react';
import { AssistantPanel } from '../components/AssistantPanel';
import MedicalForm from '../components/MedicalForm';
import { FieldType, FieldOption } from '../components/FormField';

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

export default function Index() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [highlightedFields, setHighlightedFields] = useState<string[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [isFormFieldsLoading, setIsFormFieldsLoading] = useState(true);

  useEffect(() => {
    // Load form fields from JSON file
    fetch('../../temp/curr_form.json')
      .then(response => response.json())
      .then(data => {
        setFormFields(data.formFields);
        setIsFormFieldsLoading(false);
      })
      .catch(error => {
        console.error('Error loading form fields:', error);
        setIsFormFieldsLoading(false);
      });
  }, []);

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
    }, 10000);
  };

  const handleFieldsUpdated = (updates: { id: string; value: string }[]) => {
    console.log('Fields updated in Index:', updates);
    setFormValues(prev => {
      const newValues = { ...prev };
      updates.forEach(update => {
        newValues[update.id] = update.value;
      });
      return newValues;
    });
    
    const fieldIds = updates.map(update => update.id);
    setHighlightedFields(fieldIds);
    setTimeout(() => {
      setHighlightedFields([]);
    }, 10000);
  };

  const handleTemplateFieldsLoaded = (fields: FormField[], formValues: Record<string, any>) => {
    console.log('Template fields loaded in Index:', fields, formValues);
    setFormFields(fields);
    setFormValues(formValues);
    setIsFormFieldsLoading(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <AssistantPanel 
          key={`assistant-${formFields.length}-${JSON.stringify(formFields.map(f => f.id))}`}
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