"""
Form Processor for Mini-EHR
Processes form data and maps it to OMOP CDM schema
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from .schema_definitions import CONCEPT_VALUES, MEASUREMENT_CONCEPTS
from .supabase_manager import SupabaseManager

logger = logging.getLogger(__name__)

class FormProcessor:
    def __init__(self, supabase_manager: SupabaseManager):
        """Initialize with Supabase manager instance."""
        self.db = supabase_manager
        
        # Field mappings from common form fields to EHR schema
        self.field_mappings = {
            # Person table mappings
            "patientName": "name",
            "fullName": "name",
            "name": "name",
            "dateOfBirth": "dateOfBirth",
            "dob": "dateOfBirth",
            "birthDate": "dateOfBirth",
            "gender": "gender",
            "sex": "gender",
            "race": "race",
            "ethnicity": "ethnicity",
            
            # Contact information (might go to a separate table in full implementation)
            "phone": "phone",
            "phoneNumber": "phone",
            "email": "email",
            "emailAddress": "email",
            "address": "address",
            "streetAddress": "address",
            
            # Insurance information
            "insuranceProvider": "insuranceProvider",
            "insuranceCompany": "insuranceProvider",
            "policyNumber": "policyNumber",
            "groupNumber": "groupNumber",
            
            # Medical conditions
            "conditions": "conditions",
            "diagnoses": "conditions",
            "medicalConditions": "conditions",
            "allergies": "allergies",
            
            # Medications
            "medications": "medications",
            "currentMedications": "medications",
            "drugs": "medications",
            
            # Vital signs
            "bloodPressure": "bloodPressure",
            "bp": "bloodPressure",
            "heartRate": "heartRate",
            "pulse": "heartRate",
            "temperature": "temperature",
            "temp": "temperature",
            "weight": "weight",
            "height": "height",
            "bmi": "bmi"
        }
    
    def process_form_submission(self, form_name: str, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a form submission and update the EHR.
        Returns processing results.
        """
        logger.info(f"Processing form: {form_name}")
        
        results = {
            "success": False,
            "person_id": None,
            "updates": [],
            "errors": []
        }
        
        try:
            # Step 1: Normalize form data (flatten nested structures)
            normalized_data = self._normalize_form_data(form_data)
            
            # Step 2: Extract person data and find/create person
            person_data = self._extract_person_data(normalized_data)
            if not person_data.get("name"):
                results["errors"].append("No patient name found in form")
                return results
                
            person_id = self.db.find_or_create_person(person_data)
            if not person_id:
                results["errors"].append("Failed to create or find patient")
                return results
                
            results["person_id"] = person_id
            
            # Step 3: Save raw form submission
            form_id = self.db.save_form_submission(person_id, form_name, form_data)
            
            # Step 4: Process different data types
            # Process conditions
            conditions = self._extract_conditions(normalized_data)
            for condition in conditions:
                if self._process_condition(person_id, condition):
                    results["updates"].append(f"Added condition: {condition}")
            
            # Process medications
            medications = self._extract_medications(normalized_data)
            for medication in medications:
                if self._process_medication(person_id, medication):
                    results["updates"].append(f"Added medication: {medication}")
            
            # Process measurements (vitals, lab results)
            measurements = self._extract_measurements(normalized_data)
            for measurement in measurements:
                if self._process_measurement(person_id, measurement):
                    results["updates"].append(f"Added measurement: {measurement['type']}")
            
            # Step 5: Mark form as processed
            if form_id:
                self.db.mark_form_processed(form_id)
            
            results["success"] = True
            logger.info(f"Successfully processed form for person {person_id}")
            
        except Exception as e:
            logger.error(f"Error processing form: {str(e)}")
            results["errors"].append(f"Processing error: {str(e)}")
            
        return results
    
    def _normalize_form_data(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize and flatten form data."""
        normalized = {}
        
        def flatten(data, prefix=""):
            if isinstance(data, dict):
                for key, value in data.items():
                    new_key = f"{prefix}{key}" if prefix else key
                    if isinstance(value, dict):
                        flatten(value, f"{new_key}_")
                    else:
                        # Map to standard field names
                        mapped_key = self.field_mappings.get(key, key)
                        normalized[mapped_key] = value
            elif isinstance(data, list):
                for i, item in enumerate(data):
                    if isinstance(item, dict):
                        flatten(item, f"{prefix}{i}_")
                    else:
                        normalized[f"{prefix}{i}"] = item
            else:
                normalized[prefix.rstrip("_")] = data
        
        flatten(form_data)
        return normalized
    
    def _extract_person_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract person-related data from normalized form data."""
        person_fields = ["name", "dateOfBirth", "gender", "race", "ethnicity", 
                        "phone", "email", "address"]
        
        person_data = {}
        for field in person_fields:
            if field in data:
                person_data[field] = data[field]
        
        # Handle alternate field names
        if not person_data.get("name"):
            for alt in ["patientName", "fullName", "firstName", "lastName"]:
                if alt in data:
                    if alt in ["firstName", "lastName"]:
                        first = data.get("firstName", "")
                        last = data.get("lastName", "")
                        person_data["name"] = f"{first} {last}".strip()
                    else:
                        person_data["name"] = data[alt]
                    break
        
        return person_data
    
    def _extract_conditions(self, data: Dict[str, Any]) -> List[str]:
        """Extract medical conditions from form data."""
        conditions = []
        
        # Check various condition fields
        condition_fields = ["conditions", "diagnoses", "medicalConditions", "medicalHistory"]
        for field in condition_fields:
            if field in data:
                value = data[field]
                if isinstance(value, str):
                    # Split by common delimiters
                    items = [c.strip() for c in value.replace(";", ",").split(",") if c.strip()]
                    conditions.extend(items)
                elif isinstance(value, list):
                    conditions.extend([str(c).strip() for c in value if c])
        
        # Check for allergies (special type of condition)
        if "allergies" in data:
            value = data["allergies"]
            if isinstance(value, str) and value.strip():
                allergy_items = [f"Allergy to {a.strip()}" for a in value.replace(";", ",").split(",") if a.strip()]
                conditions.extend(allergy_items)
            elif isinstance(value, list):
                conditions.extend([f"Allergy to {str(a).strip()}" for a in value if a])
        
        return list(set(conditions))  # Remove duplicates
    
    def _extract_medications(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract medications from form data."""
        medications = []
        
        med_fields = ["medications", "currentMedications", "drugs", "prescriptions"]
        for field in med_fields:
            if field in data:
                value = data[field]
                if isinstance(value, str):
                    # Simple string format: "Aspirin 81mg daily, Lisinopril 10mg daily"
                    med_strings = [m.strip() for m in value.replace(";", ",").split(",") if m.strip()]
                    for med_str in med_strings:
                        med_data = self._parse_medication_string(med_str)
                        if med_data:
                            medications.append(med_data)
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, str):
                            med_data = self._parse_medication_string(item)
                            if med_data:
                                medications.append(med_data)
                        elif isinstance(item, dict):
                            medications.append(item)
        
        return medications
    
    def _parse_medication_string(self, med_str: str) -> Optional[Dict[str, Any]]:
        """Parse a medication string like 'Aspirin 81mg daily'."""
        import re
        
        # Try to extract medication name, dose, and frequency
        # Pattern: medication_name dose frequency
        pattern = r'^([\w\s]+?)(?:\s+(\d+(?:\.\d+)?)\s*(\w+))?(?:\s+(.+))?$'
        match = re.match(pattern, med_str.strip())
        
        if match:
            name = match.group(1).strip()
            dose = match.group(2) if match.group(2) else ""
            unit = match.group(3) if match.group(3) else ""
            frequency = match.group(4) if match.group(4) else ""
            
            return {
                "name": name,
                "dosage": f"{dose}{unit}" if dose else "",
                "frequency": frequency,
                "sig": med_str  # Original prescription string
            }
        
        return {"name": med_str, "sig": med_str}
    
    def _extract_measurements(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract measurements (vitals, lab results) from form data."""
        measurements = []
        
        # Blood pressure (special case - systolic/diastolic)
        if "bloodPressure" in data or "bp" in data:
            bp_value = data.get("bloodPressure") or data.get("bp")
            if isinstance(bp_value, str):
                # Parse "120/80" format
                parts = bp_value.split("/")
                if len(parts) == 2:
                    try:
                        systolic = float(parts[0].strip())
                        diastolic = float(parts[1].strip())
                        measurements.append({
                            "type": "systolic_bp",
                            "value": systolic,
                            "unit": "mmHg",
                            "concept_id": MEASUREMENT_CONCEPTS["systolic_bp"]
                        })
                        measurements.append({
                            "type": "diastolic_bp",
                            "value": diastolic,
                            "unit": "mmHg",
                            "concept_id": MEASUREMENT_CONCEPTS["diastolic_bp"]
                        })
                    except ValueError:
                        pass
        
        # Other vital signs
        vital_mappings = {
            "heartRate": ("heart_rate", "bpm"),
            "pulse": ("heart_rate", "bpm"),
            "temperature": ("temperature", "°F"),
            "temp": ("temperature", "°F"),
            "weight": ("weight", "lbs"),
            "height": ("height", "inches"),
            "bmi": ("bmi", "kg/m²")
        }
        
        for field, (measurement_type, unit) in vital_mappings.items():
            if field in data:
                try:
                    value = float(str(data[field]).replace(",", ""))
                    measurements.append({
                        "type": measurement_type,
                        "value": value,
                        "unit": unit,
                        "concept_id": MEASUREMENT_CONCEPTS.get(measurement_type, 0)
                    })
                except ValueError:
                    pass
        
        return measurements
    
    def _process_condition(self, person_id: int, condition: str) -> bool:
        """Process and store a condition."""
        try:
            condition_data = {
                "person_id": person_id,
                "condition_concept_id": 0,  # Would map to SNOMED in real system
                "condition_source_value": condition,
                "condition_start_date": datetime.now().date().isoformat(),
                "condition_start_datetime": datetime.now().isoformat(),
                "condition_type_concept_id": 32817  # EHR reported
            }
            
            # Check if condition already exists
            existing = self.db.client.table("condition_occurrence").select("*").eq(
                "person_id", person_id
            ).eq("condition_source_value", condition).execute()
            
            if not existing.data:
                result = self.db.client.table("condition_occurrence").insert(condition_data).execute()
                return bool(result.data)
            else:
                logger.info(f"Condition '{condition}' already exists for person {person_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error processing condition: {str(e)}")
            return False
    
    def _process_medication(self, person_id: int, medication: Dict[str, Any]) -> bool:
        """Process and store a medication."""
        try:
            drug_data = {
                "person_id": person_id,
                "drug_concept_id": 0,  # Would map to RxNorm in real system
                "drug_source_value": medication.get("name", ""),
                "drug_exposure_start_date": datetime.now().date().isoformat(),
                "drug_exposure_start_datetime": datetime.now().isoformat(),
                "drug_type_concept_id": 32838,  # EHR prescription
                "sig": medication.get("sig", ""),
                "quantity": medication.get("quantity"),
                "days_supply": medication.get("days_supply"),
                "dose_unit_source_value": medication.get("dosage", "")
            }
            
            # Remove None values
            drug_data = {k: v for k, v in drug_data.items() if v is not None}
            
            # Check if medication already exists
            existing = self.db.client.table("drug_exposure").select("*").eq(
                "person_id", person_id
            ).eq("drug_source_value", medication.get("name", "")).execute()
            
            if not existing.data:
                result = self.db.client.table("drug_exposure").insert(drug_data).execute()
                return bool(result.data)
            else:
                logger.info(f"Medication '{medication.get('name')}' already exists for person {person_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error processing medication: {str(e)}")
            return False
    
    def _process_measurement(self, person_id: int, measurement: Dict[str, Any]) -> bool:
        """Process and store a measurement."""
        try:
            measurement_data = {
                "person_id": person_id,
                "measurement_concept_id": measurement.get("concept_id", 0),
                "measurement_source_value": measurement.get("type", ""),
                "measurement_date": datetime.now().date().isoformat(),
                "measurement_datetime": datetime.now().isoformat(),
                "measurement_type_concept_id": 44818702,  # From physical examination
                "value_as_number": measurement.get("value"),
                "unit_source_value": measurement.get("unit", "")
            }
            
            result = self.db.client.table("measurement").insert(measurement_data).execute()
            return bool(result.data)
            
        except Exception as e:
            logger.error(f"Error processing measurement: {str(e)}")
            return False 