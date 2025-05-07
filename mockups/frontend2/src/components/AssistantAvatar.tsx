import React from 'react';

const AssistantAvatar: React.FC = () => {
  return (
    <div className="flex items-center space-x-3">
      <img 
        src="Screenshot 2025-05-05 122826.png" 
        alt="Healthcare Assistant" 
        className="w-10 h-10 rounded-full" 
      />
      <div>
        <span className="font-semibold text-darkText block">Dr. Auto</span>
        <span className="text-xs text-gray-500">Your Form Assistant</span>
      </div>
    </div>
  );
};

export default AssistantAvatar;