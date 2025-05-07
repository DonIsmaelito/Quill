import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Field {
  id: string;
  label: string;
  value: string | Date | null;
  autofilled?: boolean;
  autofillSource?: string;
}

interface FormReviewProps {
  isOpen: boolean;
  onClose: () => void;
  fields: Field[];
  onSubmit: () => void;
}

const FormReview: React.FC<FormReviewProps> = ({ isOpen, onClose, fields, onSubmit }) => {
  const formatValue = (value: string | Date | null) => {
    if (value === null || value === '') return 'Not provided';
    if (value instanceof Date) return value.toLocaleDateString();
    return String(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Form Review</DialogTitle>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto p-4 my-4 border rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fields.map((field) => (
              <div key={field.id} className="border rounded-md p-4 bg-gray-50">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-gray-700">{field.label}</h3>
                  {field.autofilled && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      From: {field.autofillSource}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-lg">
                  {formatValue(field.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Back to Edit
          </Button>
          <Button onClick={onSubmit}>
            Submit Form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FormReview;