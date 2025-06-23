-- OMOP CDM-inspired Schema for Mini-EHR
-- Run this in Supabase SQL Editor to create all required tables

-- ===== Standardized Clinical Data (Steel Blue Region) =====

-- Person table (core patient demographics)
CREATE TABLE IF NOT EXISTS person (
    person_id SERIAL PRIMARY KEY,
    gender_concept_id INTEGER,
    year_of_birth INTEGER,
    month_of_birth INTEGER,
    day_of_birth INTEGER,
    birth_datetime TIMESTAMP,
    race_concept_id INTEGER,
    ethnicity_concept_id INTEGER,
    person_source_value VARCHAR(255),  -- Original patient ID/name
    gender_source_value VARCHAR(50),
    race_source_value VARCHAR(50),
    ethnicity_source_value VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Observation period
CREATE TABLE IF NOT EXISTS observation_period (
    observation_period_id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    observation_period_start_date DATE,
    observation_period_end_date DATE,
    period_type_concept_id INTEGER
);

-- Visit occurrence
CREATE TABLE IF NOT EXISTS visit_occurrence (
    visit_occurrence_id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    visit_concept_id INTEGER,
    visit_start_date DATE,
    visit_start_datetime TIMESTAMP,
    visit_end_date DATE,
    visit_end_datetime TIMESTAMP,
    visit_type_concept_id INTEGER,
    provider_id INTEGER,
    care_site_id INTEGER,
    visit_source_value VARCHAR(50),
    visit_source_concept_id INTEGER,
    admitted_from_concept_id INTEGER,
    admitted_from_source_value VARCHAR(50),
    discharged_to_concept_id INTEGER,
    discharged_to_source_value VARCHAR(50)
);

-- Condition occurrence
CREATE TABLE IF NOT EXISTS condition_occurrence (
    condition_occurrence_id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    condition_concept_id INTEGER,
    condition_start_date DATE,
    condition_start_datetime TIMESTAMP,
    condition_end_date DATE,
    condition_end_datetime TIMESTAMP,
    condition_type_concept_id INTEGER,
    condition_status_concept_id INTEGER,
    stop_reason VARCHAR(20),
    provider_id INTEGER,
    visit_occurrence_id INTEGER,
    visit_detail_id INTEGER,
    condition_source_value VARCHAR(500),  -- ICD codes, diagnoses
    condition_source_concept_id INTEGER,
    condition_status_source_value VARCHAR(50)
);

-- Drug exposure
CREATE TABLE IF NOT EXISTS drug_exposure (
    drug_exposure_id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    drug_concept_id INTEGER,
    drug_exposure_start_date DATE,
    drug_exposure_start_datetime TIMESTAMP,
    drug_exposure_end_date DATE,
    drug_exposure_end_datetime TIMESTAMP,
    verbatim_end_date DATE,
    drug_type_concept_id INTEGER,
    stop_reason VARCHAR(20),
    refills INTEGER,
    quantity NUMERIC,
    days_supply INTEGER,
    sig TEXT,  -- Prescription instructions
    route_concept_id INTEGER,
    lot_number VARCHAR(50),
    provider_id INTEGER,
    visit_occurrence_id INTEGER,
    drug_source_value VARCHAR(500),  -- Original drug name
    drug_source_concept_id INTEGER,
    route_source_value VARCHAR(50),
    dose_unit_source_value VARCHAR(50)
);

-- Measurement (lab results, vitals)
CREATE TABLE IF NOT EXISTS measurement (
    measurement_id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    measurement_concept_id INTEGER,
    measurement_date DATE,
    measurement_datetime TIMESTAMP,
    measurement_time VARCHAR(10),
    measurement_type_concept_id INTEGER,
    operator_concept_id INTEGER,
    value_as_number NUMERIC,
    value_as_concept_id INTEGER,
    unit_concept_id INTEGER,
    range_low NUMERIC,
    range_high NUMERIC,
    provider_id INTEGER,
    visit_occurrence_id INTEGER,
    measurement_source_value VARCHAR(500),  -- Lab test name
    measurement_source_concept_id INTEGER,
    unit_source_value VARCHAR(50),
    value_source_value VARCHAR(50),
    measurement_event_id INTEGER,
    meas_event_field_concept_id INTEGER
);

-- ===== Standardized Health System (Brick Red Region) =====

-- Care site
CREATE TABLE IF NOT EXISTS care_site (
    care_site_id SERIAL PRIMARY KEY,
    care_site_name VARCHAR(255),
    place_of_service_concept_id INTEGER,
    location_id INTEGER,
    care_site_source_value VARCHAR(50),
    place_of_service_source_value VARCHAR(50)
);

-- Provider
CREATE TABLE IF NOT EXISTS provider (
    provider_id SERIAL PRIMARY KEY,
    provider_name VARCHAR(255),
    npi VARCHAR(20),
    dea VARCHAR(20),
    specialty_concept_id INTEGER,
    care_site_id INTEGER,
    year_of_birth INTEGER,
    gender_concept_id INTEGER,
    provider_source_value VARCHAR(50),
    specialty_source_value VARCHAR(50),
    specialty_source_concept_id INTEGER,
    gender_source_value VARCHAR(50),
    gender_source_concept_id INTEGER
);

-- ===== Standardized Vocabularies (Orange Region) =====

-- Concept
CREATE TABLE IF NOT EXISTS concept (
    concept_id INTEGER PRIMARY KEY,
    concept_name VARCHAR(255),
    domain_id VARCHAR(20),
    vocabulary_id VARCHAR(20),
    concept_class_id VARCHAR(20),
    standard_concept VARCHAR(1),
    concept_code VARCHAR(50),
    valid_start_date DATE,
    valid_end_date DATE,
    invalid_reason VARCHAR(1)
);

-- Concept relationship
CREATE TABLE IF NOT EXISTS concept_relationship (
    concept_id_1 INTEGER,
    concept_id_2 INTEGER,
    relationship_id VARCHAR(20),
    valid_start_date DATE,
    valid_end_date DATE,
    invalid_reason VARCHAR(1),
    PRIMARY KEY (concept_id_1, concept_id_2, relationship_id)
);

-- ===== Helper Tables =====

-- Patient form data (stores raw form submissions)
CREATE TABLE IF NOT EXISTS patient_form_data (
    form_data_id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    form_name VARCHAR(255),
    form_data JSONB,  -- Store raw form data
    processed BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_person_source_value ON person(person_source_value);
CREATE INDEX idx_condition_person_id ON condition_occurrence(person_id);
CREATE INDEX idx_drug_person_id ON drug_exposure(person_id);
CREATE INDEX idx_measurement_person_id ON measurement(person_id);
CREATE INDEX idx_visit_person_id ON visit_occurrence(person_id);
CREATE INDEX idx_form_data_person_id ON patient_form_data(person_id);

-- Add some basic concepts for demo purposes
INSERT INTO concept (concept_id, concept_name, domain_id, vocabulary_id, concept_class_id, standard_concept) VALUES
-- Gender concepts
(8507, 'Male', 'Gender', 'Gender', 'Gender', 'S'),
(8532, 'Female', 'Gender', 'Gender', 'Gender', 'S'),
-- Race concepts  
(8527, 'White', 'Race', 'Race', 'Race', 'S'),
(8516, 'Black or African American', 'Race', 'Race', 'Race', 'S'),
(8515, 'Asian', 'Race', 'Race', 'Race', 'S'),
-- Ethnicity concepts
(38003563, 'Hispanic or Latino', 'Ethnicity', 'Ethnicity', 'Ethnicity', 'S'),
(38003564, 'Not Hispanic or Latino', 'Ethnicity', 'Ethnicity', 'Ethnicity', 'S'),
-- Visit type concepts
(9202, 'Outpatient Visit', 'Visit', 'Visit Type', 'Visit Type', 'S'),
(9201, 'Inpatient Visit', 'Visit', 'Visit Type', 'Visit Type', 'S'),
(9203, 'Emergency Room Visit', 'Visit', 'Visit Type', 'Visit Type', 'S')
ON CONFLICT (concept_id) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to person table
CREATE TRIGGER update_person_updated_at BEFORE UPDATE ON person
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 