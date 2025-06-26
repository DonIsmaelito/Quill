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
  FastForward,
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

  // Send language updates to WebSocket when language changes
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && selectedLanguage) {
      wsRef.current.send(`LANGUAGE:${selectedLanguage}`);
      console.log("Language updated via useEffect:", selectedLanguage);
    }
  }, [selectedLanguage]);

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

    // Add a subtle system message to inform the user about the language change
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

    const systemMessage = `🌐 Switched to ${languageNames[languageCode]}. I'll continue our conversation in ${languageNames[languageCode]}.`;
    const newMessage: Message = {
      id: Date.now().toString(),
      content: systemMessage,
      type: "assistant",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  // Reset messages and formValuesRef when formFields changes
  useEffect(() => {
    const welcomeMessage = generateWelcomeMessage(formTitle, formFields, selectedLanguage);
    setMessages([
      {
        id: "1",
        content: welcomeMessage,
        type: "assistant",
        timestamp: new Date(),
      },
    ]);
    ragService.setWelcomeMessage(welcomeMessage);
    // Reset formValuesRef to match the new fields
    formValuesRef.current = {};
    formFields.forEach((field) => {
      formValuesRef.current[field.id] =
        formValues[field.id] || field.value || "";
    });
  }, [formFields, formTitle]);

  // Update form fields reference when they change
  useEffect(() => {
    if (formFields.length > 0) {
      // Update the form fields in the ragService
      const currentFormFields = formFields.map((field) => ({
        id: field.id,
        label: field.label,
        value: formValuesRef.current[field.id] || "MISSING",
      }));

      // Send updated form fields to WebSocket if connected
      sendFormFieldsToWebSocket();

      console.log("AssistantPanel: Form fields updated:", currentFormFields);
    }
  }, [formFields]);

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
    fields: FormField[],
    language: string = selectedLanguage
  ): string => {
    const suggestions = generateDocumentSuggestions(fields, language);
    
    // Language-specific welcome messages
    const welcomeMessages = {
      en: `Welcome! I'm here to help you fill out the ${title}. ${suggestions}`,
      es: `¡Bienvenido! Estoy aquí para ayudarte a completar el ${title}. ${suggestions}`,
      fr: `Bienvenue ! Je suis ici pour vous aider à remplir le ${title}. ${suggestions}`,
      de: `Willkommen! Ich bin hier, um Ihnen beim Ausfüllen des ${title} zu helfen. ${suggestions}`,
      it: `Benvenuto! Sono qui per aiutarti a compilare il ${title}. ${suggestions}`,
      pt: `Bem-vindo! Estou aqui para ajudá-lo a preencher o ${title}. ${suggestions}`,
      zh: `欢迎！我在这里帮助您填写${title}。${suggestions}`,
      ar: `مرحباً! أنا هنا لمساعدتك في ملء ${title}. ${suggestions}`,
    };
    
    return welcomeMessages[language as keyof typeof welcomeMessages] || welcomeMessages.en;
  };

  /* TODO: Let LLM figure out what documents are needed based on the form fields */
  const generateDocumentSuggestions = (fields: FormField[], language: string): string => {
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
      const defaultMessages = {
        en: "You can upload any relevant documents to help fill out this form.",
        es: "Puedes subir cualquier documento relevante para ayudar a completar este formulario.",
        fr: "Vous pouvez télécharger tout document pertinent pour vous aider à remplir ce formulaire.",
        de: "Sie können relevante Dokumente hochladen, um Ihnen beim Ausfüllen dieses Formulars zu helfen.",
        it: "Puoi caricare qualsiasi documento pertinente per aiutarti a compilare questo modulo.",
        pt: "Você pode fazer upload de documentos relevantes para ajudar a preencher este formulário.",
        zh: "您可以上传任何相关文档来帮助填写此表格。",
        ar: "يمكنك تحميل أي مستندات ذات صلة للمساعدة في ملء هذا النموذج.",
      };
      return defaultMessages[language as keyof typeof defaultMessages] || defaultMessages.en;
    }

    const suggestionMessages = {
      en: `To help fill out this form, you can upload your ${suggestions.join(", ")}.`,
      es: `Para ayudar a completar este formulario, puedes subir tu ${suggestions.join(", ")}.`,
      fr: `Pour vous aider à remplir ce formulaire, vous pouvez télécharger votre ${suggestions.join(", ")}.`,
      de: `Um Ihnen beim Ausfüllen dieses Formulars zu helfen, können Sie Ihre ${suggestions.join(", ")} hochladen.`,
      it: `Per aiutarti a compilare questo modulo, puoi caricare il tuo ${suggestions.join(", ")}.`,
      pt: `Para ajudá-lo a preencher este formulário, você pode fazer upload do seu ${suggestions.join(", ")}.`,
      zh: `为了帮助填写此表格，您可以上传您的${suggestions.join("、")}。`,
      ar: `للمساعدة في ملء هذا النموذج، يمكنك تحميل ${suggestions.join(" أو ")}.`,
    };

    return suggestionMessages[language as keyof typeof suggestionMessages] || suggestionMessages.en;
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    try {
      // Always use the latest formFields and formValues from props
      const currentFormFields = formFields.map((field) => ({
        id: field.id,
        label: field.label,
        value: formValues[field.id] || "",
      }));

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
          displayResponse = displayResponse
            .replace(fieldUpdatesMatch[0], "")
            .trim();
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
        .filter((field) => {
          const fieldLabel = field.label.toLowerCase();
          const responseText = displayResponse.toLowerCase();
          
          // Only highlight fields if there are actual updates OR if the field is explicitly mentioned in a clear context
          const hasUpdates = updatedFields.length > 0;
          
          // Use word boundaries to avoid partial matches
          const wordBoundaryPattern = new RegExp(`\\b${fieldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
          
          // Check for exact phrase matches
          const exactMatch = wordBoundaryPattern.test(responseText);
          
          // More restrictive context patterns - only match when the assistant is clearly referring to the field
          const contextPatterns = [
            new RegExp(`(?:I've updated|I've filled|I've completed|I've entered)\\s+(?:the\\s+)?${fieldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
            new RegExp(`${fieldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(?:has been|is now|has been updated|has been filled)`, 'i'),
            new RegExp(`(?:the\\s+)?${fieldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(?:field|input)\\s+(?:is|has|contains)`, 'i'),
          ];
          
          const hasContextMatch = contextPatterns.some(pattern => pattern.test(responseText));
          
          // Only match if there are updates OR if there's a very clear mention
          const isMatched = hasUpdates ? (exactMatch || hasContextMatch) : hasContextMatch;
          
          if (isMatched) {
            console.log(`Field "${field.label}" matched:`, {
              fieldLabel,
              hasUpdates,
              exactMatch,
              hasContextMatch,
              responseText: responseText.substring(0, 200) + '...'
            });
          }
          
          return isMatched;
        })
        .map((field) => field.id);

      console.log("Display response:", displayResponse);
      console.log("Available form fields:", formFields.map(f => ({ id: f.id, label: f.label })));
      console.log("Mentioned fields detected:", mentionedFields);

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
        onFieldsUpdated?.(updatedFields);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Add error message to UI
      const errorMessages = {
        en: "Sorry, I encountered an error while processing your message. Please try again.",
        es: "Lo siento, encontré un error al procesar tu mensaje. Por favor, inténtalo de nuevo.",
        fr: "Désolé, j'ai rencontré une erreur lors du traitement de votre message. Veuillez réessayer.",
        de: "Entschuldigung, beim Verarbeiten Ihrer Nachricht ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
        it: "Mi dispiace, ho riscontrato un errore durante l'elaborazione del tuo messaggio. Per favore riprova.",
        pt: "Desculpe, encontrei um erro ao processar sua mensagem. Por favor, tente novamente.",
        zh: "抱歉，处理您的消息时遇到错误。请重试。",
        ar: "عذراً، واجهت خطأ أثناء معالجة رسالتك. يرجى المحاولة مرة أخرى.",
      };
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: errorMessages[selectedLanguage as keyof typeof errorMessages] || errorMessages.en,
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
        .filter((field) => {
          const fieldLabel = field.label.toLowerCase();
          const responseText = displayResponse.toLowerCase();
          
          // Only highlight fields if there are actual updates OR if the field is explicitly mentioned in a clear context
          const hasUpdates = updatedFields.length > 0;
          
          // Use word boundaries to avoid partial matches
          const wordBoundaryPattern = new RegExp(`\\b${fieldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
          
          // Check for exact phrase matches
          const exactMatch = wordBoundaryPattern.test(responseText);
          
          // More restrictive context patterns - only match when the assistant is clearly referring to the field
          const contextPatterns = [
            new RegExp(`(?:I've updated|I've filled|I've completed|I've entered)\\s+(?:the\\s+)?${fieldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
            new RegExp(`${fieldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(?:has been|is now|has been updated|has been filled)`, 'i'),
            new RegExp(`(?:the\\s+)?${fieldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(?:field|input)\\s+(?:is|has|contains)`, 'i'),
          ];
          
          const hasContextMatch = contextPatterns.some(pattern => pattern.test(responseText));
          
          // Only match if there are updates OR if there's a very clear mention
          const isMatched = hasUpdates ? (exactMatch || hasContextMatch) : hasContextMatch;
          
          if (isMatched) {
            console.log(`Field "${field.label}" matched:`, {
              fieldLabel,
              hasUpdates,
              exactMatch,
              hasContextMatch,
              responseText: responseText.substring(0, 200) + '...'
            });
          }
          
          return isMatched;
        })
        .map((field) => field.id);

      console.log("File upload - Display response:", displayResponse);
      console.log("File upload - Available form fields:", formFields.map(f => ({ id: f.id, label: f.label })));
      console.log("File upload - Mentioned fields detected:", mentionedFields);

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
        onFieldsUpdated?.(updatedFields);
      }
      // ~~~~

      // const filledFields = await ragService.fillFormFields(formFields);
      onFileUpload(Array.from(files));
    } catch (error) {
      console.error("Error processing files:", error);
      const errorMessages = {
        en: "Failed to process files. Please try again.",
        es: "Error al procesar archivos. Por favor, inténtalo de nuevo.",
        fr: "Échec du traitement des fichiers. Veuillez réessayer.",
        de: "Fehler beim Verarbeiten der Dateien. Bitte versuchen Sie es erneut.",
        it: "Errore durante l'elaborazione dei file. Per favore riprova.",
        pt: "Falha ao processar arquivos. Por favor, tente novamente.",
        zh: "处理文件失败。请重试。",
        ar: "فشل في معالجة الملفات. يرجى المحاولة مرة أخرى.",
      };
      toast.error(errorMessages[selectedLanguage as keyof typeof errorMessages] || errorMessages.en);
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
    const userMessages = {
      en: "📷 I've captured a form image",
      es: "📷 He capturado una imagen del formulario",
      fr: "📷 J'ai capturé une image du formulaire",
      de: "📷 Ich habe ein Formularbild aufgenommen",
      it: "📷 Ho catturato un'immagine del modulo",
      pt: "📷 Capturei uma imagem do formulário",
      zh: "📷 我拍摄了一张表格图片",
      ar: "📷 لقد التقطت صورة للنموذج",
    };

    const userMessage: Message = {
      id: Date.now().toString(),
      content: userMessages[selectedLanguage as keyof typeof userMessages] || userMessages.en,
      type: "user",
      timestamp: new Date(),
      imageUrl: imageUrl,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add assistant response acknowledging the image
    setTimeout(() => {
      const assistantMessages = {
        en: "Great! I can see the form you've captured. I have digitized the form and I can help you fill this out.",
        es: "¡Excelente! Puedo ver el formulario que has capturado. He digitalizado el formulario y puedo ayudarte a completarlo.",
        fr: "Excellent ! Je peux voir le formulaire que vous avez capturé. J'ai numérisé le formulaire et je peux vous aider à le remplir.",
        de: "Großartig! Ich kann das von Ihnen aufgenommene Formular sehen. Ich habe das Formular digitalisiert und kann Ihnen beim Ausfüllen helfen.",
        it: "Perfetto! Posso vedere il modulo che hai catturato. Ho digitalizzato il modulo e posso aiutarti a compilarlo.",
        pt: "Ótimo! Posso ver o formulário que você capturou. Digitalizei o formulário e posso ajudá-lo a preenchê-lo.",
        zh: "太好了！我可以看到您拍摄的表格。我已经将表格数字化，可以帮助您填写。",
        ar: "ممتاز! يمكنني رؤية النموذج الذي التقطته. لقد رقمنت النموذج ويمكنني مساعدتك في ملئه.",
      };

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: assistantMessages[selectedLanguage as keyof typeof assistantMessages] || assistantMessages.en,
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
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<Blob[]>([]);
  const isPlayingRef = useRef(false);

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
    if (wsRef.current && wsRef.current.readyState < 2) {
      return wsRef.current;
    }

    console.log("Creating new WebSocket connection...");
    const ws = new WebSocket("ws://localhost:8000/voice_ws");

    const playNextAudio = () => {
      if (audioQueueRef.current.length === 0) {
        isPlayingRef.current = false;
        currentAudioRef.current = null;
        if (shouldAutoListen.current) {
          startRecording();
        } else {
          setConversationState("idle");
        }
        return;
      }

      isPlayingRef.current = true;
      const audioBlob = audioQueueRef.current.shift();
      if (audioBlob) {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        // Store the current audio element for potential stopping
        currentAudioRef.current = audio;
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          playNextAudio();
        };
        audio.onerror = (err) => {
          console.error("Error playing audio:", err);
          currentAudioRef.current = null;
          playNextAudio();
        };
        audio.play().catch((err) => {
          console.error("Audio playback failed:", err);
          currentAudioRef.current = null;
          playNextAudio();
        });
      }
    };

    ws.onopen = () => {
      console.log("Voice WebSocket connected");
      wsRef.current = ws;
      // Immediately send current language
      if (selectedLanguage) {
        ws.send(`LANGUAGE:${selectedLanguage}`);
        console.log("Sent language to WebSocket:", selectedLanguage);
      }
      // Immediately send form fields
      sendFormFieldsToWebSocket();
      
      // Send existing chat history to maintain context
      if (messages.length > 0) {
        const chatHistory = messages.map(msg => ({
          type: msg.type,
          content: msg.content
        }));
        const historyMessage = `CHAT_HISTORY:${JSON.stringify(chatHistory)}`;
        ws.send(historyMessage);
        console.log("Sent existing chat history to WebSocket:", chatHistory.length, "messages");
      }
    };

    ws.onmessage = (event) => {
      console.log("WebSocket message received:", event.data);
      if (event.data instanceof Blob) {
        audioQueueRef.current.push(event.data);
        if (!isPlayingRef.current) {
          setConversationState("speaking");
          playNextAudio();
        }
        return;
      }

      try {
        const data = JSON.parse(event.data);
        if (data.type === "assistant_text") {
          let responseContent = data.content;
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
              responseContent = responseContent
                .replace(fieldUpdatesMatch[0], "")
                .trim();
            } catch (error) {
              console.error("Error parsing voice field updates:", error);
            }
          }

          // Add user transcript message if present
          if (data.user_transcript) {
            const userMessage: Message = {
              id: Date.now().toString(),
              content: data.user_transcript,
              type: "user",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, userMessage]);
          }

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: responseContent,
            type: "assistant",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);

          if (updatedFields.length > 0) {
            onFieldsUpdated?.(updatedFields);
          }
        } else if (data.type === "error") {
          console.error("Server error:", data.content);
          const errorMessages = {
            en: "Voice processing error: " + data.content,
            es: "Error de procesamiento de voz: " + data.content,
            fr: "Erreur de traitement vocal : " + data.content,
            de: "Sprachverarbeitungsfehler: " + data.content,
            it: "Errore di elaborazione vocale: " + data.content,
            pt: "Erro de processamento de voz: " + data.content,
            zh: "语音处理错误：" + data.content,
            ar: "خطأ في معالجة الصوت: " + data.content,
          };
          alert(errorMessages[selectedLanguage as keyof typeof errorMessages] || errorMessages.en);
          setConversationState("idle");
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("Voice WebSocket error:", error);
      setConversationState("idle");
    };

    ws.onclose = () => {
      console.log("Voice WebSocket disconnected");
      wsRef.current = null;
      setConversationState("idle");
    };

    return ws;
  };

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
      
      // Also ensure current language is sent
      if (selectedLanguage) {
        wsRef.current.send(`LANGUAGE:${selectedLanguage}`);
        console.log("Sent language to WebSocket:", selectedLanguage);
      }
    }
  };

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
        const timeoutMessages = {
          en: "Voice connection failed. Please try again.",
          es: "La conexión de voz falló. Por favor, inténtalo de nuevo.",
          fr: "La connexion vocale a échoué. Veuillez réessayer.",
          de: "Sprachverbindung fehlgeschlagen. Bitte versuchen Sie es erneut.",
          it: "Connessione vocale fallita. Per favore riprova.",
          pt: "Conexão de voz falhou. Por favor, tente novamente.",
          zh: "语音连接失败。请重试。",
          ar: "فشل الاتصال الصوتي. يرجى المحاولة مرة أخرى.",
        };
        alert(timeoutMessages[selectedLanguage as keyof typeof timeoutMessages] || timeoutMessages.en);
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
        const permissionMessages = {
          en: "Microphone permission denied. Please allow microphone access and try again.",
          es: "Permiso de micrófono denegado. Por favor, permite el acceso al micrófono e inténtalo de nuevo.",
          fr: "Permission du microphone refusée. Veuillez autoriser l'accès au microphone et réessayer.",
          de: "Mikrofonberechtigung verweigert. Bitte erlauben Sie den Mikrofonzugriff und versuchen Sie es erneut.",
          it: "Permesso microfono negato. Per favore, consenti l'accesso al microfono e riprova.",
          pt: "Permissão do microfone negada. Por favor, permita o acesso ao microfone e tente novamente.",
          zh: "麦克风权限被拒绝。请允许麦克风访问并重试。",
          ar: "تم رفض إذن الميكروفون. يرجى السماح بالوصول إلى الميكروفون والمحاولة مرة أخرى.",
        };
        alert(permissionMessages[selectedLanguage as keyof typeof permissionMessages] || permissionMessages.en);
      } else {
        const errorMessages = {
          en: "Could not start recording: " + error.message,
          es: "No se pudo iniciar la grabación: " + error.message,
          fr: "Impossible de démarrer l'enregistrement : " + error.message,
          de: "Aufnahme konnte nicht gestartet werden: " + error.message,
          it: "Impossibile avviare la registrazione: " + error.message,
          pt: "Não foi possível iniciar a gravação: " + error.message,
          zh: "无法开始录音：" + error.message,
          ar: "تعذر بدء التسجيل: " + error.message,
        };
        alert(errorMessages[selectedLanguage as keyof typeof errorMessages] || errorMessages.en);
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
      const audioMessages = {
        en: "Audio playback permission needed. Please ensure audio is enabled.",
        es: "Se necesita permiso de reproducción de audio. Por favor, asegúrate de que el audio esté habilitado.",
        fr: "Permission de lecture audio nécessaire. Veuillez vous assurer que l'audio est activé.",
        de: "Audio-Wiedergabeberechtigung erforderlich. Bitte stellen Sie sicher, dass Audio aktiviert ist.",
        it: "Permesso di riproduzione audio necessario. Assicurati che l'audio sia abilitato.",
        pt: "Permissão de reprodução de áudio necessária. Por favor, certifique-se de que o áudio está habilitado.",
        zh: "需要音频播放权限。请确保音频已启用。",
        ar: "مطلوب إذن تشغيل الصوت. يرجى التأكد من تمكين الصوت.",
      };
      alert(audioMessages[selectedLanguage as keyof typeof audioMessages] || audioMessages.en);
    }

    setIsConversationActive(true);
    shouldAutoListen.current = true;
    
    // Ensure WebSocket is ready and language is set before starting recording
    const ws = getWs();
    if (ws.readyState === WebSocket.OPEN && selectedLanguage) {
      ws.send(`LANGUAGE:${selectedLanguage}`);
      console.log("Sent language to WebSocket before starting conversation:", selectedLanguage);
    }
    
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

    // Stop current audio playback
    stopCurrentAudio(true);

    // Clear any pending silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Clean up WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
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
          icon: Loader2,
          color: "text-blue-500 animate-spin",
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
          icon: Mic,
          color: "text-red-500",
        };
    }
  };

  // Function to stop current audio playback
  const stopCurrentAudio = (isEndingConversation = false) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
      console.log("Audio playback stopped by user");
    }
    
    // Clear the audio queue and reset playing state
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    
    // Only restart recording if we're not ending the conversation
    if (!isEndingConversation && isConversationActive && shouldAutoListen.current) {
      setConversationState("listening");
      startRecording();
    }
  };

  // Wrapper function for skip button click
  const handleSkipClick = () => {
    stopCurrentAudio(false); // false = not ending conversation, just skipping
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
                {
                  {
                    en: "Upload documents",
                    es: "Subir documentos",
                    fr: "Télécharger des documents",
                    de: "Dokumente hochladen",
                    it: "Carica documenti",
                    pt: "Fazer upload de documentos",
                    zh: "上传文档",
                    ar: "تحميل المستندات",
                  }[selectedLanguage] || "Upload documents"
                }
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
                {
                  {
                    en: "Scan form with camera",
                    es: "Escanear formulario con cámara",
                    fr: "Scanner le formulaire avec l'appareil photo",
                    de: "Formular mit Kamera scannen",
                    it: "Scansiona modulo con fotocamera",
                    pt: "Digitalizar formulário com câmera",
                    zh: "用相机扫描表格",
                    ar: "مسح النموذج بالكاميرا",
                  }[selectedLanguage] || "Scan form with camera"
                }
              </div>
            </div>

            {/* Voice Chat */}
            <div className="group relative">
              <Button
                variant="ghost"
                onClick={conversationState === "speaking" ? handleSkipClick : handleConversationToggle}
                disabled={isProcessing}
                className={`h-12 px-4 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md ${
                  conversationState === "speaking"
                    ? "bg-orange-50 hover:bg-orange-100 dark:bg-orange-950 dark:hover:bg-orange-900 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800"
                    : isConversationActive
                    ? "bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                    : "bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
                }`}
              >
                {conversationState === "speaking" ? (
                  <FastForward className="h-5 w-5 mr-2" />
                ) : (
                  React.createElement(getConversationStatus().icon, {
                    className: `h-5 w-5 mr-2 ${getConversationStatus().color}`,
                  })
                )}
                <span className="text-sm font-medium">
                  {conversationState === "speaking" 
                    ? {
                        en: "Skip",
                        es: "Saltar",
                        fr: "Passer",
                        de: "Überspringen",
                        it: "Salta",
                        pt: "Pular",
                        zh: "跳过",
                        ar: "تخطي",
                      }[selectedLanguage] || "Skip"
                    : getConversationStatus().text
                  }
                </span>
              </Button>
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {conversationState === "speaking"
                  ? {
                      en: "Skip current speech",
                      es: "Saltar el habla actual",
                      fr: "Passer le discours actuel",
                      de: "Aktuelle Sprache überspringen",
                      it: "Salta il discorso attuale",
                      pt: "Pular fala atual",
                      zh: "跳过当前语音",
                      ar: "تخطي الكلام الحالي",
                    }[selectedLanguage] || "Skip current speech"
                  : isConversationActive
                  ? {
                      en: "Stop voice assistant",
                      es: "Detener asistente de voz",
                      fr: "Arrêter l'assistant vocal",
                      de: "Sprachassistent stoppen",
                      it: "Ferma assistente vocale",
                      pt: "Parar assistente de voz",
                      zh: "停止语音助手",
                      ar: "إيقاف المساعد الصوتي",
                    }[selectedLanguage] || "Stop voice assistant"
                  : {
                      en: "Start voice conversation",
                      es: "Iniciar conversación de voz",
                      fr: "Démarrer la conversation vocale",
                      de: "Sprachgespräch starten",
                      it: "Avvia conversazione vocale",
                      pt: "Iniciar conversa por voz",
                      zh: "开始语音对话",
                      ar: "بدء محادثة صوتية",
                    }[selectedLanguage] || "Start voice conversation"
                }
              </div>
            </div>
          </div>

          {/* Input area */}
          <div className="relative">
            <div className="flex items-center bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-700 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200 shadow-sm hover:shadow-md">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  {
                    en: "Ask me anything about your form...",
                    es: "Pregúntame cualquier cosa sobre tu formulario...",
                    fr: "Demandez-moi n'importe quoi sur votre formulaire...",
                    de: "Fragen Sie mich alles über Ihr Formular...",
                    it: "Chiedimi qualsiasi cosa sul tuo modulo...",
                    pt: "Pergunte-me qualquer coisa sobre seu formulário...",
                    zh: "询问我关于您的表格的任何问题...",
                    ar: "اسألني أي شيء عن نموذجك...",
                  }[selectedLanguage] || "Ask me anything about your form..."
                }
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
