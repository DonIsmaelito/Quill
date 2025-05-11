import React, { useState, useEffect } from 'react';
import FormField, { FieldType, FieldOption } from './FormField';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import FormReview from './FormReview';
import { useToast } from '@/hooks/use-toast';

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
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  success: boolean;
}

interface MedicalFormProps {
  uploadedFiles: UploadedFile[];
  fields?: FieldConfig[];
  onChange?: (values: FormData) => void;
  highlightedFields?: string[];
}

const MedicalForm: React.FC<MedicalFormProps> = ({ uploadedFiles, fields, onChange, highlightedFields = [] }) => {
  const { toast } = useToast();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [formFields, setFormFields] = useState<FieldConfig[]>(fields || [
    // Personal Information Section
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
    // Emergency Contact
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
    // Medical Information
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
    },
  ]);

  const [formData, setFormData] = useState<FormData>({
    patientName: '',
    dateOfBirth: null,
    sex: '',
    email: '',
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    medicalConditions: '',
    allergies: '',
    medications: '',
    familyHistory: '',
    insuranceProvider: '',
    insuranceNumber: '',
    signature: ''
  });

  // Update form fields when fields prop changes
  useEffect(() => {
    if (fields) {
      setFormFields(fields);
    }
  }, [fields]);

  // Notify parent of form changes
  useEffect(() => {
    onChange?.(formData);
  }, [formData, onChange]);

  // Simulate autofill when ID is uploaded
  useEffect(() => {
    if (uploadedFiles.length > 0) {
      const licenseFile = uploadedFiles.find(file => 
        file.name.toLowerCase().includes('license') || 
        file.name.toLowerCase().includes('id')
      );
      
      if (licenseFile) {
        setTimeout(() => {
          setFormFields(prevFields => prevFields.map(field => {
            if (['patientName', 'dateOfBirth', 'sex', 'address'].includes(field.id)) {
              return {
                ...field,
                autofilled: true,
                autofillSource: "Driver's License"
              };
            }
            return field;
          }));
          
          setFormData(prevData => ({
            ...prevData,
            patientName: 'John Doe',
            dateOfBirth: new Date('1990-05-15'),
            sex: 'male',
            address: '123 Main St, Anytown, USA'
          }));
        }, 1500);
      }
    }
  }, [uploadedFiles]);

  const handleFieldChange = (id: string, value: any) => {
    setFormData(prevData => ({
      ...prevData,
      [id]: value
    }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Validate required fields
    const missingFields = formFields
      .filter(field => field.required && !formData[field.id])
      .map(field => field.label);

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in the following required fields: ${missingFields.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    console.log('Form submitted:', formData);
    toast({
      title: "Registration Successful",
      description: "Your patient registration has been submitted successfully.",
    });
  };

  const handleReview = () => {
    console.log('Reviewing form data:', formData);
    setReviewOpen(true);
  };

  const handleCloseReview = () => {
    setReviewOpen(false);
  };

  const reviewFields = formFields.map(field => ({
    id: field.id,
    label: field.label,
    value: formData[field.id],
    autofilled: field.autofilled,
    autofillSource: field.autofillSource
  }));

  return (
    <Card className="p-6 bg-white shadow-sm max-w-6xl mx-auto my-8">
      <h2 className="text-2xl font-bold mb-6 text-darkText">New Patient Registration</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {formFields.map(field => (
            <FormField
              key={field.id}
              id={field.id}
              label={field.label}
              type={field.type}
              options={field.options}
              placeholder={field.placeholder}
              value={formData[field.id]}
              autofilled={field.autofilled}
              autofillSource={field.autofillSource}
              unfillable={field.unfillable}
              required={field.required}
              onChange={handleFieldChange}
              isHighlighted={highlightedFields.includes(field.id)}
            />
          ))}
        </div>
        <div className="flex justify-between mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={handleReview}
            className="border-primary text-primary"
          >
            Review Registration
          </Button>
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90"
          >
            Submit Registration
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