import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

function assignmentApiPlugin() {
  return {
    name: "assignment-api",
    configureServer(server: any) {
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
