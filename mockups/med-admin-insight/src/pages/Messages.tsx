import React, { useState, useEffect, FormEvent } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, SendHorizonal, Smile } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "contact";
  text: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  contactName: string;
  contactAvatar: string;
  lastMessage: string;
  lastMessageTimestamp: Date;
  messages: Message[];
}

const initialConversations: Conversation[] = [
  {
    id: "jonathan-doe",
    contactName: "Jonathan Doe",
    contactAvatar:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80",
    lastMessage: "Sounds good, I will be there.",
    lastMessageTimestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    messages: [
      {
        id: "msg1-jd",
        sender: "contact",
        text: "Hey, are we still on for the meeting tomorrow at 10 AM?",
        timestamp: new Date(Date.now() - 1000 * 60 * 10),
      },
      {
        id: "msg2-jd",
        sender: "user",
        text: "Yes, Jonathan! See you then.",
        timestamp: new Date(Date.now() - 1000 * 60 * 8),
      },
      {
        id: "msg3-jd",
        sender: "contact",
        text: "Sounds good, I will be there.",
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
      },
    ],
  },
  {
    id: "emily-stone",
    contactName: "Emily Stone",
    contactAvatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80",
    lastMessage: "Thank you for the update!",
    lastMessageTimestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    messages: [
      {
        id: "msg1-es",
        sender: "user",
        text: "Hi Emily, just wanted to confirm your appointment for next Tuesday.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2 - 1000 * 60 * 5),
      },
      {
        id: "msg2-es",
        sender: "contact",
        text: "Thank you for the update!",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
    ],
  },
  {
    id: "mark-hey-smith",
    contactName: "Mark Hey Smith",
    contactAvatar:
      "https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=150&q=80",
    lastMessage: "Okay, I will call back later.",
    lastMessageTimestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    messages: [
      {
        id: "msg1-mhs",
        sender: "contact",
        text: "Okay, I will call back later.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
    ],
  },
];

export default function MessagesPage() {
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState("");

  useEffect(() => {
    // Select the first conversation by default
    if (conversations.length > 0) {
      const sortedConversations = [...conversations].sort(
        (a, b) =>
          b.lastMessageTimestamp.getTime() - a.lastMessageTimestamp.getTime()
      );
      setConversations(sortedConversations);
      setSelectedConversation(sortedConversations[0]);
    }
  }, []); // Run once on mount

  const handleSelectConversation = (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    setSelectedConversation(conversation || null);
  };

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    const newMessage: Message = {
      id: `msg${Date.now()}`,
      sender: "user",
      text: messageInput.trim(),
      timestamp: new Date(),
    };

    const updatedConversation: Conversation = {
      ...selectedConversation,
      messages: [...selectedConversation.messages, newMessage],
      lastMessage: newMessage.text,
      lastMessageTimestamp: newMessage.timestamp,
    };

    const updatedConversations = conversations.map((conv) =>
      conv.id === selectedConversation.id ? updatedConversation : conv
    );

    // Sort again to bring the current conversation to the top
    const sortedConversations = [...updatedConversations].sort(
      (a, b) =>
        b.lastMessageTimestamp.getTime() - a.lastMessageTimestamp.getTime()
    );

    setConversations(sortedConversations);
    setSelectedConversation(updatedConversation);
    setMessageInput("");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-medical-background">
      <Sidebar />
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List */}
        <div className="w-1/3 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-medical-text">
              Messages
            </h2>
            {/* Future search bar can go here */}
          </div>
          <ScrollArea className="flex-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-4 flex items-center cursor-pointer hover:bg-gray-100 ${
                  selectedConversation?.id === conv.id ? "bg-gray-100" : ""
                }`}
                onClick={() => handleSelectConversation(conv.id)}
              >
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage
                    src={conv.contactAvatar}
                    alt={conv.contactName}
                  />
                  <AvatarFallback>
                    {conv.contactName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-medical-text truncate">
                      {conv.contactName}
                    </p>
                    <p className="text-xs text-medical-subtext">
                      {conv.lastMessageTimestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <p className="text-sm text-medical-subtext truncate">
                    {conv.lastMessage}
                  </p>
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-gray-200 flex items-center">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage
                    src={selectedConversation.contactAvatar}
                    alt={selectedConversation.contactName}
                  />
                  <AvatarFallback>
                    {selectedConversation.contactName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-medical-text">
                    {selectedConversation.contactName}
                  </p>
                  {/* Future status (Online/Offline) can go here */}
                </div>
              </div>
              <ScrollArea className="flex-1 p-4 space-y-4">
                {selectedConversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md p-3 rounded-lg ${
                        msg.sender === "user"
                          ? "bg-medical-primary text-white"
                          : "bg-gray-200 text-medical-text"
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.sender === "user"
                            ? "text-gray-200/80 text-right"
                            : "text-gray-500 text-left"
                        }`}
                      >
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </ScrollArea>
              <div className="p-4 border-t border-gray-200 bg-white">
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-2"
                >
                  <Button variant="ghost" size="icon" type="button">
                    <Paperclip className="h-5 w-5 text-gray-500" />
                  </Button>
                  <Button variant="ghost" size="icon" type="button">
                    <Smile className="h-5 w-5 text-gray-500" />
                  </Button>
                  <Input
                    type="text"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="bg-medical-primary hover:bg-medical-primary/90"
                  >
                    <SendHorizonal className="h-5 w-5 text-white" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-medical-subtext">
                Select a conversation to start messaging.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
