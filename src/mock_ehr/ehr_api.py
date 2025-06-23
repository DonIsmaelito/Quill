"""
EHR API for Mini-EHR System
Provides endpoints for form submission and patient profile management
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging
import os
import json
from datetime import datetime

from .supabase_manager import SupabaseManager
from .form_processor import FormProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/ehr", tags=["EHR"])

# Initialize managers
db_manager = SupabaseManager()
form_processor = FormProcessor(db_manager)

# Pydantic models
class FormSubmission(BaseModel):
    formName: str
    formData: Dict[str, Any]
    patientName: Optional[str] = None

class PatientQuery(BaseModel):
    patientName: Optional[str] = None
    personId: Optional[int] = None

# Directory for temporary form submissions
TEMP_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "mockups", "frontend2", "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

@router.post("/submit-form")
async def submit_form(submission: FormSubmission, background_tasks: BackgroundTasks):
    """
    Submit a form and process it to update the EHR.
    Creates a temporary JSON file and processes it asynchronously.
    """
    try:
        # Extract patient name from form data if not provided
        patient_name = submission.patientName
        if not patient_name:
            # Try to find name in form data
            for key in ["patientName", "name", "fullName", "firstName"]:
                if key in submission.formData:
                    patient_name = submission.formData[key]
                    break
        
        if not patient_name:
            raise HTTPException(status_code=400, detail="Patient name is required")
        
        # Create temp JSON file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        temp_filename = f"{submission.formName}_{patient_name.replace(' ', '_')}_{timestamp}.json"
        temp_filepath = os.path.join(TEMP_DIR, temp_filename)
        
        # Save form data to temp file
        temp_data = {
            "formName": submission.formName,
            "patientName": patient_name,
            "submittedAt": datetime.now().isoformat(),
            "fields": submission.formData
        }
        
        with open(temp_filepath, "w") as f:
            json.dump(temp_data, f, indent=2)
        
        logger.info(f"Saved form submission to: {temp_filepath}")
        
        # Process form immediately (could be done in background)
        results = form_processor.process_form_submission(
            submission.formName,
            submission.formData
        )
        
        # Clean up temp file after processing
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)
        
        return {
            "success": results["success"],
            "message": "Form submitted and processed successfully" if results["success"] else "Form processing failed",
            "personId": results["person_id"],
            "updates": results["updates"],
            "errors": results["errors"],
            "tempFile": temp_filename
        }
        
    except Exception as e:
        logger.error(f"Error submitting form: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Form submission failed: {str(e)}")

@router.post("/create-patient-profile")
async def create_patient_profile(patient_data: Dict[str, Any]):
    """
    Create a new patient profile in the EHR.
    """
    try:
        # Check if patient already exists
        person_id = db_manager.find_or_create_person(patient_data)
        
        if person_id:
            return {
                "success": True,
                "personId": person_id,
                "message": "Patient profile created successfully"
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to create patient profile")
            
    except Exception as e:
        logger.error(f"Error creating patient profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Profile creation failed: {str(e)}")

@router.post("/get-patient-profile")
async def get_patient_profile(query: PatientQuery):
    """
    Get complete patient profile from the EHR.
    """
    try:
        person_id = query.personId
        
        # If no person_id, try to find by name
        if not person_id and query.patientName:
            person_data = {"name": query.patientName}
            person_id = db_manager.find_or_create_person(person_data)
        
        if not person_id:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Get complete profile
        profile = db_manager.get_patient_profile(person_id)
        
        return {
            "success": True,
            "personId": person_id,
            "profile": profile
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve profile: {str(e)}")

@router.post("/update-patient-data")
async def update_patient_data(update_data: Dict[str, Any]):
    """
    Update specific patient data in the EHR.
    """
    try:
        person_id = update_data.get("personId")
        if not person_id:
            raise HTTPException(status_code=400, detail="Person ID is required")
        
        table_name = update_data.get("tableName")
        field_name = update_data.get("fieldName")
        new_value = update_data.get("value")
        
        if not all([table_name, field_name]):
            raise HTTPException(status_code=400, detail="Table name and field name are required")
        
        # Update or append field
        success = db_manager.update_or_append_field(
            table_name, person_id, field_name, new_value
        )
        
        return {
            "success": success,
            "message": "Data updated successfully" if success else "Update failed"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating patient data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

@router.get("/health")
async def health_check():
    """Check if the EHR service is running."""
    return {"status": "healthy", "service": "Mini-EHR API"}

@router.post("/initialize-tables")
async def initialize_tables():
    """
    Initialize all required tables in Supabase.
    Note: In production, this would be done via migrations.
    """
    try:
        results = db_manager.create_all_tables()
        return {
            "success": True,
            "message": "Tables initialized",
            "details": results
        }
    except Exception as e:
        logger.error(f"Error initializing tables: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Table initialization failed: {str(e)}") 