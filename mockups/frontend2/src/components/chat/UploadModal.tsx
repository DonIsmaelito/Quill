import React from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  status: 'loading' | 'success' | 'error';
  fileName: string;
  errorMessage?: string;
  onClose: () => void;
}

const UploadModal = ({ isOpen, status, fileName, errorMessage, onClose }: UploadModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Processing Document</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Please wait while we process "{fileName}"...
              </p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Upload Successful</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                "{fileName}" has been processed successfully.
              </p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Upload Failed</h3>
              <p className="text-sm text-red-500 dark:text-red-400 text-center">
                {errorMessage || 'An error occurred while processing the document.'}
              </p>
            </>
          )}
          
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {status === 'loading' ? 'Cancel' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal; 