import os
import json
import re
import logging
import argparse
from langchain_community.document_loaders import (
    UnstructuredWordDocumentLoader,
)
from langchain.document_loaders.csv_loader import CSVLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_core.documents import Document
import pytesseract
from PIL import Image
from pdf2image import convert_from_path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel
import uvicorn
from typing import Optional, Dict, List, Any
import base64
from dotenv import load_dotenv
from openai import OpenAI
from starlette.websockets import WebSocketState

load_dotenv()

# Performance optimization: Using gpt-3.5-turbo for faster response times (~400ms vs ~1200ms)
OPENAI_MODEL_NAME = "gpt-3.5-turbo"
OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable not set. Please set it to your OpenAI API key.")
openai_client = OpenAI(api_key=OPENAI_API_KEY)

Image.MAX_IMAGE_PIXELS = None  # Disable image size limit

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Constants
VECTOR_DB_DIR = "vector_db"       # Base directory for persisting vector DBs
MODEL_NAME = "llama3.2-vision:11b"
EMBEDDING_MODEL = "nomic-embed-text"
# USER_INFO_JSON = "../../uploads/user_info.json"
USER_INFO_JSON = os.path.join('..', 'uploads', 'user_info.json')
# UPLOADS_DIR = "/../uploads"
UPLOADS_DIR = os.path.join('..', 'uploads')

# Initialize FastAPI app
app = FastAPI(title="Quill RAG API", description="API for Quill RAG functionality")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for API
class QueryRequest(BaseModel):
    message: str
    documentName: Optional[str] = None
    chatHistory: Optional[str] = None
    formFields: Optional[str] = None

class UpdateRequest(BaseModel):
    message: str
    documentName: Optional[str] = None

class FormValuesRequest(BaseModel):
    values: List[Dict[str, Any]]

class UserInfoRequest(BaseModel):
    info: Dict[str, Any]

## Helper Functions

def flatten_json(data, parent_key='', sep='_'):
    """Recursively flatten a nested JSON object into a flat dictionary."""
    items = []
    
    if not data:
        return {}
        
    for key, value in data.items():
        new_key = f"{parent_key}{sep}{key}" if parent_key else key
        
        # Skip flattening vector database paths
        if isinstance(value, str) and VECTOR_DB_DIR in value:
            items.append((new_key, value))
            continue
            
        if isinstance(value, dict):
            # Handle nested dictionaries
            items.extend(flatten_json(value, new_key, sep=sep).items())
        elif isinstance(value, list):
            # Handle arrays
            for i, item in enumerate(value):
                if isinstance(item, dict):
                    items.extend(flatten_json(item, f"{new_key}{sep}{i}", sep=sep).items())
                else:
                    items.append((f"{new_key}{sep}{i}", item))
        else:
            # Simple key-value pair
            items.append((new_key, value))
    return dict(items)

def extract_text_from_pdf_with_ocr(file_path):
    """Extract text from PDF using OCR."""
    logging.info(f"Processing PDF with OCR: {file_path}")
    
    try:
        # Convert PDF pages to images
        images = convert_from_path(file_path, dpi=300)
        logging.info(f"Converted PDF to {len(images)} images")
        
        # Process each page with OCR
        text_content = []
        for i, image in enumerate(images):
            logging.info(f"Processing page {i+1} with OCR")
            text = pytesseract.image_to_string(image)
            text_content.append(text)
            
        # Combine all pages with page numbers for context
        full_text = ""
        for i, text in enumerate(text_content):
            full_text += f"\n--- Page {i+1} ---\n{text}\n"
            
        return [Document(page_content=full_text, metadata={"source": file_path})]
        
    except Exception as e:
        logging.error(f"Error processing PDF with OCR: {e}")
        return None

def ingest_file(file_path):
    """Load a file (PDF, Word, image, or CSV) with OCR for PDFs."""
    if not os.path.exists(file_path):
        logging.error(f"File not found: {file_path}")
        return None
        
    ext = os.path.splitext(file_path)[1].lower()
    
    try:
        if ext == ".pdf":
            # Use OCR for PDF processing
            data = extract_text_from_pdf_with_ocr(file_path)
        elif ext in [".doc", ".docx"]:
            loader = UnstructuredWordDocumentLoader(file_path=file_path)
            data = loader.load()
        elif ext in [".png", ".jpg", ".jpeg"]:
            image = Image.open(file_path)
            text = pytesseract.image_to_string(image)
            data = [Document(page_content=text, metadata={"source": file_path})]
        elif ext == ".csv":
            loader = CSVLoader(file_path=file_path)
            data = loader.load()
        else:
            logging.error(f"Unsupported file format: {ext}")
            return None
            
        logging.info(f"File {file_path} loaded successfully with {len(data) if data else 0} documents.")
        return data
    except Exception as e:
        logging.error(f"Error loading file {file_path}: {e}")
        return None

def split_documents(documents):
    """Split documents into smaller chunks with optimized parameters."""
    if not documents:
        logging.warning("No documents to split")
        return []
        
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=1000)
    chunks = text_splitter.split_documents(documents)
    logging.info(f"Documents split into {len(chunks)} chunks.")
    return chunks

def extract_key_value_info(chunks, text, llm):
    """Extract key-value pairs from document chunks or text using enhanced prompts."""
    try:
        if text is not None:
            full_text = text
            logging.info(f'Full text for extraction: {full_text}')
            prompt = (
                "You are a medical administrative assistant helping to extract patient information from conversations. Your role is to identify and organize patient information in a clear, structured way.\n\n"
                "TASK: Extract ALL patient information mentioned in this conversation as a clean JSON object with key-value pairs.\n\n"
                "GUIDELINES:\n"
                "- Identify information shared in natural language (e.g., 'My name is John' → {'name': 'John'})\n"
                "- Look for medical and personal details like:\n"
                "  * Personal info: name, date of birth, contact details\n"
                "  * Insurance info: provider, policy number, group number\n"
                "  * Medical info: conditions, allergies, medications\n"
                "  * Family history: relevant medical conditions\n"
                "- Use normalized key names in camelCase format (e.g., 'phoneNumber' not 'phone_number')\n"
                "- For complex values, combine relevant information (e.g., '123 Main St, Boston MA' → {'address': '123 Main St, Boston MA'})\n"
                "- Only extract information actually provided by the patient, not hypothetical or example text\n"
                "- Exclude pleasantries, questions, and non-informational content\n"
                "- If the same information is mentioned multiple times, use the most recent or complete version\n\n"
                "EXAMPLES:\n"
                "1. 'Hi, I'm John Smith and I'm 45 years old' → {'name': 'John Smith', 'age': 45}\n"
                "2. 'My insurance is Blue Cross, policy number 123-456-789' → {'insuranceProvider': 'Blue Cross', 'insurancePolicyNumber': '123-456-789'}\n"
                "3. 'I have allergies to penicillin and seasonal allergies' → {'allergies': ['penicillin', 'seasonal']}\n"
                "4. 'I take 10mg of Lisinopril daily for blood pressure' → {'medications': [{'name': 'Lisinopril', 'dosage': '10mg', 'frequency': 'daily', 'purpose': 'blood pressure'}]}\n\n"
                "IMPORTANT: Do NOT include any data from these examples. Only extract information from the CONVERSATION TEXT."
                f"CONVERSATION TEXT:\n{full_text}\n\n"
                "OUTPUT (JSON only):"
            )
        else:
            logging.info("Extracting key-value pairs from document chunks")
            if not chunks:
                logging.warning("No chunks provided for extraction")
                return {}
                
            full_text = " ".join([chunk.page_content for chunk in chunks])
            logging.info(f'Full text for extraction: {full_text}')
            prompt = (
                "You are a medical administrative assistant processing patient documents. Your task is to extract and organize patient information into a structured format.\n\n"
                "TASK: Extract ALL relevant patient information into a FLAT (non-nested) JSON object with simple key-value pairs.\n\n"
                "GUIDELINES:\n"
                "- Create a SINGLE-LEVEL JSON only - NO nested objects or arrays\n"
                "- For structured or hierarchical data, flatten using combined keys:\n"
                "  INSTEAD OF: {'address': {'street': '123 Main', 'city': 'Austin'}} \n"
                "  USE: {'addressStreet': '123 Main', 'addressCity': 'Austin'}\n"
                "- Extract all patient information:\n"
                "  * Personal details (name, DOB, contact info)\n"
                "  * Insurance information (provider, policy numbers)\n"
                "  * Medical information (conditions, allergies, medications)\n"
                "  * Family medical history\n"
                "- Standardize all key names to camelCase format\n"
                "- Ensure keys are specific and self-explanatory (e.g., 'primaryPhoneNumber' vs 'phone')\n"
                "- Preserve the original values exactly as they appear - don't normalize values\n"
                "- EXCLUDE metadata, schema information, vector embeddings, or system fields\n"
                "- EXCLUDE empty fields, placeholder text, or fields without clear values\n"
                "- If identical information appears multiple times, use the most recent or complete version\n\n"
                "EXAMPLES OF PROPER FLATTENING:\n"
                "1. {'patient': {'name': 'John', 'contact': {'email': 'j@example.com'}}} → {'patientName': 'John', 'patientContactEmail': 'j@example.com'}\n"
                "2. {'medications': [{'name': 'Lisinopril', 'dosage': '10mg'}]} → {'medicationName': 'Lisinopril', 'medicationDosage': '10mg'}\n\n"
                f"DATABASE CONTENT:\n{full_text}\n\n"
                "OUTPUT (FLAT JSON ONLY, NO OTHER TEXT):"
            )
            
        # result = llm.invoke(input=prompt)
        # raw_output = result.content.strip()
        
        logging.info(f"Prompt text: {prompt}")
        
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL_NAME,
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            n=1,
            stop=None
        )
        
        logging.info(f"OpenAI response: {response}")
        
        raw_output = response.choices[0].message.content.strip()
        
        logging.info(f"Raw output from LLM: {raw_output}")
        
        # Robust JSON extraction
        json_match = re.search(r'\{.*\}', raw_output, re.DOTALL)
        json_str = json_match.group(0) if json_match else "{}"
        
        try:
            info = json.loads(json_str)
            logging.info(f"Successfully extracted {len(info)} fields")
            return info
        except json.JSONDecodeError as e:
            # Try to repair common JSON issues
            logging.warning(f"JSON parsing failed: {e}, attempting to fix")
            # Replace single quotes with double quotes
            json_str = json_str.replace("'", "\"")
            # Fix missing quotes around keys
            json_str = re.sub(r'([{,])\s*([a-zA-Z0-9_]+)\s*:', r'\1"\2":', json_str)
            
            try:
                info = json.loads(json_str)
                logging.info(f"Fixed JSON and extracted {len(info)} fields")
                return info
            except Exception as e2:
                logging.error(f"Failed to fix JSON: {e2}")
                return {}
    except Exception as e:
        logging.error(f"Error in key-value extraction: {e}")
        return {}

def sanitize_collection_name(name: str) -> str:
    """Sanitize collection name to meet Chroma requirements."""
    if not name:
        return "default_collection"
        
    name = name.lower()
    name = re.sub(r'\s+', '_', name)
    name = re.sub(r'[^a-z0-9_-]', '', name)
    name = re.sub(r'^([^a-z0-9]+)', '', name)
    name = re.sub(r'([^a-z0-9]+)$', '', name)
    if len(name) < 3:
        name = name + "_store"
    if len(name) > 63:
        name = name[:63]
    return name

def create_vector_db(chunks, collection_name):
    """Create and persist a vector database from document chunks."""
    if not chunks:
        logging.error("No chunks provided to create vector database")
        return None
    
    # Ensure the vector DB directory exists
    os.makedirs(VECTOR_DB_DIR, exist_ok=True)    
    persist_dir = os.path.join(VECTOR_DB_DIR, collection_name)
    os.makedirs(persist_dir, exist_ok=True)
    
    logging.info(f"Creating vector database in {persist_dir} with collection name {collection_name}")
    logging.info(f"Number of chunks: {len(chunks)}")
    logging.info(f"Chunks: {chunks}")
    
    try:
        logging.info("Creating vector database...")
        vector_db = Chroma.from_documents(
            documents=chunks,
            embedding=OllamaEmbeddings(model=EMBEDDING_MODEL),
            collection_name=collection_name,
            persist_directory=persist_dir,
        )
        logging.info("Persisting vector database...")
        vector_db.persist()
        logging.info(f"Vector database created and persisted to {persist_dir}")
        return vector_db
    except Exception as e:
        logging.error(f"Error creating vector database: {e}")
        return None

def update_user_info_json(new_info, json_file=USER_INFO_JSON):
    """Update the user_info JSON file with new key-value pairs."""
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(json_file), exist_ok=True)
    
    if os.path.exists(json_file):
        try:
            with open(json_file, "r") as f:
                user_info = json.load(f)
        except json.JSONDecodeError as e:
            logging.error(f"Error decoding JSON from {json_file}: {e}. Initializing empty user_info.")
            user_info = {}
    else:
        user_info = {}
    
    user_info.update(new_info)
    
    try:
        with open(json_file, "w") as f:
            json.dump(user_info, f, indent=4)
        logging.info(f"User info JSON updated with {len(new_info)} new key-value pairs.")
    except Exception as e:
        logging.error(f"Error writing to {json_file}: {e}")

def load_user_info(json_file=USER_INFO_JSON):
    """Load and return user information from the JSON file."""
    if os.path.exists(json_file):
        try:
            with open(json_file, "r") as f:
                user_info = json.load(f)
            return user_info
        except Exception as e:
            logging.error(f"Error reading {json_file}: {e}")
    return {}

def format_chat_history(chat_history_json):
    """Format chat history for the prompt."""
    if not chat_history_json:
        return ""
    try:
        chat_history = json.loads(chat_history_json)
        formatted = "\n"
        for msg in chat_history:
            role = "User" if msg['type'] == 'user' else "Assistant"
            formatted += f"{role}: {msg['content']}\n"
        return formatted
    except Exception as e:
        logging.error(f"Error reading chat history: {e}")
        return ""

def create_retriever(vector_db):
    """Create a standard retriever from a vector database."""
    if not vector_db:
        logging.error("No vector database provided for retriever creation")
        return None
        
    try:
        retriever = vector_db.as_retriever()
        logging.info("Retriever created successfully.")
        return retriever
    except Exception as e:
        logging.error(f"Error creating retriever: {e}")
        return None

def answer_query(llm, question, user_info="", chat_history="", new_form=None, form_fields=None, allow_field_updates: bool = True):
    """
    Answer a query using stored data and vector DBs of uploaded forms.
    """
    try:
        user_info_dict = json.loads(user_info) if isinstance(user_info, str) and user_info.strip() else user_info
    except Exception as e:
        logging.error(f"Error parsing user_info: {e}")
        return "I apologize, but I'm having trouble accessing your information. Please let me know how I can help you with the form."
    
    logging.info(f"Question: {question}")
    logging.info(f"User info: {user_info}")
    logging.info(f"Chat history: {chat_history}")
    logging.info(f"New form: {new_form}")
    logging.info(f"Form fields: {form_fields}")
    
    if new_form:
        new_form_context = "\n".join(doc.page_content for doc in new_form)
    
        template = (
            "You are a friendly and helpful medical administrative assistant at a clinic. Your role is to help patients understand and complete their medical forms.\n\n"
            "FORM TO COMPLETE:\n{new_form_context}\n\n"
            "PATIENT INFORMATION:\n{user_info}\n\n"
            "CHAT HISTORY:\n{chat_history}\n\n"
            "INSTRUCTIONS:\n"
            "1. FIELD EXPLANATION:\n"
            "   - Explain each field in clear, patient-friendly language\n"
            "   - Use simple terms to explain medical concepts\n"
            "   - Suggest relevant documents where information can be found\n"
            "   - Explain why each piece of information is needed\n\n"
            "2. VALUE DETERMINATION:\n"
            "   - For each field, find the most relevant information from patient data\n"
            "   - If information is unavailable, explain what's needed and why\n"
            "   - Suggest where to find missing information\n\n"
            "3. DATA FORMATTING:\n"
            "   - Dates: Use MM/DD/YYYY format unless specified otherwise\n"
            "   - Addresses: Format as single strings with appropriate separators\n"
            "   - Phone numbers: Use (XXX) XXX-XXXX format\n"
            "   - Medical values: Use standard medical terminology\n"
            "   - Boolean values: Use Yes/No unless form specifies other values\n\n"
            "4. RESPONSE GUIDELINES:\n"
            "   - Be warm and professional\n"
            "   - Explain medical terms in simple language\n"
            "   - Keep responses concise but informative\n"
            "   - If unsure, offer to help find the information\n"
            "   - Always maintain patient privacy and confidentiality\n\n"
            "QUESTION: {question}\n\n"
            "ANSWER (DO NOT USE ANY NESTED STRUCTURE IN JSON. USE ONLY FLAT, ONE-LEVEL JSON. ANSWER ONLY JSON, NOTHING ELSE):"
        ).format(new_form_context=new_form_context, user_info=user_info, chat_history=chat_history, question=question)
        
        prompt_text = template
    else:
        base_prompt = (
            "You are a friendly and helpful medical administrative assistant at a clinic. Your role is to help patients understand and complete their medical forms.\n\n"
            "PATIENT INFORMATION:\n{user_info}\n\n"
            "CHAT HISTORY:\n{chat_history}\n\n"
            "CURRENT MEDICAL FORM FIELDS AND VALUES:\n{form_fields}\n\n"
            "GUIDELINES:\n"
            "1. Be warm and professional\n"
            "2. Explain medical terms in simple language\n"
            "3. Keep responses concise but informative\n"
            "4. If unsure, offer to help find the information\n"
            "5. Always maintain patient privacy and confidentiality\n"
            "6. If asked about information not in our records, suggest relevant documents they can provide\n"
        )

        update_instructions = (
            "7. IMPORTANT: If you can determine values for ANY form fields based on the conversation and the PATIENT INFORMATION that currently have a value of MISSING, include AS MANY of them as possible in a well-formed JSON object at the end of your response with the format:\n"
            "   {{'field_updates': [{{'id': '<field id>', 'value': '<new value>'}}]}}\n\n"
            "   For example:\n"
            "   Based on the information I have, I was able to fill out some of the form for you!"
            "   {{'field_updates': [{{'id': 'patientName', 'value': 'John Markovich'}}, {{'id': 'email', 'value': 'jm23@gmail.com'}}]}}\n"
            "   Provide field_updates for any field the patient explicitly asked to fill or change, OR for fields that are currently marked MISSING and for which you have reliable information.  Use the associated IDs.\n"
            "   Only update field values if you have the actual new value. Don't use placeholders.\n"
            "   Do NOT include any field in field_updates if you don't have actual data for it.\n"
            "   Do NOT include fields with values like 'MISSING', 'unknown', 'N/A', or placeholders.\n"
            "   Do NOT ask the patient to confirm this information in the chat. Just provide the new values in the JSON object at the end with its 'field_updates' key as specified.\n"
            "   Do NOT reference this JSON object in the chat, just print it out as specified above. It will be filtered out later.\n"
            "   Also, the field from the PATIENT INFORMATION doesn't have to be exactly the same as the field in the form. You can use the PATIENT INFORMATION to determine the new value for the form field.\n"
            "   NEVER return any sort of JSON back to the user as evidence of your answer. ONLY return the JSON object at the end if you have new values to provide, as this will be filtered out later.\n\n"
        )

        prompt_text = base_prompt
        if allow_field_updates:
            prompt_text += update_instructions

        prompt_text += "QUESTION: {question}\n\n"

        if allow_field_updates:
            prompt_text += "Remember to provide the answer in this format all in one line: {{'field_updates': [{{'id': '<field id>', 'value': '<new value>'}}]}}\n\n"

        prompt_text = prompt_text.format(user_info=user_info, chat_history=chat_history, form_fields=form_fields, question=question)
    
    
    logging.info(f"Prompt text: {prompt_text}")
    
    logging.info('Using OpenAI model for completion')
    # Use the OpenAI API to get the response. Edit later to handle conversation history properly.
    response = openai_client.chat.completions.create(
        model=OPENAI_MODEL_NAME,
        messages=[
            {"role": "user", "content": prompt_text}
        ],
        temperature=0.1,
        max_tokens=1500,
        n=1,
        stop=None
    )
    
    logging.info(f"OpenAI response: {response}")
    
    response = response.choices[0].message.content.strip()
    
    # response = llm.invoke(input=prompt_text)
    logging.info(f"LLM response: {response}")
    return response

def merge_user_info(current_info: dict, new_info: dict, llm) -> dict:
    """Merge new_info into current_info using LLM-generated mapping."""
    # If either dictionary is empty, handle the simple cases
    if not current_info:
        return new_info.copy()
    if not new_info:
        return current_info.copy()
    
    # Format the dictionaries for better LLM comprehension
    current_json = json.dumps(current_info, indent=2)
    new_json = json.dumps(new_info, indent=2)
    
    # Create a prompt that asks the LLM to analyze both sets of fields at once
    prompt = f"""
You are a data integration specialist tasked with merging user information from multiple sources. Your goal is to create an accurate, consolidated user profile.

CURRENT USER PROFILE:
{current_json}

NEW INFORMATION TO INTEGRATE:
{new_json}

TASK: Create a mapping between fields in the new information and corresponding fields in the current profile.

FIELD MATCHING RULES:
1. Match fields that represent the same information, even if the field names differ
2. Consider semantic meaning, not just exact field name matches
3. Use the following known field synonyms:
   - name = fullName, userName, firstName+lastName
   - phone = mobile, phoneNumber, cellPhone, telephone
   - address = homeAddress, streetAddress, residentialAddress
   - email = emailAddress, userEmail
   - ssn = socialSecurityNumber, taxpayerID
   - dob = dateOfBirth, birthDate
   - income = salary, wages, earnings, compensation

OUTPUT INSTRUCTIONS:
1. For each field in the NEW information, identify if it:
   - Matches an existing field in the current profile (provide the field name)
   - Is a completely new field (mark as null)
2. Output a JSON object with the following structure:
   {{
     "mapping": {{
       "new_field_name1": "matching_current_field_name",
       "new_field_name2": null,
       ...
     }}
   }}
3. Include ALL fields from the new information in your mapping
4. Return ONLY the valid JSON with no additional text

EXAMPLE 1:
Current: {{"name": "John Smith", "phone": "555-1234"}}
New: {{"fullName": "John Smith", "mobile": "555-1234", "email": "john@example.com"}}
Output: {{"mapping": {{"fullName": "name", "mobile": "phone", "email": null}}}}

EXAMPLE 2:
Current: {{"address": "123 Main St", "ssn": "123-45-6789"}}
New: {{"homeAddress": "123 Main St", "taxpayerID": "123-45-6789", "employer": "ACME Inc"}}
Output: {{"mapping": {{"homeAddress": "address", "taxpayerID": "ssn", "employer": null}}}}

YOUR MAPPING OUTPUT:
"""
    
    try:
        # Get the LLM's analysis
        response = llm.invoke(input=prompt)
        result_text = response.content.strip()
        
        # Extract the JSON object (handle potential formatting issues)
        json_match = re.search(r'\{[\s\S]*\}', result_text)
        if not json_match:
            logging.warning("Could not extract JSON from LLM response, falling back to simple merge")
            return {**current_info, **new_info}
            
        mapping_json = json_match.group(0)
        
        try:
            mapping = json.loads(mapping_json)
        except json.JSONDecodeError as e:
            logging.warning(f"Error parsing mapping JSON: {e}, attempting to fix")
            # Try to fix common JSON issues
            mapping_json = mapping_json.replace("'", "\"")
            mapping_json = re.sub(r'([{,])\s*([a-zA-Z0-9_]+)\s*:', r'\1"\2":', mapping_json)
            
            try:
                mapping = json.loads(mapping_json)
            except Exception as e2:
                logging.error(f"Failed to fix mapping JSON: {e2}, falling back to simple merge")
                return {**current_info, **new_info}
        
        if "mapping" not in mapping:
            logging.warning("Invalid mapping format (no 'mapping' key), falling back to simple merge")
            return {**current_info, **new_info}
            
        # Initialize the merged result with the current info
        merged = current_info.copy()
        
        # Apply the mapping
        for new_field, current_field in mapping["mapping"].items():
            if new_field not in new_info:
                logging.warning(f"Mapping includes '{new_field}', not in new_info. Skipping.")
                continue
                
            if current_field is not None:
                if current_field in merged:
                    merged[current_field] = new_info[new_field]
                    logging.info(f"Updated field '{current_field}' with value from '{new_field}'")
                else:
                    merged[new_field] = new_info[new_field]
                    logging.info(f"Added new field '{new_field}' (mapped field '{current_field}' doesn't exist)")
            else:
                merged[new_field] = new_info[new_field]
                logging.info(f"Added new field '{new_field}'")
                
        return merged
        
    except Exception as e:
        logging.error(f"Error in field mapping: {e}")
        # Fallback to simple merge in case of errors
        return {**current_info, **new_info}

def update_user_info_from_doc_fast(file_path, current_info: dict):
    """
    Fast version of update_user_info_from_doc that skips vector database creation.
    Used for voice uploads where we only need user info extraction for immediate auto-fill.
    """
    data = ingest_file(file_path)
    if data is None:
        logging.error(f"Failed to ingest document from {file_path}")
        return current_info
        
    chunks = split_documents(data)
    new_info = extract_key_value_info(chunks, None, None)  # Skip LLM for speed
    logging.info(f"New info extracted from document: {new_info}")
    
    # Flatten the new info before merging
    flat_new_info = flatten_json(new_info)
    logging.info(f"Flattened new info: {flat_new_info}")
    
    # Simple merge without LLM (faster)
    merged = {**current_info, **flat_new_info}
    update_user_info_json(merged)
    
    # Skip vector DB creation for speed
    logging.info("Skipped vector DB creation for fast voice upload")
    
    return merged

def update_user_info_from_doc(file_path, llm, current_info: dict):
    """
    Update user_info by processing a new document.
    Also creates and persists a vector database for the update document.
    """
    data = ingest_file(file_path)
    if data is None:
        logging.error(f"Failed to ingest document from {file_path}")
        return current_info
        
    chunks = split_documents(data)
    new_info = extract_key_value_info(chunks, None, llm)
    logging.info(f"New info extracted from document: {new_info}")
    
    # Flatten the new info before merging
    flat_new_info = flatten_json(new_info)
    logging.info(f"Flattened new info: {flat_new_info}")
    
    # Use the efficient merging function
    merged = merge_user_info(current_info, flat_new_info, llm)
    update_user_info_json(merged)
    
    # Create and persist a vector DB for the document
    filename = os.path.basename(file_path)
    collection_name = sanitize_collection_name(os.path.splitext(filename)[0])
    vector_db = create_vector_db(chunks, collection_name)
    if vector_db:
        vector_db_path = os.path.join(VECTOR_DB_DIR, collection_name)
        update_user_info_json({collection_name: vector_db_path})
    
    return merged

def update_user_info_from_conversation(text, llm, current_info: dict):
    """
    Update user_info by processing conversation text.
    """
    if not text.strip():
        logging.warning("Empty conversation text provided, no update performed")
        return current_info
        
    new_info = extract_key_value_info(None, text, llm)
    logging.info(f"New info extracted from conversation: {new_info}")
    
    # Flatten the new info before merging
    flat_new_info = flatten_json(new_info)
    logging.info(f"Flattened new info: {flat_new_info}")
    
    # Use the efficient merging function
    merged = merge_user_info(current_info, flat_new_info, llm)
    update_user_info_json(merged)
    
    return merged

def save_uploaded_file(file_content, file_name):
    """Save uploaded file to the uploads directory."""
    try:
        os.makedirs(UPLOADS_DIR, exist_ok=True)
        file_path = os.path.join(UPLOADS_DIR, file_name)
        
        with open(file_path, "wb") as f:
            f.write(file_content)
            
        logging.info(f"File saved successfully at: {file_path}")
        return file_path
    except Exception as e:
        logging.error(f"Error saving file: {e}")
        raise e

# API Endpoints
@app.post("/ingest")
async def ingest_document(file: UploadFile = File(...)):
    """Process document and update user info."""
    try:
        logging.info(f"Processing file: {file.filename}")
        content = await file.read()
        
        # Save the file
        file_path = save_uploaded_file(content, file.filename)
        
        # Process document
        data = ingest_file(file_path)
        if data is None:
            raise HTTPException(status_code=400, detail="Failed to ingest document")
            
        chunks = split_documents(data)
        # llm = ChatOllama(model=MODEL_NAME, temperature=0.1)
        key_value_info = extract_key_value_info(chunks, None, None)
        
        # Flatten any nested structures before saving
        flat_key_value_info = flatten_json(key_value_info)
        update_user_info_json(flat_key_value_info)
        
        # Create and store vector DB
        collection_name = sanitize_collection_name(os.path.splitext(file.filename)[0])
        vector_db = create_vector_db(chunks, collection_name)
        
        if vector_db:
            vector_db_path = os.path.join(VECTOR_DB_DIR, collection_name)
            update_user_info_json({collection_name: vector_db_path})
            
            return {
                "status": "success",
                "message": "Document processed successfully",
                "extracted_info": flat_key_value_info
            }
        else:
            return {
                "status": "partial_success",
                "message": "Document processed but vector database creation failed",
                "extracted_info": flat_key_value_info
            }
    except Exception as e:
        logging.error(f"Error in ingest endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@app.post("/query")
async def query_endpoint(
    message: str = Form(...),
    documentName: Optional[str] = Form(None),
    chatHistory: Optional[str] = Form(None),
    formFields: Optional[str] = Form(None)
):
    """Answer a query using stored data."""
    try:
        # Load stored user info
        user_info = load_user_info()
        
        # Format chat history if provided
        chat_history_formatted = ""
        if chatHistory:
            chat_history_formatted = format_chat_history(chatHistory)
        
        # Initialize LLM
        # llm = ChatOllama(model=MODEL_NAME, temperature=0.1)
        
        if documentName:
            # If document is provided, load it
            logging.info(f"Processing document: {documentName}")
            logging.info(f"os.sep: {os.sep}")
            file_path = UPLOADS_DIR + os.path.sep + documentName
            logging.info(f"File path: {file_path}")
            data = ingest_file(file_path)
            if data is None:
                raise HTTPException(status_code=400, detail=f"Failed to load document: {documentName}")
                
            response = answer_query(
                None, 
                message, 
                user_info=user_info, 
                chat_history=chat_history_formatted,
                new_form=data,
                form_fields=formFields,
                allow_field_updates=True  # always allow when a PDF form is provided
            )
        else:
            # Answer without document
            explanation_only = is_field_explanation_request_py(message)
            allow_updates = (
                is_update_request_py(message)
                or is_auto_fill_request_py(message)
            ) and not explanation_only

            response = answer_query(
                None,
                message,
                user_info=user_info,
                chat_history=chat_history_formatted,
                form_fields=formFields,
                allow_field_updates=allow_updates,
            )
        
        return {"content": response}
    except Exception as e:
        logging.error(f"Error in query endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")

@app.post("/update")
async def update_endpoint(
    message: str = Form(...),
    documentName: Optional[str] = Form(None),
):
    """Update user info from a document or conversation."""
    try:
        # Load current user info
        current_info = load_user_info()
        if not current_info:
            current_info = {}
            
        llm = ChatOllama(model=MODEL_NAME, temperature=0.1)
        
        if documentName:
            # Update via document
            file_path = os.path.join(UPLOADS_DIR, documentName)
            logging.info(f"Processing document for update: {file_path}")
            logging.info(f"Cwd absolute path: {os.path.abspath(os.getcwd())}")
            updated_info = update_user_info_from_doc(file_path, llm, current_info)
            return {
                "status": "success",
                "message": "Your info has been updated from your document.",
                "updated_info": updated_info,
                "content": "I've updated your information based on your document.",
                "wasUpdate": True
            }
        else:
            # Update via conversation text
            updated_info = update_user_info_from_conversation(message, llm, current_info)
            return {
                "status": "success",
                "message": "Your info has been updated from our conversation.",
                "updated_info": updated_info,
                "content": "I've updated your information based on your message.",
                "wasUpdate": True
            }
    except Exception as e:
        logging.error(f"Error in update endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

@app.post("/blank")
async def process_blank_form(
    file: UploadFile = File(...),
):
    """Process a blank form."""
    try:
        logging.info(f"Processing blank form: {file.filename}")
        content = await file.read()
        
        # Save the file
        file_path = save_uploaded_file(content, file.filename)
        
        sample_json = '{ "Employee social security number": "000-11-2222", \
        "Employer identification number": "999-888-777", \
        "Wages, tips, other compensation": "64000" }'
        
        questionPrompt = f"You are a helpful, form-filling assistant. The user will provide you with an image of a blank or partially-filled form. For each field, your task is to generate the answer to the question, 'What is the value of the field?' and add the field label and its answer as a key-value pair to a .JSON file. If the answer to the field is not already in the form, check if you can find the answer in the chat history. Here is an example response: {sample_json} ONLY RESPOND WITH THE OUTPUT OF A .JSON FILE WITH NO ADDITIONAL TEXT"
        
        # Initialize LLM
        llm = ChatOllama(model=MODEL_NAME, temperature=0.1)
        
        # Process the form
        data = ingest_file(file_path)
        if data is None:
            raise HTTPException(status_code=400, detail="Failed to process blank form")
            
        # Use query to extract fields
        response = answer_query(llm, questionPrompt, new_form=data)
        jsonString = response
        
        logging.info(f"Raw JSON string: {jsonString}")
        
        # Parse the JSON string if it's in the {"response": "..."} format
        try:
            parsedOutput = json.loads(jsonString)
            if "response" in parsedOutput:
                # Extract the inner JSON string
                jsonString = parsedOutput["response"]
                
                # If the inner string is escaped JSON, parse it again to clean it up
                try:
                    innerJson = json.loads(jsonString)
                    jsonString = json.dumps(innerJson)
                except:
                    # If we can't parse it as JSON, just use it as is
                    logging.info('Using response string directly')
            elif isinstance(parsedOutput, dict):
                # If it's already a valid JSON object, convert back to string
                jsonString = json.dumps(parsedOutput)
        except:
            logging.info('Output is not in {"response": "..."} format, using as is')
        
        # Create a temporary JSON file for the filled form data
        jsonFilePath = os.path.join(UPLOADS_DIR, "temp_form_data.json")
        with open(jsonFilePath, "w") as f:
            f.write(jsonString)
        
        # Get the filled PDF path - it should be the same as original but with "_filled.pdf" suffix
        # outputPath = file_path.replace(/\.[^/.]+$/, '') + '_filled.pdf'
        outputPath = file_path.replace(r"\.[^/.]+$", '') + '_filled.pdf'
        
        # Run write_pdf.py to fill the form
        # Note: This would need to be implemented separately as a function
        # For now, we'll just return the JSON data
        
        return {
            "message": "Blank form processed successfully",
            "fields": jsonString,
            "filledFormPath": outputPath
        }
    except Exception as e:
        logging.error(f"Error processing blank form: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process blank form: {str(e)}")

@app.post("/update-form-values")
async def update_form_values(request: FormValuesRequest):
    """Update form values."""
    try:
        # Create directory if it doesn't exist
        form_values_path = os.path.join(UPLOADS_DIR, "form_values.json")
        os.makedirs(os.path.dirname(form_values_path), exist_ok=True)
        
        with open(form_values_path, "w") as f:
            json.dump(request.values, f, indent=2)
            
        return {
            "message": "Form values updated successfully",
            "values": request.values
        }
    except Exception as e:
        logging.error(f"Error updating form values: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update form values: {str(e)}")

@app.get("/get-form-values")
async def get_form_values():
    """Get form values."""
    try:
        form_values_path = os.path.join(UPLOADS_DIR, "form_values.json")
        if os.path.exists(form_values_path):
            with open(form_values_path, "r") as f:
                values = json.load(f)
            return {"values": values}
        else:
            return {"values": []}
    except Exception as e:
        logging.error(f"Error getting form values: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get form values: {str(e)}")

@app.post("/update-user-info")
async def update_user_info_endpoint(request: UserInfoRequest):
    """Update user info."""
    try:
        update_user_info_json(request.info)
        return {
            "message": "User info updated successfully",
            "info": request.info
        }
    except Exception as e:
        logging.error(f"Error updating user info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update user info: {str(e)}")

@app.get("/get-user-info")
async def get_user_info():
    """Get user info."""
    try:
        info = load_user_info()
        return {"info": info}
    except Exception as e:
        logging.error(f"Error getting user info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user info: {str(e)}")

# --- Voice agent helper ----------------------------------------------------
try:
    from ..voice_agent import voice as voice_helper
except Exception:
    import importlib, pathlib, sys

    voice_module_path = pathlib.Path(__file__).resolve().parents[1] / "voice_agent"
    if str(voice_module_path) not in sys.path:
        sys.path.append(str(voice_module_path))
    voice_helper = importlib.import_module("voice")

def is_update_request_py(message: str) -> bool:
    lower_message = message.lower()
    update_keywords = [
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
    ]

    info_types = [
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
    ]

    for kw in update_keywords:
        if f" {kw} " in lower_message:
            for info in info_types:
                if info in lower_message:
                    return True
            if kw in {"update", "change", "modify", "fix", "correct"}:
                return True

    if "not" in lower_message and "but" in lower_message:
        return True
    if any(phrase in lower_message for phrase in ["it's", "its", "should be", "is actually"]):
        return True

    return False

def is_field_explanation_request_py(message: str) -> bool:
    lower = message.lower().strip()

    # Must look like a question about a field
    if "?" not in lower:
        return False

    explanation_phrases = [
        "what does", "what is", "explain", "meaning of", "entail", "stand for",
        "how do i fill", "how to fill", "instructions for", "what should i put",
    ]
    return any(phrase in lower for phrase in explanation_phrases)


def is_auto_fill_request_py(message: str) -> bool:
    """Return True if the user asks the assistant to fill / complete the form."""
    lower = message.lower()
    fill_patterns = [
        "fill out", "fill in", "fill the form", "complete the form", "auto fill", "autofill",
        "populate the form", "enter the information", "add the information",
    ]
    return any(pat in lower for pat in fill_patterns)

# ---------------------------------------------------------------------------
# WebSocket endpoint for bi-directional voice communication
# ---------------------------------------------------------------------------

async def handle_voice_file_upload(upload_request: dict) -> dict:
    """
    Handle voice-controlled file upload requests.
    Returns dict with success status, message, and file_path if successful.
    """
    try:
        # Start with default location if none specified
        search_locations = []
        if upload_request.get("file_location"):
            search_locations.append(upload_request["file_location"])
        
        # Add common locations as fallback
        search_locations.extend([
            "~/Desktop", "~/Downloads", "~/Documents", 
            ".", "./uploads"  # Current directory and uploads folder
        ])
        
        # Search for PDF files
        found_files = []
        for location in search_locations:
            pdf_files = voice_helper.find_pdf_files(location, upload_request.get("doc_type"))
            found_files.extend(pdf_files)
        
        if not found_files:
            locations_str = ", ".join([loc.replace("~/", "your ") for loc in search_locations[:3]])
            return {
                "success": False,
                "message": f"I couldn't find any PDF files in {locations_str}. Please make sure the file exists and try again."
            }
        
        # Select the best match
        selected_file = voice_helper.select_best_pdf_match(found_files, upload_request)
        
        if not selected_file:
            return {
                "success": False,
                "message": "I found some PDF files but couldn't determine which one you meant. Please be more specific."
            }
        
        # Copy the file to uploads directory
        import shutil
        filename = os.path.basename(selected_file)
        destination_path = os.path.join(UPLOADS_DIR, filename)
        
        # Ensure uploads directory exists
        os.makedirs(UPLOADS_DIR, exist_ok=True)
        
        # Copy the file
        shutil.copy2(selected_file, destination_path)
        
        # Generate response message
        doc_type_str = upload_request.get("doc_type", "document")
        location_str = upload_request.get("file_location", "") or ""
        
        if location_str:
            location_str = location_str.replace("~/", "your ")
            message = f"I found and uploaded the {doc_type_str} '{filename}' from {location_str}."
        else:
            message = f"I found and uploaded the {doc_type_str} '{filename}'."
        
        return {
            "success": True,
            "message": message,
            "file_path": destination_path,
            "filename": filename
        }
        
    except Exception as e:
        logging.error(f"Voice file upload error: {e}")
        return {
            "success": False,
            "message": f"I encountered an error while trying to upload the file: {str(e)}"
        }

@app.websocket("/voice_ws")
async def voice_ws(websocket: WebSocket):
    """Handle voice chat: receive audio, return assistant reply + TTS audio."""

    await websocket.accept()

    # Conversation memory (mirrors UI chat) – list of {type, content}
    conversation = []  # type: list[dict[str, str]]

    audio_chunks: list[bytes] = []
    
    # Store form fields for context (will be sent by frontend)
    current_form_fields = None

    try:
        while True:
            msg = await websocket.receive()

            # Binary frame – append to buffer
            if "bytes" in msg and msg["bytes"] is not None:
                audio_data = msg["bytes"]
                logging.debug("voice_ws: received %d audio bytes", len(audio_data))
                
                # For the new single-blob approach, we expect larger chunks
                if len(audio_data) > 1000:  # Substantial audio data
                    audio_chunks = [audio_data]  # Replace any previous chunks
                    logging.debug("voice_ws: received substantial audio blob")
                else:
                    audio_chunks.append(audio_data)
                continue

            # Text frame acts as control; expect "END" to delimit utterance
            if "text" in msg and msg["text"]:
                text_msg = msg["text"].strip()
                
                # Check for form fields update
                if text_msg.startswith("FORM_FIELDS:"):
                    try:
                        form_fields_json = text_msg[12:]  # Remove "FORM_FIELDS:" prefix
                        current_form_fields = form_fields_json
                        logging.debug("voice_ws: received form fields update")
                        continue
                    except Exception as e:
                        logging.error("voice_ws: error parsing form fields: %s", e)
                        continue
                
                if text_msg.upper() != "END":
                    # Ignore other control messages for now
                    continue

                # We have full audio → run ASR
                if not audio_chunks:
                    await websocket.send_json({"type": "error", "content": "No audio received"})
                    continue

                logging.debug("voice_ws: END received – processing %d audio chunks", len(audio_chunks))
                audio_bytes = b"".join(audio_chunks)
                audio_chunks = []  # reset for next utterance

                # Validate audio data
                if len(audio_bytes) < 1000:  # Less than 1KB is probably too short
                    logging.warning("voice_ws: audio data too short (%d bytes), skipping", len(audio_bytes))
                    await websocket.send_json({"type": "error", "content": "Audio recording too short. Please try speaking for longer."})
                    continue

                # Additional validation - check for reasonable audio size (not too large either)
                if len(audio_bytes) > 50 * 1024 * 1024:  # 50MB max
                    logging.warning("voice_ws: audio data too large (%d bytes), skipping", len(audio_bytes))
                    await websocket.send_json({"type": "error", "content": "Audio recording too large. Please try a shorter recording."})
                    continue

                logging.debug("voice_ws: running ASR on %d bytes", len(audio_bytes))
                # Speech-to-Text
                try:
                    transcript = voice_helper.transcribe(audio_bytes)
                    logging.info("voice_ws: transcript='%s'", transcript)
                    
                    # Check if transcription failed or is empty
                    if not transcript or transcript.strip() in ["[No speech detected]", "[Transcription failed", ""] or transcript.startswith("[Transcription failed"):
                        logging.warning("voice_ws: transcription failed or empty")
                        await websocket.send_json({"type": "error", "content": "Could not understand the audio. Please try speaking more clearly."})
                        continue
                        
                except Exception as e:
                    logging.error("voice_ws: ASR exception: %s", e)
                    await websocket.send_json({"type": "error", "content": f"ASR failed: {e}"})
                    continue

                # Append user message to conv memory (server-side only)
                conversation.append({"type": "user", "content": transcript})

                # Check if this is a file upload request
                upload_request = voice_helper.detect_file_upload_request(transcript)
                
                if upload_request["is_upload_request"]:
                    # Handle voice-controlled file upload
                    try:
                        upload_result = await handle_voice_file_upload(upload_request)
                        
                        if upload_result["success"]:
                            # File uploaded successfully - provide feedback
                            reply_text = upload_result["message"]
                            
                            # Process the uploaded file through existing RAG pipeline
                            file_path = upload_result["file_path"]
                            filename = os.path.basename(file_path)
                            
                            # Ingest the file into the RAG system
                            data = ingest_file(file_path)
                            
                            if data:
                                reply_text += f" The document has been processed and is now available for questions. You can ask me about the contents of {filename}."
                                
                                # Update user info from the document (faster than vector DB)
                                try:
                                    current_info = load_user_info() or {}
                                    updated_info = update_user_info_from_doc_fast(file_path, current_info)
                                    if updated_info != current_info:
                                        reply_text += " I've also updated your personal information based on the document contents."
                                except Exception as e:
                                    logging.warning(f"Could not update user info from uploaded document: {e}")
                                
                                # AUTO-FILL: Automatically try to fill form fields after successful upload
                                if current_form_fields:
                                    try:
                                        auto_fill_message = "Fill out any form fields you can from the uploaded document. Only include fields you have actual data for - do NOT include fields with placeholder or missing values."

                                        # TODO: How do we figure out when to autofill? Because the user will never ask for it. They will expect it.
                                        
                                        auto_fill_response = answer_query(
                                            None,
                                            auto_fill_message,
                                            user_info=load_user_info(),
                                            chat_history="\n".join([f"{m['type']}: {m['content']}" for m in conversation]),
                                            form_fields=current_form_fields,
                                        )
                                        
                                        # Check if auto-fill response contains field updates
                                        field_updates_match = re.search(r'\{[\'"]field_updates[\'"]:\s*\[[\s\S]*?\]\}', auto_fill_response)
                                        if field_updates_match:
                                            # Append the field updates to the main response so frontend can process them
                                            reply_text += " " + field_updates_match.group(0)
                                            logging.info(f"Voice upload: Auto-fill generated field updates: {field_updates_match.group(0)}")
                                        
                                    except Exception as e:
                                        logging.warning(f"Voice upload auto-fill failed: {e}")
                                
                            else:
                                reply_text += " However, there was an issue processing the document content. You may need to upload it again."
                        else:
                            # File upload failed
                            reply_text = upload_result["message"]
                            
                    except Exception as e:
                        logging.error(f"Voice file upload error: {e}")
                        reply_text = f"I encountered an error while trying to upload the file: {str(e)}"
                        
                else:
                    # Regular query processing (existing logic)
                    # Determine intent & call existing endpoints directly (function)
                    is_update = is_update_request_py(transcript)
                    explanation_only = is_field_explanation_request_py(transcript)
                    allow_updates = (
                        is_update
                        or is_auto_fill_request_py(transcript)
                    ) and not explanation_only

                    try:
                        logging.debug("voice_ws: calling answer_query (update=%s)", is_update)
                        reply_text = answer_query(
                            None,
                            transcript,
                            user_info=load_user_info(),
                            chat_history="\n".join([f"{m['type']}: {m['content']}" for m in conversation]),
                            form_fields=current_form_fields,  # Include form fields for context
                            allow_field_updates=allow_updates,
                        )
                    except Exception as e:
                        await websocket.send_json({"type": "error", "content": f"LLM error: {e}"})
                        continue

                # Add assistant message to conv memory
                conversation.append({"type": "assistant", "content": reply_text})

                # Clean the response for TTS (remove field update JSON)
                cleaned_reply_text = clean_response_for_voice(reply_text)
                logging.info("voice_ws: Original response: '%s'", reply_text)
                logging.info("voice_ws: Cleaned response for TTS: '%s'", cleaned_reply_text)

                # TTS
                logging.debug("voice_ws: synthesizing TTS for reply (len=%d chars)", len(cleaned_reply_text))
                try:
                    logging.info("voice_ws: calling TTS synthesis...")
                    audio_reply = voice_helper.synthesize(cleaned_reply_text)
                    logging.info("voice_ws: TTS synthesis completed, got %d bytes", len(audio_reply))
                except Exception as e:
                    logging.error("voice_ws: TTS synthesis failed: %s", e)
                    await websocket.send_json({"type": "error", "content": f"TTS failed: {e}"})
                    continue

                # Stream assistant text as JSON, then TTS audio
                response_json = json.dumps({
                    "type": "assistant_text",
                    "content": reply_text,  # Send full response with JSON for frontend processing
                })
                logging.debug("voice_ws: sending assistant text JSON")
                await websocket.send_text(response_json)
                logging.debug("voice_ws: assistant text sent, now streaming audio (%d bytes)", len(audio_reply))
                # Send audio bytes
                logging.info("voice_ws: sending audio bytes to client...")
                await websocket.send_bytes(audio_reply)
                logging.info("voice_ws: audio bytes sent successfully")

    except WebSocketDisconnect:
        # Clean disconnect
        logging.info("voice_ws: WebSocket disconnected cleanly")
    except Exception as e:
        logging.error("voice_ws: Unexpected error: %s", e)
        # Only try to send error if connection is still open
        try:
            if websocket.application_state == WebSocketState.CONNECTED:
                await websocket.send_json({"type": "error", "content": "Voice processing error occurred"})
        except Exception as send_error:
            logging.error("voice_ws: Failed to send error message: %s", send_error)
        
        # Try to close connection gracefully
        try:
            if websocket.application_state not in [WebSocketState.DISCONNECTED, WebSocketState.DISCONNECTING]:
                await websocket.close()
        except Exception as close_error:
            logging.error("voice_ws: Failed to close WebSocket: %s", close_error)

def clean_response_for_voice(response_text: str) -> str:
    """
    Remove field update JSON from response text before TTS synthesis.
    This ensures the voice agent doesn't read out the JSON field updates.
    """
    # Extract field updates JSON (same regex as frontend)
    field_updates_match = re.search(r'\{[\'"]field_updates[\'"]:\s*\[[\s\S]*?\]\}', response_text)
    
    if field_updates_match:
        # Remove the field updates JSON from the response
        cleaned_response = response_text.replace(field_updates_match.group(0), "").strip()
        
        # Clean up any redundant text that might be left
        cleaned_response = re.sub(r'\s*Based on the information I have, I was able to fill out some of the form for you!\s*', '', cleaned_response)
        cleaned_response = re.sub(r'\s*Here\'s the updated information:\s*', '', cleaned_response)
        
        # If we're left with an empty response after cleaning, provide a fallback
        if not cleaned_response.strip():
            # Check if there were field updates
            try:
                import json
                field_updates_string = field_updates_match.group(0).replace("'", '"')
                updates_obj = json.loads(field_updates_string)
                field_updates = updates_obj.get('field_updates', [])
                
                if field_updates:
                    return f"I've updated {len(field_updates)} field{'s' if len(field_updates) != 1 else ''} in your form for you."
                else:
                    return "Yes, I can hear you perfectly! I'm here to help you with your medical form. What would you like me to help you with?"
            except:
                return "Yes, I can hear you perfectly! I'm here to help you with your medical form. What would you like me to help you with?"
        
        return cleaned_response
    
    # If no JSON found, return the original response (but ensure it's not empty)
    if not response_text.strip():
        return "Yes, I can hear you perfectly! I'm here to help you with your medical form. What would you like me to help you with?"
    
    return response_text

if __name__ == "__main__":
    # Create required directories
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    os.makedirs(VECTOR_DB_DIR, exist_ok=True)
    
    # Run the FastAPI app
    uvicorn.run(app, host="0.0.0.0", port=8000)