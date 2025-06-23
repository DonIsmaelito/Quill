"""
OMOP CDM-inspired Schema Definitions for Mini-EHR
Based on the standardized health data model
"""

# Table definitions following OMOP CDM structure
SCHEMA_DEFINITIONS = {
    # ===== Standardized Clinical Data (Steel Blue Region) =====
    "person": {
        "columns": {
            "person_id": "SERIAL PRIMARY KEY",
            "gender_concept_id": "INTEGER",
            "year_of_birth": "INTEGER",
            "month_of_birth": "INTEGER", 
            "day_of_birth": "INTEGER",
            "birth_datetime": "TIMESTAMP",
            "race_concept_id": "INTEGER",
            "ethnicity_concept_id": "INTEGER",
            "person_source_value": "VARCHAR(255)",  # Original patient ID
            "gender_source_value": "VARCHAR(50)",
            "race_source_value": "VARCHAR(50)",
            "ethnicity_source_value": "VARCHAR(50)",
            "created_at": "TIMESTAMP DEFAULT NOW()",
            "updated_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "clinical_data"
    },
    
    "observation_period": {
        "columns": {
            "observation_period_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "observation_period_start_date": "DATE",
            "observation_period_end_date": "DATE",
            "period_type_concept_id": "INTEGER"
        },
        "region": "clinical_data"
    },
    
    "visit_occurrence": {
        "columns": {
            "visit_occurrence_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "visit_concept_id": "INTEGER",
            "visit_start_date": "DATE",
            "visit_start_datetime": "TIMESTAMP",
            "visit_end_date": "DATE", 
            "visit_end_datetime": "TIMESTAMP",
            "visit_type_concept_id": "INTEGER",
            "provider_id": "INTEGER",
            "care_site_id": "INTEGER",
            "visit_source_value": "VARCHAR(50)",
            "visit_source_concept_id": "INTEGER",
            "admitted_from_concept_id": "INTEGER",
            "admitted_from_source_value": "VARCHAR(50)",
            "discharged_to_concept_id": "INTEGER",
            "discharged_to_source_value": "VARCHAR(50)"
        },
        "region": "clinical_data"
    },
    
    "condition_occurrence": {
        "columns": {
            "condition_occurrence_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "condition_concept_id": "INTEGER",
            "condition_start_date": "DATE",
            "condition_start_datetime": "TIMESTAMP",
            "condition_end_date": "DATE",
            "condition_end_datetime": "TIMESTAMP",
            "condition_type_concept_id": "INTEGER",
            "condition_status_concept_id": "INTEGER",
            "stop_reason": "VARCHAR(20)",
            "provider_id": "INTEGER",
            "visit_occurrence_id": "INTEGER",
            "visit_detail_id": "INTEGER",
            "condition_source_value": "VARCHAR(500)",  # ICD codes, etc
            "condition_source_concept_id": "INTEGER",
            "condition_status_source_value": "VARCHAR(50)"
        },
        "region": "clinical_data"
    },
    
    "drug_exposure": {
        "columns": {
            "drug_exposure_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "drug_concept_id": "INTEGER",
            "drug_exposure_start_date": "DATE",
            "drug_exposure_start_datetime": "TIMESTAMP",
            "drug_exposure_end_date": "DATE",
            "drug_exposure_end_datetime": "TIMESTAMP",
            "verbatim_end_date": "DATE",
            "drug_type_concept_id": "INTEGER",
            "stop_reason": "VARCHAR(20)",
            "refills": "INTEGER",
            "quantity": "NUMERIC",
            "days_supply": "INTEGER",
            "sig": "TEXT",  # Prescription instructions
            "route_concept_id": "INTEGER",
            "lot_number": "VARCHAR(50)",
            "provider_id": "INTEGER",
            "visit_occurrence_id": "INTEGER",
            "drug_source_value": "VARCHAR(500)",  # Original drug name
            "drug_source_concept_id": "INTEGER",
            "route_source_value": "VARCHAR(50)",
            "dose_unit_source_value": "VARCHAR(50)"
        },
        "region": "clinical_data"
    },
    
    "measurement": {
        "columns": {
            "measurement_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "measurement_concept_id": "INTEGER",
            "measurement_date": "DATE",
            "measurement_datetime": "TIMESTAMP",
            "measurement_time": "VARCHAR(10)",
            "measurement_type_concept_id": "INTEGER",
            "operator_concept_id": "INTEGER",
            "value_as_number": "NUMERIC",
            "value_as_concept_id": "INTEGER",
            "unit_concept_id": "INTEGER",
            "range_low": "NUMERIC",
            "range_high": "NUMERIC",
            "provider_id": "INTEGER",
            "visit_occurrence_id": "INTEGER",
            "measurement_source_value": "VARCHAR(500)",  # Lab test name
            "measurement_source_concept_id": "INTEGER",
            "unit_source_value": "VARCHAR(50)",
            "value_source_value": "VARCHAR(50)",
            "measurement_event_id": "INTEGER",
            "meas_event_field_concept_id": "INTEGER"
        },
        "region": "clinical_data"
    },
    
    # ===== Standardized Health System (Brick Red Region) =====
    "care_site": {
        "columns": {
            "care_site_id": "SERIAL PRIMARY KEY",
            "care_site_name": "VARCHAR(255)",
            "place_of_service_concept_id": "INTEGER",
            "location_id": "INTEGER",
            "care_site_source_value": "VARCHAR(50)",
            "place_of_service_source_value": "VARCHAR(50)"
        },
        "region": "health_system"
    },
    
    "provider": {
        "columns": {
            "provider_id": "SERIAL PRIMARY KEY",
            "provider_name": "VARCHAR(255)",
            "npi": "VARCHAR(20)",
            "dea": "VARCHAR(20)",
            "specialty_concept_id": "INTEGER",
            "care_site_id": "INTEGER",
            "year_of_birth": "INTEGER",
            "gender_concept_id": "INTEGER",
            "provider_source_value": "VARCHAR(50)",
            "specialty_source_value": "VARCHAR(50)",
            "specialty_source_concept_id": "INTEGER",
            "gender_source_value": "VARCHAR(50)",
            "gender_source_concept_id": "INTEGER"
        },
        "region": "health_system"
    },
    
    # ===== Standardized Vocabularies (Orange Region) =====
    "concept": {
        "columns": {
            "concept_id": "INTEGER PRIMARY KEY",
            "concept_name": "VARCHAR(255)",
            "domain_id": "VARCHAR(20)",
            "vocabulary_id": "VARCHAR(20)",
            "concept_class_id": "VARCHAR(20)",
            "standard_concept": "VARCHAR(1)",
            "concept_code": "VARCHAR(50)",
            "valid_start_date": "DATE",
            "valid_end_date": "DATE",
            "invalid_reason": "VARCHAR(1)"
        },
        "region": "vocabularies"
    },
    
    "concept_relationship": {
        "columns": {
            "concept_id_1": "INTEGER",
            "concept_id_2": "INTEGER", 
            "relationship_id": "VARCHAR(20)",
            "valid_start_date": "DATE",
            "valid_end_date": "DATE",
            "invalid_reason": "VARCHAR(1)"
        },
        "region": "vocabularies"
    },
    
    # ===== Additional Helper Tables =====
    "patient_form_data": {
        "columns": {
            "form_data_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "form_name": "VARCHAR(255)",
            "form_data": "JSONB",  # Store raw form data
            "processed": "BOOLEAN DEFAULT FALSE",
            "submitted_at": "TIMESTAMP DEFAULT NOW()",
            "processed_at": "TIMESTAMP"
        },
        "region": "helper"
    }
}

# Concept IDs for common values (simplified for demo)
CONCEPT_VALUES = {
    "gender": {
        "Male": 8507,
        "Female": 8532,
        "Unknown": 0
    },
    "race": {
        "White": 8527,
        "Black or African American": 8516,
        "Asian": 8515,
        "American Indian or Alaska Native": 8657,
        "Native Hawaiian or Other Pacific Islander": 8557,
        "Other": 0
    },
    "ethnicity": {
        "Hispanic or Latino": 38003563,
        "Not Hispanic or Latino": 38003564,
        "Unknown": 0
    },
    "visit_type": {
        "Outpatient Visit": 9202,
        "Inpatient Visit": 9201,
        "Emergency Room Visit": 9203
    }
}

# Common measurement concept IDs
MEASUREMENT_CONCEPTS = {
    "systolic_bp": 3004249,
    "diastolic_bp": 3012888,
    "heart_rate": 3027018,
    "temperature": 3020891,
    "weight": 3025315,
    "height": 3036277,
    "bmi": 3038553
} 