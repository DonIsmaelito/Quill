import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onAttach: () => void; // Keeping the prop to maintain interface compatibility
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onAttach }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <div className="flex items-center space-x-2 p-2 border-t bg-white">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Send a message..."
        className="flex-1 border-accent"
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
      />
      <Button 
        onClick={handleSend}
        className="bg-primary hover:bg-primary/90"
      >
        Send
      </Button>
    </div>
  );
};

export default ChatInput;