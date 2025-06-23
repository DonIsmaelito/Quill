"""
Supabase Manager for Mini-EHR
Handles database connections, table creation, and data operations
"""

import os
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
from .schema_definitions import SCHEMA_DEFINITIONS, CONCEPT_VALUES

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

class SupabaseManager:
    def __init__(self):
        """Initialize Supabase client with environment credentials."""
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")

        if not self.url or not self.key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables must be set. Please create a .env file with these values.")

        self.client: Client = create_client(self.url, self.key)
        logger.info("Supabase client initialized")
        
    def create_all_tables(self):
        """Create all tables defined in schema_definitions."""
        created_tables = []
        errors = []
        
        for table_name, table_def in SCHEMA_DEFINITIONS.items():
            try:
                # Note: Supabase doesn't support direct CREATE TABLE via the client
                # You would typically create tables via Supabase dashboard or migration files
                # For this demo, we'll log what would be created
                logger.info(f"Table '{table_name}' should be created with columns: {list(table_def['columns'].keys())}")
                created_tables.append(table_name)
            except Exception as e:
                logger.error(f"Error creating table {table_name}: {str(e)}")
                errors.append((table_name, str(e)))
                
        return {"created": created_tables, "errors": errors}
    
    def find_or_create_person(self, person_data: Dict[str, Any]) -> Optional[int]:
        """
        Find existing person or create new one.
        Returns person_id.
        """
        try:
            # Try to find by name (person_source_value)
            name = person_data.get("name", "").strip()
            if not name:
                logger.error("No name provided for person lookup")
                return None
                
            # Search for existing person
            result = self.client.table("person").select("*").eq("person_source_value", name).execute()
            
            if result.data and len(result.data) > 0:
                # Person exists
                person_id = result.data[0]["person_id"]
                logger.info(f"Found existing person: {name} (ID: {person_id})")
                return person_id
            else:
                # Create new person
                # Parse birth date if provided
                birth_date = person_data.get("dateOfBirth", "")
                year_of_birth = None
                month_of_birth = None
                day_of_birth = None
                
                if birth_date:
                    try:
                        # Try different date formats
                        for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"]:
                            try:
                                dt = datetime.strptime(birth_date, fmt)
                                year_of_birth = dt.year
                                month_of_birth = dt.month
                                day_of_birth = dt.day
                                break
                            except ValueError:
                                continue
                    except Exception as e:
                        logger.warning(f"Could not parse birth date: {birth_date}")
                
                # Map gender to concept ID
                gender = person_data.get("gender", "").title()
                gender_concept_id = CONCEPT_VALUES["gender"].get(gender, 0)
                
                # Map race to concept ID
                race = person_data.get("race", "").title()
                race_concept_id = CONCEPT_VALUES["race"].get(race, 0)
                
                # Map ethnicity to concept ID
                ethnicity = person_data.get("ethnicity", "")
                ethnicity_concept_id = CONCEPT_VALUES["ethnicity"].get(ethnicity, 0)
                
                # Create person record
                new_person = {
                    "person_source_value": name,
                    "gender_concept_id": gender_concept_id,
                    "gender_source_value": person_data.get("gender", ""),
                    "year_of_birth": year_of_birth,
                    "month_of_birth": month_of_birth,
                    "day_of_birth": day_of_birth,
                    "race_concept_id": race_concept_id,
                    "race_source_value": person_data.get("race", ""),
                    "ethnicity_concept_id": ethnicity_concept_id,
                    "ethnicity_source_value": person_data.get("ethnicity", "")
                }
                
                # Remove None values
                new_person = {k: v for k, v in new_person.items() if v is not None}
                
                result = self.client.table("person").insert(new_person).execute()
                
                if result.data and len(result.data) > 0:
                    person_id = result.data[0]["person_id"]
                    logger.info(f"Created new person: {name} (ID: {person_id})")
                    
                    # Create observation period
                    self._create_observation_period(person_id)
                    
                    return person_id
                else:
                    logger.error(f"Failed to create person: {name}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error in find_or_create_person: {str(e)}")
            return None
    
    def _create_observation_period(self, person_id: int):
        """Create an observation period for a new person."""
        try:
            observation_period = {
                "person_id": person_id,
                "observation_period_start_date": datetime.now().date().isoformat(),
                "observation_period_end_date": "2099-12-31",  # Far future date
                "period_type_concept_id": 44814724  # Period covering healthcare encounters
            }
            
            self.client.table("observation_period").insert(observation_period).execute()
            logger.info(f"Created observation period for person_id: {person_id}")
            
        except Exception as e:
            logger.error(f"Error creating observation period: {str(e)}")
    
    def update_or_append_field(self, table_name: str, person_id: int, field_name: str, 
                              new_value: Any, identifier_field: str = None) -> bool:
        """
        Update or append to a field in a table.
        If value exists and is different, append with comma.
        """
        try:
            # For fields that should be appended (like condition lists)
            appendable_fields = ["condition_source_value", "drug_source_value", 
                               "measurement_source_value", "sig"]
            
            # Check if record exists
            query = self.client.table(table_name).select("*").eq("person_id", person_id)
            if identifier_field:
                query = query.eq(identifier_field, new_value.get(identifier_field, ""))
                
            result = query.execute()
            
            if result.data and len(result.data) > 0:
                # Record exists
                existing_record = result.data[0]
                existing_value = existing_record.get(field_name, "")
                
                if field_name in appendable_fields and existing_value:
                    # Check if value already exists (avoid duplicates)
                    existing_values = [v.strip() for v in str(existing_value).split(",")]
                    if str(new_value) not in existing_values:
                        # Append with comma
                        updated_value = f"{existing_value}, {new_value}"
                        
                        # Update the record
                        update_data = {field_name: updated_value}
                        update_id = existing_record.get(f"{table_name}_id")
                        
                        self.client.table(table_name).update(update_data).eq(
                            f"{table_name}_id", update_id
                        ).execute()
                        
                        logger.info(f"Appended to {table_name}.{field_name} for person {person_id}")
                    else:
                        logger.info(f"Value already exists in {table_name}.{field_name}, skipping")
                else:
                    # Update with new value if different
                    if str(existing_value) != str(new_value):
                        update_data = {field_name: new_value}
                        update_id = existing_record.get(f"{table_name}_id")
                        
                        self.client.table(table_name).update(update_data).eq(
                            f"{table_name}_id", update_id
                        ).execute()
                        
                        logger.info(f"Updated {table_name}.{field_name} for person {person_id}")
            else:
                # Create new record
                new_record = {"person_id": person_id, field_name: new_value}
                self.client.table(table_name).insert(new_record).execute()
                logger.info(f"Created new {table_name} record for person {person_id}")
                
            return True
            
        except Exception as e:
            logger.error(f"Error updating field {field_name} in {table_name}: {str(e)}")
            return False
    
    def save_form_submission(self, person_id: int, form_name: str, form_data: Dict[str, Any]):
        """Save raw form submission for processing."""
        try:
            submission = {
                "person_id": person_id,
                "form_name": form_name,
                "form_data": form_data,
                "processed": False
            }
            
            result = self.client.table("patient_form_data").insert(submission).execute()
            
            if result.data and len(result.data) > 0:
                form_id = result.data[0]["form_data_id"]
                logger.info(f"Saved form submission: {form_name} (ID: {form_id})")
                return form_id
            else:
                logger.error("Failed to save form submission")
                return None
                
        except Exception as e:
            logger.error(f"Error saving form submission: {str(e)}")
            return None
    
    def mark_form_processed(self, form_id: int):
        """Mark a form submission as processed."""
        try:
            update_data = {
                "processed": True,
                "processed_at": datetime.now().isoformat()
            }
            
            self.client.table("patient_form_data").update(update_data).eq(
                "form_data_id", form_id
            ).execute()
            
            logger.info(f"Marked form {form_id} as processed")
            
        except Exception as e:
            logger.error(f"Error marking form as processed: {str(e)}")
    
    def get_patient_profile(self, person_id: int) -> Dict[str, Any]:
        """Get complete patient profile from all tables."""
        profile = {}
        
        try:
            # Get person data
            person_result = self.client.table("person").select("*").eq("person_id", person_id).execute()
            if person_result.data:
                profile["person"] = person_result.data[0]
            
            # Get conditions
            conditions_result = self.client.table("condition_occurrence").select("*").eq("person_id", person_id).execute()
            profile["conditions"] = conditions_result.data if conditions_result.data else []
            
            # Get medications
            drugs_result = self.client.table("drug_exposure").select("*").eq("person_id", person_id).execute()
            profile["medications"] = drugs_result.data if drugs_result.data else []
            
            # Get measurements
            measurements_result = self.client.table("measurement").select("*").eq("person_id", person_id).execute()
            profile["measurements"] = measurements_result.data if measurements_result.data else []
            
            # Get visits
            visits_result = self.client.table("visit_occurrence").select("*").eq("person_id", person_id).execute()
            profile["visits"] = visits_result.data if visits_result.data else []
            
            logger.info(f"Retrieved complete profile for person {person_id}")
            
        except Exception as e:
            logger.error(f"Error getting patient profile: {str(e)}")
            
        return profile 