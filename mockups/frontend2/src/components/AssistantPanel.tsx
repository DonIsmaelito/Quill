import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";
import {
  Upload,
  Send,
  Loader2,
  Mic,
  AudioWaveform,
  Camera,
} from "lucide-react";
import { ragService } from "../services/ragService";
import { toast } from "sonner";
import { ThemeToggle } from "./ThemeToggle";
import { CameraCapture } from "./CameraCapture";
import LanguageSelector from "./LanguageSelector";

// Not exactly the same as in Index.tsx
interface FormField {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  value?: string;
}

interface AssistantPanelProps {
  onFileUpload: (files: File[]) => void;
  formFields: FormField[];
  formTitle: string;
  formValues: Record<string, any>;
  onFieldsMentioned?: (fieldIds: string[]) => void;
  onFieldsUpdated?: (updates: { id: string; value: string }[]) => void;
  isFormFieldsLoading: boolean;
}

interface Message {
  id: string;
  content: string;
  type: "user" | "assistant";
  timestamp: Date;
  imageUrl?: string; // Add optional image URL field
}

export function AssistantPanel({
  onFileUpload,
  formFields,
  formTitle,
  formValues,
  onFieldsMentioned,
  onFieldsUpdated,
  isFormFieldsLoading,
}: AssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(true);

  // Create a ref to track form values for stable comparisons
  const formValuesRef = useRef<Record<string, any>>({});

  // Keep ref in sync with props
  useEffect(() => {
    formValuesRef.current = formValues;
  }, [formValues]);

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
    const newMessage: Message = {
      id: Date.now().toString(),
      content: systemMessage,
      type: "assistant",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  useEffect(() => {
    const welcomeMessage = generateWelcomeMessage(formTitle, formFields);
    setMessages([
      {
        id: "1",
        content: welcomeMessage,
        type: "assistant",
        timestamp: new Date(),
      },
    ]);
    // Set the welcome message in the ragService
    ragService.setWelcomeMessage(welcomeMessage);
  }, [formTitle, formFields]);

  // DISABLED: Auto-fill form on initial load (per user request to remove "refresh autofill" feature)
  /*
  useEffect(() => {
    const autoFillForm = async () => {
      if (
        initialLoadRef.current &&
        !isFormFieldsLoading &&
        formFields.length > 0
      ) {
        initialLoadRef.current = false;

        // Small delay to ensure other effects have completed
        setTimeout(async () => {
          try {
            setIsProcessing(true);

            // Get current form field values
            const currentFormFields = formFields.map((field) => ({
              id: field.id,
              label: field.label,
              value: formValuesRef.current[field.id] || "",
            }));

            console.log("Current form fields:", currentFormFields);

            // Send invisible query to fill the form
            const message = "Can you fill out as much of my form as possible?";
            const response = await ragService.processUserMessage(
              message,
              currentFormFields
            );

            console.log("Auto-fill response:", response);

            // Extract field updates from the response
            const fieldUpdatesMatch = response.match(
              /\{['"]field_updates['"]\s*:\s*\[(\n?.*?)+\]\}/
            );
            let updatedFields: { id: string; value: string }[] = [];
            let displayResponse = response;

            if (fieldUpdatesMatch) {
              try {
                const fieldUpdatesString = fieldUpdatesMatch[0].replace(
                  /'/g,
                  '"'
                );
                const updatesObj = JSON.parse(fieldUpdatesString);
                updatedFields = updatesObj.field_updates || [];
                console.log("Auto-fill field updates:", updatedFields);

                // Remove the field updates from the response
                displayResponse = response
                  .replace(fieldUpdatesMatch[0], "")
                  .trim();
              } catch (error) {
                console.error("Error parsing auto-fill field updates:", error);
              }
            }

            // Extract mentioned fields from the response
            const mentionedFields = formFields
              .filter((field) =>
                displayResponse
                  .toLowerCase()
                  .includes(field.label.toLowerCase())
              )
              .map((field) => field.id);

            // Notify parent component about mentioned fields
            onFieldsMentioned?.(mentionedFields);

            // Add a message about updated fields if any were updated
            if (updatedFields.length > 0) {
              const fieldLabels = updatedFields.map(
                (update) =>
                  formFields.find((f) => f.id === update.id)?.label || update.id
              );

              // Add assistant response to UI
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: `I've pre-filled the following fields based on available information: ${fieldLabels.join(
                  ", "
                )}.`,
                type: "assistant",
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, assistantMessage]);

              // Update form fields if any were changed
              const actualUpdates = updatedFields.filter((update) => {
                const field = formFields.find(
                  (f) => f.id.toLowerCase() === update.id.toLowerCase()
                );
                return (
                  field && formValuesRef.current[field.id] !== update.value
                );
              });

              if (actualUpdates.length > 0) {
                console.log("Actual auto-fill updates:", actualUpdates);

                const fieldUpdates = actualUpdates.map((update) => ({
                  id: update.id,
                  value: update.value,
                }));

                onFieldsUpdated?.(fieldUpdates);
              }
            }
          } catch (error) {
            console.error("Error during auto-fill:", error);
          } finally {
            setIsProcessing(false);
          }
        }, 500);
      }
    };

    autoFillForm();
  }, [formFields, onFieldsMentioned, onFieldsUpdated, isFormFieldsLoading]);
  */

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateWelcomeMessage = (
    title: string,
    fields: FormField[]
  ): string => {
    const suggestions = generateDocumentSuggestions(fields);
    return `Welcome! I'm here to help you fill out the ${title}. ${suggestions}`;
  };

  /* TODO: Let LLM figure out what documents are needed based on the form fields */
  const generateDocumentSuggestions = (fields: FormField[]): string => {
    const suggestions = [];

    if (
      fields.some(
        (f) => f.id === "fullName" || f.id === "dateOfBirth" || f.id === "sex"
      )
    ) {
      suggestions.push("driver's license or state ID");
    }

    if (
      fields.some(
        (f) => f.id === "insuranceProvider" || f.id === "insurancePolicyNumber"
      )
    ) {
      suggestions.push("insurance card");
    }

    if (
      fields.some(
        (f) =>
          f.id === "medicalConditions" ||
          f.id === "allergies" ||
          f.id === "medications"
      )
    ) {
      suggestions.push("medical records or medication list");
    }

    if (suggestions.length === 0) {
      return "You can upload any relevant documents to help fill out this form.";
    }

    return `To help fill out this form, you can upload your ${suggestions.join(
      ", "
    )}.`;
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    try {
      // Add user message to UI
      const userMessage: Message = {
        id: Date.now().toString(),
        content: message,
        type: "user",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsProcessing(true);

      // Get current form field values using the ref for stability
      const currentFormFields = formFields.map((field) => ({
        id: field.id,
        label: field.label,
        value: formValuesRef.current[field.id] || "",
      }));

      // Process message with form fields
      const response = await ragService.processUserMessage(
        message,
        currentFormFields,
        selectedLanguage
      );
      // // delay for 2 seconds to simulate processing
      // await new Promise(resolve => setTimeout(resolve, 2000));
      // const response = "I'd be happy to help with that! Here are common examples of medical conditions you might include as selectable or fillable items in a medical form: high blood pressure, diabetes, asthma, allergies, heart disease, etc. Let me know if you'd like more information on any of these conditions!";

      console.log("Assistant response:", response);

      // Extract field updates from the response
      const fieldUpdatesMatch = response.match(
        /\{['"]field_updates['"]:\s*\[[\s\S]*?\]\}/
      );
      let updatedFields: { id: string; value: string }[] = [];
      let displayResponse = response;

      if (fieldUpdatesMatch) {
        try {
          const fieldUpdatesString = fieldUpdatesMatch[0].replace(/'/g, '"');
          const updatesObj = JSON.parse(fieldUpdatesString);
          updatedFields = updatesObj.field_updates || [];
          console.log("Field updates:", updatedFields);
          // Remove the field updates from the response
          displayResponse = response.replace(fieldUpdatesMatch[0], "").trim();
          console.log(
            "Display response after removing fields:",
            displayResponse
          );
        } catch (error) {
          console.error("Error parsing field updates:", error);
        }
      }

      // Add a message about updated fields if any were updated
      if (updatedFields.length > 0) {
        const fieldLabels = updatedFields.map(
          (update) =>
            formFields.find((f) => f.id === update.id)?.label || update.id
        );
        displayResponse += `\n\nI've updated the following fields: ${fieldLabels.join(
          ", "
        )}.`;
        console.log("New display response:", displayResponse);
      }

      // Extract mentioned fields from the response
      const mentionedFields = formFields
        .filter((field) =>
          displayResponse.toLowerCase().includes(field.label.toLowerCase())
        )
        .map((field) => field.id);

      // Notify parent component about mentioned fields
      onFieldsMentioned?.(mentionedFields);

      // Add assistant response to UI
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: displayResponse,
        type: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update form fields if any were changed
      if (updatedFields.length > 0) {
        // Filter out non-changes first to avoid unnecessary updates
        const actualUpdates = updatedFields.filter((update) => {
          const field = formFields.find(
            (f) => f.id.toLowerCase() === update.id.toLowerCase()
          );
          // Had MISSING in non filled fields here
          // Only include if field exists, value is different from current, AND value is not "MISSING"
          return (
            field &&
            formValuesRef.current[field.id] !== update.value &&
            update.value !== "MISSING" &&
            update.value !== "missing" &&
            update.value?.toString().toUpperCase() !== "MISSING"
          );
        });

        if (actualUpdates.length > 0) {
          console.log("Actual field updates:", actualUpdates);

          // Convert to the format expected by parent component
          const fieldUpdates = actualUpdates.map((update) => ({
            id: update.id,
            value: update.value,
          }));

          // Notify parent about changes
          onFieldsUpdated?.(fieldUpdates);
        } else {
          console.log("No actual field updates found (values already match)");
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Add error message to UI
      const errorMessage: Message = {
        id: Date.now().toString(),
        content:
          "Sorry, I encountered an error while processing your message. Please try again.",
        type: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    console.log("File upload triggered");
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await ragService.processDocument(file);
      }

      // Now that the user_data.json has been updated in the backend with the new file information,
      // let's send a message on the user's behalf to fill in any fields it can in the form.
      // Do not display this message in the UI, do not add it to the message array, and keep any text
      // that's currently in the input box so that the user can continue typing and send another message.

      // ~~~~
      // Get current form field values using the ref for stability
      const currentFormFields = formFields.map((field) => ({
        id: field.id,
        label: field.label,
        value: formValuesRef.current[field.id] || "",
      }));

      // Process message with form fields
      const message =
        "I've uploaded a new document that has updated the information in your system under PATIENT INFORMATION. Try to fill out any additional fields in the form that you can that dont have a value yet (whose values in the CURRENT MEDICAL FORM FIELDS AND VALUES is MISSING). DO NOT confirm fields that are already filled out, and DO NOT ask about other fields whose data is not available in PATIENT INFORMATION. Simply give the new fields that can be filled out along with their values in the requested format.";
      const response = await ragService.processUserMessage(
        message,
        currentFormFields,
        selectedLanguage
      );
      // // delay for 2 seconds to simulate processing
      // await new Promise(resolve => setTimeout(resolve, 2000));
      // const response = "Welcome back! I'm happy to help you fill out your medical form. Now that we have some updated information from the document you uploaded, let's see if we can fill out a few more fields. Based on the PATIENT INFORMATION, I was able to determine some new values for the following fields: {'field_updates': [{'id': 'patientName', 'value': 'Johnathan Doe'}, {'id': 'dateOfBirth', 'value': '01/15/1985'}, {'id': 'gender', 'value': 'Male'}, {'id': 'phone', 'value': '(555) 123-4567'}, {'id': 'email', 'value': 'john.doe@example.com'}, {'id': 'address', 'value': '123 Main Street, Springfield, TX'}, {'id': 'insuranceProvider', 'value': 'Blue Cross Blue Shield'}, {'id': 'insuranceNumber', 'value': 'BCBS123456789'}]}";

      console.log("Assistant response:", response);

      // Extract field updates from the response
      const fieldUpdatesMatch = response.match(
        /\{['"]field_updates['"]:\s*\[[\s\S]*?\]\}/
      );
      let updatedFields: { id: string; value: string }[] = [];
      let displayResponse = response;

      if (fieldUpdatesMatch) {
        try {
          const fieldUpdatesString = fieldUpdatesMatch[0].replace(/'/g, '"');
          const updatesObj = JSON.parse(fieldUpdatesString);
          updatedFields = updatesObj.field_updates || [];
          console.log("Field updates:", updatedFields);
          // Remove the field updates from the response
          displayResponse = response.replace(fieldUpdatesMatch[0], "").trim();
          console.log(
            "Display response after removing fields:",
            displayResponse
          );
        } catch (error) {
          console.error("Error parsing field updates:", error);
        }
      }

      // Add a message about updated fields if any were updated
      if (updatedFields.length > 0) {
        const fieldLabels = updatedFields.map(
          (update) =>
            formFields.find((f) => f.id === update.id)?.label || update.id
        );
        displayResponse += `\n\nI've updated the following fields: ${fieldLabels.join(
          ", "
        )}.`;
        console.log("New display response:", displayResponse);
      }

      // Extract mentioned fields from the response
      const mentionedFields = formFields
        .filter((field) =>
          displayResponse.toLowerCase().includes(field.label.toLowerCase())
        )
        .map((field) => field.id);

      // Notify parent component about mentioned fields
      onFieldsMentioned?.(mentionedFields);

      // Add assistant response to UI
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: displayResponse,
        type: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update form fields if any were changed
      if (updatedFields.length > 0) {
        // Filter out non-changes first to avoid unnecessary updates
        const actualUpdates = updatedFields.filter((update) => {
          const field = formFields.find(
            (f) => f.id.toLowerCase() === update.id.toLowerCase()
          );
          // Only include if field exists, value is different from current, AND value is not "MISSING"
          return (
            field &&
            formValuesRef.current[field.id] !== update.value &&
            update.value !== "MISSING" &&
            update.value !== "missing" &&
            update.value?.toString().toUpperCase() !== "MISSING"
          );
        });

        if (actualUpdates.length > 0) {
          console.log("Actual field updates:", actualUpdates);

          // Convert to the format expected by parent component
          const fieldUpdates = actualUpdates.map((update) => ({
            id: update.id,
            value: update.value,
          }));

          // Notify parent about changes
          onFieldsUpdated?.(fieldUpdates);
        } else {
          console.log("No actual field updates found (values already match)");
        }
      }
      // ~~~~

      // const filledFields = await ragService.fillFormFields(formFields);
      onFileUpload(Array.from(files));
    } catch (error) {
      console.error("Error processing files:", error);
      toast.error("Failed to process files. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Camera capture functions -------------------------------------------
  const handleCameraCapture = () => {
    setIsCameraOpen(true);
  };

  const handleCameraImageCaptured = async (
    imageFile: File,
    imageUrl: string
  ) => {
    console.log("Camera image captured:", imageFile.name);

    // Add user message with image
    const userMessage: Message = {
      id: Date.now().toString(),
      content: "📷 I've captured a form image",
      type: "user",
      timestamp: new Date(),
      imageUrl: imageUrl,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add assistant response acknowledging the image
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "Great! I can see the form you've captured. I have digitized the form and I can help you fill this out.",
        type: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 500);

    // Close the camera
    setIsCameraOpen(false);
  };

  // Voice agent ---------------------------------------------------------
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

  const getWs = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)
      return wsRef.current;

    console.log("Creating new WebSocket connection...");
    wsRef.current = new WebSocket("ws://localhost:8000/voice_ws");

    wsRef.current.onopen = () => {
      console.log("Voice WebSocket connected");
      // Send language preference to voice agent
      if (selectedLanguage) {
        wsRef.current?.send(`LANGUAGE:${selectedLanguage}`);
        console.log(`Sent language preference: ${selectedLanguage}`);
      }
      // Send current form fields when connection opens
      sendFormFieldsToWebSocket();
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

          // Add a message about updated fields if any were updated
          if (updatedFields.length > 0) {
            const fieldLabels = updatedFields.map(
              (update) =>
                formFields.find((f) => f.id === update.id)?.label || update.id
            );
            responseContent += `\n\nI've updated the following fields: ${fieldLabels.join(
              ", "
            )}.`;
            console.log(
              "Voice: Enhanced response with field update info:",
              responseContent
            );
          }

          // Extract mentioned fields from the response
          const mentionedFields = formFields
            .filter((field) =>
              responseContent.toLowerCase().includes(field.label.toLowerCase())
            )
            .map((field) => field.id);

          // Notify parent component about mentioned fields
          onFieldsMentioned?.(mentionedFields);

          // Add assistant response to chat
          const assistantMessage: Message = {
            id: (Date.now() + Math.random()).toString(),
            content: responseContent,
            type: "assistant",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          console.log("Assistant response added to chat");

          // Update form fields if any were changed
          if (updatedFields.length > 0) {
            // Filter out non-changes first to avoid unnecessary updates
            const actualUpdates = updatedFields.filter((update) => {
              const field = formFields.find(
                (f) => f.id.toLowerCase() === update.id.toLowerCase()
              );
              // Only include if field exists, value is different from current, AND value is not "MISSING"
              return (
                field &&
                formValuesRef.current[field.id] !== update.value &&
                update.value !== "MISSING" &&
                update.value !== "missing" &&
                update.value?.toString().toUpperCase() !== "MISSING"
              );
            });

            if (actualUpdates.length > 0) {
              console.log("Voice: Actual field updates:", actualUpdates);

              // Convert to the format expected by parent component
              const fieldUpdates = actualUpdates.map((update) => ({
                id: update.id,
                value: update.value,
              }));

              // Notify parent about changes
              onFieldsUpdated?.(fieldUpdates);
              console.log("Voice: Form fields updated successfully");
            } else {
              console.log(
                "Voice: No actual field updates found (values already match)"
              );
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

        // Enhanced debugging for audio playback
        console.log("🔊 Creating Audio element for Blob");
        console.log("🔊 Audio can play MP3:", audio.canPlayType("audio/mpeg"));
        console.log("🔊 Audio can play MP4:", audio.canPlayType("audio/mp4"));
        console.log("🔊 Audio volume:", audio.volume);
        console.log("🔊 Audio muted:", audio.muted);

        // Set volume to maximum and ensure not muted
        audio.volume = 1.0;
        audio.muted = false;

        // Add better error handling and debugging
        audio.onerror = (e) => {
          console.error("🔊 Audio error event:", e);
          console.error("🔊 Audio error details:", audio.error);
          console.error("🔊 Audio error code:", audio.error?.code);
          console.error("🔊 Audio error message:", audio.error?.message);
        };

        audio.onloadstart = () => console.log("🔊 Audio load started");
        audio.onloadeddata = () => console.log("🔊 Audio data loaded");
        audio.oncanplay = () => console.log("🔊 Audio can play");
        audio.oncanplaythrough = () => console.log("🔊 Audio can play through");

        // When audio finishes playing, automatically start listening again if in conversation mode
        audio.onended = () => {
          console.log("🔊 Audio playback finished");
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

        console.log("🔊 Starting audio playback...");
        audio
          .play()
          .then(() => {
            console.log("🔊 Audio playback started successfully");
            console.log("🔊 Audio current time:", audio.currentTime);
            console.log("🔊 Audio duration:", audio.duration);
            console.log("🔊 Audio paused:", audio.paused);
          })
          .catch((err) => {
            console.error("🔊 Audio playback error:", err);
            console.error("🔊 Error name:", err.name);
            console.error("🔊 Error message:", err.message);
            console.error("🔊 Audio source:", audioBlob);
            console.error("🔊 Audio readyState:", audio.readyState);
            console.error("🔊 Audio networkState:", audio.networkState);
            console.error("🔊 Audio buffered ranges:", audio.buffered.length);

            // Try to provide helpful error messages
            if (err.name === "NotAllowedError") {
              console.error(
                "🔊 Browser blocked audio playback - user interaction may be required"
              );
              alert(
                "Audio playback was blocked by the browser. Please click somewhere on the page to enable audio."
              );
            } else if (err.name === "NotSupportedError") {
              console.error("🔊 Audio format not supported by browser");
              alert(
                "Your browser doesn't support the audio format. Please try a different browser."
              );
            }

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

        // Enhanced debugging for audio playback
        console.log("🔊 Creating Audio element for ArrayBuffer");
        console.log("🔊 Audio can play MP3:", audio.canPlayType("audio/mpeg"));
        console.log("🔊 Audio can play MP4:", audio.canPlayType("audio/mp4"));
        console.log("🔊 Audio volume:", audio.volume);
        console.log("🔊 Audio muted:", audio.muted);

        // Set volume to maximum and ensure not muted
        audio.volume = 1.0;
        audio.muted = false;

        // Add better error handling and debugging
        audio.onerror = (e) => {
          console.error("🔊 Audio error event:", e);
          console.error("🔊 Audio error details:", audio.error);
          console.error("🔊 Audio error code:", audio.error?.code);
          console.error("🔊 Audio error message:", audio.error?.message);
        };

        audio.onloadstart = () => console.log("🔊 Audio load started");
        audio.onloadeddata = () => console.log("🔊 Audio data loaded");
        audio.oncanplay = () => console.log("🔊 Audio can play");
        audio.oncanplaythrough = () => console.log("🔊 Audio can play through");

        // When audio finishes playing, automatically start listening again if in conversation mode
        audio.onended = () => {
          console.log("🔊 Audio playback finished");
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

        console.log("🔊 Starting audio playback...");
        audio
          .play()
          .then(() => {
            console.log("🔊 Audio playback started successfully");
            console.log("🔊 Audio current time:", audio.currentTime);
            console.log("🔊 Audio duration:", audio.duration);
            console.log("🔊 Audio paused:", audio.paused);
          })
          .catch((err) => {
            console.error("🔊 Audio playback error:", err);
            console.error("🔊 Error name:", err.name);
            console.error("🔊 Error message:", err.message);
            console.error("🔊 Audio source:", audioUrl);
            console.error("🔊 Audio readyState:", audio.readyState);
            console.error("🔊 Audio networkState:", audio.networkState);
            console.error("🔊 Audio buffered ranges:", audio.buffered.length);

            // Try to provide helpful error messages
            if (err.name === "NotAllowedError") {
              console.error(
                "🔊 Browser blocked audio playback - user interaction may be required"
              );
              alert(
                "Audio playback was blocked by the browser. Please click somewhere on the page to enable audio."
              );
            } else if (err.name === "NotSupportedError") {
              console.error("🔊 Audio format not supported by browser");
              alert(
                "Your browser doesn't support the audio format. Please try a different browser."
              );
            }

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

  // Function to send current form fields to WebSocket
  const sendFormFieldsToWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN && formFields.length > 0) {
      const currentFormFields = formFields.map((field) => ({
        id: field.id,
        label: field.label,
        value: formValuesRef.current[field.id] || "MISSING",
      }));

      const formFieldsMessage = `FORM_FIELDS:${JSON.stringify(
        currentFormFields
      )}`;
      wsRef.current.send(formFieldsMessage);
      console.log("Sent form fields to WebSocket:", currentFormFields);
    }
  };

  // Send form fields when they change
  useEffect(() => {
    if (formFields.length > 0) {
      sendFormFieldsToWebSocket();
    }
  }, [formFields, formValues]);

  // Voice recording functionality
  const startRecording = async () => {
    console.log("Starting recording...");
    try {
      // Establish WebSocket connection first
      const ws = getWs();

      // Wait for WebSocket to be ready (with timeout)
      let attempts = 0;
      while (ws.readyState !== WebSocket.OPEN && attempts < 10) {
        console.log(`Waiting for WebSocket connection... (${ws.readyState})`);
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      if (ws.readyState !== WebSocket.OPEN) {
        console.error("WebSocket connection timeout");
        alert("Voice connection failed. Please try again.");
        setConversationState("idle");
        return;
      }

      console.log("WebSocket ready for voice recording");
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
            console.warn("⚠️ Audio too small, not sending");
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

    // Request audio permission and test playback first
    try {
      // Create a silent audio to unlock browser audio context
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
        console.log("🔊 Audio context resumed");
      }

      // Test audio playback with a silent sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      gainNode.gain.value = 0; // Silent
      oscillator.frequency.value = 440;
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.01);
      console.log("Audio permission unlocked");
    } catch (error) {
      console.error("Audio permission failed:", error);
      alert(
        "Audio playback permission needed. Please ensure audio is enabled."
      );
    }

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

  return (
    <>
      <Card className="flex flex-col h-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Assistant</h2>
          <div className="flex items-center space-x-3">
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
            />
            <ThemeToggle />
          </div>
        </div>

        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {/* Display image if present */}
                  {message.imageUrl && (
                    <div className="mb-2">
                      <img
                        src={message.imageUrl}
                        alt="Captured form"
                        className="max-w-full h-auto rounded-lg border border-border"
                        style={{ maxHeight: "200px", objectFit: "contain" }}
                      />
                    </div>
                  )}
                  {/* Display text content */}
                  <div>{message.content}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-6 border-t bg-gradient-to-r from-background to-muted/20">
          {/* Action buttons row */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <Input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={handleFileUpload}
              accept=".pdf,.jpg,.jpeg,.png"
            />

            {/* Upload Documents */}
            <div className="group relative">
              <Button
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="h-12 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-all duration-200 hover:scale-105 hover:shadow-md"
              >
                <Upload className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Upload</span>
              </Button>
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Upload documents
              </div>
            </div>

            {/* Camera Scan */}
            <div className="group relative">
              <Button
                variant="ghost"
                onClick={handleCameraCapture}
                disabled={isProcessing}
                className="h-12 px-4 rounded-xl bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 transition-all duration-200 hover:scale-105 hover:shadow-md"
              >
                <Camera className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Scan</span>
              </Button>
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Scan form with camera
              </div>
            </div>

            {/* Voice Chat */}
            <div className="group relative">
              <Button
                variant="ghost"
                onClick={handleConversationToggle}
                disabled={isProcessing}
                className={`h-12 px-4 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md ${
                  isConversationActive
                    ? "bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                    : "bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
                }`}
              >
                {React.createElement(getConversationStatus().icon, {
                  className: `h-5 w-5 mr-2 ${getConversationStatus().color}`,
                })}
                <span className="text-sm font-medium">
                  {isConversationActive ? "Voice" : "Voice"}
                </span>
              </Button>
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {getConversationStatus().text}
              </div>
            </div>
          </div>

          {/* Input area */}
          <div className="relative">
            <div className="flex items-center bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-700 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200 shadow-sm hover:shadow-md">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about your form..."
                onKeyPress={(e) =>
                  e.key === "Enter" && handleSendMessage(input)
                }
                disabled={isProcessing}
                className="border-0 bg-transparent h-14 px-6 text-base placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                onClick={() => handleSendMessage(input)}
                disabled={isProcessing || !input.trim()}
                className="m-2 h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                size="icon"
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Real Camera Capture Component */}
      <CameraCapture
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onImageCaptured={handleCameraImageCaptured}
      />
    </>
  );
}
