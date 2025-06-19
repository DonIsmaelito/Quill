import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { X, Camera, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onImageCaptured: (imageFile: File, imageUrl: string) => void;
}

interface DocumentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export function CameraCapture({
  isOpen,
  onClose,
  onImageCaptured,
}: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [documentDetected, setDocumentDetected] = useState(false);
  const [documentBounds, setDocumentBounds] = useState<DocumentBounds | null>(
    null
  );
  const [captureStage, setCaptureStage] = useState<
    "detecting" | "stabilizing" | "countdown" | "captured"
  >("detecting");
  const [stabilityCount, setStabilityCount] = useState(0);
  const [countdownTimer, setCountdownTimer] = useState(0);
  const [showResetMessage, setShowResetMessage] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stabilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: "environment", // Prefer back camera on mobile
        },
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }

      // Start document detection
      startDocumentDetection();
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Unable to access camera. Please check permissions.");
      onClose();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    // Clean up all intervals and timeouts
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (stabilityTimeoutRef.current) {
      clearTimeout(stabilityTimeoutRef.current);
      stabilityTimeoutRef.current = null;
    }
  };

  const startDocumentDetection = () => {
    // Run document detection every 300ms for more responsive auto-detection
    detectionIntervalRef.current = setInterval(() => {
      if (
        videoRef.current &&
        canvasRef.current &&
        (captureStage === "detecting" || captureStage === "stabilizing")
      ) {
        detectDocument();
      }
    }, 300);
  };

  const detectDocument = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob for document detection API
    canvas.toBlob(
      async (blob) => {
        if (!blob) return;

        try {
          const formData = new FormData();
          formData.append("file", blob, "frame.jpg");

          const response = await fetch("/api/vision/detect-document", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();

            // Higher confidence threshold for auto-capture (80% vs 70%)
            const isDetected =
              result.document_detected && result.confidence > 0.8;

            if (isDetected) {
              setDocumentDetected(true);
              setDocumentBounds(result.bounds);
              setShowResetMessage(false);

              // Handle stability tracking and auto-capture
              if (captureStage === "detecting") {
                // Start stability tracking
                setCaptureStage("stabilizing");
                setStabilityCount(1);

                // Set timeout for stability period (2.5 seconds)
                stabilityTimeoutRef.current = setTimeout(() => {
                  startCountdown();
                }, 2500);
              } else if (captureStage === "stabilizing") {
                // Continue stability tracking
                setStabilityCount((prev) => prev + 1);
              }
            } else {
              // Document lost or confidence too low
              setDocumentDetected(false);
              setDocumentBounds(null);

              if (captureStage === "stabilizing") {
                // Reset to detecting with friendly message
                resetDetection(
                  "Oops, couldn't detect the form clearly. Let's try again!"
                );
              }
            }
          }
        } catch (error) {
          console.error("Document detection error:", error);
        }
      },
      "image/jpeg",
      0.8
    );
  };

  const resetDetection = (message?: string) => {
    setCaptureStage("detecting");
    setStabilityCount(0);
    setCountdownTimer(0);
    setDocumentDetected(false);
    setDocumentBounds(null);

    if (stabilityTimeoutRef.current) {
      clearTimeout(stabilityTimeoutRef.current);
      stabilityTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (message) {
      setShowResetMessage(true);
      setTimeout(() => setShowResetMessage(false), 3000);
    }
  };

  const startCountdown = () => {
    setCaptureStage("countdown");
    setCountdownTimer(3);

    countdownIntervalRef.current = setInterval(() => {
      setCountdownTimer((prev) => {
        if (prev <= 1) {
          // Auto-capture when countdown reaches 0
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          captureImage();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Manual capture function (called by button click)
  const handleManualCapture = () => {
    // Stop auto-detection and countdown if running
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (stabilityTimeoutRef.current) {
      clearTimeout(stabilityTimeoutRef.current);
      stabilityTimeoutRef.current = null;
    }

    captureImage();
  };

  // Unified capture function for both auto and manual capture
  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setCaptureStage("captured");

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Capture full resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to high-quality image
    canvas.toBlob(
      async (blob) => {
        if (!blob) return;

        const imageFile = new File([blob], "captured-form.jpg", {
          type: "image/jpeg",
        });

        // Create object URL for display
        const imageUrl = URL.createObjectURL(blob);

        // Notify parent with both file and URL
        onImageCaptured(imageFile, imageUrl);

        toast.success("Form image captured successfully!");

        // Auto-close after a short delay
        setTimeout(() => {
          onClose();
        }, 1000);
      },
      "image/jpeg",
      0.95
    );
  };

  const renderOverlay = () => {
    if (!videoRef.current) return null;

    return (
      <div className="absolute inset-0 pointer-events-none">
        {/* Document detection overlay */}
        {documentBounds && documentDetected && (
          <div
            className="absolute border-2 border-green-500 bg-green-500/20 rounded-lg"
            style={{
              left: `${
                (documentBounds.x / videoRef.current.videoWidth) * 100
              }%`,
              top: `${
                (documentBounds.y / videoRef.current.videoHeight) * 100
              }%`,
              width: `${
                (documentBounds.width / videoRef.current.videoWidth) * 100
              }%`,
              height: `${
                (documentBounds.height / videoRef.current.videoHeight) * 100
              }%`,
            }}
          >
            <div className="absolute -top-8 left-0 bg-green-500 text-white px-2 py-1 rounded text-sm">
              Document detected ({Math.round(documentBounds.confidence * 100)}%)
            </div>
          </div>
        )}

        {/* Center detection guide - taller and narrower */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[60%] h-[70%] border-2 border-dashed border-white/50 rounded-lg flex items-center justify-center relative">
            {/* Main status message */}
            <div className="text-center text-white bg-black/50 px-4 py-2 rounded">
              {captureStage === "detecting" && !documentDetected && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <span>Position your blank form in the frame</span>
                </div>
              )}
              {captureStage === "detecting" && documentDetected && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Form detected! Analyzing...</span>
                </div>
              )}
              {captureStage === "stabilizing" && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>
                    Hold steady... ({Math.round(stabilityCount / 8)}s)
                  </span>
                </div>
              )}
              {captureStage === "countdown" && (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full border-2 border-green-400 flex items-center justify-center text-xs font-bold">
                    {countdownTimer}
                  </div>
                  <span>Auto-capturing in {countdownTimer}...</span>
                </div>
              )}
              {captureStage === "captured" && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Image captured!</span>
                </div>
              )}
            </div>

            {/* Countdown circle overlay */}
            {captureStage === "countdown" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-green-400 bg-green-400/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {countdownTimer}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reset message */}
        {showResetMessage && (
          <div className="absolute top-20 inset-x-0 flex justify-center">
            <div className="bg-orange-500 text-white px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>
                  Oops, couldn't detect the form clearly. Let's try again!
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="relative w-full h-full">
        {/* Video feed */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />

        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay */}
        {renderOverlay()}

        {/* Controls */}
        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Close button */}
            <Button
              variant="outline"
              size="icon"
              onClick={onClose}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>

            {/* Manual capture button */}
            <Button
              onClick={handleManualCapture}
              disabled={captureStage === "captured"}
              className="w-16 h-16 rounded-full bg-white text-black hover:bg-white/90 transition-all duration-200 hover:scale-105 disabled:opacity-50"
            >
              <Camera className="w-6 h-6" />
            </Button>

            {/* Status indicator */}
            <div className="w-12 flex justify-center">
              {documentDetected && captureStage !== "captured" && (
                <CheckCircle className="w-6 h-6 text-green-400" />
              )}
              {captureStage === "captured" && (
                <CheckCircle className="w-6 h-6 text-green-400" />
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center mt-4">
            <p className="text-white/80 text-sm">
              {captureStage === "detecting" &&
                "Position your blank form in the frame - tap the camera button or wait for auto-capture"}
              {captureStage === "stabilizing" &&
                "Great! Hold steady while we analyze your form..."}
              {captureStage === "countdown" &&
                `Auto-capturing in ${countdownTimer} seconds`}
              {captureStage === "captured" && "Image captured successfully!"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
