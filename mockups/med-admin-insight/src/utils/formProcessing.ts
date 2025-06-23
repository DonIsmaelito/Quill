import { FormField } from "../types/form";

interface TableField {
  id: string;
  type: "text" | "checkbox" | "radio" | "select" | "date" | "signature";
  label: string;
  value: string | boolean;
}

// Helper function to determine field type from key
const getFieldType = (key: string): FormField["type"] => {
  if (key.startsWith("text")) return "text";
  if (key.startsWith("boolean")) return "checkbox";
  if (key.startsWith("date")) return "date";
  return "text"; // default to text
};

// Helper function to determine column type from key (for table fields)
const getColumnType = (key: string): "text" | "checkbox" | "radio" | "select" | "date" | "signature" => {
  if (key.startsWith("text")) return "text";
  if (key.startsWith("date")) return "date";
  if (key.startsWith("boolean")) return "checkbox";
  return "text"; // default to text
};

// Helper function to process nested form data
export const processFormData = (
  data: any,
  parentId: string = "",
  level: number = 0
): FormField[] => {
  const fields: FormField[] = [];
  let yOffset = 0;

  for (const [key, value] of Object.entries(data)) {
    const currentId = parentId ? `${parentId}-${key}` : key;
    
    // If the value is an object and not a field type (text, boolean, date, table)
    if (typeof value === "object" && value !== null && !key.match(/^(text|boolean|date|table)\d+$/)) {
      // Add header as a text field with special styling
      fields.push({
        id: currentId,
        type: "text",
        label: key,
        required: false,
        value: "",
        position: {
          x: 0,
          y: yOffset,
          width: 600,
          height: level === 0 ? 48 : 36
        }
      });
      yOffset += level === 0 ? 60 : 48;

      // Process children
      const childFields = processFormData(value, currentId, level + 1);
      fields.push(...childFields);
      yOffset += childFields.length * 48; // Approximate height for child fields
    } else if (key.match(/^(text|boolean|date|table)\d+$/)) {
      if (key.startsWith("table")) {
        // Process table fields
        const tableFields: TableField[] = [];
        for (const [colKey, colValue] of Object.entries(value)) {
          const colType = getColumnType(colKey);
          tableFields.push({
            id: `${currentId}-${colKey}`,
            type: colType,
            label: Object.keys(colValue)[0],
            value: colType === "checkbox" ? false : ""
          });
        }

        // Add table as a text field with table data
        fields.push({
          id: currentId,
          type: "text",
          label: "", // Empty label for table type
          required: false,
          value: JSON.stringify(tableFields), // Store table data as JSON string
          position: {
            x: 0,
            y: yOffset,
            width: 600,
            height: 200 // Height for table with one row
          }
        });
        yOffset += 220; // Table height + margin
      } else {
        // Process regular fields
        const fieldType = getFieldType(key);
        const fieldLabel = Object.keys(value)[0];
        fields.push({
          id: currentId,
          type: fieldType,
          label: fieldLabel,
          required: false,
          value: fieldType === "checkbox" ? false : "",
          position: {
            x: 0,
            y: yOffset,
            width: 300,
            height: 40
          }
        });
        yOffset += 48; // Field height + margin
      }
    }
  }

  return fields;
};