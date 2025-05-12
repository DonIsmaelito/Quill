import React, { useState, useEffect, useRef } from 'react';
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
  fields: FieldConfig[];
  formValues: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  highlightedFields?: string[];
}

const MedicalForm: React.FC<MedicalFormProps> = ({ 
  uploadedFiles, 
  fields, 
  formValues,
  onChange,
  highlightedFields = []
}) => {
  const { toast } = useToast();
  const [reviewOpen, setReviewOpen] = useState(false);

  // Remove local formData state since we're using props
  const handleFieldChange = (id: string, value: any) => {
    console.log(`Field ${id} changed in MedicalForm to:`, value);
    onChange({ ...formValues, [id]: value });
  };

  const handleSubmit = (e?: React.FormEvent) => {
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
    toast({
      title: "Registration Successful",
      description: "Your patient registration has been submitted successfully.",
    });
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

  return (
    <Card className="p-6 bg-white shadow-sm max-w-6xl mx-auto my-8">
      <h2 className="text-2xl font-bold mb-6 text-darkText">New Patient Registration</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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