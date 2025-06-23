"""
Patient Data Query Functions for Voice Agent
Provides structured queries to retrieve patient information from EHR
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from .supabase_manager import SupabaseManager

logger = logging.getLogger(__name__)

class PatientDataQuery:
    def __init__(self, supabase_manager: SupabaseManager):
        """Initialize with Supabase manager instance."""
        self.db = supabase_manager
    
    def get_patient_summary(self, patient_name: str) -> Dict[str, Any]:
        """Get comprehensive patient summary for voice agent context."""
        try:
            # Find patient
            person_data = {"name": patient_name}
            person_id = self.db.find_or_create_person(person_data)
            
            if not person_id:
                return {"error": f"Patient '{patient_name}' not found in the system"}
            
            # Get complete profile
            profile = self.db.get_patient_profile(person_id)
            
            # Structure data for voice agent
            summary = {
                "patient_name": patient_name,
                "person_id": person_id,
                "demographics": self._format_demographics(profile.get("person", {})),
                "conditions": self._format_conditions(profile.get("conditions", [])),
                "medications": self._format_medications(profile.get("medications", [])),
                "recent_vitals": self._format_vitals(profile.get("measurements", [])),
                "visit_history": self._format_visits(profile.get("visits", [])),
                "allergies": self._extract_allergies(profile.get("conditions", [])),
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting patient summary: {str(e)}")
            return {"error": f"Failed to retrieve patient data: {str(e)}"}
    
    def _format_demographics(self, person: Dict[str, Any]) -> Dict[str, Any]:
        """Format demographics for voice response."""
        if not person:
            return {"status": "No demographic information available"}
        
        demographics = {}
        
        # Calculate age
        if person.get("year_of_birth"):
            age = datetime.now().year - person["year_of_birth"]
            demographics["age"] = f"{age} years old"
            demographics["date_of_birth"] = f"{person.get('month_of_birth', '')}/{person.get('day_of_birth', '')}/{person.get('year_of_birth', '')}"
        
        # Gender
        demographics["gender"] = person.get("gender_source_value", "Not specified")
        
        # Race and ethnicity
        demographics["race"] = person.get("race_source_value", "Not specified")
        demographics["ethnicity"] = person.get("ethnicity_source_value", "Not specified")
        
        return demographics
    
    def _format_conditions(self, conditions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Format conditions for voice response."""
        if not conditions:
            return {"status": "No conditions on record"}
        
        # Group conditions
        active_conditions = []
        chronic_conditions = []
        
        for condition in conditions:
            condition_name = condition.get("condition_source_value", "Unknown condition")
            start_date = condition.get("condition_start_date", "Unknown date")
            
            # Simple classification (in real system would use concept IDs)
            if any(term in condition_name.lower() for term in ["diabetes", "hypertension", "asthma", "copd"]):
                chronic_conditions.append(f"{condition_name} (since {start_date})")
            else:
                active_conditions.append(f"{condition_name} (started {start_date})")
        
        return {
            "chronic_conditions": chronic_conditions or ["None"],
            "active_conditions": active_conditions or ["None"],
            "total_conditions": len(conditions)
        }
    
    def _format_medications(self, medications: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Format medications for voice response."""
        if not medications:
            return {"status": "No current medications"}
        
        current_meds = []
        
        for med in medications:
            med_name = med.get("drug_source_value", "Unknown medication")
            sig = med.get("sig", "")
            dose = med.get("dose_unit_source_value", "")
            
            # Format medication string
            if sig:
                med_str = f"{med_name} - {sig}"
            elif dose:
                med_str = f"{med_name} {dose}"
            else:
                med_str = med_name
                
            current_meds.append(med_str)
        
        return {
            "current_medications": current_meds,
            "medication_count": len(current_meds)
        }
    
    def _format_vitals(self, measurements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Format recent vital signs for voice response."""
        if not measurements:
            return {"status": "No vital signs recorded"}
        
        # Get most recent measurements by type
        vitals = {}
        measurement_types = {
            "systolic_bp": "Blood Pressure (Systolic)",
            "diastolic_bp": "Blood Pressure (Diastolic)",
            "heart_rate": "Heart Rate",
            "temperature": "Temperature",
            "weight": "Weight",
            "height": "Height",
            "bmi": "BMI"
        }
        
        # Sort by date to get most recent
        sorted_measurements = sorted(
            measurements, 
            key=lambda x: x.get("measurement_datetime", ""), 
            reverse=True
        )
        
        for measurement in sorted_measurements:
            source_value = measurement.get("measurement_source_value", "")
            if source_value in measurement_types and source_value not in vitals:
                value = measurement.get("value_as_number", "")
                unit = measurement.get("unit_source_value", "")
                date = measurement.get("measurement_date", "")
                
                vitals[measurement_types[source_value]] = {
                    "value": f"{value} {unit}",
                    "date": date
                }
        
        # Format blood pressure specially
        if "Blood Pressure (Systolic)" in vitals and "Blood Pressure (Diastolic)" in vitals:
            systolic = vitals["Blood Pressure (Systolic)"]["value"].split()[0]
            diastolic = vitals["Blood Pressure (Diastolic)"]["value"].split()[0]
            date = vitals["Blood Pressure (Systolic)"]["date"]
            vitals["Blood Pressure"] = {
                "value": f"{systolic}/{diastolic} mmHg",
                "date": date
            }
            # Remove individual entries
            del vitals["Blood Pressure (Systolic)"]
            del vitals["Blood Pressure (Diastolic)"]
        
        return vitals if vitals else {"status": "No recent vital signs"}
    
    def _format_visits(self, visits: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Format visit history for voice response."""
        if not visits:
            return {"status": "No visit history"}
        
        # Sort by date
        sorted_visits = sorted(
            visits,
            key=lambda x: x.get("visit_start_date", ""),
            reverse=True
        )
        
        # Get last visit
        last_visit = sorted_visits[0] if sorted_visits else None
        
        visit_summary = {
            "total_visits": len(visits),
            "last_visit_date": last_visit.get("visit_start_date", "Unknown") if last_visit else "None",
            "last_visit_type": last_visit.get("visit_source_value", "Unknown") if last_visit else "None"
        }
        
        return visit_summary
    
    def _extract_allergies(self, conditions: List[Dict[str, Any]]) -> List[str]:
        """Extract allergies from conditions."""
        allergies = []
        
        for condition in conditions:
            condition_name = condition.get("condition_source_value", "")
            if "allergy" in condition_name.lower():
                # Extract allergen name
                allergen = condition_name.replace("Allergy to ", "").strip()
                allergies.append(allergen)
        
        return allergies if allergies else ["No known allergies"]
    
    def get_specific_info(self, patient_name: str, info_type: str) -> Dict[str, Any]:
        """Get specific information about a patient based on query type."""
        summary = self.get_patient_summary(patient_name)
        
        if "error" in summary:
            return summary
        
        info_type_lower = info_type.lower()
        
        # Map query types to data
        if "allerg" in info_type_lower:
            return {
                "patient_name": patient_name,
                "allergies": summary["allergies"]
            }
        elif "medicat" in info_type_lower or "med" in info_type_lower:
            return {
                "patient_name": patient_name,
                "medications": summary["medications"]
            }
        elif "condition" in info_type_lower or "diagnos" in info_type_lower:
            return {
                "patient_name": patient_name,
                "conditions": summary["conditions"]
            }
        elif "vital" in info_type_lower or "blood pressure" in info_type_lower:
            return {
                "patient_name": patient_name,
                "vitals": summary["recent_vitals"]
            }
        elif "age" in info_type_lower or "demograph" in info_type_lower:
            return {
                "patient_name": patient_name,
                "demographics": summary["demographics"]
            }
        elif "visit" in info_type_lower:
            return {
                "patient_name": patient_name,
                "visits": summary["visit_history"]
            }
        else:
            # Return full summary if query type unclear
            return summary 