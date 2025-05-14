import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FormReviewProps {
  isOpen: boolean;
  onClose: () => void;
  fields: {
    id: string;
    label: string;
    value: any;
    autofilled?: boolean;
    autofillSource?: string;
  }[];
  onSubmit: () => void;
}

const FormReview: React.FC<FormReviewProps> = ({
  isOpen,
  onClose,
  fields,
  onSubmit,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Review Registration</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</h3>
                <p className="text-base text-gray-900 dark:text-gray-100">
                  {field.value || <span className="text-gray-400 dark:text-gray-500">Not provided</span>}
                </p>
                {field.autofilled && (
                  <p className="text-sm text-success">
                    Auto-filled from {field.autofillSource}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Back to Form
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            className="bg-primary hover:bg-primary/90"
          >
            Submit Registration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FormReview;