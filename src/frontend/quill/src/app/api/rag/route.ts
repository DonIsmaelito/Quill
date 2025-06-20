import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import axios from "axios";

// Add new interfaces
interface FormFieldValue {
  id: string;
  label: string;
  value: any;
}

interface UserInfo {
  [key: string]: any;
}

// Add new file paths
const USER_INFO_PATH = path.join("..", "..", "uploads", "user_info.json");
const FORM_VALUES_PATH = path.join("..", "..", "uploads", "form_values.json");

// Define FastAPI server URL
const FASTAPI_URL = "http://localhost:8000";

/**
 * Simple sentiment classifier to detect if a message is requesting an update to user information
 * @param message The user's message
 * @returns Boolean indicating if this is an update request
 */
function isUpdateRequest(message: string): boolean {
  // convert to lowercase for easier matching
  const lowerMessage = message.toLowerCase();

  console.log("Checking if message is an update request:", lowerMessage);

  // keywords and phrases that suggest the user wants to update their info
  const updateKeywords = [
    "update",
    "change",
    "modify",
    "correct",
    "fix",
    "edit",
    "wrong",
    "incorrect",
    "mistake",
    "error",
    "not right",
    "is not",
    "instead of",
    "should be",
    "actually",
    "instead",
    "my real",
    "my actual",
    "my correct",
    "add",
    "remove",
  ];

  // information types that might be updated
  const infoTypes = [
    "name",
    "address",
    "phone",
    "email",
    "number",
    "info",
    "information",
    "birth",
    "date",
    "ssn",
    "social",
    "id",
    "identifier",
    "password",
    "contact",
    "details",
    "data",
    "profile",
    "record",
  ];

  // check for direct update requests
  for (const keyword of updateKeywords) {
    // check for keyword with space on either side
    if (lowerMessage.includes(` ${keyword} `)) {
      console.log("Found update keyword:", keyword);
      for (const infoType of infoTypes) {
        if (lowerMessage.includes(infoType)) {
          return true;
        }
      }

      // Even without specific info type, these strongly suggest updates
      if (
        keyword === "update" ||
        keyword === "change" ||
        keyword === "modify" ||
        keyword === "fix" ||
        keyword === "correct"
      ) {
        return true;
      }
    }
  }

  // Check for correction patterns
  if (lowerMessage.includes("not") && lowerMessage.includes("but")) {
    console.log("Found not/but pattern");
    return true;
  }

  if (
    lowerMessage.includes("it's") ||
    lowerMessage.includes("its") ||
    lowerMessage.includes("should be") ||
    lowerMessage.includes("is actually")
  ) {
    console.log("Found it's/its pattern");
    return true;
  }

  // Default to false - assume query if no update indicators found
  return false;
}

// Add CORS headers to response
function addCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours
  return response;
}

export async function OPTIONS(request: Request) {
  // Handle preflight requests
  const requestHeaders = new Headers(request.headers);
  const origin = requestHeaders.get("Origin") || "*";

  const response = new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400", // 24 hours
      Vary: "Origin", // Important for caching responses from different origins
    },
  });

  return response;
}

export async function POST(request: Request) {
  try {
    console.log("Starting POST request processing");
    const formData = await request.formData();
    const mode = formData.get("mode");
    console.log("Request mode:", mode);

    if (mode === "ingest" || mode === "ingest-form-template") {
      const file = formData.get("file") as File;
      if (!file) {
        return addCorsHeaders(
          NextResponse.json({ error: "No file provided" }, { status: 400 })
        );
      }

      console.log("Processing file:", file.name);
      const buffer = Buffer.from(await file.arrayBuffer());

      // Create a new FormData to send to the FastAPI server
      const apiFormData = new FormData();
      const blob = new Blob([buffer], { type: file.type });
      apiFormData.append("file", blob, file.name);

      try {
        // Call the FastAPI ingest endpoint
        const response = await axios.post(
          `${FASTAPI_URL}/${mode}`,
          apiFormData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        return addCorsHeaders(NextResponse.json(response.data));
      } catch (error: any) {
        console.error(
          "Error calling FastAPI ingest endpoint:",
          error.response?.data || error.message
        );
        return addCorsHeaders(
          NextResponse.json(
            {
              error: "Failed to process document",
              details: error.response?.data || error.message,
            },
            { status: error.response?.status || 500 }
          )
        );
      }
    } else if (mode === "query") {
      const message = formData.get("message") as string;
      const documentName = formData.get("documentName") as string;
      if (documentName) {
        console.log("Document name from route.ts:", documentName);
      }
      const chatHistory = formData.get("chatHistory") as string;
      const formFields = formData.get("formFields") as string;

      if (!message) {
        return addCorsHeaders(
          NextResponse.json(
            {
              error: "Message is required",
            },
            { status: 400 }
          )
        );
      }

      // Determine if this is an update request or a regular query
      const isUpdate = isUpdateRequest(message);
      // const endpoint = isUpdate ? 'update' : 'query';
      const endpoint = "query"; // Always use 'query' for now until we update (TODO)
      console.log(`Message classified as ${endpoint} request:`, message);

      // Set up the API form data
      const apiFormData = new FormData();
      apiFormData.append("message", message);

      if (documentName) {
        apiFormData.append("documentName", documentName);
      }

      if (chatHistory) {
        apiFormData.append("chatHistory", chatHistory);
      }

      if (formFields && endpoint === "query") {
        apiFormData.append("formFields", formFields);
      }

      try {
        // Call the appropriate FastAPI endpoint
        const response = await axios.post(
          `${FASTAPI_URL}/${endpoint}`,
          apiFormData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        if (endpoint === "update") {
          return addCorsHeaders(
            NextResponse.json({
              content:
                response.data.content ||
                `I've updated your information. ${response.data.message || ""}`,
              wasUpdate: true,
              ...response.data,
            })
          );
        } else {
          return addCorsHeaders(
            NextResponse.json({ content: response.data.content })
          );
        }
      } catch (error: any) {
        console.error(
          `Error calling FastAPI ${endpoint} endpoint:`,
          error.response?.data || error.message
        );
        return addCorsHeaders(
          NextResponse.json(
            {
              error: `Failed to process ${endpoint} request`,
              details: error.response?.data || error.message,
            },
            { status: error.response?.status || 500 }
          )
        );
      }
    } else if (mode === "blank") {
      const file = formData.get("file") as File;

      console.log("Processing blank form:", file.name);
      const buffer = Buffer.from(await file.arrayBuffer());

      // Create a new FormData to send to the FastAPI server
      const apiFormData = new FormData();
      const blob = new Blob([buffer], { type: file.type });
      apiFormData.append("file", blob, file.name);

      try {
        // Call the FastAPI blank endpoint
        const response = await axios.post(`${FASTAPI_URL}/blank`, apiFormData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        return addCorsHeaders(
          NextResponse.json({
            message: "Blank form processed successfully",
            details: response.data.fields,
            filledFormPath: response.data.filledFormPath,
          })
        );
      } catch (error: any) {
        console.error(
          "Error calling FastAPI blank endpoint:",
          error.response?.data || error.message
        );
        return addCorsHeaders(
          NextResponse.json(
            {
              error: "Failed to process blank form",
              details: error.response?.data || error.message,
            },
            { status: error.response?.status || 500 }
          )
        );
      }
    } else if (mode === "update-form-values") {
      const values = formData.get("values") as string;
      if (!values) {
        return addCorsHeaders(
          NextResponse.json(
            { error: "No form values provided" },
            { status: 400 }
          )
        );
      }

      try {
        const formValues = JSON.parse(values);

        // Call the FastAPI update-form-values endpoint
        const response = await axios.post(`${FASTAPI_URL}/update-form-values`, {
          values: formValues,
        });

        return addCorsHeaders(
          NextResponse.json({
            message: "Form values updated successfully",
            values: formValues,
          })
        );
      } catch (error: any) {
        console.error(
          "Error updating form values:",
          error.response?.data || error.message
        );
        return addCorsHeaders(
          NextResponse.json(
            {
              error: "Invalid form values format",
              details: error.response?.data || error.message,
            },
            { status: error.response?.status || 500 }
          )
        );
      }
    } else if (mode === "get-form-values") {
      try {
        // Call the FastAPI get-form-values endpoint
        const response = await axios.get(`${FASTAPI_URL}/get-form-values`);

        return addCorsHeaders(
          NextResponse.json({ values: response.data.values })
        );
      } catch (error: any) {
        console.error(
          "Error getting form values:",
          error.response?.data || error.message
        );
        return addCorsHeaders(
          NextResponse.json(
            {
              error: "Failed to load form values",
              details: error.response?.data || error.message,
            },
            { status: error.response?.status || 500 }
          )
        );
      }
    } else if (mode === "update-user-info") {
      const info = formData.get("info") as string;
      if (!info) {
        return addCorsHeaders(
          NextResponse.json({ error: "No user info provided" }, { status: 400 })
        );
      }

      try {
        const userInfo = JSON.parse(info);

        // Call the FastAPI update-user-info endpoint
        const response = await axios.post(`${FASTAPI_URL}/update-user-info`, {
          info: userInfo,
        });

        return addCorsHeaders(
          NextResponse.json({
            message: "User info updated successfully",
            info: userInfo,
          })
        );
      } catch (error: any) {
        console.error(
          "Error updating user info:",
          error.response?.data || error.message
        );
        return addCorsHeaders(
          NextResponse.json(
            {
              error: "Invalid user info format",
              details: error.response?.data || error.message,
            },
            { status: error.response?.status || 500 }
          )
        );
      }
    } else if (mode === "get-user-info") {
      try {
        // Call the FastAPI get-user-info endpoint
        const response = await axios.get(`${FASTAPI_URL}/get-user-info`);

        return addCorsHeaders(NextResponse.json({ info: response.data.info }));
      } catch (error: any) {
        console.error(
          "Error getting user info:",
          error.response?.data || error.message
        );
        return addCorsHeaders(
          NextResponse.json(
            {
              error: "Failed to load user info",
              details: error.response?.data || error.message,
            },
            { status: error.response?.status || 500 }
          )
        );
      }
    }

    return addCorsHeaders(
      NextResponse.json({ error: "Invalid mode" }, { status: 400 })
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Route error:", errorMessage);
    return addCorsHeaders(
      NextResponse.json(
        {
          error: "Failed to process request",
          details: errorMessage,
        },
        { status: 500 }
      )
    );
  }
}
