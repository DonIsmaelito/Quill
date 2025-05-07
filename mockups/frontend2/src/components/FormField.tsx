import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Check, X, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FieldType = 'text' | 'textarea' | 'select' | 'date' | 'signature';

export interface FieldOption {
  value: string;
  label: string;
}

interface FormFieldProps {
  id: string;
  label: string;
  type: FieldType;
  value: string | Date | null;
  options?: FieldOption[];
  placeholder?: string;
  autofilled?: boolean;
  autofillSource?: string;
  unfillable?: boolean;
  onChange: (id: string, value: any) => void;
}

const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  type,
  value,
  options = [],
  placeholder = '',
  autofilled = false,
  autofillSource,
  unfillable = false,
  onChange,
}) => {
  const [isLocked, setIsLocked] = useState(autofilled);
  
  const handleUnlock = () => {
    setIsLocked(false);
  };
  
  const renderField = () => {
    const isDisabled = isLocked && autofilled;
    
    switch (type) {
      case 'text':
        return (
          <div className="relative">
            <Input
              id={id}
              value={value as string || ''}
              onChange={(e) => onChange(id, e.target.value)}
              placeholder={placeholder}
              disabled={isDisabled}
              className={cn(
                autofilled ? "autofilled pr-10" : "",
                unfillable ? "unfillable" : "",
              )}
            />
            {renderStatus()}
          </div>
        );
        
      case 'textarea':
        return (
          <div className="relative">
            <Textarea
              id={id}
              value={value as string || ''}
              onChange={(e) => onChange(id, e.target.value)}
              placeholder={placeholder}
              disabled={isDisabled}
              className={cn(
                autofilled ? "autofilled pr-10" : "",
                unfillable ? "unfillable" : "",
              )}
            />
            {renderStatus()}
          </div>
        );
        
      case 'select':
        return (
          <div className="relative">
            <Select
              disabled={isDisabled}
              value={value as string}
              onValueChange={(val) => onChange(id, val)}
            >
              <SelectTrigger 
                className={cn(
                  autofilled ? "autofilled pr-10" : "",
                  unfillable ? "unfillable" : "",
                )}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {renderStatus()}
          </div>
        );
        
      case 'date':
        return (
          <div className="relative">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isDisabled}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !value && "text-muted-foreground",
                    autofilled ? "autofilled pr-10" : "",
                    unfillable ? "unfillable" : "",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? format(value as Date, 'MM/dd/yyyy') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50 pointer-events-auto" align="start">
                <Calendar
                  mode="single"
                  selected={value as Date || undefined}
                  onSelect={(date) => onChange(id, date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {renderStatus()}
          </div>
        );
        
      case 'signature':
        return (
          <div className="relative border border-gray-300 h-32 bg-white rounded flex items-center justify-center">
            {value ? (
              <div className="text-center">
                <p className="text-sm italic">{String(value)}</p>
                <p className="text-xs text-gray-500">E-signature</p>
              </div>
            ) : (
              <Button onClick={() => onChange(id, "John Doe")}>
                Add Signature
              </Button>
            )}
          </div>
        );
        
      default:
        return null;
    }
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
  
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-darkText mb-1">
        {label}
      </label>
      {renderField()}
    </div>
  );
};

export default FormField;