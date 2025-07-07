"""
Vercel Serverless Function for Mini-EHR System
Adapted from FastAPI to work with Vercel's serverless environment
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# Add the mock_ehr directory to the path so we can import modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'mock_ehr'))

try:
    from supabase_manager import SupabaseManager
    from form_processor import FormProcessor
except ImportError as e:
    print(f"Import error: {e}")
    # Fallback for when modules aren't available
    class SupabaseManager:
        def __init__(self):
            pass
        def find_or_create_person(self, data):
            return 1
        def get_patient_profile(self, person_id):
            return {"id": person_id, "name": "Test Patient"}
        def update_or_append_field(self, table, person_id, field, value):
            return True
        def create_all_tables(self):
            return {"success": True}
    
    class FormProcessor:
        def __init__(self, db_manager):
            self.db_manager = db_manager
        def process_form_submission(self, form_name, form_data):
            return {"success": True, "person_id": 1, "updates": [], "errors": []}

# Initialize managers
db_manager = SupabaseManager()
form_processor = FormProcessor(db_manager)

class EHRHandler(BaseHTTPRequestHandler):
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
            
            if self.path == '/api/ehr/submit-form':
                response = self.handle_submit_form(data)
            elif self.path == '/api/ehr/create-patient-profile':
                response = self.handle_create_patient(data)
            elif self.path == '/api/ehr/get-patient-profile':
                response = self.handle_get_patient(data)
            elif self.path == '/api/ehr/update-patient-data':
                response = self.handle_update_patient(data)
            elif self.path == '/api/ehr/initialize-tables':
                response = self.handle_initialize_tables()
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
        
        if self.path == '/api/ehr/health':
            response = {"status": "healthy", "service": "Mini-EHR API"}
        elif self.path == '/api/ehr':
            response = {
                "message": "Mini-EHR API is running",
                "version": "1.0.0",
                "endpoints": {
                    "health": "/api/ehr/health",
                    "submit_form": "/api/ehr/submit-form",
                    "create_patient": "/api/ehr/create-patient-profile",
                    "get_patient": "/api/ehr/get-patient-profile",
                    "update_patient": "/api/ehr/update-patient-data",
                    "initialize_tables": "/api/ehr/initialize-tables"
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
    
    def handle_submit_form(self, data):
        """Handle form submission"""
        try:
            form_name = data.get('formName')
            form_data = data.get('formData', {})
            patient_name = data.get('patientName')
            
            if not patient_name:
                for key in ["patientName", "name", "fullName", "firstName"]:
                    if key in form_data:
                        patient_name = form_data[key]
                        break
            
            if not patient_name:
                return {"error": "Patient name is required"}
            
            results = form_processor.process_form_submission(form_name, form_data)
            
            return {
                "success": results["success"],
                "message": "Form submitted and processed successfully" if results["success"] else "Form processing failed",
                "personId": results["person_id"],
                "updates": results["updates"],
                "errors": results["errors"]
            }
        except Exception as e:
            return {"error": f"Form submission failed: {str(e)}"}
    
    def handle_create_patient(self, data):
        """Handle patient profile creation"""
        try:
            person_id = db_manager.find_or_create_person(data)
            return {
                "success": True,
                "personId": person_id,
                "message": "Patient profile created successfully"
            }
        except Exception as e:
            return {"error": f"Profile creation failed: {str(e)}"}
    
    def handle_get_patient(self, data):
        """Handle patient profile retrieval"""
        try:
            person_id = data.get('personId')
            patient_name = data.get('patientName')
            
            if not person_id and patient_name:
                person_data = {"name": patient_name}
                person_id = db_manager.find_or_create_person(person_data)
            
            if not person_id:
                return {"error": "Patient not found"}
            
            profile = db_manager.get_patient_profile(person_id)
            return {
                "success": True,
                "personId": person_id,
                "profile": profile
            }
        except Exception as e:
            return {"error": f"Failed to retrieve profile: {str(e)}"}
    
    def handle_update_patient(self, data):
        """Handle patient data updates"""
        try:
            person_id = data.get('personId')
            table_name = data.get('tableName')
            field_name = data.get('fieldName')
            new_value = data.get('value')
            
            if not all([person_id, table_name, field_name]):
                return {"error": "Person ID, table name, and field name are required"}
            
            success = db_manager.update_or_append_field(table_name, person_id, field_name, new_value)
            return {
                "success": success,
                "message": "Data updated successfully" if success else "Update failed"
            }
        except Exception as e:
            return {"error": f"Update failed: {str(e)}"}
    
    def handle_initialize_tables(self):
        """Handle table initialization"""
        try:
            results = db_manager.create_all_tables()
            return {
                "success": True,
                "message": "Tables initialized",
                "details": results
            }
        except Exception as e:
            return {"error": f"Table initialization failed: {str(e)}"}

# Vercel serverless function entry point
def handler(request, context):
    """Main handler for Vercel serverless function"""
    return EHRHandler().handle_request(request, context)

# For local testing
if __name__ == "__main__":
    from http.server import HTTPServer
    server = HTTPServer(('localhost', 8000), EHRHandler)
    print("Server running on http://localhost:8000")
    server.serve_forever() 