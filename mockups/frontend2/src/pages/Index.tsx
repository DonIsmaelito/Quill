import React, { useState } from 'react';
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
}

export default function Index() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [highlightedFields, setHighlightedFields] = useState<string[]>([]);
  const [formFields] = useState<FormField[]>([
    { 
      id: 'patientName', 
      label: 'Full Name', 
      type: 'text',
      placeholder: 'Enter your full name',
      required: true
    },
    { 
      id: 'dateOfBirth', 
      label: 'Date of Birth', 
      type: 'date',
      required: true
    },
    { 
      id: 'sex', 
      label: 'Sex', 
      type: 'select',
      options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'other', label: 'Other' },
        { value: 'prefer-not-to-say', label: 'Prefer not to say' }
      ],
      required: true
    },
    {
      id: 'email',
      label: 'Email Address',
      type: 'text',
      placeholder: 'Enter your email address',
      required: true
    },
    {
      id: 'phone',
      label: 'Phone Number',
      type: 'text',
      placeholder: 'Enter your phone number',
      required: true
    },
    {
      id: 'address',
      label: 'Address',
      type: 'textarea',
      placeholder: 'Enter your full address',
      required: true
    },
    {
      id: 'emergencyContact',
      label: 'Emergency Contact Name',
      type: 'text',
      placeholder: 'Enter emergency contact name',
      required: true
    },
    {
      id: 'emergencyPhone',
      label: 'Emergency Contact Phone',
      type: 'text',
      placeholder: 'Enter emergency contact phone number',
      required: true
    },
    {
      id: 'medicalConditions',
      label: 'Existing Medical Conditions',
      type: 'textarea',
      placeholder: 'List any existing medical conditions',
      unfillable: true
    },
    {
      id: 'allergies',
      label: 'Allergies',
      type: 'textarea',
      placeholder: 'List any allergies',
      unfillable: true
    },
    {
      id: 'medications',
      label: 'Current Medications',
      type: 'textarea',
      placeholder: 'List current medications and dosages',
      unfillable: true
    },
    {
      id: 'familyHistory',
      label: 'Family Medical History',
      type: 'textarea',
      placeholder: 'Describe relevant family medical history',
      unfillable: true
    },
    {
      id: 'insuranceProvider',
      label: 'Insurance Provider',
      type: 'text',
      placeholder: 'Enter your insurance provider name',
      required: true
    },
    {
      id: 'insuranceNumber',
      label: 'Insurance Policy Number',
      type: 'text',
      placeholder: 'Enter your insurance policy number',
      required: true
    },
    {
      id: 'signature',
      label: 'Patient Signature',
      type: 'signature',
      required: true
    }
  ]);

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
    setFormValues(values);
  };

  const handleFieldsMentioned = (fieldIds: string[]) => {
    setHighlightedFields(fieldIds);
    // Clear the highlight after 9 seconds
    setTimeout(() => {
      setHighlightedFields([]);
    }, 18000);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-1/3 border-r border-gray-200 bg-white">
        <AssistantPanel 
          onFileUpload={handleFileUpload}
          formFields={formFields}
          formTitle="Patient Registration Form"
          formValues={formValues}
          onFieldsMentioned={handleFieldsMentioned}
        />
      </div>
      <div className="w-2/3 p-8 overflow-y-auto">
        <MedicalForm 
          uploadedFiles={uploadedFiles}
          fields={formFields}
          onChange={handleFormChange}
          highlightedFields={highlightedFields}
        />
      </div>
    </div>
  );
}
