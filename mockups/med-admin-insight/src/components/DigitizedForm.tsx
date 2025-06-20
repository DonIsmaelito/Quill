import React, { useState } from "react";
import { FormField } from "../types/form";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { X, Plus, Type, CheckSquare, Calendar, FileSignature, List, Table as TableIcon, Edit2 } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Textarea } from "./ui/textarea";

interface DigitizedFormProps {
  fields: FormField[];
  onDeleteField?: (fieldId: string) => void;
  onAddField?: (field: FormField, index: number) => void;
  onEditField?: (fieldId: string, updates: Partial<FormField>) => void;
}

interface TableField {
  id: string;
  type: "text" | "checkbox" | "radio" | "select" | "date" | "signature";
  label: string;
  value: string | boolean;
}

type FieldType = FormField["type"] | "header" | "subheader";

interface TableColumn {
  id: string;
  label: string;
  type: "text" | "checkbox" | "date";
}

interface FieldConfig {
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  columns?: TableColumn[];
}

export function DigitizedForm({ fields, onDeleteField, onAddField, onEditField }: DigitizedFormProps) {
  let isFirstHeader = true;
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [fieldConfig, setFieldConfig] = useState<FieldConfig>({
    type: "text",
    label: "",
    required: false,
  });
  const [newOption, setNewOption] = useState("");
  const [newColumn, setNewColumn] = useState<TableColumn>({ id: "", label: "", type: "text" });

  const DeleteButton = ({ fieldId }: { fieldId: string }) => (
    <Button
      variant="ghost"
      size="icon"
      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white rounded-full shadow-sm"
      onClick={() => onDeleteField?.(fieldId)}
    >
      <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
    </Button>
  );

  const EditButton = ({ field }: { field: FormField }) => (
    <Button
      variant="ghost"
      size="icon"
      className="absolute top-1 right-8 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white rounded-full shadow-sm"
      onClick={() => {
        setEditingField(field);
        setFieldConfig({
          type: field.type,
          label: field.label,
          required: field.required || false,
          placeholder: field.placeholder,
          options: field.options,
          columns: field.type === "table" ? JSON.parse(field.value as string) : undefined,
        });
        setShowEditModal(true);
      }}
    >
      <Edit2 className="h-4 w-4 text-gray-500 hover:text-medical-primary" />
    </Button>
  );

  const InsertButton = ({ index }: { index: number }) => (
    <div className="relative h-2 group">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-px w-full bg-transparent group-hover:bg-gray-200 transition-colors"></div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-gray-50 rounded-full shadow-sm border border-gray-200"
          onClick={() => {
            setInsertIndex(index);
            setShowConfigModal(true);
          }}
        >
          <Plus className="h-3 w-3 text-gray-400" />
        </Button>
      </div>
    </div>
  );

  const handleAddField = () => {
    if (!selectedFieldType || insertIndex === null) return;

    const newField: FormField = {
      id: `${selectedFieldType}-${Date.now()}`,
      type: selectedFieldType === "header" || selectedFieldType === "subheader" ? "text" : selectedFieldType,
      label: fieldConfig.label,
      required: fieldConfig.required,
      placeholder: fieldConfig.placeholder,
      options: fieldConfig.options,
      value: selectedFieldType === "checkbox" ? false : 
             selectedFieldType === "table" ? JSON.stringify(fieldConfig.columns || []) : "",
      position: {
        x: 0,
        y: 0,
        width: selectedFieldType === "header" || selectedFieldType === "subheader" ? 600 : 
               selectedFieldType === "table" ? 600 : 300,
        height: selectedFieldType === "header" ? 48 : 
                selectedFieldType === "subheader" ? 36 : 
                selectedFieldType === "table" ? 200 : 40
      }
    };

    onAddField?.(newField, insertIndex);
    setShowConfigModal(false);
    setSelectedFieldType(null);
    setFieldConfig({
      type: "text",
      label: "",
      required: false,
    });
    setNewColumn({ id: "", label: "", type: "text" });
  };

  const handleEditField = () => {
    if (!editingField) return;

    onEditField?.(editingField.id, {
      label: fieldConfig.label,
      required: fieldConfig.required,
      placeholder: fieldConfig.placeholder,
      options: fieldConfig.options,
      value: editingField.type === "table" ? JSON.stringify(fieldConfig.columns || []) : undefined
    });

    setShowEditModal(false);
    setEditingField(null);
    setFieldConfig({
      type: "text",
      label: "",
      required: false,
    });
  };

  const renderField = (field: FormField) => {
    // Check if this is a header field (based on width and height)
    const isHeader = field.position.width === 600 && (field.position.height === 48 || field.position.height === 36);
    const isSubheader = field.position.height === 36;

    if (isHeader) {
      const headerElement = (
        <div key={field.id} className={`${isSubheader ? 'mt-8' : 'mt-12'} mb-6 relative group`}>
          {!isSubheader && !isFirstHeader && <hr className="border-medical-primary/20 mb-6" />}
          <h2 className={`font-semibold ${isSubheader ? 'text-lg text-gray-700' : 'text-2xl text-medical-primary'}`}>
            {field.label}
          </h2>
          {isSubheader && <hr className="border-medical-primary/10 mt-2" />}
          <EditButton field={field} />
          <DeleteButton fieldId={field.id} />
        </div>
      );
      
      if (!isSubheader) {
        isFirstHeader = false;
      }
      
      return headerElement;
    }

    // Check if this is a table field (based on width and height)
    const isTable = field.position.width === 600 && field.position.height === 200;
    if (isTable) {
      try {
        const tableFields: TableField[] = JSON.parse(field.value as string);
        return (
          <div key={field.id} className="mb-6 relative group">
            <Label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="border border-medical-primary/20 rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {tableFields.map((col) => (
                        <TableHead key={col.id} className="bg-medical-primary/5 text-medical-primary font-medium text-center whitespace-nowrap">
                          {col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      {tableFields.map((col) => (
                        <TableCell key={col.id} className="bg-white whitespace-nowrap">
                          {col.type === "checkbox" ? (
                            <div className="flex justify-center">
                              <Checkbox 
                                checked={col.value as boolean} 
                                onCheckedChange={(checked) => {
                                  const newValue = checked as boolean;
                                  const updatedFields = tableFields.map(f => 
                                    f.id === col.id ? { ...f, value: newValue } : f
                                  );
                                  onEditField?.(field.id, {
                                    value: JSON.stringify(updatedFields)
                                  });
                                }}
                                className="border-medical-primary/30"
                              />
                            </div>
                          ) : col.type === "date" ? (
                            <Input 
                              type="date" 
                              value={col.value as string} 
                              onChange={(e) => {
                                const newValue = e.target.value;
                                const updatedFields = tableFields.map(f => 
                                  f.id === col.id ? { ...f, value: newValue } : f
                                );
                                onEditField?.(field.id, {
                                  value: JSON.stringify(updatedFields)
                                });
                              }}
                              className="w-full border-medical-primary/20 focus:border-medical-primary/40"
                            />
                          ) : (
                            <Input 
                              type="text" 
                              value={col.value as string} 
                              onChange={(e) => {
                                const newValue = e.target.value;
                                const updatedFields = tableFields.map(f => 
                                  f.id === col.id ? { ...f, value: newValue } : f
                                );
                                onEditField?.(field.id, {
                                  value: JSON.stringify(updatedFields)
                                });
                              }}
                              className="w-full border-medical-primary/20 focus:border-medical-primary/40"
                            />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
            <EditButton field={field} />
            <DeleteButton fieldId={field.id} />
          </div>
        );
      } catch (e) {
        console.error("Error parsing table data:", e);
        return null;
      }
    }

    switch (field.type) {
      case "text":
        return (
          <div key={field.id} className="mb-4 relative group">
            <Label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type="text"
              placeholder={field.placeholder}
              required={field.required}
              className="w-full border-medical-primary/20 focus:border-medical-primary/40"
              defaultValue={field.value as string}
            />
            <EditButton field={field} />
            <DeleteButton fieldId={field.id} />
          </div>
        );
      case "checkbox":
        return (
          <div key={field.id} className="flex items-center space-x-2 mb-4 relative group">
            <Checkbox id={field.id} required={field.required} defaultChecked={field.value as boolean} className="border-medical-primary/30" />
            <Label htmlFor={field.id} className="text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <EditButton field={field} />
            <DeleteButton fieldId={field.id} />
          </div>
        );
      case "radio":
        return (
          <div key={field.id} className="mb-4 relative group">
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <RadioGroup required={field.required} defaultValue={field.value as string}>
              {field.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${field.id}-${option}`} className="border-medical-primary/30" />
                  <Label htmlFor={`${field.id}-${option}`} className="text-sm text-gray-700">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <EditButton field={field} />
            <DeleteButton fieldId={field.id} />
          </div>
        );
      case "select":
        return (
          <div key={field.id} className="mb-4 relative group">
            <Label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select required={field.required} defaultValue={field.value as string}>
              <SelectTrigger className="w-full border-medical-primary/20 focus:border-medical-primary/40">
                <SelectValue placeholder={field.placeholder || "Select an option"} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <EditButton field={field} />
            <DeleteButton fieldId={field.id} />
          </div>
        );
      case "date":
        return (
          <div key={field.id} className="mb-4 relative group">
            <Label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type="date"
              required={field.required}
              className="w-full border-medical-primary/20 focus:border-medical-primary/40"
              defaultValue={field.value as string}
            />
            <EditButton field={field} />
            <DeleteButton fieldId={field.id} />
          </div>
        );
      case "signature":
        return (
          <div key={field.id} className="mb-4 relative group">
            <Label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="border-2 border-dashed border-medical-primary/20 rounded-lg p-4 text-center cursor-pointer hover:border-medical-primary/40 transition-colors">
              <p className="text-sm text-gray-500">Click to sign</p>
            </div>
            <EditButton field={field} />
            <DeleteButton fieldId={field.id} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 overflow-y-auto h-full bg-white rounded-lg shadow-sm">
      <form className="space-y-4">
        {fields.map((field, index) => (
          <React.Fragment key={field.id}>
            {renderField(field)}
            <InsertButton index={index + 1} />
          </React.Fragment>
        ))}
      </form>

      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Field</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select
                value={selectedFieldType || ""}
                onValueChange={(value: FieldType) => {
                  setSelectedFieldType(value);
                  setFieldConfig(prev => ({ ...prev, type: value }));
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select field type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="header">
                    <div className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      <span>Header</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="subheader">
                    <div className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      <span>Subheader</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="text">
                    <div className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      <span>Text</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="checkbox">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" />
                      <span>Checkbox</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="radio">
                    <div className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      <span>Radio</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="select">
                    <div className="flex items-center gap-2">
                      <List className="h-4 w-4" />
                      <span>Select</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="date">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Date</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="signature">
                    <div className="flex items-center gap-2">
                      <FileSignature className="h-4 w-4" />
                      <span>Signature</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="table">
                    <div className="flex items-center gap-2">
                      <TableIcon className="h-4 w-4" />
                      <span>Table</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="label" className="text-right">
                Label
              </Label>
              <Input
                id="label"
                value={fieldConfig.label}
                onChange={(e) => setFieldConfig(prev => ({ ...prev, label: e.target.value }))}
                className="col-span-3"
                placeholder={selectedFieldType === "header" ? "Enter header text" : 
                           selectedFieldType === "subheader" ? "Enter subheader text" : 
                           "Enter field label"}
              />
            </div>

            {selectedFieldType === "table" && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Columns</Label>
                <div className="col-span-3 space-y-2">
                  {fieldConfig.columns?.map((column, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input 
                        value={column.label} 
                        readOnly 
                        className="flex-1"
                      />
                      <Select
                        value={column.type}
                        onValueChange={(value: "text" | "checkbox" | "date") => {
                          setFieldConfig(prev => ({
                            ...prev,
                            columns: prev.columns?.map((col, i) => 
                              i === index ? { ...col, type: value } : col
                            )
                          }));
                        }}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setFieldConfig(prev => ({
                            ...prev,
                            columns: prev.columns?.filter((_, i) => i !== index)
                          }));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newColumn.label}
                      onChange={(e) => setNewColumn(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="Column name"
                      className="flex-1"
                    />
                    <Select
                      value={newColumn.type}
                      onValueChange={(value: "text" | "checkbox" | "date") => 
                        setNewColumn(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (newColumn.label.trim()) {
                          setFieldConfig(prev => ({
                            ...prev,
                            columns: [...(prev.columns || []), { ...newColumn, id: `col-${Date.now()}` }]
                          }));
                          setNewColumn({ id: "", label: "", type: "text" });
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {(selectedFieldType === "radio" || selectedFieldType === "select") && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Options</Label>
                <div className="col-span-3 space-y-2">
                  {fieldConfig.options?.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input value={option} readOnly />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setFieldConfig(prev => ({
                            ...prev,
                            options: prev.options?.filter((_, i) => i !== index)
                          }));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder="Add new option"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (newOption.trim()) {
                          setFieldConfig(prev => ({
                            ...prev,
                            options: [...(prev.options || []), newOption.trim()]
                          }));
                          setNewOption("");
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="required" className="text-right">
                Required
              </Label>
              <Checkbox
                id="required"
                checked={fieldConfig.required}
                onCheckedChange={(checked) => 
                  setFieldConfig(prev => ({ ...prev, required: checked as boolean }))
                }
                className="col-span-3"
                disabled={selectedFieldType === "header" || selectedFieldType === "subheader"}
              />
            </div>

            {selectedFieldType === "text" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="placeholder" className="text-right">
                  Placeholder
                </Label>
                <Input
                  id="placeholder"
                  value={fieldConfig.placeholder || ""}
                  onChange={(e) => setFieldConfig(prev => ({ ...prev, placeholder: e.target.value }))}
                  className="col-span-3"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddField} 
              disabled={
                !selectedFieldType || 
                !fieldConfig.label || 
                (selectedFieldType === "table" && (!fieldConfig.columns || fieldConfig.columns.length === 0))
              }
            >
              Add Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Field</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="label" className="text-right">
                Label
              </Label>
              <Input
                id="label"
                value={fieldConfig.label}
                onChange={(e) => setFieldConfig(prev => ({ ...prev, label: e.target.value }))}
                className="col-span-3"
              />
            </div>

            {editingField?.type === "table" && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Columns</Label>
                <div className="col-span-3 space-y-2">
                  {fieldConfig.columns?.map((column, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input 
                        value={column.label} 
                        onChange={(e) => {
                          setFieldConfig(prev => ({
                            ...prev,
                            columns: prev.columns?.map((col, i) => 
                              i === index ? { ...col, label: e.target.value } : col
                            )
                          }));
                        }}
                        className="flex-1 bg-green-50 border-green-200 focus:border-green-300 focus:ring-green-200"
                      />
                      <Select
                        value={column.type}
                        onValueChange={(value: "text" | "checkbox" | "date") => {
                          setFieldConfig(prev => ({
                            ...prev,
                            columns: prev.columns?.map((col, i) => 
                              i === index ? { ...col, type: value } : col
                            )
                          }));
                        }}
                      >
                        <SelectTrigger className="w-24 bg-green-50 border-green-200 focus:border-green-300 focus:ring-green-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setFieldConfig(prev => ({
                            ...prev,
                            columns: prev.columns?.filter((_, i) => i !== index)
                          }));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newColumn.label}
                      onChange={(e) => setNewColumn(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="Column name"
                      className="flex-1"
                    />
                    <Select
                      value={newColumn.type}
                      onValueChange={(value: "text" | "checkbox" | "date") => 
                        setNewColumn(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (newColumn.label.trim()) {
                          setFieldConfig(prev => ({
                            ...prev,
                            columns: [...(prev.columns || []), { ...newColumn, id: `col-${Date.now()}` }]
                          }));
                          setNewColumn({ id: "", label: "", type: "text" });
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {(editingField?.type === "radio" || editingField?.type === "select") && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Options</Label>
                <div className="col-span-3 space-y-2">
                  {fieldConfig.options?.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input value={option} readOnly />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setFieldConfig(prev => ({
                            ...prev,
                            options: prev.options?.filter((_, i) => i !== index)
                          }));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder="Add new option"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (newOption.trim()) {
                          setFieldConfig(prev => ({
                            ...prev,
                            options: [...(prev.options || []), newOption.trim()]
                          }));
                          setNewOption("");
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="required" className="text-right">
                Required
              </Label>
              <Checkbox
                id="required"
                checked={fieldConfig.required}
                onCheckedChange={(checked) => 
                  setFieldConfig(prev => ({ ...prev, required: checked as boolean }))
                }
                className="col-span-3"
              />
            </div>

            {editingField?.type === "text" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="placeholder" className="text-right">
                  Placeholder
                </Label>
                <Input
                  id="placeholder"
                  value={fieldConfig.placeholder || ""}
                  onChange={(e) => setFieldConfig(prev => ({ ...prev, placeholder: e.target.value }))}
                  className="col-span-3"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditField} 
              disabled={
                !fieldConfig.label || 
                (editingField?.type === "table" && (!fieldConfig.columns || fieldConfig.columns.length === 0))
              }
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 