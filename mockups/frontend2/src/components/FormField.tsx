import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Check, X, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import SignatureCanvas from 'react-signature-canvas';

export type FieldType = 'text' | 'textarea' | 'select' | 'date' | 'signature';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FormFieldProps {
  id: string;
  label: string;
  type: FieldType;
  value: any;
  onChange: (id: string, value: any) => void;
  options?: FieldOption[];
  placeholder?: string;
  autofilled?: boolean;
  autofillSource?: string;
  unfillable?: boolean;
  required?: boolean;
  isHighlighted?: boolean;
  'data-highlighted'?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  type,
  value,
  onChange,
  options = [],
  placeholder,
  autofilled,
  autofillSource,
  unfillable,
  required,
  isHighlighted = false
}) => {
  // Track the last valid prop value to prevent flickering
  const lastValidValueRef = useRef<any>(value);
  const [internalValue, setInternalValue] = useState<any>(value);
  const signatureRef = useRef<SignatureCanvas | null>(null);
  const [isLocked, setIsLocked] = useState(autofilled);
  
  // Add more robust debugging in the useEffect for value changes
  useEffect(() => {
    console.log(`FormField ${id} value prop changed:`, value);
    console.log(`FormField ${id} current internalValue:`, internalValue);
    
    // Don't use strict equality which might fail for objects/dates
    if (value !== undefined && JSON.stringify(value) !== JSON.stringify(internalValue)) {
      console.log(`Updating internalValue for ${id} to:`, value);
      setInternalValue(value);
      lastValidValueRef.current = value;
    }
  }, [value, id]);

  // Update lock state when autofilled prop changes
  useEffect(() => {
    setIsLocked(autofilled);
  }, [autofilled]);

  // Improved change handler to reduce state updates
  const handleChange = (fieldValue: any) => {
    // Only update if the value has actually changed
    if (fieldValue !== internalValue) {
      setInternalValue(fieldValue);
      lastValidValueRef.current = fieldValue;
      onChange(id, fieldValue);
    }
  };

  const handleSignatureEnd = () => {
    if (signatureRef.current) {
      const signatureDataURL = signatureRef.current.toDataURL();
      handleChange(signatureDataURL);
    }
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      handleChange('');
    }
  };
  
  const handleUnlock = () => {
    setIsLocked(false);
  };
  
  const renderStatus = () => {
    if (autofilled) {
      return (
        <>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {isLocked ? (
              <button onClick={handleUnlock} className="text-gray-500 hover:text-primary">
                <Unlock size={16} />
              </button>
            ) : (
              <Check size={16} className="text-success" />
            )}
          </div>
          
          {isLocked && (
            <div className="text-xs text-success mt-1 flex items-center">
              <span>From: {autofillSource}</span>
              <Check size={12} className="ml-1" />
            </div>
          )}
          
          {!isLocked && autofilled && (
            <div className="text-xs text-gray-500 mt-1">
              Edited manually (originally from {autofillSource})
            </div>
          )}
        </>
      );
    }
    
    if (unfillable) {
      return (
        <>
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <X size={16} className="text-destructive" />
          </div>
          <div className="text-xs text-destructive mt-1">
            Unable to autofill. Please complete manually.
          </div>
        </>
      );
    }
    
    return null;
  };

  const isDisabled = isLocked && autofilled;
  const fieldClassName = cn(
    "w-full transition-all duration-200",
    autofilled ? "bg-green-50 pr-10" : "",
    unfillable ? "unfillable" : "",
    isHighlighted ? "ring-2 ring-blue-500 ring-offset-2" : ""
  );

  // Also ensure we're using the key prop correctly
  // Add a unique key that changes when the value changes to force re-render
  const fieldKey = `${id}-${isHighlighted ? 'highlighted' : 'normal'}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-1 text-base font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>

      <div className="relative">
        {type === 'text' && (
          <Input
            id={id}
            placeholder={placeholder}
            value={internalValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            className={cn(fieldClassName, "h-11 text-base")}
            disabled={isDisabled}
            key={fieldKey}
            data-highlighted={isHighlighted}
          />
        )}

        {type === 'textarea' && (
          <Textarea
            id={id}
            placeholder={placeholder}
            value={internalValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            className={cn(fieldClassName, "min-h-[100px] text-base")}
            disabled={isDisabled}
            rows={4}
            key={fieldKey}
            data-highlighted={isHighlighted}
          />
        )}

        {type === 'select' && (
          <Select 
            value={internalValue || ''} 
            onValueChange={handleChange}
            disabled={isDisabled}
          >
            <SelectTrigger 
              className={cn(fieldClassName, "h-11 text-base")}
              key={fieldKey}
              data-highlighted={isHighlighted}
            >
              <SelectValue placeholder={placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option.value} value={option.value} className="text-base">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {type === 'date' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={isDisabled}
                className={cn(
                  "w-full justify-start text-left font-normal h-11 text-base",
                  !internalValue && "text-muted-foreground",
                  fieldClassName
                )}
                key={fieldKey}
              >
                <CalendarIcon className="mr-2 h-5 w-5" />
                {internalValue ? format(new Date(internalValue), 'MM/dd/yyyy') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50 pointer-events-auto" align="start">
              <Calendar
                mode="single"
                selected={internalValue ? new Date(internalValue) : undefined}
                onSelect={(date) => handleChange(date)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        )}

        {type === 'signature' && (
          <div className="border border-gray-200 rounded-md p-2">
            <div className="border border-dashed border-gray-300 rounded-md bg-gray-50 h-32 flex flex-col">
              {internalValue ? (
                <div className="text-center h-full flex items-center justify-center">
                  <img src={internalValue} alt="Signature" className="max-h-full" />
                </div>
              ) : (
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    className: 'signature-canvas w-full h-full',
                  }}
                  onEnd={handleSignatureEnd}
                />
              )}
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={clearSignature}
                className="text-base text-gray-500 hover:text-gray-700"
              >
                Clear Signature
              </button>
            </div>
          </div>
        )}
        
        {renderStatus()}
      </div>
    </div>
  );
};

export default FormField;