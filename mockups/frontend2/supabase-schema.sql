-- Quill EHR Database Schema for Supabase
-- Based on OMOP CDM-inspired schema with enhanced fields

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== Standardized Clinical Data Tables =====

-- Person table (enhanced)
CREATE TABLE person (
    person_id SERIAL PRIMARY KEY,
    gender_concept_id INTEGER,
    year_of_birth INTEGER,
    month_of_birth INTEGER,
    day_of_birth INTEGER,
    birth_datetime TIMESTAMP,
    race_concept_id INTEGER,
    ethnicity_concept_id INTEGER,
    person_source_value VARCHAR(255),
    gender_source_value VARCHAR(50),
    race_source_value VARCHAR(50),
    ethnicity_source_value VARCHAR(50),
    -- Enhanced demographic fields
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    middle_name VARCHAR(100),
    suffix VARCHAR(10),
    preferred_name VARCHAR(100),
    ssn VARCHAR(11),
    marital_status_concept_id INTEGER,
    language_concept_id INTEGER,
    preferred_language VARCHAR(50),
    religion_concept_id INTEGER,
    veteran_status BOOLEAN DEFAULT FALSE,
    deceased BOOLEAN DEFAULT FALSE,
    death_date DATE,
    death_datetime TIMESTAMP,
    death_type_concept_id INTEGER,
    cause_of_death_concept_id INTEGER,
    cause_of_death_source_value VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Person Address table
CREATE TABLE person_address (
    address_id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    address_type VARCHAR(20),
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    county VARCHAR(100),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    is_primary BOOLEAN DEFAULT FALSE,
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Person Contact table
CREATE TABLE person_contact (
    contact_id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    contact_type VARCHAR(20),
    contact_value VARCHAR(255),
    contact_subtype VARCHAR(20),
    is_primary BOOLEAN DEFAULT FALSE,
    preferred_contact_method VARCHAR(20),
    do_not_contact BOOLEAN DEFAULT FALSE,
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Emergency Contact table
CREATE TABLE emergency_contact (
    emergency_contact_id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    contact_name VARCHAR(255),
    relationship VARCHAR(100),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    address_line_1 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insurance table
CREATE TABLE insurance (
    insurance_id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    insurance_type VARCHAR(50),
    insurance_provider VARCHAR(255),
    policy_number VARCHAR(100),
    group_number VARCHAR(100),
    subscriber_name VARCHAR(255),
    subscriber_relationship VARCHAR(50),
    subscriber_dob DATE,
    subscriber_ssn VARCHAR(11),
    effective_date DATE,
    expiration_date DATE,
    copay_amount NUMERIC(10,2),
    deductible_amount NUMERIC(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Observation Period table
CREATE TABLE observation_period (
    observation_period_id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    observation_period_start_date DATE,
    observation_period_end_date DATE,
    period_type_concept_id INTEGER
);

-- Visit Occurrence table (enhanced)
CREATE TABLE visit_occurrence (
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
    discharged_to_source_value VARCHAR(50),
    -- Enhanced visit fields
    visit_status VARCHAR(20),
    chief_complaint TEXT,
    visit_notes TEXT,
    discharge_summary TEXT,
    discharge_instructions TEXT,
    follow_up_date DATE,
    follow_up_instructions TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Condition Occurrence table (enhanced)
CREATE TABLE condition_occurrence (
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
    visit_occurrence_id INTEGER REFERENCES visit_occurrence(visit_occurrence_id),
    visit_detail_id INTEGER,
    condition_source_value VARCHAR(500),
    condition_source_concept_id INTEGER,
    condition_status_source_value VARCHAR(50),
    -- Enhanced condition fields
    severity VARCHAR(20),
    chronic BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    diagnosis_priority INTEGER,
    diagnosis_confidence VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Drug Exposure table (enhanced)
CREATE TABLE drug_exposure (
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
    sig TEXT,
    route_concept_id INTEGER,
    lot_number VARCHAR(50),
    provider_id INTEGER,
    visit_occurrence_id INTEGER REFERENCES visit_occurrence(visit_occurrence_id),
    drug_source_value VARCHAR(500),
    drug_source_concept_id INTEGER,
    route_source_value VARCHAR(50),
    dose_unit_source_value VARCHAR(50),
    -- Enhanced drug fields
    prescription_status VARCHAR(20),
    dose_form VARCHAR(100),
    strength VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    allergies TEXT,
    side_effects TEXT,
    effectiveness VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Measurement table (enhanced)
CREATE TABLE measurement (
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
    visit_occurrence_id INTEGER REFERENCES visit_occurrence(visit_occurrence_id),
    measurement_source_value VARCHAR(500),
    measurement_source_concept_id INTEGER,
    unit_source_value VARCHAR(50),
    value_source_value VARCHAR(50),
    measurement_event_id INTEGER,
    meas_event_field_concept_id INTEGER,
    -- Enhanced measurement fields
    result_status VARCHAR(20),
    abnormal_flag VARCHAR(10),
    reference_range VARCHAR(100),
    method VARCHAR(100),
    specimen_type VARCHAR(100),
    lab_name VARCHAR(255),
    lab_order_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===== Health System Tables =====

-- Care Site table (enhanced)
CREATE TABLE care_site (
    care_site_id SERIAL PRIMARY KEY,
    care_site_name VARCHAR(255),
    place_of_service_concept_id INTEGER,
    location_id INTEGER,
    care_site_source_value VARCHAR(50),
    place_of_service_source_value VARCHAR(50),
    -- Enhanced care site fields
    care_site_type VARCHAR(100),
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    phone VARCHAR(20),
    fax VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    tax_id VARCHAR(20),
    npi VARCHAR(20),
    license_number VARCHAR(50),
    accreditation VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Provider table (enhanced)
CREATE TABLE provider (
    provider_id SERIAL PRIMARY KEY,
    provider_name VARCHAR(255),
    npi VARCHAR(20),
    dea VARCHAR(20),
    specialty_concept_id INTEGER,
    care_site_id INTEGER REFERENCES care_site(care_site_id),
    year_of_birth INTEGER,
    gender_concept_id INTEGER,
    provider_source_value VARCHAR(50),
    specialty_source_value VARCHAR(50),
    specialty_source_concept_id INTEGER,
    gender_source_value VARCHAR(50),
    gender_source_concept_id INTEGER,
    -- Enhanced provider fields
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    middle_name VARCHAR(100),
    suffix VARCHAR(10),
    title VARCHAR(50),
    credentials VARCHAR(100),
    license_number VARCHAR(50),
    state_license VARCHAR(50),
    board_certifications TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    address_line_1 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    hire_date DATE,
    termination_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===== Helper Tables =====

-- Patient Form Data table
CREATE TABLE patient_form_data (
    form_data_id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    form_name VARCHAR(255),
    form_data JSONB,
    processed BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    -- Enhanced form fields
    form_version VARCHAR(20),
    form_status VARCHAR(20),
    submitted_by VARCHAR(255),
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP,
    notes TEXT
);

-- Appointment table
CREATE TABLE appointment (
    appointment_id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    provider_id INTEGER REFERENCES provider(provider_id),
    care_site_id INTEGER REFERENCES care_site(care_site_id),
    appointment_date DATE,
    appointment_time TIME,
    appointment_datetime TIMESTAMP,
    duration_minutes INTEGER,
    appointment_type VARCHAR(100),
    appointment_status VARCHAR(20),
    reason TEXT,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Allergy table
CREATE TABLE allergy (
    allergy_id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    allergen_concept_id INTEGER,
    allergen_source_value VARCHAR(500),
    allergy_type VARCHAR(50),
    severity VARCHAR(20),
    reaction TEXT,
    onset_date DATE,
    resolved_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(255),
    verified_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Vital Signs table
CREATE TABLE vital_signs (
    vital_signs_id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES person(person_id) ON DELETE CASCADE,
    visit_occurrence_id INTEGER REFERENCES visit_occurrence(visit_occurrence_id),
    measurement_date DATE,
    measurement_datetime TIMESTAMP,
    temperature NUMERIC(4,1),
    temperature_unit VARCHAR(10) DEFAULT 'F',
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    heart_rate INTEGER,
    respiratory_rate INTEGER,
    oxygen_saturation NUMERIC(4,1),
    height NUMERIC(5,2),
    height_unit VARCHAR(10) DEFAULT 'cm',
    weight NUMERIC(5,2),
    weight_unit VARCHAR(10) DEFAULT 'kg',
    bmi NUMERIC(4,2),
    pain_scale INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Log table
CREATE TABLE audit_log (
    audit_id SERIAL PRIMARY KEY,
    table_name VARCHAR(100),
    record_id INTEGER,
    action VARCHAR(20),
    user_id VARCHAR(255),
    timestamp TIMESTAMP DEFAULT NOW(),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- ===== Indexes for Performance =====

-- Person indexes
CREATE INDEX idx_person_source_value ON person(person_source_value);
CREATE INDEX idx_person_name ON person(first_name, last_name);
CREATE INDEX idx_person_ssn ON person(ssn);

-- Visit indexes
CREATE INDEX idx_visit_person_id ON visit_occurrence(person_id);
CREATE INDEX idx_visit_date ON visit_occurrence(visit_start_date);
CREATE INDEX idx_visit_status ON visit_occurrence(visit_status);

-- Condition indexes
CREATE INDEX idx_condition_person_id ON condition_occurrence(person_id);
CREATE INDEX idx_condition_active ON condition_occurrence(active);
CREATE INDEX idx_condition_date ON condition_occurrence(condition_start_date);

-- Drug indexes
CREATE INDEX idx_drug_person_id ON drug_exposure(person_id);
CREATE INDEX idx_drug_status ON drug_exposure(prescription_status);
CREATE INDEX idx_drug_date ON drug_exposure(drug_exposure_start_date);

-- Measurement indexes
CREATE INDEX idx_measurement_person_id ON measurement(person_id);
CREATE INDEX idx_measurement_date ON measurement(measurement_date);
CREATE INDEX idx_measurement_source ON measurement(measurement_source_value);

-- Appointment indexes
CREATE INDEX idx_appointment_person_id ON appointment(person_id);
CREATE INDEX idx_appointment_date ON appointment(appointment_date);
CREATE INDEX idx_appointment_status ON appointment(appointment_status);

-- ===== Row Level Security (RLS) Policies =====

-- Enable RLS on all tables
ALTER TABLE person ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_address ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_occurrence ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_occurrence ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_exposure ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergy ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_form_data ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (customize based on your requirements)
-- These are basic examples - implement proper policies based on user roles

-- Policy for patients to see only their own data
CREATE POLICY "Patients can view own data" ON person
    FOR SELECT USING (person_source_value = current_user);

-- Policy for providers to see patient data
CREATE POLICY "Providers can view patient data" ON person
    FOR SELECT USING (true); -- Add proper role checking

-- Policy for admins to have full access
CREATE POLICY "Admins have full access" ON person
    FOR ALL USING (true); -- Add proper role checking

-- ===== Sample Data (Optional) =====

-- Insert sample concept values
INSERT INTO person (person_source_value, first_name, last_name, gender_source_value, year_of_birth) 
VALUES ('Demo User', 'Demo', 'User', 'Male', 1985);

-- ===== Comments =====

COMMENT ON TABLE person IS 'Enhanced person table with comprehensive demographic information';
COMMENT ON TABLE visit_occurrence IS 'Patient visits with enhanced clinical information';
COMMENT ON TABLE condition_occurrence IS 'Medical conditions with severity and confidence tracking';
COMMENT ON TABLE drug_exposure IS 'Medication exposure with prescription management';
COMMENT ON TABLE measurement IS 'Clinical measurements with lab integration';
COMMENT ON TABLE appointment IS 'Appointment scheduling and management';
COMMENT ON TABLE audit_log IS 'Complete audit trail for compliance and security'; 