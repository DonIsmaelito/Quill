import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Custom plugin to handle file system operations in development
const fileSystemPlugin = () => {
  return {
    name: "file-system-plugin",
    configureServer(server: any) {
      server.middlewares.use("/api/update-template", async (req: any, res: any) => {
        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk: any) => {
            body += chunk.toString();
          });
          req.on("end", async () => {
            try {
              const { templateId, data } = JSON.parse(body);
              const filePath = path.join(__dirname, "temp", "form-templates", `${templateId}.json`);
              
              // Ensure directory exists
              const dir = path.dirname(filePath);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              
              // Write the file
              fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
              
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: true, message: "Template updated successfully" }));
            } catch (error) {
              console.error("Error updating template:", error);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: false, error: (error as Error).message }));
            }
          });
        } else {
          res.writeHead(405, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Method not allowed" }));
        }
      });

      // Email service endpoint
      server.middlewares.use("/api/send-form-email", async (req: any, res: any) => {
        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk: any) => {
            body += chunk.toString();
          });
          req.on("end", async () => {
            try {
              const { patientEmail, patientName, templateName, templateId } = JSON.parse(body);
              
              // Create form URL with template ID parameter
              const formUrl = `http://localhost:5173/?template=${templateId}`;
              
              // Create email transporter using Gmail SMTP
              const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                  user: process.env.EMAIL_USER,
                  pass: process.env.EMAIL_PASS
                }
              });

              // Email content
              const mailOptions = {
                from: process.env.EMAIL_FROM,
                to: process.env.EMAIL_TO,
                subject: `Form Request: ${templateName}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">Medical Form Request</h2>
                    <p>Dear ${patientName},</p>
                    <p>You have been requested to complete a medical form: <strong>${templateName}</strong></p>
                    <p>Please click the link below to access and complete the form:</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${formUrl}" 
                         style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Link to form
                      </a>
                    </div>
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #666;">${formUrl}</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #666;">
                      This is an automated message from the Medical Forms System. 
                      Please do not reply to this email.
                    </p>
                  </div>
                `
              };

              // Send email
              await transporter.sendMail(mailOptions);
              
              console.log(`Email sent successfully to ${patientEmail} for template: ${templateName}`);
              
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ 
                success: true, 
                message: "Form request email sent successfully" 
              }));
            } catch (error) {
              console.error("Error sending email:", error);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ 
                success: false, 
                error: (error as Error).message 
              }));
            }
          });
        } else {
          res.writeHead(405, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Method not allowed" }));
        }
      });

      // Assignment service endpoint
      server.middlewares.use("/api/assign", async (req: any, res: any) => {
        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk: any) => {
            body += chunk.toString();
          });
          req.on("end", async () => {
            try {
              const assignment = JSON.parse(body);
              
              // Create a unique filename for the assignment
              const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
              const filename = `assignment-${assignment.templateId}-${assignment.patientId}-${timestamp}.json`;
              
              // Save the assignment to a file
              const assignmentsDir = path.join(__dirname, "temp", "assignments");
              if (!fs.existsSync(assignmentsDir)) {
                fs.mkdirSync(assignmentsDir, { recursive: true });
              }
              
              const filePath = path.join(assignmentsDir, filename);
              fs.writeFileSync(filePath, JSON.stringify(assignment, null, 2));
              
              console.log(`Assignment saved: ${filename}`);
              
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ 
                success: true, 
                message: "Assignment saved successfully",
                filename: filename
              }));
            } catch (error) {
              console.error("Error saving assignment:", error);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ 
                success: false, 
                error: (error as Error).message 
              }));
            }
          });
        } else {
          res.writeHead(405, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Method not allowed" }));
        }
      });

      // Filled form API endpoint
      server.middlewares.use("/api/filled-form", async (req: any, res: any) => {
        if (req.method !== "GET") {
          res.writeHead(405, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Method not allowed" }));
          return;
        }

        try {
          const formId = req.url?.split('/')[1]; // Get form ID from URL
          if (!formId) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Form ID is required" }));
            return;
          }
          
          // Path to the filled form file in frontend2 project
          const filledFormPath = path.join(__dirname, "..", "frontend2", "temp", "filled-forms", `${formId}.json`);
          
          if (!fs.existsSync(filledFormPath)) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Form not found" }));
            return;
          }
          
          const formData = await fs.promises.readFile(filledFormPath, "utf-8");
          const form = JSON.parse(formData);
          
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(form));
        } catch (error) {
          console.error("Filled form API error:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal server error" }));
        }
      });
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), fileSystemPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
