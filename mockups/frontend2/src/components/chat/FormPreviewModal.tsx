import React from 'react';
import { Download } from 'lucide-react';

interface FormPreviewModalProps {
  isOpen: boolean;
  filePath: string;
  fileName?: string;
  onClose: () => void;
}

const FormPreviewModal = ({ isOpen, filePath, fileName, onClose }: FormPreviewModalProps) => {
  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/download?filePath=${encodeURIComponent(filePath)}`);
      if (!response.ok) throw new Error('Failed to download file');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'filled_form.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download the form. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Form Preview
          </h3>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Download className="h-5 w-5" />
            <span>Download</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <iframe
            src={`/api/preview?filePath=${encodeURIComponent(filePath)}`}
            className="w-full h-full"
            title="Form Preview"
          />
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormPreviewModal; 