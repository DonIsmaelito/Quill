declare module "*.json" {
  const value: any;
  export default value;
}

interface TemplateJsonData {
  id: string;
  name: string;
  category: "Administrative" | "Clinical" | "Legal" | "Other";
  uses: number;
  pdfUrl: string;
  description?: string;
  tags?: string[];
  version: number;
  lastEditedBy?: { name: string; avatarUrl?: string } | { name: string; avatarUrl?: string }[];
  lastEditedOn?: string;
  fields?: any;
} 