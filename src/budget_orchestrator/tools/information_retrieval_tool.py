# Information retrieval tool for medical form fields using real user context and chat history

import json
import os
import sys
from typing import Dict, Any, List, Optional
from datetime import datetime

# Add current directory to path for imports
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, current_dir)

try:
    from config import FIELD_CRITICALITY, CONTEXT_REWARDS
except ImportError:
    # Fallback values if config not available
    FIELD_CRITICALITY = {
        'name': 2.0, 'date': 3.0, 'ssn': 5.0, 'phone': 1.0, 'email': 1.0,
        'address': 2.0, 'insurance_id': 4.0, 'medical_condition': 8.0, 'medication': 10.0
    }
    CONTEXT_REWARDS = {'context_utilization': 0.3}

class InformationRetrievalTool:
    
    # Initialize tool with user context for retrieving known information
    def __init__(self, context=None, user_info=None):
        self.context = context
        self.user_info = user_info or {}
    
    # Retrieve field information from user context and chat history
    def execute(self, field_id: str, field_type: str, context: Dict = None) -> Dict[str, Any]:
        try:
            # Check user information first (highest confidence)
            user_info_result = self.retrieve_from_user_info(field_id, field_type)
            if user_info_result:
                return {
                    'success': True,
                    'value': user_info_result['value'],
                    'confidence': user_info_result['confidence'],
                    'source': 'user_info',
                    'field_criticality': FIELD_CRITICALITY.get(field_type, 1.0),
                    'context_bonuses': {'context_utilization': CONTEXT_REWARDS['context_utilization']},
                    'retrieval_method': 'user_context',
                    'cost': 0.0002, 
                    'latency': 1.0
                }
            
            # Check chat history for field values
            chat_result = self.retrieve_from_chat_history(field_id, field_type)
            if chat_result:
                return {
                    'success': True,
                    'value': chat_result['value'],
                    'confidence': chat_result['confidence'],
                    'source': 'chat_history',
                    'field_criticality': FIELD_CRITICALITY.get(field_type, 1.0),
                    'context_bonuses': {'context_utilization': CONTEXT_REWARDS['context_utilization']},
                    'retrieval_method': 'chat_context',
                    'cost': 0.0002,
                    'latency': 1.0
                }
            
            # No information found
            return {
                'success': False,
                'value': None,
                'confidence': 0.0,
                'source': 'none',
                'field_criticality': FIELD_CRITICALITY.get(field_type, 1.0),
                'context_bonuses': {},
                'retrieval_method': 'no_match',
                'cost': 0.0002,
                'latency': 1.0
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'confidence': 0.0,
                'cost': 0.0002,
                'latency': 1.0
            }
    
    # Retrieve information from stored user information
    def retrieve_from_user_info(self, field_id: str, field_type: str) -> Optional[Dict[str, Any]]:
        if not self.user_info:
            return None
        
        # Direct field ID match
        if field_id in self.user_info:
            return {
                'value': str(self.user_info[field_id]),
                'confidence': 0.95
            }
        
        # Field type matching
        field_variations = self.get_field_variations(field_id, field_type)
        for variation in field_variations:
            if variation in self.user_info:
                return {
                    'value': str(self.user_info[variation]),
                    'confidence': 0.85
                }
        
        return None
    
    # Retrieve field values from chat history
    def retrieve_from_chat_history(self, field_id: str, field_type: str) -> Optional[Dict[str, Any]]:
        if not self.context or not hasattr(self.context, 'chat_history') or not self.context.chat_history:
            return None
        
        field_variations = self.get_field_variations(field_id, field_type)
        
        # Search recent chat history for field mentions
        for exchange in reversed(self.context.chat_history[-10:]): 
            if exchange['type'] == 'user':
                content = exchange['content'].lower()
                
                # Look for field mentions and extract values
                for variation in field_variations:
                    if variation.lower() in content:
                        # Simple pattern: "my [field] is [value]"
                        import re
                        patterns = [
                            rf'my\s+{re.escape(variation)}\s+is\s+([^\n,;.]+)',
                            rf'{re.escape(variation)}\s*[:=]\s*([^\n,;.]+)',
                            rf'{re.escape(variation)}\s+is\s+([^\n,;.]+)'
                        ]
                        
                        for pattern in patterns:
                            match = re.search(pattern, content, re.IGNORECASE)
                            if match:
                                value = match.group(1).strip()
                                if value and len(value) > 1:
                                    return {
                                        'value': value,
                                        'confidence': 0.75
                                    }
        
        return None
    
    # Generate variations of field names for matching
    def get_field_variations(self, field_id: str, field_type: str) -> List[str]:
        variations = [field_id, field_type]
        
        # Add common variations
        field_name = field_id.replace('_', ' ').replace('-', ' ')
        variations.extend([field_name, field_name.lower()])
        
        # Add field-specific variations
        field_specific = {
            'name': ['name', 'full name'],
            'ssn': ['ssn', 'social security number'],
            'phone': ['phone', 'phone number'],
            'email': ['email', 'email address'],
            'date': ['date', 'birth date', 'dob'],
            'address': ['address', 'home address'],
            'insurance_id': ['insurance', 'insurance id']
        }
        
        if field_type in field_specific:
            variations.extend(field_specific[field_type])
        
        return list(set(variations))  # Remove duplicates


class InformationRetrievalToolStub:
    
    # Simple stub initialization
    def __init__(self, context=None, user_info=None):
        self.context = context
        self.user_info = user_info or {}
    
    # Stub implementation returns simple mock results for fast training
    def execute(self, field_id: str, field_type: str, context: Dict = None) -> Dict[str, Any]:
        # Simple mock values for fast training
        mock_values = {
            'name': 'Jane Smith',
            'ssn': '987-65-4321',
            'phone': '(555) 987-6543',
            'email': 'jane.smith@email.com',
            'date': '12/25/1985',
            'address': '456 Oak St, Town, ST 54321',
            'insurance_id': 'INS987654',
            'medical_condition': 'Diabetes',
            'medication': 'Metformin 500mg'
        }
        
        mock_value = mock_values.get(field_type, f"Mock {field_type}")
        
        return {
            'success': True,
            'value': mock_value,
            'confidence': 0.80,
            'source': 'mock',
            'field_criticality': FIELD_CRITICALITY.get(field_type, 1.0),
            'context_bonuses': {},
            'retrieval_method': 'stub',
            'cost': 0.0002,
            'latency': 1.0
        } 