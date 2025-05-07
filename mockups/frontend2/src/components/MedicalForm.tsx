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
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  success: boolean;
}

interface MedicalFormProps {
  uploadedFiles: UploadedFile[];
}

const MedicalForm: React.FC<MedicalFormProps> = ({ uploadedFiles }) => {
  const { toast } = useToast();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [formFields, setFormFields] = useState<FieldConfig[]>([
    { 
      id: 'patientName', 
      label: 'Patient Name', 
      type: 'text',
      placeholder: 'Full Name'
    },
    { 
      id: 'dateOfBirth', 
      label: 'Date of Birth', 
      type: 'date'
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
      ]
    },
    { 
      id: 'symptoms', 
      label: 'Symptoms', 
      type: 'textarea',
      placeholder: 'Describe your symptoms',
      unfillable: true
    },
    { 
      id: 'diagnosis', 
      label: 'Diagnosis', 
      type: 'textarea',
      placeholder: 'To be filled by doctor'
    },
    { 
      id: 'treatment', 
      label: 'Treatment', 
      type: 'textarea',
      placeholder: 'To be filled by doctor'
    },
    { 
      id: 'signature', 
      label: 'Patient Signature', 
      type: 'signature'
    },
  ]);

  const [formData, setFormData] = useState<FormData>({
    patientName: '',
    dateOfBirth: null,
    sex: '',
    symptoms: '',
    diagnosis: '',
    treatment: '',
    signature: ''
  });

  // Simulate autofill when ID is uploaded
  useEffect(() => {
    if (uploadedFiles.length > 0) {
      // Check if there's a file with "license" in the name to simulate license detection
      const licenseFile = uploadedFiles.find(file => 
        file.name.toLowerCase().includes('license') || 
        file.name.toLowerCase().includes('id')
      );
      
      if (licenseFile) {
        setTimeout(() => {
          // Update form fields to show autofilled status
          setFormFields(prevFields => prevFields.map(field => {
            if (['patientName', 'dateOfBirth', 'sex'].includes(field.id)) {
              return {
                ...field,
                autofilled: true,
                autofillSource: "Driver's License"
              };
            }
            return field;
          }));
          
          // Update form data with mock values
          setFormData(prevData => ({
            ...prevData,
            patientName: 'John Doe',
            dateOfBirth: new Date('1990-05-15'),
            sex: 'male'
          }));
        }, 1500); // Simulate processing delay
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
    console.log('Form submitted:', formData);
    toast({
      title: "Form Submitted Successfully",
      description: "Your medical form has been submitted.",
    });
    // Here you would typically submit the form data to your backend
  };

  const handleReview = () => {
    console.log('Reviewing form data:', formData);
    setReviewOpen(true);
  };

  const handleCloseReview = () => {
    setReviewOpen(false);
  };

  // Prepare fields for review
  const reviewFields = formFields.map(field => ({
    id: field.id,
    label: field.label,
    value: formData[field.id],
    autofilled: field.autofilled,
    autofillSource: field.autofillSource
  }));

  return (
    <Card className="p-6 bg-white shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-darkText">Medical Form</h2>
      <form onSubmit={handleSubmit}>
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
            onChange={handleFieldChange}
          />
        ))}
        <div className="flex justify-between mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={handleReview}
            className="border-primary text-primary"
          >
            Review Form
          </Button>
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90"
          >
            Submit
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