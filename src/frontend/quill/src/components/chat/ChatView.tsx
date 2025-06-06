'use client';

import React, { useState } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
import { useChatService } from '@/context/ChatContext';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import { MessageType } from './types';

interface ChatViewProps {
  onBack: () => void;
  messages: MessageType[];
  onMessagesUpdate: (messages: MessageType[]) => void;
}

const ChatView = ({ onBack, messages, onMessagesUpdate }: ChatViewProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { documents } = useDocuments();
  const { chatService } = useChatService();

  const handleSendMessage = async (messageText: string) => {
    try {
      setIsLoading(true);
      // Add user message immediately
      const updatedMessages = [
        ...messages,
        { type: 'user', content: messageText }
      ];
      onMessagesUpdate(updatedMessages);

      // Get response from chatbot
      const response = await chatService.generateResponse(messageText, {
        documents,
        chatHistory: messages
      });

      // Add bot response
      onMessagesUpdate([
        ...updatedMessages,
        { type: 'bot', content: response }
      ]);
    } catch (error) {
      console.error('Error in chat:', error);
      onMessagesUpdate([
        ...messages,
        { type: 'user', content: messageText },
        { type: 'bot', content: 'Sorry, I encountered an error processing your request.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for agent responses (used for automatic messages from the agent)
  const handleAgentResponse = (messageText: string) => {
    // Add an agent message without sending a request
    onMessagesUpdate([
      ...messages,
      { type: 'bot', content: messageText }
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
        <button
          onClick={onBack}
          className="text-lg text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Form Assistant</h1>
        <div className="w-8" />
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <ChatMessages messages={messages} isLoading={isLoading} />
        <ChatInput 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading} 
          onAgentResponse={handleAgentResponse}
        />
      </div>
    </div>
  );
};

export default ChatView;