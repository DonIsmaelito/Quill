import React, { useState, useEffect } from "react";
import { ragService, Message } from "../../services/ragService";
import ChatInput from "./ChatInput";
import LanguageSelector from "../LanguageSelector";
import AssistantMessage from "../AssistantMessage";

interface ChatViewProps {
  onBack: () => void;
  messages: Message[];
  onMessagesUpdate: (messages: Message[]) => void;
}

const ChatView = ({ onBack, messages, onMessagesUpdate }: ChatViewProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const documents = ragService.getDocuments();

  // Load saved language preference from localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem("quill-language");
    if (savedLanguage) {
      setSelectedLanguage(savedLanguage);
    }
  }, []);

  // Handle language change
  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    localStorage.setItem("quill-language", languageCode);

    // Add a system message to inform the user about the language change
    const languageNames: { [key: string]: string } = {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      zh: "Chinese",
      ar: "Arabic",
    };

    const systemMessage = `Language switched to ${languageNames[languageCode]}. I'll now respond in ${languageNames[languageCode]}.`;
    onMessagesUpdate([
      ...messages,
      { type: "system" as const, content: systemMessage },
    ]);
  };

  const handleSendMessage = async (messageText: string) => {
    try {
      setIsLoading(true);
      // Add user message immediately
      const updatedMessages = [
        ...messages,
        { type: "user" as const, content: messageText },
      ];
      onMessagesUpdate(updatedMessages);

      // Get response from chatbot
      const response = await ragService.generateResponse(messageText, {
        documents,
        chatHistory: messages,
        language: selectedLanguage,
      });

      // Add bot response
      onMessagesUpdate([
        ...updatedMessages,
        { type: "bot" as const, content: response },
      ]);
    } catch (error) {
      console.error("Error in chat:", error);
      onMessagesUpdate([
        ...messages,
        { type: "user" as const, content: messageText },
        {
          type: "bot" as const,
          content: "Sorry, I encountered an error processing your request.",
        },
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
      { type: "bot" as const, content: messageText },
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
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Form Assistant
        </h1>
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onLanguageChange={handleLanguageChange}
        />
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <AssistantMessage key={index} isUser={message.type === "user"}>
              {message.content}
            </AssistantMessage>
          ))}
          {isLoading && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onAgentResponse={handleAgentResponse}
          selectedLanguage={selectedLanguage}
          chatHistory={messages.map(msg => ({
            type: msg.type,
            content: msg.content
          }))}
        />
      </div>
    </div>
  );
};

export default ChatView;
