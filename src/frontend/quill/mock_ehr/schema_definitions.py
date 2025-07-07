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
            # Enhanced demographic fields
            "first_name": "VARCHAR(100)",
            "last_name": "VARCHAR(100)",
            "middle_name": "VARCHAR(100)",
            "suffix": "VARCHAR(10)",
            "preferred_name": "VARCHAR(100)",
            "ssn": "VARCHAR(11)",  # XXX-XX-XXXX format
            "marital_status_concept_id": "INTEGER",
            "language_concept_id": "INTEGER",
            "preferred_language": "VARCHAR(50)",
            "religion_concept_id": "INTEGER",
            "veteran_status": "BOOLEAN",
            "deceased": "BOOLEAN DEFAULT FALSE",
            "death_date": "DATE",
            "death_datetime": "TIMESTAMP",
            "death_type_concept_id": "INTEGER",
            "cause_of_death_concept_id": "INTEGER",
            "cause_of_death_source_value": "VARCHAR(500)",
            "created_at": "TIMESTAMP DEFAULT NOW()",
            "updated_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "clinical_data"
    },
    
    "person_address": {
        "columns": {
            "address_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "address_type": "VARCHAR(20)",  # home, work, billing, emergency
            "address_line_1": "VARCHAR(255)",
            "address_line_2": "VARCHAR(255)",
            "city": "VARCHAR(100)",
            "state": "VARCHAR(50)",
            "zip_code": "VARCHAR(20)",
            "country": "VARCHAR(100) DEFAULT 'USA'",
            "county": "VARCHAR(100)",
            "latitude": "NUMERIC(10, 8)",
            "longitude": "NUMERIC(11, 8)",
            "is_primary": "BOOLEAN DEFAULT FALSE",
            "valid_from": "DATE",
            "valid_to": "DATE",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "clinical_data"
    },
    
    "person_contact": {
        "columns": {
            "contact_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "contact_type": "VARCHAR(20)",  # phone, email, fax
            "contact_value": "VARCHAR(255)",
            "contact_subtype": "VARCHAR(20)",  # mobile, home, work
            "is_primary": "BOOLEAN DEFAULT FALSE",
            "preferred_contact_method": "VARCHAR(20)",
            "do_not_contact": "BOOLEAN DEFAULT FALSE",
            "valid_from": "DATE",
            "valid_to": "DATE",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "clinical_data"
    },
    
    "emergency_contact": {
        "columns": {
            "emergency_contact_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "contact_name": "VARCHAR(255)",
            "relationship": "VARCHAR(100)",
            "phone_number": "VARCHAR(20)",
            "email": "VARCHAR(255)",
            "address_line_1": "VARCHAR(255)",
            "city": "VARCHAR(100)",
            "state": "VARCHAR(50)",
            "zip_code": "VARCHAR(20)",
            "is_primary": "BOOLEAN DEFAULT FALSE",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "clinical_data"
    },
    
    "insurance": {
        "columns": {
            "insurance_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "insurance_type": "VARCHAR(50)",  # primary, secondary, tertiary
            "insurance_provider": "VARCHAR(255)",
            "policy_number": "VARCHAR(100)",
            "group_number": "VARCHAR(100)",
            "subscriber_name": "VARCHAR(255)",
            "subscriber_relationship": "VARCHAR(50)",
            "subscriber_dob": "DATE",
            "subscriber_ssn": "VARCHAR(11)",
            "effective_date": "DATE",
            "expiration_date": "DATE",
            "copay_amount": "NUMERIC(10,2)",
            "deductible_amount": "NUMERIC(10,2)",
            "is_active": "BOOLEAN DEFAULT TRUE",
            "created_at": "TIMESTAMP DEFAULT NOW()"
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
            "discharged_to_source_value": "VARCHAR(50)",
            # Enhanced visit fields
            "visit_status": "VARCHAR(20)",  # scheduled, in-progress, completed, cancelled
            "chief_complaint": "TEXT",
            "visit_notes": "TEXT",
            "discharge_summary": "TEXT",
            "discharge_instructions": "TEXT",
            "follow_up_date": "DATE",
            "follow_up_instructions": "TEXT",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "clinical_data"
    },
    
    "visit_detail": {
        "columns": {
            "visit_detail_id": "SERIAL PRIMARY KEY",
            "visit_occurrence_id": "INTEGER REFERENCES visit_occurrence(visit_occurrence_id)",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "visit_detail_start_datetime": "TIMESTAMP",
            "visit_detail_end_datetime": "TIMESTAMP",
            "visit_detail_type_concept_id": "INTEGER",
            "provider_id": "INTEGER",
            "care_site_id": "INTEGER",
            "admitting_source_concept_id": "INTEGER",
            "discharge_to_concept_id": "INTEGER",
            "preceding_visit_detail_id": "INTEGER",
            "visit_detail_source_value": "VARCHAR(50)",
            "visit_detail_source_concept_id": "INTEGER",
            "admitting_source_value": "VARCHAR(50)",
            "discharge_to_source_value": "VARCHAR(50)",
            "visit_detail_parent_id": "INTEGER"
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
            "condition_status_source_value": "VARCHAR(50)",
            # Enhanced condition fields
            "severity": "VARCHAR(20)",  # mild, moderate, severe
            "chronic": "BOOLEAN DEFAULT FALSE",
            "active": "BOOLEAN DEFAULT TRUE",
            "diagnosis_priority": "INTEGER",  # 1=primary, 2=secondary, etc.
            "diagnosis_confidence": "VARCHAR(20)",  # confirmed, probable, possible
            "notes": "TEXT",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "clinical_data"
    },
    
    "procedure_occurrence": {
        "columns": {
            "procedure_occurrence_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "procedure_concept_id": "INTEGER",
            "procedure_date": "DATE",
            "procedure_datetime": "TIMESTAMP",
            "procedure_type_concept_id": "INTEGER",
            "modifier_concept_id": "INTEGER",
            "quantity": "INTEGER",
            "provider_id": "INTEGER",
            "visit_occurrence_id": "INTEGER",
            "visit_detail_id": "INTEGER",
            "procedure_source_value": "VARCHAR(500)",
            "procedure_source_concept_id": "INTEGER",
            "modifier_source_value": "VARCHAR(50)",
            # Enhanced procedure fields
            "procedure_status": "VARCHAR(20)",  # scheduled, completed, cancelled
            "anesthesia_type": "VARCHAR(50)",
            "procedure_notes": "TEXT",
            "complications": "TEXT",
            "outcome": "VARCHAR(100)",
            "created_at": "TIMESTAMP DEFAULT NOW()"
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
            "dose_unit_source_value": "VARCHAR(50)",
            # Enhanced drug fields
            "prescription_status": "VARCHAR(20)",  # active, discontinued, completed
            "dose_form": "VARCHAR(100)",
            "strength": "VARCHAR(100)",
            "frequency": "VARCHAR(100)",
            "duration": "VARCHAR(100)",
            "allergies": "TEXT",
            "side_effects": "TEXT",
            "effectiveness": "VARCHAR(20)",  # effective, ineffective, unknown
            "created_at": "TIMESTAMP DEFAULT NOW()"
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
            "meas_event_field_concept_id": "INTEGER",
            # Enhanced measurement fields
            "result_status": "VARCHAR(20)",  # normal, abnormal, critical
            "abnormal_flag": "VARCHAR(10)",
            "reference_range": "VARCHAR(100)",
            "method": "VARCHAR(100)",
            "specimen_type": "VARCHAR(100)",
            "lab_name": "VARCHAR(255)",
            "lab_order_id": "VARCHAR(100)",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "clinical_data"
    },
    
    "observation": {
        "columns": {
            "observation_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "observation_concept_id": "INTEGER",
            "observation_date": "DATE",
            "observation_datetime": "TIMESTAMP",
            "observation_type_concept_id": "INTEGER",
            "value_as_number": "NUMERIC",
            "value_as_string": "VARCHAR(500)",
            "value_as_concept_id": "INTEGER",
            "qualifier_concept_id": "INTEGER",
            "unit_concept_id": "INTEGER",
            "provider_id": "INTEGER",
            "visit_occurrence_id": "INTEGER",
            "visit_detail_id": "INTEGER",
            "observation_source_value": "VARCHAR(500)",
            "observation_source_concept_id": "INTEGER",
            "unit_source_value": "VARCHAR(50)",
            "qualifier_source_value": "VARCHAR(50)",
            "value_source_value": "VARCHAR(500)",
            "observation_event_id": "INTEGER",
            "obs_event_field_concept_id": "INTEGER",
            # Enhanced observation fields
            "observation_category": "VARCHAR(100)",
            "observation_notes": "TEXT",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "clinical_data"
    },
    
    "note": {
        "columns": {
            "note_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "note_date": "DATE",
            "note_datetime": "TIMESTAMP",
            "note_type_concept_id": "INTEGER",
            "note_class_concept_id": "INTEGER",
            "note_title": "VARCHAR(250)",
            "note_text": "TEXT",
            "encoding_concept_id": "INTEGER",
            "language_concept_id": "INTEGER",
            "provider_id": "INTEGER",
            "visit_occurrence_id": "INTEGER",
            "visit_detail_id": "INTEGER",
            "note_source_value": "VARCHAR(500)",
            # Enhanced note fields
            "note_status": "VARCHAR(20)",  # draft, final, amended
            "note_category": "VARCHAR(100)",
            "is_confidential": "BOOLEAN DEFAULT FALSE",
            "created_at": "TIMESTAMP DEFAULT NOW()",
            "updated_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "clinical_data"
    },
    
    "note_nlp": {
        "columns": {
            "note_nlp_id": "SERIAL PRIMARY KEY",
            "note_id": "INTEGER REFERENCES note(note_id)",
            "section_concept_id": "INTEGER",
            "snippet": "VARCHAR(500)",
            "offset": "VARCHAR(50)",
            "lexical_variant": "VARCHAR(500)",
            "note_nlp_concept_id": "INTEGER",
            "note_nlp_source_concept_id": "INTEGER",
            "nlp_system": "VARCHAR(250)",
            "nlp_date": "DATE",
            "nlp_datetime": "TIMESTAMP",
            "term_exists": "VARCHAR(1)",
            "term_temporal": "VARCHAR(50)",
            "term_modifiers": "VARCHAR(2000)",
            "term_confidence": "VARCHAR(50)"
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
            "place_of_service_source_value": "VARCHAR(50)",
            # Enhanced care site fields
            "care_site_type": "VARCHAR(100)",  # hospital, clinic, urgent care, etc.
            "address_line_1": "VARCHAR(255)",
            "address_line_2": "VARCHAR(255)",
            "city": "VARCHAR(100)",
            "state": "VARCHAR(50)",
            "zip_code": "VARCHAR(20)",
            "phone": "VARCHAR(20)",
            "fax": "VARCHAR(20)",
            "email": "VARCHAR(255)",
            "website": "VARCHAR(255)",
            "tax_id": "VARCHAR(20)",
            "npi": "VARCHAR(20)",
            "license_number": "VARCHAR(50)",
            "accreditation": "VARCHAR(255)",
            "is_active": "BOOLEAN DEFAULT TRUE",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "health_system"
    },
    
    "location": {
        "columns": {
            "location_id": "SERIAL PRIMARY KEY",
            "address_1": "VARCHAR(255)",
            "address_2": "VARCHAR(255)",
            "city": "VARCHAR(100)",
            "state": "VARCHAR(50)",
            "zip": "VARCHAR(20)",
            "county": "VARCHAR(100)",
            "location_source_value": "VARCHAR(50)",
            "country_concept_id": "INTEGER",
            "country_source_value": "VARCHAR(50)",
            "latitude": "NUMERIC(10, 8)",
            "longitude": "NUMERIC(11, 8)"
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
            "gender_source_concept_id": "INTEGER",
            # Enhanced provider fields
            "first_name": "VARCHAR(100)",
            "last_name": "VARCHAR(100)",
            "middle_name": "VARCHAR(100)",
            "suffix": "VARCHAR(10)",
            "title": "VARCHAR(50)",  # Dr., Prof., etc.
            "credentials": "VARCHAR(100)",  # MD, RN, NP, etc.
            "license_number": "VARCHAR(50)",
            "state_license": "VARCHAR(50)",
            "board_certifications": "TEXT",
            "phone": "VARCHAR(20)",
            "email": "VARCHAR(255)",
            "address_line_1": "VARCHAR(255)",
            "city": "VARCHAR(100)",
            "state": "VARCHAR(50)",
            "zip_code": "VARCHAR(20)",
            "is_active": "BOOLEAN DEFAULT TRUE",
            "hire_date": "DATE",
            "termination_date": "DATE",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "health_system"
    },
    
    "cost": {
        "columns": {
            "cost_id": "SERIAL PRIMARY KEY",
            "cost_event_id": "INTEGER",
            "cost_domain_id": "VARCHAR(20)",
            "cost_type_concept_id": "INTEGER",
            "currency_concept_id": "INTEGER",
            "total_charge": "NUMERIC(10,2)",
            "total_cost": "NUMERIC(10,2)",
            "total_paid": "NUMERIC(10,2)",
            "paid_by_payer": "NUMERIC(10,2)",
            "paid_by_patient": "NUMERIC(10,2)",
            "paid_patient_copay": "NUMERIC(10,2)",
            "paid_patient_coinsurance": "NUMERIC(10,2)",
            "paid_patient_deductible": "NUMERIC(10,2)",
            "paid_by_primary": "NUMERIC(10,2)",
            "paid_ingredient_cost": "NUMERIC(10,2)",
            "paid_dispensing_fee": "NUMERIC(10,2)",
            "payer_plan_period_id": "INTEGER",
            "amount_allowed": "NUMERIC(10,2)",
            "revenue_code_concept_id": "INTEGER",
            "revenue_code_source_value": "VARCHAR(50)",
            "drg_concept_id": "INTEGER",
            "drg_source_value": "VARCHAR(50)"
        },
        "region": "health_system"
    },
    
    "payer_plan_period": {
        "columns": {
            "payer_plan_period_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "payer_plan_period_start_date": "DATE",
            "payer_plan_period_end_date": "DATE",
            "payer_concept_id": "INTEGER",
            "payer_source_value": "VARCHAR(50)",
            "payer_source_concept_id": "INTEGER",
            "plan_concept_id": "INTEGER",
            "plan_source_value": "VARCHAR(50)",
            "plan_source_concept_id": "INTEGER",
            "sponsor_concept_id": "INTEGER",
            "sponsor_source_value": "VARCHAR(50)",
            "sponsor_source_concept_id": "INTEGER",
            "family_source_value": "VARCHAR(50)",
            "stop_reason_concept_id": "INTEGER",
            "stop_reason_source_value": "VARCHAR(50)",
            "stop_reason_source_concept_id": "INTEGER"
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
    
    "concept_ancestor": {
        "columns": {
            "ancestor_concept_id": "INTEGER",
            "descendant_concept_id": "INTEGER",
            "min_levels_of_separation": "INTEGER",
            "max_levels_of_separation": "INTEGER"
        },
        "region": "vocabularies"
    },
    
    "concept_synonym": {
        "columns": {
            "concept_id": "INTEGER",
            "concept_synonym_name": "VARCHAR(1000)",
            "language_concept_id": "INTEGER"
        },
        "region": "vocabularies"
    },
    
    "domain": {
        "columns": {
            "domain_id": "VARCHAR(20) PRIMARY KEY",
            "domain_name": "VARCHAR(255)",
            "domain_concept_id": "INTEGER"
        },
        "region": "vocabularies"
    },
    
    "vocabulary": {
        "columns": {
            "vocabulary_id": "VARCHAR(20) PRIMARY KEY",
            "vocabulary_name": "VARCHAR(255)",
            "vocabulary_reference": "VARCHAR(255)",
            "vocabulary_version": "VARCHAR(255)",
            "vocabulary_concept_id": "INTEGER"
        },
        "region": "vocabularies"
    },
    
    "concept_class": {
        "columns": {
            "concept_class_id": "VARCHAR(20) PRIMARY KEY",
            "concept_class_name": "VARCHAR(255)",
            "concept_class_concept_id": "INTEGER"
        },
        "region": "vocabularies"
    },
    
    "relationship": {
        "columns": {
            "relationship_id": "VARCHAR(20) PRIMARY KEY",
            "relationship_name": "VARCHAR(255)",
            "is_hierarchical": "VARCHAR(1)",
            "defines_ancestry": "VARCHAR(1)",
            "reverse_relationship_id": "VARCHAR(20)",
            "relationship_concept_id": "INTEGER"
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
            "processed_at": "TIMESTAMP",
            # Enhanced form fields
            "form_version": "VARCHAR(20)",
            "form_status": "VARCHAR(20)",  # draft, submitted, processed, archived
            "submitted_by": "VARCHAR(255)",
            "reviewed_by": "VARCHAR(255)",
            "reviewed_at": "TIMESTAMP",
            "notes": "TEXT"
        },
        "region": "helper"
    },
    
    "appointment": {
        "columns": {
            "appointment_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "provider_id": "INTEGER REFERENCES provider(provider_id)",
            "care_site_id": "INTEGER REFERENCES care_site(care_site_id)",
            "appointment_date": "DATE",
            "appointment_time": "TIME",
            "appointment_datetime": "TIMESTAMP",
            "duration_minutes": "INTEGER",
            "appointment_type": "VARCHAR(100)",  # consultation, follow-up, procedure, etc.
            "appointment_status": "VARCHAR(20)",  # scheduled, confirmed, completed, cancelled, no-show
            "reason": "TEXT",
            "notes": "TEXT",
            "created_by": "VARCHAR(255)",
            "created_at": "TIMESTAMP DEFAULT NOW()",
            "updated_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "helper"
    },
    
    "allergy": {
        "columns": {
            "allergy_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "allergen_concept_id": "INTEGER",
            "allergen_source_value": "VARCHAR(500)",
            "allergy_type": "VARCHAR(50)",  # drug, food, environmental, etc.
            "severity": "VARCHAR(20)",  # mild, moderate, severe, life-threatening
            "reaction": "TEXT",
            "onset_date": "DATE",
            "resolved_date": "DATE",
            "is_active": "BOOLEAN DEFAULT TRUE",
            "verified": "BOOLEAN DEFAULT FALSE",
            "verified_by": "VARCHAR(255)",
            "verified_date": "DATE",
            "notes": "TEXT",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "helper"
    },
    
    "immunization": {
        "columns": {
            "immunization_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "immunization_concept_id": "INTEGER",
            "immunization_date": "DATE",
            "immunization_datetime": "TIMESTAMP",
            "immunization_type": "VARCHAR(100)",
            "manufacturer": "VARCHAR(255)",
            "lot_number": "VARCHAR(100)",
            "expiration_date": "DATE",
            "administered_by": "VARCHAR(255)",
            "administered_at": "VARCHAR(255)",
            "route": "VARCHAR(50)",
            "dose": "VARCHAR(100)",
            "series": "VARCHAR(50)",
            "reaction": "TEXT",
            "notes": "TEXT",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "helper"
    },
    
    "family_history": {
        "columns": {
            "family_history_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "relative_type": "VARCHAR(50)",  # mother, father, sibling, etc.
            "relative_age": "INTEGER",
            "condition_concept_id": "INTEGER",
            "condition_source_value": "VARCHAR(500)",
            "onset_age": "INTEGER",
            "is_deceased": "BOOLEAN DEFAULT FALSE",
            "death_age": "INTEGER",
            "notes": "TEXT",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "helper"
    },
    
    "social_history": {
        "columns": {
            "social_history_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "category": "VARCHAR(100)",  # smoking, alcohol, drugs, occupation, etc.
            "status": "VARCHAR(100)",  # current, former, never
            "start_date": "DATE",
            "end_date": "DATE",
            "frequency": "VARCHAR(100)",
            "quantity": "VARCHAR(100)",
            "notes": "TEXT",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "helper"
    },
    
    "vital_signs": {
        "columns": {
            "vital_signs_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "visit_occurrence_id": "INTEGER REFERENCES visit_occurrence(visit_occurrence_id)",
            "measurement_date": "DATE",
            "measurement_datetime": "TIMESTAMP",
            "temperature": "NUMERIC(4,1)",
            "temperature_unit": "VARCHAR(10) DEFAULT 'F'",
            "blood_pressure_systolic": "INTEGER",
            "blood_pressure_diastolic": "INTEGER",
            "heart_rate": "INTEGER",
            "respiratory_rate": "INTEGER",
            "oxygen_saturation": "NUMERIC(4,1)",
            "height": "NUMERIC(5,2)",
            "height_unit": "VARCHAR(10) DEFAULT 'cm'",
            "weight": "NUMERIC(5,2)",
            "weight_unit": "VARCHAR(10) DEFAULT 'kg'",
            "bmi": "NUMERIC(4,2)",
            "pain_scale": "INTEGER",
            "notes": "TEXT",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "helper"
    },
    
    "lab_order": {
        "columns": {
            "lab_order_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "provider_id": "INTEGER REFERENCES provider(provider_id)",
            "visit_occurrence_id": "INTEGER REFERENCES visit_occurrence(visit_occurrence_id)",
            "order_date": "DATE",
            "order_datetime": "TIMESTAMP",
            "lab_name": "VARCHAR(255)",
            "lab_order_number": "VARCHAR(100)",
            "priority": "VARCHAR(20)",  # routine, urgent, stat
            "status": "VARCHAR(20)",  # ordered, collected, processing, completed, cancelled
            "collection_date": "DATE",
            "collection_datetime": "TIMESTAMP",
            "result_date": "DATE",
            "result_datetime": "TIMESTAMP",
            "notes": "TEXT",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "helper"
    },
    
    "lab_result": {
        "columns": {
            "lab_result_id": "SERIAL PRIMARY KEY",
            "lab_order_id": "INTEGER REFERENCES lab_order(lab_order_id)",
            "test_name": "VARCHAR(255)",
            "test_code": "VARCHAR(100)",
            "result_value": "VARCHAR(500)",
            "result_numeric": "NUMERIC",
            "result_unit": "VARCHAR(50)",
            "reference_range": "VARCHAR(100)",
            "abnormal_flag": "VARCHAR(10)",
            "result_status": "VARCHAR(20)",  # normal, abnormal, critical
            "result_date": "DATE",
            "result_datetime": "TIMESTAMP",
            "notes": "TEXT",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "helper"
    },
    
    "medication_order": {
        "columns": {
            "medication_order_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "provider_id": "INTEGER REFERENCES provider(provider_id)",
            "visit_occurrence_id": "INTEGER REFERENCES visit_occurrence(visit_occurrence_id)",
            "drug_concept_id": "INTEGER",
            "drug_name": "VARCHAR(255)",
            "order_date": "DATE",
            "order_datetime": "TIMESTAMP",
            "start_date": "DATE",
            "end_date": "DATE",
            "dose": "VARCHAR(100)",
            "frequency": "VARCHAR(100)",
            "route": "VARCHAR(50)",
            "duration": "VARCHAR(100)",
            "quantity": "NUMERIC",
            "refills": "INTEGER",
            "priority": "VARCHAR(20)",  # routine, urgent, stat
            "status": "VARCHAR(20)",  # ordered, dispensed, administered, discontinued
            "sig": "TEXT",
            "notes": "TEXT",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "helper"
    },
    
    "document": {
        "columns": {
            "document_id": "SERIAL PRIMARY KEY",
            "person_id": "INTEGER REFERENCES person(person_id)",
            "document_type": "VARCHAR(100)",  # consent, advance directive, etc.
            "document_title": "VARCHAR(255)",
            "document_date": "DATE",
            "document_datetime": "TIMESTAMP",
            "document_source_value": "VARCHAR(500)",
            "document_source_concept_id": "INTEGER",
            "document_class_concept_id": "INTEGER",
            "mime_type": "VARCHAR(100)",
            "file_path": "VARCHAR(500)",
            "file_size": "INTEGER",
            "content": "TEXT",
            "status": "VARCHAR(20)",  # draft, final, archived
            "created_by": "VARCHAR(255)",
            "created_at": "TIMESTAMP DEFAULT NOW()"
        },
        "region": "helper"
    },
    
    "audit_log": {
        "columns": {
            "audit_id": "SERIAL PRIMARY KEY",
            "table_name": "VARCHAR(100)",
            "record_id": "INTEGER",
            "action": "VARCHAR(20)",  # insert, update, delete, select
            "user_id": "VARCHAR(255)",
            "timestamp": "TIMESTAMP DEFAULT NOW()",
            "old_values": "JSONB",
            "new_values": "JSONB",
            "ip_address": "VARCHAR(45)",
            "user_agent": "TEXT"
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
    },
    "marital_status": {
        "Single": 4000,
        "Married": 4001,
        "Divorced": 4002,
        "Widowed": 4003,
        "Separated": 4004,
        "Unknown": 0
    },
    "language": {
        "English": 4180186,
        "Spanish": 4175777,
        "French": 4175778,
        "German": 4175779,
        "Chinese": 4175780,
        "Unknown": 0
    },
    "religion": {
        "Christianity": 5000,
        "Islam": 5001,
        "Judaism": 5002,
        "Hinduism": 5003,
        "Buddhism": 5004,
        "None": 5005,
        "Unknown": 0
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
    "bmi": 3038553,
    "respiratory_rate": 3024171,
    "oxygen_saturation": 3027018,
    "pain_scale": 3027018
}

# Common condition concept IDs
CONDITION_CONCEPTS = {
    "hypertension": 316139,
    "diabetes_mellitus": 201820,
    "coronary_artery_disease": 312327,
    "congestive_heart_failure": 316139,
    "chronic_obstructive_pulmonary_disease": 255573,
    "asthma": 317009,
    "depression": 440383,
    "anxiety": 380094,
    "obesity": 433736,
    "hyperlipidemia": 432867
}

# Common drug concept IDs
DRUG_CONCEPTS = {
    "aspirin": 1112807,
    "metformin": 1503297,
    "lisinopril": 1308216,
    "atorvastatin": 1545958,
    "amlodipine": 1332418,
    "metoprolol": 1307046,
    "omeprazole": 923645,
    "acetaminophen": 1125315,
    "ibuprofen": 1177480,
    "hydrochlorothiazide": 974166
} 