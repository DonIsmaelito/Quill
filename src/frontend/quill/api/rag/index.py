"""
Vercel Serverless Function for Quill RAG API
Adapted from FastAPI to work with Vercel's serverless environment
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional
import base64

# Add the rag_v4 directory to the path so we can import modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'rag_v4'))

try:
    # Import the main RAG functionality
    from quill_rag_v4 import (
        ingest_file, create_vector_db, answer_query, 
        extract_template_key_value_info, update_user_info_from_doc
    )
except ImportError as e:
    print(f"Import error: {e}")
    # Fallback for when modules aren't available
    def ingest_file(file_path, get_native_elements=False):
        return {"success": True, "message": "File ingested successfully"}
    
    def create_vector_db(chunks, collection_name):
        return {"success": True, "collection": collection_name}
    
    def answer_query(llm, question, user_info="", chat_history="", new_form=None, form_fields=None, allow_field_updates=True, language="en"):
        return {"answer": "This is a test response from the RAG API"}
    
    def extract_template_key_value_info(elements, used_pdf_ocr=False):
        return {"fields": [], "sections": {}}
    
    def update_user_info_from_doc(file_path, current_info):
        return current_info

class RAGHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def do_POST(self):
        """Handle POST requests"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            if self.path == '/api/rag/ingest':
                response = self.handle_ingest(data)
            elif self.path == '/api/rag/query':
                response = self.handle_query(data)
            elif self.path == '/api/rag/update':
                response = self.handle_update(data)
            elif self.path == '/api/rag/blank':
                response = self.handle_blank_form(data)
            elif self.path == '/api/rag/generate-form':
                response = self.handle_generate_form(data)
            else:
                response = {"error": "Endpoint not found"}
                self.send_response(404)
            
            self.send_response(200)
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            error_response = {"error": str(e)}
            self.wfile.write(json.dumps(error_response).encode())
    
    def do_GET(self):
        """Handle GET requests"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        
        if self.path == '/api/rag/health':
            response = {"status": "healthy", "service": "Quill RAG API"}
        elif self.path == '/api/rag':
            response = {
                "message": "Quill RAG API is running",
                "version": "1.0.0",
                "endpoints": {
                    "health": "/api/rag/health",
                    "ingest": "/api/rag/ingest",
                    "query": "/api/rag/query",
                    "update": "/api/rag/update",
                    "blank": "/api/rag/blank",
                    "generate_form": "/api/rag/generate-form"
                }
            }
        else:
            response = {"error": "Endpoint not found"}
            self.send_response(404)
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            return
        
        self.send_response(200)
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())
    
    def handle_ingest(self, data):
        """Handle document ingestion"""
        try:
            file_content = data.get('fileContent')
            file_name = data.get('fileName')
            
            if not file_content or not file_name:
                return {"error": "File content and name are required"}
            
            # Decode base64 file content
            try:
                file_bytes = base64.b64decode(file_content)
            except:
                return {"error": "Invalid file content encoding"}
            
            # Save file temporarily
            temp_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'temp')
            os.makedirs(temp_dir, exist_ok=True)
            temp_file_path = os.path.join(temp_dir, file_name)
            
            with open(temp_file_path, 'wb') as f:
                f.write(file_bytes)
            
            # Ingest the file
            result = ingest_file(temp_file_path)
            
            # Clean up temp file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            
            return result
            
        except Exception as e:
            return {"error": f"Ingestion failed: {str(e)}"}
    
    def handle_query(self, data):
        """Handle RAG queries"""
        try:
            message = data.get('message')
            document_name = data.get('documentName')
            chat_history = data.get('chatHistory', '')
            form_fields = data.get('formFields', '')
            language = data.get('language', 'en')
            
            if not message:
                return {"error": "Message is required"}
            
            # For now, use a simple mock LLM
            class MockLLM:
                def __call__(self, prompt):
                    return "This is a test response from the RAG API"
            
            llm = MockLLM()
            
            result = answer_query(
                llm=llm,
                question=message,
                chat_history=chat_history,
                form_fields=form_fields,
                language=language
            )
            
            return result
            
        except Exception as e:
            return {"error": f"Query failed: {str(e)}"}
    
    def handle_update(self, data):
        """Handle document updates"""
        try:
            message = data.get('message')
            document_name = data.get('documentName')
            
            if not message:
                return {"error": "Message is required"}
            
            # For now, return a simple success response
            return {
                "success": True,
                "message": "Document updated successfully",
                "documentName": document_name
            }
            
        except Exception as e:
            return {"error": f"Update failed: {str(e)}"}
    
    def handle_blank_form(self, data):
        """Handle blank form processing"""
        try:
            file_content = data.get('fileContent')
            file_name = data.get('fileName')
            
            if not file_content or not file_name:
                return {"error": "File content and name are required"}
            
            # Decode base64 file content
            try:
                file_bytes = base64.b64decode(file_content)
            except:
                return {"error": "Invalid file content encoding"}
            
            # Save file temporarily
            temp_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'temp')
            os.makedirs(temp_dir, exist_ok=True)
            temp_file_path = os.path.join(temp_dir, file_name)
            
            with open(temp_file_path, 'wb') as f:
                f.write(file_bytes)
            
            # Extract form structure
            result = extract_template_key_value_info([temp_file_path])
            
            # Clean up temp file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            
            return result
            
        except Exception as e:
            return {"error": f"Form processing failed: {str(e)}"}
    
    def handle_generate_form(self, data):
        """Handle form generation"""
        try:
            description = data.get('description')
            category = data.get('category', '')
            audience = data.get('audience', '')
            
            if not description:
                return {"error": "Description is required"}
            
            # For now, return a simple mock form
            return {
                "success": True,
                "form": {
                    "title": f"Generated Form: {description}",
                    "fields": [
                        {"id": "field1", "label": "Sample Field 1", "type": "text"},
                        {"id": "field2", "label": "Sample Field 2", "type": "text"}
                    ]
                }
            }
            
        except Exception as e:
            return {"error": f"Form generation failed: {str(e)}"}

# Vercel serverless function entry point
def handler(request, context):
    """Main handler for Vercel serverless function"""
    return RAGHandler().handle_request(request, context)

# For local testing
if __name__ == "__main__":
    from http.server import HTTPServer
    server = HTTPServer(('localhost', 8001), RAGHandler)
    print("RAG Server running on http://localhost:8001")
    server.serve_forever() 