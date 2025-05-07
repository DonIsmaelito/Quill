import React from 'react';
import { cn } from '@/lib/utils';

interface AssistantMessageProps {
  isUser?: boolean;
  children: React.ReactNode;
  timestamp?: string;
}

const AssistantMessage: React.FC<AssistantMessageProps> = ({ 
  isUser = false,
  children,
  timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}) => {
  return (
    <div className={cn(
      "mb-4",
      isUser ? "flex justify-end" : "flex justify-start"
    )}>
      <div className={cn(
        "max-w-[80%] rounded-lg px-4 py-2",
        isUser 
          ? "bg-primary text-white rounded-tr-none" 
          : "bg-gray-100 text-darkText rounded-tl-none"
      )}>
        <div className="text-sm">{children}</div>
        <div className={cn(
          "text-xs mt-1",
          isUser ? "text-blue-100" : "text-gray-500"
        )}>
          {timestamp}
        </div>
      </div>
    </div>
  );
};

export default AssistantMessage;
