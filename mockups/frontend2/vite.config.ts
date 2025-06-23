import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function assignmentApiPlugin() {
  return {
    name: "assignment-api",
    configureServer(server: any) {
      // Template files API
      server.middlewares.use(
        "/api/templates",
        async (req: any, res: any, next: any) => {
          if (req.method !== "GET") return next();
          
          try {
            const templateId = req.url?.split('/')[1]; // Get template ID from URL
            if (!templateId) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Template ID is required" }));
              return;
            }
            
            // Path to the template file in med-admin-insight project
            const templatePath = path.join(process.cwd(), "..", "med-admin-insight", "temp", "form-templates", `${templateId}.json`);
            
            const templateData = await fs.promises.readFile(templatePath, "utf-8");
            const template = JSON.parse(templateData);
            
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.end(JSON.stringify(template));
          } catch (error) {
            console.error("Template API error:", error);
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Template not found" }));
          }
        }
      );

      // Save filled form API
      server.middlewares.use("/api/save-filled-form", async (req: any, res: any) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        let body = "";
        req.on("data", (chunk: any) => {
          body += chunk.toString();
        });
        req.on("end", async () => {
          try {
            const { formId, data } = JSON.parse(body);
            
            // Ensure filled-forms directory exists
            const filledFormsDir = path.join(process.cwd(), "temp", "filled-forms");
            await fs.promises.mkdir(filledFormsDir, { recursive: true });
            
            // Save the filled form
            const filePath = path.join(filledFormsDir, `${formId}.json`);
            await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
            
            console.log(`Filled form saved: ${formId}`);
            
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ 
              success: true, 
              message: "Filled form saved successfully",
              formId: formId
            }));
          } catch (error) {
            console.error("Error saving filled form:", error);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ 
              success: false, 
              error: (error as Error).message 
            }));
          }
        });
      });

      // Notify clinician API
      server.middlewares.use("/api/notify-clinician", async (req: any, res: any) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        let body = "";
        req.on("data", (chunk: any) => {
          body += chunk.toString();
        });
        req.on("end", async () => {
          try {
            const { formId, templateName, templateId, submittedAt } = JSON.parse(body);
            
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

            // Create admin URL with form ID parameter
            const adminUrl = `http://localhost:8080/view-filled-form/${formId}`;
            
            // Email content for clinician notification
            const mailOptions = {
              from: process.env.EMAIL_FROM,
              to: process.env.EMAIL_TO,
              subject: `New Form Submission: ${templateName}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #2563eb;">New Form Submission</h2>
                  <p>A patient has submitted a completed form.</p>
                  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Form Details:</h3>
                    <p><strong>Template:</strong> ${templateName}</p>
                    <p><strong>Template ID:</strong> ${templateId}</p>
                    <p><strong>Form ID:</strong> ${formId}</p>
                    <p><strong>Submitted:</strong> ${new Date(submittedAt).toLocaleString()}</p>
                  </div>
                  <p>Click the link below to view the completed form:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${adminUrl}" 
                       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      View Completed Form
                    </a>
                  </div>
                  <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; color: #666;">${adminUrl}</p>
                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                  <p style="font-size: 12px; color: #666;">
                    This is an automated notification from the Medical Forms System.
                  </p>
                </div>
              `
            };

            // Send email
            await transporter.sendMail(mailOptions);
            
            console.log(`Clinician notification sent for form: ${formId}`);
            
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ 
              success: true, 
              message: "Clinician notification sent successfully" 
            }));
          } catch (error) {
            console.error("Error sending clinician notification:", error);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ 
              success: false, 
              error: (error as Error).message 
            }));
          }
        });
      });

      server.middlewares.use(
        "/api/assign",
        async (req: any, res: any, next: any) => {
          // Handle CORS preflight
          if (req.method === "OPTIONS") {
            res.statusCode = 204;
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");
            res.end();
            return;
          }

          if (req.method !== "POST") {
            res.statusCode = 405;
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.end("Method Not Allowed");
            return;
          }

          let rawBody = "";
          req.on("data", (chunk: Buffer) => {
            rawBody += chunk.toString();
          });
          req.on("end", async () => {
            try {
              const payload = JSON.parse(rawBody || "{}");

              if (!payload.templateId || !payload.patientId) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error: "templateId and patientId are required",
                  })
                );
                return;
              }

              const timestamp = Date.now();
              const filename = `${payload.patientId}_${payload.templateId}_${timestamp}.json`;

              const tempDir = path.join(process.cwd(), "temp");
              await fs.promises.mkdir(tempDir, { recursive: true });

              // Try to locate a JSON definition for the selected template
              let templateJson: Record<string, unknown> | null = null;
              try {
                // Look for /forms/<templateId>.json first
                const formsDir = path.join(process.cwd(), "forms");
                const candidatePath = path.join(
                  formsDir,
                  `${payload.templateId}.json`
                );
                const fallbackCurrForm = path.join(
                  process.cwd(),
                  "temp",
                  "curr_form.json"
                );

                let chosenPath: string | null = null;
                if (
                  await fs.promises
                    .stat(candidatePath)
                    .then(() => true)
                    .catch(() => false)
                ) {
                  chosenPath = candidatePath;
                } else if (
                  payload.templateId === "patient-intake-form" &&
                  (await fs.promises
                    .stat(fallbackCurrForm)
                    .then(() => true)
                    .catch(() => false))
                ) {
                  chosenPath = fallbackCurrForm;
                }

                if (chosenPath) {
                  const jsonStr = await fs.promises.readFile(
                    chosenPath,
                    "utf-8"
                  );
                  templateJson = JSON.parse(jsonStr);
                }
              } catch (_err) {
                console.warn("Could not load template JSON:", _err);
              }

              const fileContents = templateJson ?? {
                ...payload,
                assignedAt:
                  payload.assignedAt || new Date(timestamp).toISOString(),
              };

              await fs.promises.writeFile(
                path.join(tempDir, filename),
                JSON.stringify(fileContents, null, 2),
                "utf-8"
              );

              res.setHeader("Content-Type", "application/json");
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.end(JSON.stringify({ success: true, filename }));
            } catch (err) {
              console.error("assignment-api error:", err);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Internal server error" }));
            }
          });
        }
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), assignmentApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true, // This allows access from other devices on the network
  },
});
