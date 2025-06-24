import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Loader2,
  Volume2,
  Stethoscope,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface VoiceAssistantProps {
  className?: string;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversation, setConversation] = useState<
    Array<{ type: string; content: string }>
  >([]);
  const [currentPatient, setCurrentPatient] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState<string | null>(
    null
  );

  // Manual text input
  const [manualInput, setManualInput] = useState("");

  // Panel resizing
  const DEFAULT_SIZE = { width: 384, height: 600 }; // Tailwind w-96 and max-h-600px
  const [panelSize, setPanelSize] = useState<{ width: number; height: number }>(
    DEFAULT_SIZE
  );
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<HTMLAudioElement | null>(null);

  // Initialize WebSocket connection
  const initWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return wsRef.current;

    const ws = new WebSocket("ws://localhost:8000/clinic_voice_ws");

    ws.onopen = () => {
      console.log("Voice assistant connected");
      setError(null);
    };

    ws.onmessage = async (event) => {
      if (event.data instanceof Blob) {
        // Audio data - play it
        setIsSpeaking(true);
        setIsProcessing(false);

        const audioBlob = event.data;
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioQueueRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          // Automatically start listening again for continuous conversation
          if (isOpen) {
            startListening();
          }
        };

        try {
          await audio.play();
        } catch (err) {
          console.error("Audio playback error:", err);
          setIsSpeaking(false);
        }
      } else {
        // Text message
        const msg = JSON.parse(event.data);

        if (msg.type === "assistant_text") {
          // First, add the user's transcript to conversation if we have one
          if (msg.user_transcript) {
            setConversation((prev) => {
              // Remove any "Speaking..." placeholder
              const filtered = prev.filter((m) => m.content !== "Speaking...");
              return [
                ...filtered,
                { type: "user", content: msg.user_transcript },
              ];
            });
          }

          // Add assistant's response to conversation
          setConversation((prev) => [
            ...prev,
            { type: "assistant", content: msg.content },
          ]);

          // Stop processing spinner now that we have a response (audio may follow)
          setIsProcessing(false);

          // Update current patient if provided
          if (msg.current_patient) {
            setCurrentPatient(msg.current_patient);
          }
        } else if (msg.type === "error") {
          setError(msg.content);
          setIsProcessing(false);
          setIsListening(false);
        }
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("Connection failed. Please try again.");
      setIsListening(false);
      setIsProcessing(false);
    };

    ws.onclose = () => {
      console.log("Voice assistant disconnected");
      setIsListening(false);
      setIsProcessing(false);
    };

    wsRef.current = ws;
    return ws;
  };

  // Start listening
  const startListening = async () => {
    try {
      const ws = initWebSocket();

      // Wait for connection
      let attempts = 0;
      while (ws.readyState !== WebSocket.OPEN && attempts < 10) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      if (ws.readyState !== WebSocket.OPEN) {
        setError("Failed to connect. Please try again.");
        return;
      }

      setIsListening(true);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = mediaRecorder;

      let audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setIsListening(false);
        setIsProcessing(true);

        if (audioChunks.length > 0 && ws.readyState === WebSocket.OPEN) {
          const audioBlob = new Blob(audioChunks, { type: mimeType });

          // Don't add placeholder message - wait for actual transcript
          // The transcript will come back in the assistant_text message

          // Send audio
          ws.send(audioBlob);
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send("END");
            }
          }, 100);
        }

        // Clean up
        stream.getTracks().forEach((track) => track.stop());
      };

      // Start recording
      mediaRecorder.start(1000);

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          stopListening();
        }
      }, 10000);
    } catch (error) {
      console.error("Error starting recording:", error);
      setError("Microphone access denied or unavailable.");
      setIsListening(false);
    }
  };

  // Stop listening
  const stopListening = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  };

  // Toggle voice assistant
  const toggleVoiceAssistant = () => {
    if (isOpen) {
      setIsOpen(false);
      stopListening();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConversation([]);
      setCurrentPatient(null);
    } else {
      setIsOpen(true);
      setConversation([
        {
          type: "assistant",
          content:
            'Hello Doctor! I can help you access patient information. Just say something like "Tell me about patient John Doe" or "What are the current medications for Jane Smith?"',
        },
      ]);
      setTimeout(() => startListening(), 500);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (audioQueueRef.current) {
        audioQueueRef.current.pause();
      }
    };
  }, []);

  const getStatusIcon = () => {
    if (isListening) return <Mic className="h-5 w-5 animate-pulse" />;
    if (isProcessing) return <Loader2 className="h-5 w-5 animate-spin" />;
    if (isSpeaking) return <Volume2 className="h-5 w-5 animate-pulse" />;
    return <MicOff className="h-5 w-5" />;
  };

  const getStatusText = () => {
    if (isListening) return "Listening...";
    if (isProcessing) return "Processing...";
    if (isSpeaking) return "Speaking...";
    return "Click microphone to speak";
  };

  const getStatusColor = () => {
    if (isListening) return "text-red-500";
    if (isProcessing) return "text-blue-500";
    if (isSpeaking) return "text-green-500";
    return "text-gray-500";
  };

  // ---------------- Manual Text Query ------------------
  const sendManualQuery = () => {
    const text = manualInput.trim();
    if (!text) return;

    // Ensure WebSocket open
    const ws = initWebSocket();

    if (ws.readyState !== WebSocket.OPEN) {
      setError("Connection not established.");
      return;
    }

    // Add to conversation immediately
    setConversation((prev) => [...prev, { type: "user", content: text }]);

    ws.send(
      JSON.stringify({
        type: "text_query",
        transcript: text,
      })
    );

    setManualInput("");
    setIsProcessing(true);
  };

  // Handle Enter key in input
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendManualQuery();
    }
  };

  // ---------------- Resizing ---------------------------
  const onResizeMouseDown = (e: React.MouseEvent) => {
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: panelSize.width,
      startH: panelSize.height,
    };

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dx = ev.clientX - resizeRef.current.startX;
      const dy = ev.clientY - resizeRef.current.startY;
      setPanelSize({
        width: Math.max(320, resizeRef.current.startW + dx),
        height: Math.max(400, resizeRef.current.startH - dy), // dragging up increases height
      });
    };

    const onMouseUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const minimizePanel = () => {
    setPanelSize(DEFAULT_SIZE);
  };

  return (
    <>
      {/* Floating Voice Button */}
      <Button
        onClick={toggleVoiceAssistant}
        className={cn(
          "fixed bottom-6 left-6 h-16 w-16 rounded-full shadow-xl",
          "bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
          "text-white transition-all duration-300 hover:scale-110 z-50",
          "flex items-center justify-center group",
          isOpen && "ring-4 ring-blue-300 ring-opacity-50",
          className
        )}
      >
        <div className="relative">
          <Stethoscope className="h-8 w-8" />
          {isOpen && (
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full animate-pulse" />
          )}
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-gray-900 text-white text-sm py-1 px-3 rounded-lg whitespace-nowrap">
            Voice Assistant
          </div>
        </div>
      </Button>

      {/* Voice Assistant Panel */}
      {isOpen && (
        <Card
          className="fixed bottom-24 left-6 shadow-2xl z-50 flex flex-col"
          style={{ width: panelSize.width, height: panelSize.height }}
        >
          {/* Header */}
          <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 relative">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Medical Assistant</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentPatient
                    ? `Discussing: ${currentPatient}`
                    : "No patient selected"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {panelSize.width !== DEFAULT_SIZE.width && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={minimizePanel}
                    className="h-8 w-8 p-0"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleVoiceAssistant}
                  className="h-8 w-8 p-0"
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Resize handle */}
            <div
              onMouseDown={onResizeMouseDown}
              className="absolute -top-1 right-0 w-4 h-4 cursor-nwse-resize"
            />
          </div>

          {/* Conversation */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {conversation.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex",
                  msg.type === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    msg.type === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Manual Input */}
          <div className="p-3 border-t bg-white dark:bg-gray-800 flex items-center gap-2">
            <input
              className="flex-1 border rounded-md px-2 py-1 text-sm dark:bg-gray-900 dark:border-gray-700"
              placeholder="Type your question..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={onInputKeyDown}
              disabled={isProcessing}
            />
            <Button
              size="sm"
              onClick={sendManualQuery}
              disabled={isProcessing || !manualInput.trim()}
            >
              Send
            </Button>
          </div>

          {/* Status Bar */}
          <div className="p-4 border-t bg-gray-50 dark:bg-gray-900">
            {error ? (
              <div className="text-red-500 text-sm text-center">{error}</div>
            ) : (
              <div className="flex items-center justify-center space-x-3">
                <div className={cn("transition-colors", getStatusColor())}>
                  {getStatusIcon()}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {getStatusText()}
                </span>
                <Button
                  size="sm"
                  variant={isListening ? "destructive" : "default"}
                  onClick={isListening ? stopListening : startListening}
                  disabled={isProcessing || isSpeaking}
                  className="h-8"
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-4 w-4 mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-1" />
                      Speak
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  );
};
