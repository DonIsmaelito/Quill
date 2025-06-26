import React, { useEffect, useState } from "react";
import { CheckCircle, FileText, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface FormSuccessScreenProps {
  templateName?: string;
  formId?: string;
  submittedAt?: string;
  onClose?: () => void;
}

const FormSuccessScreen: React.FC<FormSuccessScreenProps> = ({
  templateName = "Form",
  formId,
  submittedAt,
  onClose,
}) => {
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [pulseRing, setPulseRing] = useState(false);

  useEffect(() => {
    // Start the animation sequence
    const timer1 = setTimeout(() => setShowCheckmark(true), 300);
    const timer2 = setTimeout(() => {
      setPulseRing(true);
      // Stop the pulse after 1 second
      setTimeout(() => setPulseRing(false), 1000);
    }, 800);
    const timer3 = setTimeout(() => setShowContent(true), 1200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center z-50">
      <Card className="bg-white shadow-2xl rounded-2xl p-8 max-w-md w-full mx-4 text-center">
        {/* Animated Checkmark */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto relative">
            {/* Background circle with single pulse animation */}
            {pulseRing && (
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
            )}
            
            {/* Main circle */}
            <div className="relative w-full h-full bg-green-500 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle 
                className={`w-12 h-12 text-white transition-all duration-700 ease-out ${
                  showCheckmark 
                    ? 'opacity-100 scale-100' 
                    : 'opacity-0 scale-50'
                }`}
              />
            </div>
            
            {/* Success rings animation - only show during pulse */}
            {pulseRing && (
              <>
                <div className="absolute inset-0 border-4 border-green-300 rounded-full animate-ping"></div>
                <div className="absolute inset-0 border-4 border-green-200 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
              </>
            )}
          </div>
        </div>

        {/* Content with fade-in animation */}
        <div className={`transition-all duration-700 ease-out ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Success!
          </h1>
          
          <p className="text-lg text-gray-600 mb-6">
            Your {templateName} has been submitted successfully
          </p>

          {/* Success details */}
          <div className="bg-green-50 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Form Details</span>
            </div>
            
            {formId && (
              <div className="text-sm text-green-700 mb-2">
                <span className="font-medium">Form ID:</span> {formId}
              </div>
            )}
            
            {submittedAt && (
              <div className="text-sm text-green-700 mb-2">
                <span className="font-medium">Submitted:</span> {formatDate(submittedAt)}
              </div>
            )}
          </div>

          {/* Next steps */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-center gap-3 mb-3">
              <Mail className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">What happens next?</span>
            </div>
            
            <div className="space-y-2 text-sm text-blue-700">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Your clinician has been notified</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Your form will be reviewed shortly</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>You'll receive a confirmation email</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Button 
              onClick={onClose}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-medium"
            >
              Return to Dashboard
            </Button>
            
            <Button 
              variant="outline"
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={() => window.print()}
            >
              Print Confirmation
            </Button>
          </div>

          {/* Additional info */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>Form processed in real-time</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FormSuccessScreen; 