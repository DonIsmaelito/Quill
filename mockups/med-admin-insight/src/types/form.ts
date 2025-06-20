export interface FormField {
  id: string;
  type: "text" | "checkbox" | "radio" | "select" | "date" | "signature" | "table";
  label: string;
  required: boolean;
  value?: string | boolean;
  options?: string[];
  placeholder?: string;
  columns?: Array<{
    id: string;
    label: string;
    type: "text" | "checkbox" | "date";
    value: string | boolean;
  }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
} 