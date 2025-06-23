# Ask User Tool for intelligent user interaction and multi-field information extraction

import time
import random
import re
from typing import Dict, Any, Optional, List, Tuple
import sys
import os

# Add current directory to path for imports
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, current_dir)

try:
    from config import TOOL_COSTS, TOOL_LATENCIES, FIELD_CRITICALITY, TOOL_CONFIDENCES, CONTEXT_REWARDS
except ImportError:
    # Fallback values if config not available
    TOOL_COSTS = {'ask_user': 0.0003}
    TOOL_LATENCIES = {'ask_user': 15.0}
    FIELD_CRITICALITY = {'name': 2.0, 'ssn': 5.0, 'phone': 1.0}
    TOOL_CONFIDENCES = {'ask_user': 0.95}
    CONTEXT_REWARDS = {'multi_field_extraction': 2.0}

class AskUserTool:
    
    # Constructor for Ask User Tool with intelligent response processing
    def __init__(self, context=None, query_processor=None, interface='console'):
        self.cost = TOOL_COSTS.get('ask_user', 0.0003)
        self.latency = TOOL_LATENCIES.get('ask_user', 15.0)
        self.base_confidence = TOOL_CONFIDENCES['ask_user']
        self.interface = interface
        self.context = context
        self.query_processor = query_processor
        self.field_patterns = self.initialize_field_patterns()
        
    # Initialize patterns for extracting field values from responses
    def initialize_field_patterns(self) -> Dict[str, List[str]]:
        return {
            'ssn': [
                r'\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b',
                r'(?:social\s+security|ssn|ss#)\s*:?\s*(\d{3}[-\s]?\d{2}[-\s]?\d{4})',
            ],
            'phone': [
                r'\b\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})\b',
                r'(?:phone|tel|mobile|cell)\s*:?\s*(\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4}))',
            ],
            'email': [
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
                r'(?:email|e-mail)\s*:?\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})',
            ],
            'date': [
                r'\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})\b',
                r'(?:birth|born|dob)\s*:?\s*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',
            ],
            'name': [
                r'(?:name|called)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
                r'(?:i\'?m|my name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
            ]
        }
    
    # Ask user for field information with intelligent response processing
    def execute(self, field_id: str, field_type: str, context: Dict = None, 
                retry_count: int = 0) -> Dict[str, Any]:
        start_time = time.time()
        
        try:
            # Generate contextually appropriate prompt
            prompt = self.generate_enhanced_prompt(field_id, field_type, context, retry_count)
            
            # Get user response
            user_response = self.get_user_input(prompt, field_type)
            
            if not user_response:
                return self.create_empty_response(field_id, field_type, start_time)
            
            # Process user response intelligently
            processing_result = self.process_user_response(
                user_response, field_id, field_type, context
            )
            
            # Update conversation context
            if self.context:
                self.context.update_chat_history(prompt, user_response)
            
            latency = time.time() - start_time
            
            return {
                'success': processing_result['success'],
                'value': processing_result['primary_value'],
                'confidence': processing_result['confidence'],
                'user_response': user_response,
                'extracted_fields': processing_result['all_extracted_fields'],
                'field_criticality': FIELD_CRITICALITY.get(field_type, 1.0),
                'cost': self.cost,
                'latency': latency,
                'processing_method': 'intelligent_extraction',
                'multi_field_bonus': processing_result.get('multi_field_bonus', 0),
                'context_utilized': processing_result.get('context_utilized', False),
                'retry_count': retry_count,
                'user_engagement': self.assess_user_engagement(user_response)
            }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'confidence': 0.0,
                'cost': self.cost,
                'latency': time.time() - start_time,
                'retry_count': retry_count
            }
    
    # Generate contextually appropriate prompt for user
    def generate_enhanced_prompt(self, field_id: str, field_type: str, 
                                context: Dict = None, retry_count: int = 0) -> str:
        
        # Base prompts for different field types
        base_prompts = {
            'name': "What is your full name?",
            'date': "What is your date of birth? (Please use MM/DD/YYYY format)",
            'ssn': "What is your Social Security Number? (Format: XXX-XX-XXXX)",
            'address': "What is your complete address?",
            'phone': "What is your phone number?",
            'email': "What is your email address?",
            'insurance_id': "What is your insurance policy number or member ID?",
            'medical_condition': "Please describe your current medical condition or diagnosis:",
            'medication': "What medications are you currently taking?",
            'signature': "Please type your full name for the signature:",
            'checkbox': f"Please answer yes or no for {field_id.replace('_', ' ')}:",
        }
        
        prompt = base_prompts.get(field_type, f"Please provide information for {field_id.replace('_', ' ')}:")
        
        # Add context from previous conversation
        if self.context and hasattr(self.context, 'chat_history') and self.context.chat_history:
            recent_context = self.context.get_recent_context(2)
            if recent_context:
                prompt = f"Based on our conversation, {prompt.lower()}"
        
        # Add form context if available
        if context:
            if 'form_name' in context:
                prompt = f"[{context['form_name']}] {prompt}"
            if 'field_description' in context:
                prompt += f" ({context['field_description']})"
        
        # Add retry-specific messaging
        if retry_count > 0:
            retry_messages = [
                "I need to clarify this information. ",
                "Let me ask again for better accuracy. ",
                "To ensure we have the correct information, "
            ]
            prompt = retry_messages[min(retry_count - 1, len(retry_messages) - 1)] + prompt
        
        # Add helpful hints for complex fields
        if field_type == 'ssn':
            prompt += "\nNote: You can include or omit dashes (123-45-6789 or 123456789)"
        elif field_type == 'phone':
            prompt += "\nNote: Any format is fine (555-123-4567, (555) 123-4567, etc.)"
        elif field_type == 'date':
            prompt += "\nNote: You can also say 'January 15, 1990' or similar"
        
        # Encourage comprehensive responses for potential multi-field extraction
        if field_type in ['name', 'address', 'medical_condition']:
            prompt += "\nFeel free to provide any additional relevant information."
        
        return prompt
    
    # Get user input based on interface type
    def get_user_input(self, prompt: str, field_type: str) -> Optional[str]:
        if self.interface == 'console':
            return self.console_input(prompt, field_type)
        elif self.interface == 'web':
            return self.web_input(prompt, field_type)
        elif self.interface == 'stub':
            return self.stub_input(field_type)
        else:
            return None
    
    # Get input from console with enhanced formatting
    def console_input(self, prompt: str, field_type: str) -> Optional[str]:
        print(f"\nMEDICAL FORM ASSISTANCE")
        print(f"\n{prompt}")
        
        try:
            value = input("Your response: ").strip()
            return value if value else None
        except KeyboardInterrupt:
            print("\n\nOperation cancelled by user.")
            return None
        except Exception as e:
            return None
    
    # Placeholder for web interface implementation
    def web_input(self, prompt: str, field_type: str) -> Optional[str]:
        return self.stub_input(field_type)
    
    # Enhanced stub implementation with realistic responses
    def stub_input(self, field_type: str) -> Optional[str]:
        # Simulate realistic user response time
        time.sleep(random.uniform(3.0, 8.0))
        
        # Simulate 90% response rate
        if random.random() < 0.90:
            enhanced_responses = {
                'name': [
                    "My name is John Michael Smith",
                    "I'm Sarah Johnson",
                    "Robert Davis here",
                    "Call me Maria Elena Rodriguez"
                ],
                'date': [
                    "I was born on March 15, 1985",
                    "01/22/1992",
                    "My birth date is 07/08/1978",
                    "December 3rd, 1990"
                ],
                'ssn': [
                    "My social security number is 123-45-6789",
                    "SSN: 987-65-4321",
                    "123456789"
                ],
                'address': [
                    "I live at 123 Main Street, Springfield, IL 62701",
                    "456 Oak Avenue, Apt 2B, Chicago, IL 60601, phone is 555-0123",
                    "789 Pine Road, Riverside, CA 92501"
                ],
                'phone': [
                    "My phone number is (555) 123-4567",
                    "Call me at 555-987-6543",
                    "555.246.8135 is my cell"
                ],
                'email': [
                    "Email me at john.smith@email.com",
                    "My email is sarah.j@gmail.com, phone (555) 111-2222",
                    "contact.me@domain.org"
                ],
                'insurance_id': [
                    "Insurance ID: INS123456789",
                    "My policy number is POL-ABC-123",
                    "Member ID is MEM456789"
                ],
                'medical_condition': [
                    "I have type 2 diabetes and high blood pressure",
                    "Currently being treated for hypertension",
                    "No major medical conditions, just taking vitamins"
                ],
                'medication': [
                    "I take Metformin 500mg twice daily and Lisinopril 10mg",
                    "Currently on blood pressure medication - Amlodipine 5mg",
                    "No prescription medications, just multivitamins"
                ]
            }
            
            responses = enhanced_responses.get(field_type, [f"Here's my {field_type}: test_value"])
            return random.choice(responses)
        else:
            return None
    
    # Intelligently process user response to extract field values
    def process_user_response(self, user_response: str, field_id: str, 
                             field_type: str, context: Dict = None) -> Dict[str, Any]:
        
        # Extract the primary field value
        primary_value, primary_confidence = self.extract_primary_field(
            user_response, field_type
        )
        
        # Extract additional fields mentioned in response
        additional_fields = self.extract_additional_fields(user_response)
        
        query_processed_fields = []
        if self.query_processor:
            try:
                query_result = self.query_processor.process_response(
                    user_response, target_field=field_id
                )
                if query_result.get('field_updates'):
                    query_processed_fields = query_result['field_updates']
            except Exception as e:
                pass
        
        # Combine and validate results
        all_extracted_fields = self.combine_extracted_fields(
            primary_value, primary_confidence, field_id, field_type,
            additional_fields, query_processed_fields
        )
        
        multi_field_bonus = 0
        if len(all_extracted_fields) > 1:
            multi_field_bonus = CONTEXT_REWARDS.get('multi_field_extraction', 0)
        
        context_utilized = self.check_context_utilization(user_response)
        
        success = primary_value is not None and primary_confidence >= 0.5
        
        return {
            'success': success,
            'primary_value': primary_value,
            'confidence': primary_confidence,
            'all_extracted_fields': all_extracted_fields,
            'multi_field_bonus': multi_field_bonus,
            'context_utilized': context_utilized,
            'processing_details': {
                'primary_extraction': bool(primary_value),
                'additional_fields_found': len(additional_fields),
                'query_processor_used': bool(query_processed_fields),
                'total_fields_extracted': len(all_extracted_fields)
            }
        }
    
    # Extract the primary field value from user response
    def extract_primary_field(self, text: str, field_type: str) -> Tuple[Optional[str], float]:
        
        if field_type not in self.field_patterns:
            # For unknown field types, return cleaned text with moderate confidence
            cleaned = text.strip()
            return (cleaned, 0.75) if cleaned else (None, 0.0)
        
        patterns = self.field_patterns[field_type]
        best_match = None
        best_confidence = 0.0
        
        for i, pattern in enumerate(patterns):
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                if match.groups():
                    value = match.groups()[-1].strip()
                else:
                    value = match.group(0).strip()
                
                if value:
                    confidence = 0.95 - (i * 0.1)
                    
                    # Validation bonus
                    if self.validate_field_value(value, field_type):
                        confidence = min(0.98, confidence + 0.15)
                    
                    if confidence > best_confidence:
                        best_match = value
                        best_confidence = confidence
        
        # If no pattern match, try simple extraction for name/text fields
        if not best_match and field_type in ['name', 'medical_condition', 'medication']:
            if field_type == 'name':
                name_match = re.search(r'(?:my name is|i\'?m|called)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)', text, re.IGNORECASE)
                if name_match:
                    best_match = name_match.group(1).strip()
                    best_confidence = 0.85
                else:
                    words = re.findall(r'\b[A-Z][a-z]+\b', text)
                    if words:
                        best_match = ' '.join(words)
                        best_confidence = 0.70
            else:
                cleaned = re.sub(r'^(i|my|the|for|about)\s+', '', text.strip(), flags=re.IGNORECASE)
                if cleaned:
                    best_match = cleaned
                    best_confidence = 0.80
        
        return best_match, best_confidence
    
    # Extract additional field values mentioned in the response
    def extract_additional_fields(self, text: str) -> List[Dict[str, Any]]:
        additional_fields = []
        
        # Check each field type's patterns against the text
        for field_type, patterns in self.field_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    value = match.groups()[-1] if match.groups() else match.group(0)
                    value = value.strip()
                    
                    if value and self.validate_field_value(value, field_type):
                        additional_fields.append({
                            'field_type': field_type,
                            'value': value,
                            'confidence': 0.85,
                            'extraction_method': 'pattern_match',
                            'context': self.get_match_context(text, match.start(), match.end())
                        })
        
        return self.deduplicate_fields(additional_fields)[:5]
    
    # Combine all extracted fields into final result
    def combine_extracted_fields(self, primary_value: Optional[str], primary_confidence: float,
                                primary_field_id: str, primary_field_type: str,
                                additional_fields: List[Dict[str, Any]],
                                query_processed_fields: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        
        combined_fields = []
        
        # Add primary field if found
        if primary_value:
            combined_fields.append({
                'field_id': primary_field_id,
                'field_type': primary_field_type,
                'value': primary_value,
                'confidence': primary_confidence,
                'source': 'primary_extraction'
            })
        
        # Add additional fields
        for field in additional_fields:
            combined_fields.append({
                'field_id': f"additional_{field['field_type']}",
                'field_type': field['field_type'],
                'value': field['value'],
                'confidence': field['confidence'],
                'source': 'additional_extraction'
            })
        
        # Add query processed fields
        for field in query_processed_fields:
            combined_fields.append({
                'field_id': field.get('id', 'unknown'),
                'field_type': field.get('type', 'unknown'),
                'value': field.get('value', ''),
                'confidence': 0.90,
                'source': 'query_processor'
            })
        
        return combined_fields
    
    # Validate extracted field value
    def validate_field_value(self, value: str, field_type: str) -> bool:
        if not value:
            return False
        
        validation_rules = {
            'email': lambda v: '@' in v and '.' in v.split('@')[-1] if '@' in v else False,
            'ssn': lambda v: len(re.sub(r'[^\d]', '', v)) == 9,
            'phone': lambda v: len(re.sub(r'[^\d]', '', v)) >= 10,
            'date': lambda v: len(re.findall(r'\d+', v)) >= 3,
            'checkbox': lambda v: v.lower() in ['yes', 'no', 'true', 'false', '1', '0']
        }
        
        validator = validation_rules.get(field_type)
        return validator(value) if validator else True
    
    # Check if user response utilizes conversation context
    def check_context_utilization(self, user_response: str) -> bool:
        context_indicators = [
            'as i mentioned', 'like i said', 'from before', 'previously',
            'earlier', 'already told', 'same as', 'still the'
        ]
        
        response_lower = user_response.lower()
        return any(indicator in response_lower for indicator in context_indicators)
    
    # Assess user engagement level based on response
    def assess_user_engagement(self, user_response: str) -> str:
        if not user_response:
            return 'none'
        
        response_length = len(user_response.split())
        
        if response_length >= 10:
            return 'high'
        elif response_length >= 3:
            return 'medium'
        else:
            return 'low'
    
    # Get context around a match
    def get_match_context(self, text: str, start: int, end: int, window: int = 30) -> str:
        context_start = max(0, start - window)
        context_end = min(len(text), end + window)
        return text[context_start:context_end]
    
    # Remove duplicate field extractions
    def deduplicate_fields(self, fields: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        seen = set()
        unique_fields = []
        
        for field in fields:
            key = (field['field_type'], field['value'].lower().strip())
            if key not in seen:
                seen.add(key)
                unique_fields.append(field)
        
        return sorted(unique_fields, key=lambda x: x['confidence'], reverse=True)
    
    # Create response for when user doesn't provide input
    def create_empty_response(self, field_id: str, field_type: str, start_time: float) -> Dict[str, Any]:
        return {
            'success': False,
            'value': None,
            'confidence': 0.0,
            'user_response': None,
            'extracted_fields': [],
            'field_criticality': FIELD_CRITICALITY.get(field_type, 1.0),
            'cost': self.cost,
            'latency': time.time() - start_time,
            'processing_method': 'no_response',
            'user_engagement': 'none'
        }


class AskUserToolStub(AskUserTool):
    
    # Stub implementation for testing
    def __init__(self, context=None, query_processor=None):
        super().__init__(context=context, query_processor=query_processor, interface='stub')


# Backward compatibility aliases
EnhancedAskUserTool = AskUserTool
EnhancedAskUserToolStub = AskUserToolStub
