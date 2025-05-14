import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";

interface AssignmentPayload {
  templateId: string;
  templateName?: string;
  patientId: string;
  patientName?: string;
  assignedAt?: string;
  [key: string]: unknown; // allow additional arbitrary fields
}

// Ensure this route runs in the Node.js runtime (required for fs access)
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") || "http://localhost:5173";

  try {
    const payload: AssignmentPayload = await request.json();

    // Basic validation
    if (!payload?.templateId || !payload?.patientId) {
      return NextResponse.json(
        { error: "templateId and patientId are required" },
        { status: 400, headers: { "Access-Control-Allow-Origin": origin } }
      );
    }

    const timestamp = Date.now();
    const filename = `${payload.patientId}_${payload.templateId}_${timestamp}.json`;

    // Ensure /temp directory exists at project root (mockups/frontend2/temp)
    const tempDir = path.join(process.cwd(), "temp");
    await fs.mkdir(tempDir, { recursive: true });

    // Augment payload with server-side timestamp if not provided
    const fileData = {
      ...payload,
      assignedAt: payload.assignedAt || new Date(timestamp).toISOString(),
    };

    await fs.writeFile(
      path.join(tempDir, filename),
      JSON.stringify(fileData, null, 2),
      "utf-8"
    );

    return NextResponse.json(
      { success: true, filename },
      {
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error) {
    console.error("Error in /api/assign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  }
}
