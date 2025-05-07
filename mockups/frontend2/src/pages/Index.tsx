
import React, { useState } from 'react';
import AssistantPanel from '@/components/AssistantPanel';
import MedicalForm from '@/components/MedicalForm';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  success: boolean;
}

const Index = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  
  const handleFileUpload = (files: UploadedFile[]) => {
    setUploadedFiles(files);
  };
  
  return (
    <div className="flex h-screen w-full overflow-hidden bg-lightGray">
      <AssistantPanel onFileUpload={handleFileUpload} />
      <div className="form-panel">
        <MedicalForm uploadedFiles={uploadedFiles} />
      </div>
    </div>
  );
};

export default Index;
