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
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel
import uvicorn
from typing import Optional, Dict, List, Any
import base64

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
    allow_credentials=True,
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
            
        result = llm.invoke(input=prompt)
        raw_output = result.content.strip()
        
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

def answer_query(llm, question, user_info="", chat_history="", new_form=None, form_fields=None):
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
        prompt_text = (
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
            "7. IMPORTANT: If you can determine values for ANY form fields based on the conversation and the PATIENT INFORMATION that currently have a value of MISSING, include AS MANY of them as possible in a well-formed JSON object at the end of your response with the format:\n"
            "   {{'field_updates': [{{'id': '<field id>', 'value': '<new value>'}}]}}\n\n"
            "   ONLY provide field_updates for fields that are in the CURRENT MEDICAL FORM FIELDS AND VALUES and have a value of MISSING. Use the associated IDs. Only choose from the IDs in the existing form fields, not the patient info ones.\n"
            "   Only update field values if you have the actual new value. Don't use place-holders.\n"
            "   Do NOT ask the patient to confirm this information in the chat. Just provide the new values in the JSON object at the end with its 'field_updates' key as specified.\n"
            "   Do NOT reference this JSON object in the chat, just print it out as specified above. It will be filtered out before shown to the user.\n"
            "   Also, the field from the PATIENT INFORMATION doesn't have to be exactly the same as the field in the form. You can use the PATIENT INFORMATION to determine the new value for the form field.\n"
            "   NEVER return any sort of JSON back to the user as evidence of your answer. ONLY return the JSON object at the end if you have new values to provide, as this will be filtered out later.\n\n"
            "QUESTION: {question}"
        ).format(user_info=user_info, chat_history=chat_history, form_fields=form_fields, question=question)
    
    
    logging.info(f"Prompt text: {prompt_text}")
    
    response = llm.invoke(input=prompt_text)
    logging.info(f"LLM response: {response.content.strip()}")
    return response.content.strip()

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
        llm = ChatOllama(model=MODEL_NAME, temperature=0.1)
        key_value_info = extract_key_value_info(chunks, None, llm)
        
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
        llm = ChatOllama(model=MODEL_NAME, temperature=0.1)
        
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
                llm, 
                message, 
                user_info=user_info, 
                chat_history=chat_history_formatted,
                new_form=data,
                form_fields=formFields
            )
        else:
            # Answer without document
            response = answer_query(
                llm, 
                message, 
                user_info=user_info, 
                chat_history=chat_history_formatted,
                form_fields=formFields
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

if __name__ == "__main__":
    # Create required directories
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    os.makedirs(VECTOR_DB_DIR, exist_ok=True)
    
    # Run the FastAPI app
    uvicorn.run(app, host="0.0.0.0", port=8000)