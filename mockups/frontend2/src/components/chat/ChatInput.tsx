import React, { useState, useRef, useEffect } from "react";
import { Upload, ClipboardEdit, Mic, AudioWaveform } from "lucide-react";
import { ragService } from "../../services/ragService";
import UploadModal from "./UploadModal";
import FormPreviewModal from "./FormPreviewModal";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  onAgentResponse?: (message: string) => void;
  onSilentUpload?: (fileName: string) => void;
  selectedLanguage?: string;
}

const ChatInput = ({
  onSendMessage,
  isLoading = false,
  onAgentResponse,
  onSilentUpload,
  selectedLanguage = "en",
}: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [showTooltip1, setShowTooltip1] = useState(false);
  const [showTooltip2, setShowTooltip2] = useState(false);
  const [showFormPreview, setShowFormPreview] = useState(false);
  const [formFilePath, setFormFilePath] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blankFileInputRef = useRef<HTMLInputElement>(null);

  // Tooltip timer refs
  const tooltip1Timer = useRef<NodeJS.Timeout | null>(null);
  const tooltip2Timer = useRef<NodeJS.Timeout | null>(null);

  // Voice-agent state --------------------------------------------------
  // Performance optimizations for low latency:
  // - 1.5s silence detection (vs 3s) for faster response
  const [isRecording, setIsRecording] = useState(false);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [conversationState, setConversationState] = useState<
    "idle" | "listening" | "processing" | "speaking"
  >("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const shouldAutoListen = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Silence detection
  const checkAudioLevel = () => {
    if (!analyserRef.current) return 0;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    return average;
  };

  const startSilenceDetection = () => {
    const detectSilence = () => {
      const audioLevel = checkAudioLevel();
      const silenceThreshold = 5; // Adjust this threshold as needed

      if (audioLevel < silenceThreshold) {
        // Start silence timer if not already started
        if (!silenceTimeoutRef.current) {
          console.log("🔇 Silence detected, starting 1.5-second timer");
          silenceTimeoutRef.current = setTimeout(() => {
            console.log("⏰ 1.5 seconds of silence - auto-stopping recording");
            stopRecording();
          }, 1500); // 1.5 seconds of silence for faster response
        }
      } else {
        // Reset silence timer if user is speaking
        if (silenceTimeoutRef.current) {
          console.log("🗣️ Speech detected - resetting silence timer");
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
      }

      // Continue monitoring if still recording
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        requestAnimationFrame(detectSilence);
      }
    };

    detectSilence();
  };

  // Voice recording functionality
  const startRecording = async () => {
    console.log("🎤 Starting recording...");
    try {
      // Establish WebSocket connection first
      const ws = getWs();

      // Wait for WebSocket to be ready (with timeout)
      let attempts = 0;
      while (ws.readyState !== WebSocket.OPEN && attempts < 10) {
        console.log(
          `⏳ Waiting for WebSocket connection... (${ws.readyState})`
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      if (ws.readyState !== WebSocket.OPEN) {
        console.error("WebSocket connection timeout");
        alert("Voice connection failed. Please try again.");
        setConversationState("idle");
        return;
      }

      console.log(" WebSocket ready for voice recording");
      setConversationState("listening");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log("📡 Got media stream");

      // Set up audio analysis for silence detection
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);

      // Try to use the most compatible format for ElevenLabs
      let mimeType = "audio/webm;codecs=opus";
      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];

      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      console.log("📹 Using MIME type:", mimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      mediaRecorderRef.current = mediaRecorder;

      let audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log("Audio data available:", event.data.size, "bytes");
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log("MediaRecorder stopped, sending audio data");
        setConversationState("processing");

        // Clear silence detection
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }

        if (audioChunks.length > 0 && ws.readyState === WebSocket.OPEN) {
          // Combine all chunks into a single blob
          const audioBlob = new Blob(audioChunks, { type: mimeType });
          console.log("Sending combined audio blob:", audioBlob.size, "bytes");

          if (audioBlob.size > 1000) {
            // Only send if substantial
            ws.send(audioBlob);
            // Send END signal after audio
            setTimeout(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send("END");
                console.log("Sent END signal");
              }
            }, 100);
          } else {
            console.warn("Audio too small, not sending");
            ws.send("END"); // Still send END to reset state
          }
        }
        audioChunks = []; // Clear chunks
      };

      // Start recording with longer intervals to get better chunks
      mediaRecorder.start(1000); // 1 second chunks
      setIsRecording(true);
      console.log("Recording started");

      // Start silence detection instead of timeout
      startSilenceDetection();
    } catch (error) {
      console.error("Error starting recording:", error);
      setConversationState("idle");
      // Show user-friendly error
      if (error.name === "NotAllowedError") {
        alert(
          "Microphone permission denied. Please allow microphone access and try again."
        );
      } else {
        alert("Could not start recording: " + error.message);
      }
    }
  };

  const stopRecording = () => {
    console.log("Stopping recording...");
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log("Recording stop requested");

      // Clear silence detection
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      // Clean up audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Clean up MediaRecorder after a delay to ensure all data is processed
      setTimeout(() => {
        if (mediaRecorderRef.current) {
          // Stop all tracks to free up the microphone
          const stream = mediaRecorderRef.current.stream;
          if (stream) {
            stream.getTracks().forEach((track) => {
              track.stop();
              console.log("Stopped audio track");
            });
          }
          mediaRecorderRef.current = null;
          console.log("MediaRecorder cleaned up");
        }
      }, 500); // Longer delay to ensure stop event completes
    }
  };

  const startConversation = async () => {
    console.log("Starting conversation mode");
    setIsConversationActive(true);
    shouldAutoListen.current = true;
    await startRecording();
  };

  const endConversation = () => {
    console.log("Ending conversation mode");
    setIsConversationActive(false);
    shouldAutoListen.current = false;
    setConversationState("idle");

    // Stop current recording if active
    if (isRecording) {
      stopRecording();
    }

    // Clear any pending silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Clean up any remaining resources
    if (mediaRecorderRef.current) {
      const stream = mediaRecorderRef.current.stream;
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      }
      mediaRecorderRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const handleConversationToggle = () => {
    if (isConversationActive) {
      endConversation();
    } else {
      startConversation();
    }
  };

  // Get conversation status text and icon
  const getConversationStatus = () => {
    if (!isConversationActive) {
      return { text: "Start Conversation", icon: Mic, color: "text-gray-500" };
    }

    switch (conversationState) {
      case "listening":
        return {
          text: "Listening...",
          icon: AudioWaveform,
          color: "text-red-500 animate-pulse",
        };
      case "processing":
        return {
          text: "Processing...",
          icon: AudioWaveform,
          color: "text-blue-500 animate-pulse",
        };
      case "speaking":
        return {
          text: "Speaking...",
          icon: AudioWaveform,
          color: "text-green-500 animate-pulse",
        };
      default:
        return {
          text: "End Conversation",
          icon: AudioWaveform,
          color: "text-red-500 animate-pulse",
        };
    }
  };

  const getWs = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)
      return wsRef.current;

    console.log("Creating new WebSocket connection...");
    wsRef.current = new WebSocket("ws://localhost:8000/voice_ws");

    wsRef.current.onopen = () => {
      console.log("Voice WebSocket connected");
      // Send language preference to voice agent
      if (selectedLanguage) {
        wsRef.current.send(`LANGUAGE:${selectedLanguage}`);
        console.log(`Sent language preference: ${selectedLanguage}`);
      }
    };

    wsRef.current.onmessage = (ev) => {
      console.log("WebSocket message received:", typeof ev.data);
      if (typeof ev.data === "string") {
        const msg = JSON.parse(ev.data);
        console.log("JSON message:", msg);
        if (msg.type === "assistant_text") {
          setConversationState("speaking");

          let responseContent = msg.content;

          // Extract field updates from the response (same logic as regular chat)
          const fieldUpdatesMatch = responseContent.match(
            /\{['"]field_updates['"]:\s*\[[\s\S]*?\]\}/
          );
          let updatedFields: { id: string; value: string }[] = [];

          if (fieldUpdatesMatch) {
            try {
              const fieldUpdatesString = fieldUpdatesMatch[0].replace(
                /'/g,
                '"'
              );
              const updatesObj = JSON.parse(fieldUpdatesString);
              updatedFields = updatesObj.field_updates || [];
              console.log("Voice: Field updates extracted:", updatedFields);

              // Remove the field updates from the response text
              responseContent = responseContent
                .replace(fieldUpdatesMatch[0], "")
                .trim();
              console.log("Voice: Cleaned response text:", responseContent);
            } catch (error) {
              console.error("Voice: Error parsing field updates:", error);
            }
          }

          // Send the cleaned response to chat
          onAgentResponse(responseContent);
          console.log("Assistant response sent to chat");

          // If there were field updates, we'd need a callback to handle them
          // Note: ChatInput doesn't have direct access to form update functions
          // This would need to be passed as a prop if form updates are needed here
          if (updatedFields.length > 0) {
            // Filter out MISSING values before processing
            const actualUpdates = updatedFields.filter(
              (update) =>
                update.value !== "MISSING" &&
                update.value !== "missing" &&
                update.value?.toString().toUpperCase() !== "MISSING"
            );

            if (actualUpdates.length > 0) {
              console.log(
                "Voice: Field updates detected but no handler available in ChatInput"
              );
              console.log(
                "Voice: Consider using AssistantPanel for voice interactions with form updates"
              );
              console.log("Voice: Filtered field updates:", actualUpdates);
            }
          }
        } else if (msg.type === "error") {
          console.error("Server error:", msg.content);
          setConversationState("idle");
          alert("Voice processing error: " + msg.content);
        }
      } else if (ev.data instanceof Blob) {
        console.log(
          "Audio blob received:",
          ev.data.size,
          "bytes",
          "type:",
          ev.data.type
        );
        const audioBlob = URL.createObjectURL(ev.data);
        const audio = new Audio(audioBlob);

        // Add better error handling and debugging
        audio.onerror = (e) => {
          console.error("Audio error event:", e);
          console.error("Audio error details:", audio.error);
        };

        // When audio finishes playing, automatically start listening again if in conversation mode
        audio.onended = () => {
          console.log("Audio playback finished");
          URL.revokeObjectURL(audioBlob); // Clean up object URL
          if (isConversationActive && shouldAutoListen.current) {
            console.log("Auto-starting next recording...");
            setTimeout(() => {
              startRecording();
            }, 500); // Small delay before next recording
          } else {
            setConversationState("idle");
          }
        };

        audio
          .play()
          .then(() => console.log("Audio playback started successfully"))
          .catch((err) => {
            console.error("Audio playback error:", err);
            console.error("Audio source:", audioBlob);
            console.error("Audio readyState:", audio.readyState);
            console.error("Audio networkState:", audio.networkState);
            // If audio fails, still continue conversation
            if (isConversationActive && shouldAutoListen.current) {
              setTimeout(() => {
                startRecording();
              }, 500);
            } else {
              setConversationState("idle");
            }
          });
      } else if (ev.data instanceof ArrayBuffer) {
        console.log("Audio ArrayBuffer received:", ev.data.byteLength, "bytes");
        const audioBuffer = new Blob([ev.data], { type: "audio/mpeg" });
        const audioUrl = URL.createObjectURL(audioBuffer);
        const audio = new Audio(audioUrl);

        // Add better error handling and debugging
        audio.onerror = (e) => {
          console.error("Audio error event:", e);
          console.error("Audio error details:", audio.error);
        };

        // When audio finishes playing, automatically start listening again if in conversation mode
        audio.onended = () => {
          console.log("Audio playback finished");
          URL.revokeObjectURL(audioUrl); // Clean up object URL
          if (isConversationActive && shouldAutoListen.current) {
            console.log("Auto-starting next recording...");
            setTimeout(() => {
              startRecording();
            }, 500); // Small delay before next recording
          } else {
            setConversationState("idle");
          }
        };

        audio
          .play()
          .then(() => console.log("Audio playback started successfully"))
          .catch((err) => {
            console.error("Audio playback error:", err);
            console.error("Audio source:", audioUrl);
            console.error("Audio readyState:", audio.readyState);
            console.error("Audio networkState:", audio.networkState);
            // If audio fails, still continue conversation
            if (isConversationActive && shouldAutoListen.current) {
              setTimeout(() => {
                startRecording();
              }, 500);
            } else {
              setConversationState("idle");
            }
          });
      }
    };

    wsRef.current.onerror = (error) => {
      console.error("Voice WebSocket error:", error);
      setConversationState("idle");
    };

    wsRef.current.onclose = () => {
      console.log("Voice WebSocket disconnected");
      setConversationState("idle");
    };

    return wsRef.current;
  };

  const handleMicClick = async () => {
    handleConversationToggle();
  };

  const handleMouseEnter = (tooltipNumber: 1 | 2) => {
    const timer = setTimeout(() => {
      if (tooltipNumber === 1) {
        setShowTooltip1(true);
      } else {
        setShowTooltip2(true);
      }
    }, 1000);

    if (tooltipNumber === 1) {
      tooltip1Timer.current = timer;
    } else {
      tooltip2Timer.current = timer;
    }
  };

  const handleMouseLeave = (tooltipNumber: 1 | 2) => {
    if (tooltipNumber === 1) {
      if (tooltip1Timer.current) {
        clearTimeout(tooltip1Timer.current);
      }
      setShowTooltip1(false);
    } else {
      if (tooltip2Timer.current) {
        clearTimeout(tooltip2Timer.current);
      }
      setShowTooltip2(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput("");
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isBlank: boolean
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus("loading");
    setUploadedFileName(file.name);

    try {
      if (isBlank) {
        const result = await ragService.fillFormFields(file);
        setFormFilePath(result.filledFormPath);
        setTimeout(() => {
          setUploadStatus("idle");
          setShowFormPreview(true);
        }, 1500);
      } else {
        await ragService.processDocument(file);
        setUploadStatus("success");

        if (onSilentUpload) {
          onSilentUpload(file.name);
        }

        if (onAgentResponse) {
          setTimeout(() => {
            onAgentResponse(
              `I've processed your document "${file.name}". Would you like me to help you fill out any forms using the information I extracted?`
            );
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Full upload error:", error);
      setUploadStatus("error");
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload document"
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (blankFileInputRef.current) {
        blankFileInputRef.current.value = "";
      }
    }
  };

  const closeModal = () => {
    setUploadStatus("idle");
  };

  const closeFormPreview = () => {
    setShowFormPreview(false);

    if (onAgentResponse) {
      onAgentResponse(
        `I've filled out the form based on the information extracted from your documents. You can download the completed form or upload another document if needed.`
      );
    }
  };

  return (
    <>
      <UploadModal
        isOpen={uploadStatus !== "idle"}
        status={
          uploadStatus === "loading"
            ? "loading"
            : uploadStatus === "success"
            ? "success"
            : "error"
        }
        fileName={uploadedFileName}
        errorMessage={uploadError}
        onClose={closeModal}
      />

      <FormPreviewModal
        isOpen={showFormPreview}
        filePath={formFilePath}
        fileName={
          uploadedFileName
            ? uploadedFileName.replace(/\.[^/.]+$/, "") + "_filled.pdf"
            : undefined
        }
        onClose={closeFormPreview}
      />

      <div className="shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the form you need help with..."
              disabled={isLoading}
              className="text-lg flex-1 p-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                       disabled:opacity-50"
            />
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => handleFileUpload(e, false)}
              accept=".pdf,.doc,.docx"
              className="hidden"
            />
            <input
              ref={blankFileInputRef}
              type="file"
              onChange={(e) => handleFileUpload(e, true)}
              accept=".pdf,.doc,.docx"
              className="hidden"
            />
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter(1)}
              onMouseLeave={() => handleMouseLeave(1)}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Upload document"
              >
                <Upload className="h-5 w-5" />
              </button>
              {showTooltip1 && (
                <div
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 
                          bg-gray-900 text-white text-sm rounded-md whitespace-nowrap z-10
                          transition-opacity duration-200"
                >
                  Upload document to analyze
                  <div
                    className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent 
                            border-t-gray-900"
                  ></div>
                </div>
              )}
            </div>
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter(2)}
              onMouseLeave={() => handleMouseLeave(2)}
            >
              <button
                type="button"
                onClick={() => blankFileInputRef.current?.click()}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Upload and fill blank form"
              >
                <ClipboardEdit className="h-5 w-5" />
              </button>
              {showTooltip2 && (
                <div
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 
                          bg-gray-900 text-white text-sm rounded-md whitespace-nowrap z-10
                          transition-opacity duration-200"
                >
                  Upload blank form to fill out
                  <div
                    className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent 
                            border-t-gray-900"
                  ></div>
                </div>
              )}
            </div>
            {/* Microphone */}
            <button
              type="button"
              onClick={handleMicClick}
              disabled={isLoading}
              className={`p-2 ${
                getConversationStatus().color
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label="Voice input"
              title={getConversationStatus().text}
            >
              {React.createElement(getConversationStatus().icon, {
                className: "h-5 w-5",
              })}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="text-lg bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center min-w-[80px]"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ChatInput;
