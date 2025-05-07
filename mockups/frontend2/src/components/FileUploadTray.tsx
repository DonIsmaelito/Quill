import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Check, File } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  success: boolean;
}

interface FileUploadTrayProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
}

const FileUploadTray: React.FC<FileUploadTrayProps> = ({ onFilesUploaded }) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    setError(null);

    if (selectedFiles) {
      const newFiles: UploadedFile[] = [];

      Array.from(selectedFiles).forEach(file => {
        // Check for valid file types
        if (file.type === 'application/pdf' || file.type.startsWith('image/png')) {
          const newFile: UploadedFile = {
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: file.type,
            success: true
          };
          
          newFiles.push(newFile);
        } else {
          setError('Only PDF and PNG files are supported.');
          return;
        }
      });

      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onFilesUploaded(updatedFiles);
    }
  };

  const removeFile = (id: string) => {
    const updatedFiles = files.filter(file => file.id !== id);
    setFiles(updatedFiles);
    onFilesUploaded(updatedFiles);
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Uploaded Documents</h3>
        <label>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.png"
            onChange={handleFileChange}
            multiple
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs bg-primary text-white hover:bg-primary/90"
            onClick={() => {
              const fileInput = document.querySelector('input[type="file"]');
              if (fileInput) {
                (fileInput as HTMLInputElement).click();
              }
            }}
          >
            Upload Files
          </Button>
        </label>
      </div>
      
      {error && (
        <div className="text-destructive text-xs bg-destructive/10 p-2 rounded">
          {error}
        </div>
      )}
      
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {files.length === 0 ? (
          <div className="text-gray-400 text-xs text-center py-2">
            No documents uploaded yet
          </div>
        ) : (
          files.map(file => (
            <div 
              key={file.id}
              className={cn(
                "flex items-center justify-between bg-white p-2 rounded border",
                file.success ? "border-success" : "border-destructive"
              )}
            >
              <div className="flex items-center space-x-2">
                <File size={16} className="text-gray-500" />
                <span className="text-xs truncate max-w-[180px]">{file.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                {file.success ? (
                  <Check size={16} className="text-success" />
                ) : (
                  <X size={16} className="text-destructive" />
                )}
                <button 
                  onClick={() => removeFile(file.id)}
                  className="text-gray-400 hover:text-destructive"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FileUploadTray;