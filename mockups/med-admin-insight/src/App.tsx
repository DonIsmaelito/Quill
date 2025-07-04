import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import Dashboard from "./pages/Dashboard";
import CreateForm from "./pages/CreateForm";
import PendingForms from "./pages/PendingForms";
import CompletedForms from "./pages/CompletedForms";
import Templates from "./pages/Templates";
import Patients from "./pages/Patients";
import Schedule from "./pages/Schedule";
import Messages from "./pages/Messages";
import Analytics from "./pages/Analytics";
import SettingsPage from "./pages/Settings";
import AccountSettings from "./components/settings/AccountSettings";
import AppearanceSettings from "./components/settings/AppearanceSettings";
import NotificationSettings from "./components/settings/NotificationSettings";
import DoctorsDirectory from "./pages/DoctorsDirectory";
import AssignTemplatePage from "./pages/AssignTemplatePage";
import ReadOnlyFormViewer from "./components/ReadOnlyFormViewer";
import NotFound from "./pages/NotFound";
import { VoiceAssistant } from "./components/VoiceAssistant";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create-form" element={<CreateForm />} />
            <Route path="/pending-forms" element={<PendingForms />} />
            <Route path="/completed-forms" element={<CompletedForms />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<SettingsPage />}>
              <Route index element={<AccountSettings />} />
              <Route path="account" element={<AccountSettings />} />
              <Route path="appearance" element={<AppearanceSettings />} />
              <Route path="notifications" element={<NotificationSettings />} />
            </Route>
            <Route path="/doctors-directory" element={<DoctorsDirectory />} />
            <Route
              path="/assign-template/:templateId/:templateName"
              element={<AssignTemplatePage />}
            />
            {/* Fallback route for backward compatibility */}
            <Route
              path="/assign-template/:templateId"
              element={<AssignTemplatePage />}
            />
            <Route
              path="/view-filled-form/:formId"
              element={<ReadOnlyFormViewer />}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          {/* Voice Assistant - Always visible on all pages */}
          <VoiceAssistant />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
