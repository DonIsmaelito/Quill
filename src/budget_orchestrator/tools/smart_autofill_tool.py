# Smart Auto-Fill Tool for intelligent form completion with validation and multi-field support

import re
import json
from typing import Dict, Any, List, Optional, Tuple
import logging
from datetime import datetime
import sys
import os

# Add current directory to path for imports
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, current_dir)

from config import FIELD_CRITICALITY, CONTEXT_REWARDS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SmartAutoFillTool:
    
    # Initialize tool with form context and validation rules
    def __init__(self, context=None):
        self.context = context
        self.field_validators = self.initialize_validators()
        self.field_formatters = self.initialize_formatters()
        self.multi_field_patterns = self.initialize_multi_field_patterns()
    
    # Main execution method for form field completion
    def execute(self, field_id: str, field_type: str, extracted_data: Dict[str, Any], 
                form_context: Dict[str, Any] = None) -> Dict[str, Any]:
        try:
            if not extracted_data or not extracted_data.get('success'):
                return {
                    'success': False,
                    'error': 'No valid data provided for completion',
                    'confidence': 0.0,
                    'cost': 0.00001,
                    'latency': 0.2
                }
            
            primary_value = extracted_data.get('value')
            if not primary_value:
                return {
                    'success': False,
                    'error': 'No value in extracted data',
                    'confidence': 0.0,
                    'cost': 0.00001,
                    'latency': 0.2
                }
            
            # Validate and format the primary field
            validation_result = self.validate_and_format_field(primary_value, field_type)
            
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': f"Validation failed: {validation_result['error']}",
                    'confidence': 0.0,
                    'cost': 0.00001,
                    'latency': 0.2
                }
            
            formatted_value = validation_result['formatted_value']
            base_confidence = min(0.95, extracted_data.get('confidence', 0.8) * validation_result['confidence_multiplier'])
            
            # Attempt multi-field completion for efficiency
            multi_field_completions = self.attempt_multi_field_completion(
                primary_value, field_type, form_context
            )
            
            # Calculate cost based on operations performed
            cost = self.calculate_completion_cost(len(multi_field_completions))
            latency = self.calculate_completion_latency(len(multi_field_completions))
            
            result = {
                'success': True,
                'value': formatted_value,
                'confidence': base_confidence,
                'field_criticality': FIELD_CRITICALITY.get(field_type, 1.0),
                'completion_method': 'smart_autofill',
                'validation_passed': True,
                'formatted': validation_result.get('formatting_applied', False),
                'cost': cost,
                'latency': latency
            }
            
            # Add multi-field completion bonuses
            if multi_field_completions:
                result['multi_field_completions'] = multi_field_completions
                result['multi_field_bonus'] = len(multi_field_completions) * CONTEXT_REWARDS.get('multi_field_extraction', 2.0)
                result['efficiency_boost'] = True
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Auto-fill execution failed: {str(e)}',
                'confidence': 0.0,
                'cost': 0.00001,
                'latency': 0.5
            }
    
    # Validate and format field value according to type-specific rules
    def validate_and_format_field(self, value: str, field_type: str) -> Dict[str, Any]:
        
        if field_type not in self.field_validators:
            # Generic validation for unknown field types
            return {
                'valid': True,
                'formatted_value': value.strip(),
                'confidence_multiplier': 1.0,
                'formatting_applied': False
            }
        
        validator = self.field_validators[field_type]
        formatter = self.field_formatters.get(field_type)
        
        # Apply validation
        validation_result = validator(value)
        if not validation_result['valid']:
            return validation_result
        
        # Apply formatting if available
        formatted_value = value
        formatting_applied = False
        
        if formatter:
            try:
                formatted_value = formatter(value)
                formatting_applied = True
            except Exception as e:
                formatted_value = value
        
        return {
            'valid': True,
            'formatted_value': formatted_value,
            'confidence_multiplier': validation_result.get('confidence_multiplier', 1.0),
            'formatting_applied': formatting_applied
        }
    
    # Attempt to complete multiple related fields from single data source
    def attempt_multi_field_completion(self, primary_value: str, field_type: str, 
                                     form_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        
        if not form_context or field_type not in self.multi_field_patterns:
            return []
        
        pattern_info = self.multi_field_patterns[field_type]
        completions = []
        
        for related_field, extraction_func in pattern_info.items():
            try:
                extracted_value = extraction_func(primary_value)
                if extracted_value:
                    # Validate the extracted value for the related field
                    validation = self.validate_and_format_field(extracted_value, related_field)
                    
                    if validation['valid']:
                        completions.append({
                            'field_type': related_field,
                            'value': validation['formatted_value'],
                            'confidence': 0.85,
                            'derivation_source': field_type,
                            'method': 'multi_field_extraction'
                        })
                        
            except Exception as e:
                continue
        
        return completions
    
    # Initialize field validation functions
    def initialize_validators(self) -> Dict[str, callable]:
        
        def validate_ssn(value: str) -> Dict[str, Any]:
            # Remove all non-digits
            digits = re.sub(r'[^\d]', '', value)
            if len(digits) == 9:
                return {'valid': True, 'confidence_multiplier': 1.0}
            else:
                return {'valid': False, 'error': 'SSN must be 9 digits'}
        
        def validate_phone(value: str) -> Dict[str, Any]:
            digits = re.sub(r'[^\d]', '', value)
            if len(digits) == 10:
                return {'valid': True, 'confidence_multiplier': 1.0}
            elif len(digits) == 11 and digits.startswith('1'):
                return {'valid': True, 'confidence_multiplier': 0.95}
            else:
                return {'valid': False, 'error': 'Phone number must be 10 digits'}
        
        def validate_email(value: str) -> Dict[str, Any]:
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if re.match(email_pattern, value.strip()):
                return {'valid': True, 'confidence_multiplier': 1.0}
            else:
                return {'valid': False, 'error': 'Invalid email format'}
        
        def validate_date(value: str) -> Dict[str, Any]:
            # Try to parse common date formats
            date_patterns = [
                r'^\d{1,2}/\d{1,2}/\d{4}$',
                r'^\d{1,2}-\d{1,2}-\d{4}$',
                r'^\d{4}/\d{1,2}/\d{1,2}$',
                r'^\d{4}-\d{1,2}-\d{1,2}$'
            ]
            
            for pattern in date_patterns:
                if re.match(pattern, value.strip()):
                    return {'valid': True, 'confidence_multiplier': 1.0}
            
            return {'valid': False, 'error': 'Date format not recognized'}
        
        def validate_name(value: str) -> Dict[str, Any]:
            # Basic name validation
            name = value.strip()
            if len(name) >= 2 and re.match(r'^[a-zA-Z\s\-\.\']+$', name):
                return {'valid': True, 'confidence_multiplier': 1.0}
            else:
                return {'valid': False, 'error': 'Invalid name format'}
        
        def validate_address(value: str) -> Dict[str, Any]:
            # Basic address validation
            address = value.strip()
            if len(address) >= 5:
                return {'valid': True, 'confidence_multiplier': 1.0}
            else:
                return {'valid': False, 'error': 'Address too short'}
        
        return {
            'ssn': validate_ssn,
            'phone': validate_phone,
            'email': validate_email,
            'date': validate_date,
            'name': validate_name,
            'address': validate_address
        }
    
    # Initialize field formatting functions
    def initialize_formatters(self) -> Dict[str, callable]:
        
        def format_ssn(value: str) -> str:
            digits = re.sub(r'[^\d]', '', value)
            return f"{digits[:3]}-{digits[3:5]}-{digits[5:]}"
        
        def format_phone(value: str) -> str:
            digits = re.sub(r'[^\d]', '', value)
            if len(digits) == 11 and digits.startswith('1'):
                digits = digits[1:]  # Remove country code
            return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
        
        def format_name(value: str) -> str:
            # Title case for names
            return ' '.join(word.capitalize() for word in value.strip().split())
        
        def format_email(value: str) -> str:
            return value.strip().lower()
        
        return {
            'ssn': format_ssn,
            'phone': format_phone,
            'name': format_name,
            'email': format_email
        }
    
    # Initialize multi-field completion patterns
    def initialize_multi_field_patterns(self) -> Dict[str, Dict[str, callable]]:
        
        def extract_first_name(full_name: str) -> Optional[str]:
            parts = full_name.strip().split()
            return parts[0] if parts else None
        
        def extract_last_name(full_name: str) -> Optional[str]:
            parts = full_name.strip().split()
            return parts[-1] if len(parts) > 1 else None
        
        def extract_initials(full_name: str) -> Optional[str]:
            parts = full_name.strip().split()
            if len(parts) >= 2:
                return f"{parts[0][0]}.{parts[-1][0]}."
            return None
        
        def extract_area_code(phone: str) -> Optional[str]:
            digits = re.sub(r'[^\d]', '', phone)
            if len(digits) >= 10:
                return digits[:3]
            return None
        
        def extract_city_from_address(address: str) -> Optional[str]:
            # Simple pattern: look for city after comma
            parts = address.split(',')
            if len(parts) >= 2:
                return parts[1].strip()
            return None
        
        def extract_state_from_address(address: str) -> Optional[str]:
            # Simple pattern: look for state abbreviation
            state_pattern = r'\b([A-Z]{2})\b'
            match = re.search(state_pattern, address)
            return match.group(1) if match else None
        
        return {
            'name': {
                'first_name': extract_first_name,
                'last_name': extract_last_name,
                'initials': extract_initials
            },
            'phone': {
                'area_code': extract_area_code
            },
            'address': {
                'city': extract_city_from_address,
                'state': extract_state_from_address
            }
        }
    
    # Calculate cost based on completion complexity
    def calculate_completion_cost(self, num_additional_fields: int) -> float:
        base_cost = 0.00008 
        additional_cost = num_additional_fields * 0.00002
        return base_cost + additional_cost
    
    # Calculate latency based on completion complexity
    def calculate_completion_latency(self, num_additional_fields: int) -> float:
        base_latency = 0.5
        additional_latency = num_additional_fields * 0.1
        return base_latency + additional_latency


class SmartAutoFillToolStub:
    
    # Simple stub initialization
    def __init__(self, context=None):
        self.context = context
    
    # Stub implementation returns mock completion results
    def execute(self, field_id: str, field_type: str, extracted_data: Dict[str, Any], 
                form_context: Dict[str, Any] = None) -> Dict[str, Any]:
        
        if not extracted_data or not extracted_data.get('success'):
            return {
                'success': False,
                'error': 'No data provided',
                'confidence': 0.0,
                'cost': 0.00001,
                'latency': 0.1
            }
        
        # Mock successful completion
        primary_value = extracted_data.get('value', f'Mock {field_type}')
        
        # Mock multi-field completion for certain types
        multi_field_completions = []
        if field_type == 'name':
            multi_field_completions = [
                {'field_type': 'first_name', 'value': 'John', 'confidence': 0.85},
                {'field_type': 'last_name', 'value': 'Doe', 'confidence': 0.85}
            ]
        elif field_type == 'phone':
            multi_field_completions = [
                {'field_type': 'area_code', 'value': '555', 'confidence': 0.85}
            ]
        
        result = {
            'success': True,
            'value': primary_value,
            'confidence': 0.90,
            'field_criticality': FIELD_CRITICALITY.get(field_type, 1.0),
            'completion_method': 'stub_autofill',
            'validation_passed': True,
            'formatted': True,
            'cost': 0.00008,
            'latency': 0.5
        }
        
        if multi_field_completions:
            result['multi_field_completions'] = multi_field_completions
            result['multi_field_bonus'] = len(multi_field_completions) * CONTEXT_REWARDS.get('multi_field_extraction', 2.0)
            result['efficiency_boost'] = True
        
        return result 