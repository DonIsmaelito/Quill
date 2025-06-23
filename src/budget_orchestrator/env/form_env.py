# Enhanced Gym environment for medical form-filling with budget/time constraints using real form dataset

import gymnasium as gym
from gymnasium import spaces
import numpy as np
from typing import Dict, List, Tuple, Any, Optional
import json
import time
import sys
import os

# Add current directory to path for imports
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, current_dir)

# Update import path to absolute imports
from config import (
    MAX_FIELDS_PER_FORM, MAX_BUDGET_PER_FORM, MAX_LATENCY_PER_FORM,
    FIELD_BASE_REWARD, FIELD_PENALTY, LATENCY_PENALTY_FACTOR, BUDGET_PENALTY_FACTOR,
    BUDGET_BUCKETS, CONFIDENCE_BUCKETS, LATENCY_BUCKETS,
    CRITICALITY_BUCKETS, CONTEXT_AVAILABILITY_BUCKETS, DOCUMENT_QUALITY_BUCKETS, USER_ENGAGEMENT_BUCKETS,
    FIELD_TYPES, FIELD_CRITICALITY, CONTEXT_REWARDS, ERROR_PENALTIES,
    CONFIDENCE_THRESHOLD, MAX_RETRY_ATTEMPTS, CORE_ACTIONS
)
from tools import create_context_aware_tools, ToolContext, get_core_action_names, KnowledgeBaseManager

# Clean action constants inspired by tutorial - Updated with smart autofill
ACTION_EXTRACT = 0
ACTION_RETRIEVE = 1 
ACTION_ASK_USER = 2
ACTION_SMART_AUTOFILL = 3
ACTION_SKIP = 4

ACTION_NAMES = {
    ACTION_EXTRACT: 'extract_from_document',
    ACTION_RETRIEVE: 'retrieve_information', 
    ACTION_ASK_USER: 'ask_user',
    ACTION_SMART_AUTOFILL: 'smart_autofill',
    ACTION_SKIP: 'skip'
}

ACTION_TO_STR = {v: k for k, v in ACTION_NAMES.items()}

class StateEncoder:
    # Clean state encoding system for Q-learning with medical form fields
    
    # Constructor for state encoder
    def __init__(self):
        # State space dimensions for clean encoding
        self.state_dims = {
            'field_index': MAX_FIELDS_PER_FORM,
            'field_type': len(FIELD_TYPES),
            'budget_bucket': BUDGET_BUCKETS,
            'latency_bucket': LATENCY_BUCKETS,
            'confidence_bucket': CONFIDENCE_BUCKETS,
            'criticality_bucket': CRITICALITY_BUCKETS,
            'context_available_bucket': CONTEXT_AVAILABILITY_BUCKETS,
            'document_quality_bucket': DOCUMENT_QUALITY_BUCKETS,
            'user_engagement_bucket': USER_ENGAGEMENT_BUCKETS,
            'last_tool': len(CORE_ACTIONS),
            'field_filled': 2
        }
        
        # Calculate total state space size for Q-table
        self.state_space_size = 1
        for dim in self.state_dims.values():
            self.state_space_size *= dim
    
    # Convert observation dict to clean tuple encoding for Q-table indexing
    def encode_state(self, observation: Dict[str, Any]) -> Tuple:
        return (
            observation.get('field_index', 0),
            observation.get('field_type', 0),
            observation.get('budget_bucket', 0),
            observation.get('latency_bucket', 0),
            observation.get('confidence_bucket', 0),
            observation.get('criticality_bucket', 0),
            observation.get('context_available_bucket', 0),
            observation.get('document_quality_bucket', 0),
            observation.get('user_engagement_bucket', 0),
            observation.get('last_tool', 0),
            observation.get('field_filled', 0)
        )
    
    # Convert tuple encoding to observation dict 
    def decode_state(self, state_tuple: Tuple) -> Dict[str, Any]:
        if len(state_tuple) != len(self.state_dims):
            raise ValueError(f"Invalid state tuple length: {len(state_tuple)}")
        
        keys = list(self.state_dims.keys())
        return {keys[i]: state_tuple[i] for i in range(len(keys))}
    
    # Convert state to human-readable string
    def state_to_readable(self, state_tuple: Tuple) -> str:
        decoded = self.decode_state(state_tuple)
        field_type_name = FIELD_TYPES[decoded['field_type']] if decoded['field_type'] < len(FIELD_TYPES) else 'unknown'
        criticality_name = ['low', 'medium', 'high'][decoded['criticality_bucket']]
        context_name = ['unlikely', 'maybe', 'likely'][decoded['context_available_bucket']]
        
        return f"Field_{decoded['field_index']}({field_type_name})_Crit_{criticality_name}_Ctx_{context_name}"


class EnhancedFormFillingEnv(gym.Env):
    # Enhanced form filling environment for training with real medical forms and budget constraints
    
    # Initialize environment with form fields and medical context
    def __init__(self, form_fields: List[Dict[str, Any]] = None, use_stubs: bool = True,
                 user_info: Dict = None, chat_history: List[Dict] = None):
        super().__init__()
        
        # Initialize state encoder
        self.state_encoder = StateEncoder()
        
        # Enhanced action space (core 4 actions only)
        self.action_names = CORE_ACTIONS
        self.n_actions = len(self.action_names)
        self.action_space = spaces.Discrete(self.n_actions)
        
        # Enhanced observation space with context features
        self.observation_space = spaces.Dict({
            'field_index': spaces.Discrete(MAX_FIELDS_PER_FORM),
            'field_type': spaces.Discrete(len(FIELD_TYPES)),
            'budget_bucket': spaces.Discrete(BUDGET_BUCKETS),
            'latency_bucket': spaces.Discrete(LATENCY_BUCKETS),
            'confidence_bucket': spaces.Discrete(CONFIDENCE_BUCKETS),
            'criticality_bucket': spaces.Discrete(CRITICALITY_BUCKETS),
            'context_available_bucket': spaces.Discrete(CONTEXT_AVAILABILITY_BUCKETS),
            'document_quality_bucket': spaces.Discrete(DOCUMENT_QUALITY_BUCKETS),
            'user_engagement_bucket': spaces.Discrete(USER_ENGAGEMENT_BUCKETS),
            'last_tool': spaces.Discrete(self.n_actions),
            'field_filled': spaces.Discrete(2),  # 0 or 1
            'action_mask': spaces.MultiBinary(self.n_actions)
        })
        
        # Initialize context and tools
        self.use_stubs = use_stubs
        self.user_info = user_info or {}
        self.chat_history = chat_history or []
        
        # Create tool context for conversation awareness
        self.tool_context = ToolContext(
            chat_history=self.chat_history,
            user_info=self.user_info,
            session_context={},
            vector_db_path="vector_db"
        )
        
        # Initialize context-aware tools (core actions only)
        self.tools = create_context_aware_tools(self.tool_context, use_stubs, tools_category='core')
        
        # Initialize knowledge base manager for learning
        self.knowledge_manager = KnowledgeBaseManager(self.tool_context)
        
        # Form fields and state - will be set during reset with real form data
        self.form_fields = form_fields or []
        self.n_fields = len(self.form_fields)
        
        # Episode state
        self.current_field_idx = 0
        self.budget_spent = 0.0
        self.latency_spent = 0.0
        self.field_values = {}
        self.field_confidences = {}
        self.field_extraction_methods = {}
        
        # New: Store intermediate data for smart autofill workflow
        self.extracted_data_cache = {}  # Cache data from extract/retrieve/ask tools
        
        self.last_tool_idx = 0
        self.last_confidence = 0.0
        self.document_quality = 'fair'  # Default document quality
        self.user_engagement = 'medium'  # Default engagement
        
        # Enhanced tracking
        self.episode_rewards = []
        self.fields_filled = 0
        self.fields_correct = 0
        self.multi_field_extractions = 0
        self.context_utilizations = 0
        self.user_corrections_learned = 0
        self.retry_counts = {}
        
        # Session metadata
        self.session_start_time = time.time()
        self.conversation_turns = 0
        
        # Completed forms for learning (processed after episodes)
        self.completed_forms = []
    
    # Get clean state encoding using StateEncoder for Q-table indexing
    def get_state_encoding(self, observation: Dict[str, Any]) -> Tuple:
        return self.state_encoder.encode_state(observation)
    
    # Get human-readable state description
    def get_readable_state(self, observation: Dict[str, Any]) -> str:
        state_tuple = self.state_encoder.encode_state(observation)
        return self.state_encoder.state_to_readable(state_tuple)
    
    # Get valid action probabilities for analysis (uniform for valid actions)
    def get_action_probabilities(self, observation: Dict[str, Any]) -> Dict[str, float]:
        action_mask = observation.get('action_mask', np.ones(self.n_actions))
        valid_actions = np.where(action_mask == 1)[0]
        
        if len(valid_actions) == 0:
            return {}
        
        # Uniform probability for valid actions
        prob = 1.0 / len(valid_actions)
        return {self.action_names[i]: prob for i in valid_actions}

    # Reset environment with real form data and initialize episode state
    def reset(self, seed: Optional[int] = None, options: Optional[dict] = None) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        super().reset(seed=seed)
        
        # Reset state
        self.current_field_idx = 0
        self.budget_spent = 0.0
        self.latency_spent = 0.0
        self.field_values = {}
        self.field_confidences = {}
        self.field_extraction_methods = {}
        
        # Reset tracking
        self.episode_rewards = []
        self.fields_filled = 0
        self.fields_correct = 0
        self.multi_field_extractions = 0
        self.context_utilizations = 0
        self.user_corrections_learned = 0
        self.retry_counts = {}
        self.conversation_turns = 0
        self.session_start_time = time.time()
        
        # Clear extracted data cache for new episode
        self.extracted_data_cache = {}
        
        # Initialize data gathering history for reward tracking
        self.last_data_gathering_tools = []
        
        # Handle real form data from options
        if options:
            if 'form_fields' in options:
                self.form_fields = options['form_fields']
                self.n_fields = len(self.form_fields)
            if 'user_info' in options:
                self.user_info = options['user_info']
                self.tool_context.user_info = self.user_info
            if 'chat_history' in options:
                self.chat_history = options['chat_history']
                self.tool_context.chat_history = self.chat_history
            if 'document_quality' in options:
                self.document_quality = options['document_quality']
            if 'image_path' in options:
                self.current_image_path = options['image_path']
            if 'original_fields' in options:
                self.original_fields = options['original_fields']  # Store original form field data

        # Store current form metadata for tools
        self.current_form_metadata = {
            'has_real_data': options.get('has_real_data', False) if options else False,
            'sample_id': options.get('sample_id', 'synthetic') if options else 'synthetic',
            'image_path': getattr(self, 'current_image_path', None),
            'original_fields': getattr(self, 'original_fields', [])
        }
        
        obs = self.get_obs()
        info = self.get_info()
        
        return obs, info
    
    # Get enhanced observation with medical form context features
    def get_obs(self) -> Dict[str, Any]:
        current_field = self.form_fields[self.current_field_idx] if self.current_field_idx < self.n_fields else None
        
        # Standard discretizations for Q-learning
        budget_remaining = MAX_BUDGET_PER_FORM - self.budget_spent
        budget_bucket = min(int(budget_remaining / MAX_BUDGET_PER_FORM * BUDGET_BUCKETS), BUDGET_BUCKETS - 1)
        budget_bucket = max(0, budget_bucket)
        
        latency_remaining = MAX_LATENCY_PER_FORM - self.latency_spent
        latency_bucket = min(int(latency_remaining / MAX_LATENCY_PER_FORM * LATENCY_BUCKETS), LATENCY_BUCKETS - 1)
        latency_bucket = max(0, latency_bucket)
        
        confidence_bucket = min(int(self.last_confidence * CONFIDENCE_BUCKETS), CONFIDENCE_BUCKETS - 1)
        
        # Enhanced context features for medical forms
        criticality_bucket = self.get_criticality_bucket(current_field)
        context_available_bucket = self.assess_context_availability(current_field)
        document_quality_bucket = self.get_document_quality_bucket()
        user_engagement_bucket = self.get_user_engagement_bucket()
        
        # Field type index for state encoding
        field_type_idx = 0
        if current_field:
            field_type = current_field['type']
            if field_type in FIELD_TYPES:
                field_type_idx = FIELD_TYPES.index(field_type)
        
        # Field completion status
        field_filled = 0
        if current_field and current_field['name'] in self.field_values:
            field_filled = 1
        
        # Action mask based on budget and latency constraints
        action_mask = self.get_action_mask(budget_remaining, latency_remaining)
        
        return {
            'field_index': self.current_field_idx,
            'field_type': field_type_idx,
            'budget_bucket': budget_bucket,
            'latency_bucket': latency_bucket,
            'confidence_bucket': confidence_bucket,
            'criticality_bucket': criticality_bucket,
            'context_available_bucket': context_available_bucket,
            'document_quality_bucket': document_quality_bucket,
            'user_engagement_bucket': user_engagement_bucket,
            'last_tool': self.last_tool_idx,
            'field_filled': field_filled,
            'action_mask': action_mask
        }
    
    # Get criticality bucket for current medical field
    def get_criticality_bucket(self, field: Optional[Dict]) -> int:
        if not field:
            return 0
        
        criticality = FIELD_CRITICALITY.get(field['type'], 1.0)
        if criticality >= 8.0:  # Life-critical
            return 2  # High
        elif criticality >= 3.0:  # Important
            return 1  # Medium
        else:
            return 0  # Low
    
    # Assess likelihood of finding field information in context
    def assess_context_availability(self, field: Optional[Dict]) -> int:
        if not field:
            return 0
        
        field_name = field['name']
        field_type = field['type']
        
        # Check user info for field availability
        user_info_score = 0
        if field_name in self.user_info or field_type in self.user_info:
            user_info_score = 2
        
        # Check chat history for recent mentions
        chat_score = 0
        if self.chat_history:
            recent_content = " ".join([
                msg.get('content', '') for msg in self.chat_history[-10:]
                if msg.get('type') == 'user'
            ]).lower()
            
            field_indicators = [field_name.lower(), field_type.lower()]
            if any(indicator in recent_content for indicator in field_indicators):
                chat_score = 1
        
        # Combine scores to determine availability
        total_score = user_info_score + chat_score
        if total_score >= 2:
            return 2  # Likely
        elif total_score >= 1:
            return 1  # Maybe
        else:
            return 0  # Unlikely
    
    # Convert document quality to discrete bucket for state encoding
    def get_document_quality_bucket(self) -> int:
        quality_map = {'poor': 0, 'fair': 1, 'good': 2}
        return quality_map.get(self.document_quality, 1)
    
    # Convert user engagement to discrete bucket for state encoding
    def get_user_engagement_bucket(self) -> int:
        engagement_map = {'low': 0, 'medium': 1, 'high': 2}
        return engagement_map.get(self.user_engagement, 1)
    
    # Get action mask based on budget and latency constraints
    def get_action_mask(self, budget_remaining: float, latency_remaining: float) -> np.ndarray:
        mask = np.ones(self.n_actions, dtype=np.int8)
        
        # Action costs and latencies for constraint checking (updated with smart autofill)
        action_costs = {
            'extract_from_document': 0.00005,
            'retrieve_information': 0.0002,
            'ask_user': 0.0003,
            'smart_autofill': 0.00008,
            'skip': 0.0
        }
        
        action_latencies = {
            'extract_from_document': 3.0,
            'retrieve_information': 1.0,
            'ask_user': 15.0,
            'smart_autofill': 0.5,
            'skip': 0.0
        }
        
        # Additional logic for smart autofill tool
        current_field = self.form_fields[self.current_field_idx] if self.current_field_idx < self.n_fields else None
        current_field_name = current_field['name'] if current_field else None
        
        # Mask actions that exceed remaining budget or latency
        for i, action_name in enumerate(self.action_names):
            cost = action_costs[action_name]
            latency = action_latencies[action_name]
            
            if cost > budget_remaining or latency > latency_remaining:
                mask[i] = 0
                continue
            
            # FIXED: Smart autofill available if ANY cached data exists (not just successful)
            # This prevents action masking deadlock and allows use of partial data
            if action_name == 'smart_autofill':
                if not current_field_name or current_field_name not in self.extracted_data_cache:
                    mask[i] = 0  # Can't autofill without any cached data
                # Note: Now allows partial/low-confidence cached data
        
        # Skip is always valid as last resort
        mask[-1] = 1
        return mask
    
    # Enhanced step function with medical-aware rewards and real form data support
    def step(self, action: int) -> Tuple[Dict[str, Any], float, bool, bool, Dict[str, Any]]:
        if self.current_field_idx >= self.n_fields:
            obs = self.get_obs()
            return obs, 0.0, True, False, self.get_info()

        current_field = self.form_fields[self.current_field_idx]
        field_name = current_field['name']
        field_type = current_field['type']

        # Initialize reward for this step
        reward = 0.0
        
        # Execute action using appropriate tool
        if action < len(self.action_names) - 1:  # Not skip
            action_name = self.action_names[action]
            tool = self.tools[action_name]
            
            # Call tool with enhanced interface for real form support
            tool_result = self.call_enhanced_tool(tool, action_name, field_name, field_type, current_field)
            
            # Update environment state from tool results
            self.budget_spent += tool_result.get('cost', 0)
            self.latency_spent += tool_result.get('latency', 0)
            self.last_tool_idx = action
            self.last_confidence = tool_result.get('confidence', 0)
            
            # Calculate reward based on tool results
            reward += self.process_tool_result(tool_result, current_field, action_name)
            
        else:
            # Skip action - move to next field with penalty
            reward += self.process_skip_action(current_field)
            self.current_field_idx += 1
            self.last_tool_idx = action
        
        # Check if episode is complete
        done = self.current_field_idx >= self.n_fields
        
        # Apply final episode rewards and penalties
        if done:
            reward += self.calculate_final_rewards()
            # Store completed form for potential learning
            self.store_completed_form()
        
        # Update episode tracking and return results
        self.episode_rewards.append(reward)
        obs = self.get_obs()
        info = self.get_info()
        
        return obs, reward, done, False, info
    
    # Call tool with enhanced interface and real form data support
    def call_enhanced_tool(self, tool: Any, action_name: str, field_name: str, 
                          field_type: str, field_info: Dict) -> Dict[str, Any]:
        try:
            if action_name == 'smart_autofill':
                # Smart autofill tool completes form using cached extracted data
                cached_data = self.extracted_data_cache.get(field_name)
                if not cached_data:
                    return {
                        'success': False,
                        'error': 'No extracted data available for autofill. Use extract/retrieve/ask tools first.',
                        'confidence': 0.0,
                        'cost': 0.00001,
                        'latency': 0.1
                    }
                
                # Call smart autofill with the cached data
                result = tool.execute(
                    field_name, 
                    field_type, 
                    cached_data,
                    form_context={'current_field_idx': self.current_field_idx,
                                'total_fields': self.n_fields,
                                'field_info': field_info}
                )
                
                # If successful, actually fill the form field
                if result.get('success'):
                    self.field_values[field_name] = result['value']
                    self.field_confidences[field_name] = result['confidence']
                    self.field_extraction_methods[field_name] = f"{cached_data.get('source_tool', 'unknown')}+autofill"
                    
                    # Clear the cached data since field is completed
                    if field_name in self.extracted_data_cache:
                        del self.extracted_data_cache[field_name]
                
                return result
                
            elif action_name == 'extract_from_document':
                # Document extraction tool with real form image support
                
                # Check if we have real form data available
                if (hasattr(self, 'current_form_metadata') and 
                    self.current_form_metadata.get('has_real_data', False)):
                    
                    # Find corresponding original field for ground truth
                    original_field = None
                    current_field_idx = self.current_field_idx
                    if (hasattr(self, 'original_fields') and 
                        current_field_idx < len(self.original_fields)):
                        original_field = self.original_fields[current_field_idx]
                    
                    # Use specialized method for real form images
                    if hasattr(tool, 'execute_from_form_image') and original_field:
                        result = tool.execute_from_form_image(
                            field_info=original_field,
                            image_path=getattr(self, 'current_image_path', None)
                        )
                    else:
                        # Fallback to regular extraction with image path
                        image_path = getattr(self, 'current_image_path', None)
                        documents = [image_path] if image_path else ['sample_medical_form.pdf']
                        result = tool.execute(field_name, field_type, documents)
                else:
                    # Synthetic data fallback (should be rare with real dataset)
                    documents = ['sample_medical_form.pdf']
                    result = tool.execute(field_name, field_type, documents)
                
                # Update document quality from extraction results
                if 'document_quality' in result:
                    self.document_quality = result['document_quality']
                
                # FIXED: Cache data even if confidence is below threshold or tool "failed"
                # This allows smart_autofill to use partial/low-confidence data
                if result.get('value') or result.get('confidence', 0) > 0.1:
                    self.extracted_data_cache[field_name] = {
                        **result,
                        'source_tool': 'extract_from_document',
                        'timestamp': time.time(),
                        'partial_data': not result.get('success', False)  # Mark as partial if not fully successful
                    }
                
                return result
                
            elif action_name == 'retrieve_information':
                # Information retrieval tool for user context
                result = tool.execute(field_name, field_type)
                
                # Track context utilization for rewards
                if result.get('context_bonuses'):
                    self.context_utilizations += 1
                    if 'correction_learned' in result['context_bonuses']:
                        self.user_corrections_learned += 1
                
                # FIXED: Cache data even if not fully successful
                # This allows smart_autofill to use partial context information
                if result.get('value') or result.get('confidence', 0) > 0.1:
                    self.extracted_data_cache[field_name] = {
                        **result,
                        'source_tool': 'retrieve_information',
                        'timestamp': time.time(),
                        'partial_data': not result.get('success', False)
                    }
                
                return result
                
            elif action_name == 'ask_user':
                # Enhanced ask user tool with form context
                result = tool.execute(field_name, field_type, 
                                    form_context={'current_field_idx': self.current_field_idx,
                                                'total_fields': self.n_fields,
                                                'field_info': field_info})
                
                # Track conversation metrics
                if result.get('success'):
                    self.conversation_turns += 1
                    
                    # Update user engagement based on response quality
                    if result.get('user_provided_answer'):
                        current_engagement = {'low': 0, 'medium': 1, 'high': 2}[self.user_engagement]
                        new_engagement = min(2, current_engagement + 1)
                        self.user_engagement = ['low', 'medium', 'high'][new_engagement]
                    
                    # Track multi-field extraction capabilities
                    if result.get('multi_field_info'):
                        self.multi_field_extractions += len(result['multi_field_info'])
                
                # FIXED: Cache user data even if processing wasn't perfect
                if result.get('value') or result.get('confidence', 0) > 0.1:
                    self.extracted_data_cache[field_name] = {
                        **result,
                        'source_tool': 'ask_user',
                        'timestamp': time.time(),
                        'partial_data': not result.get('success', False)
                    }
                
                return result
                
            else:
                # Unknown action - return error result
                return {
                    'success': False,
                    'error': f'Unknown action: {action_name}',
                    'confidence': 0.0,
                    'cost': 0.0,
                    'latency': 0.0
                }
                
        except Exception as e:
            # Handle tool execution errors gracefully
            return {
                'success': False,
                'error': f'Tool execution failed: {str(e)}',
                'confidence': 0.0,
                'cost': 0.01,  # Small cost for failed execution
                'latency': 1.0
            }
    
    # Process tool result and calculate medical-aware reward
    def process_tool_result(self, result: Dict[str, Any], field_info: Dict, action_name: str) -> float:
        reward = 0.0
        field_name = field_info['name']
        field_type = field_info['type']
        
        # Apply medical criticality multiplier for rewards
        criticality_multiplier = FIELD_CRITICALITY.get(field_type, 1.0) / 5.0  # Normalize to ~0.2-2.0
        
        if action_name == 'smart_autofill':
            # Smart autofill tool actually completes the form field
            if result.get('success') and result.get('confidence', 0) >= CONFIDENCE_THRESHOLD:
                value = result.get('value')
                confidence = result['confidence']
                
                if value:
                    # Field is already filled by call_enhanced_tool
                    self.fields_filled += 1
                    self.fields_correct += 1  # Assume correct for training
                    
                    # Base completion reward scaled by medical criticality
                    base_reward = FIELD_BASE_REWARD * criticality_multiplier
                    reward += base_reward
                    
                    # Confidence bonus for high-quality completions
                    confidence_bonus = (confidence - CONFIDENCE_THRESHOLD) * 0.5
                    reward += confidence_bonus
                    
                    # FIXED: Give credit to data gathering tools that enabled this completion
                    # Check if there was cached data from previous tools
                    if hasattr(self, 'last_data_gathering_tools'):
                        for tool_name in self.last_data_gathering_tools:
                            if tool_name in ['extract_from_document', 'retrieve_information', 'ask_user']:
                                # Bonus for successful data gathering that led to completion
                                enablement_bonus = (FIELD_BASE_REWARD * 0.5) * criticality_multiplier
                                reward += enablement_bonus
                    
                    # Multi-field completion bonus for efficiency
                    if result.get('multi_field_bonus'):
                        reward += result['multi_field_bonus'] * criticality_multiplier
                    
                    # Validation and formatting bonuses
                    if result.get('validation_passed'):
                        reward += 0.2 * criticality_multiplier
                    if result.get('formatted'):
                        reward += 0.1 * criticality_multiplier
                    
                    # Move to next field after successful completion
                    self.current_field_idx += 1
                    
                    # Clear data gathering history for next field
                    self.last_data_gathering_tools = []
            else:
                # Failed completion - give partial credit if tried with partial data
                cached_data = self.extracted_data_cache.get(field_name)
                if cached_data and cached_data.get('partial_data'):
                    # Smaller penalty for failing with partial data
                    error_penalty = ERROR_PENALTIES.get('incomplete', -0.5) * 0.5
                else:
                    # Full penalty for failing with good data
                    error_penalty = ERROR_PENALTIES.get('incomplete', -0.5)
                
                reward += error_penalty * criticality_multiplier
                
                # Track retry attempts for this field
                self.retry_counts[field_name] = self.retry_counts.get(field_name, 0) + 1
                
                # Skip field if max retries reached
                if self.retry_counts[field_name] >= MAX_RETRY_ATTEMPTS:
                    self.current_field_idx += 1
        
        else:
            # Extract/retrieve/ask tools provide data gathering rewards
            # FIXED: Improved reward structure to encourage data gathering
            
            # Initialize data gathering history if not exists
            if not hasattr(self, 'last_data_gathering_tools'):
                self.last_data_gathering_tools = []
            
            if result.get('value') or result.get('confidence', 0) > 0.1:
                # Successful data gathering (even if partial)
                confidence = result.get('confidence', 0.5)
                
                # FIXED: More substantial data gathering reward
                base_data_reward = (FIELD_BASE_REWARD * 0.6) * criticality_multiplier  # Increased from 0.3
                reward += base_data_reward
                
                # Quality bonus for high-confidence data
                if confidence >= CONFIDENCE_THRESHOLD:
                    confidence_bonus = (confidence - CONFIDENCE_THRESHOLD) * 0.3
                    reward += confidence_bonus
                    
                    # Track successful data gathering for future completion bonus
                    if action_name not in self.last_data_gathering_tools:
                        self.last_data_gathering_tools.append(action_name)
                else:
                    # Partial data bonus - still valuable for smart_autofill
                    partial_bonus = confidence * 0.2 * criticality_multiplier
                    reward += partial_bonus
                    
                    # Track partial data gathering too
                    if action_name not in self.last_data_gathering_tools:
                        self.last_data_gathering_tools.append(action_name)
                
                # Context utilization bonuses for smart tool usage
                if result.get('context_bonuses'):
                    for bonus_type, bonus_value in result['context_bonuses'].items():
                        reward += bonus_value * criticality_multiplier * 0.7
            
            else:
                # Failed data gathering - smaller penalty but still track attempt
                error_type = 'false_negative' if result.get('confidence', 0) < 0.1 else 'incomplete'
                error_penalty = ERROR_PENALTIES.get(error_type, -0.5) * 0.3
                reward += error_penalty * criticality_multiplier
        
        return reward
    
    # Process skip action and calculate penalty based on field importance
    def process_skip_action(self, field_info: Dict) -> float:
        field_type = field_info['type']
        criticality_multiplier = FIELD_CRITICALITY.get(field_type, 1.0) / 5.0
        
        # Penalty for skipping, weighted by medical criticality
        penalty = FIELD_PENALTY * criticality_multiplier
        
        # Extra penalty for skipping required medical fields
        if field_info.get('required', False):
            penalty *= 2.0
        
        return penalty
    
    # Calculate final episode rewards and constraint penalties
    def calculate_final_rewards(self) -> float:
        reward = 0.0
        
        # Budget constraint penalty for overspending
        if self.budget_spent > MAX_BUDGET_PER_FORM:
            budget_excess = self.budget_spent - MAX_BUDGET_PER_FORM
            reward -= budget_excess * BUDGET_PENALTY_FACTOR
            
        # Latency constraint penalty for taking too long
        if self.latency_spent > MAX_LATENCY_PER_FORM:
            latency_excess = self.latency_spent - MAX_LATENCY_PER_FORM
            reward -= latency_excess * LATENCY_PENALTY_FACTOR
        
        # Completion bonus for finishing most fields
        completion_rate = self.fields_filled / self.n_fields
        if completion_rate >= 0.8:  # 80% completion threshold
            completion_bonus = CONTEXT_REWARDS.get('session_efficiency', 0.3) * completion_rate
            reward += completion_bonus
        
        # Context utilization bonus for smart information use
        if self.context_utilizations > 0:
            context_bonus = min(1.0, self.context_utilizations * 0.2)
            reward += context_bonus
        
        # Multi-field extraction bonus for efficiency
        if self.multi_field_extractions > 0:
            multi_field_bonus = min(1.0, self.multi_field_extractions * 0.3)
            reward += multi_field_bonus
        
        return reward
    
    # Store completed form information for learning and analysis
    def store_completed_form(self):
        completed_form = {
            'field_values': self.field_values.copy(),
            'field_confidences': self.field_confidences.copy(),
            'completion_rate': self.fields_filled / self.n_fields,
            'total_cost': self.budget_spent,
            'total_latency': self.latency_spent,
            'session_duration': time.time() - self.session_start_time,
            'form_structure': self.form_fields.copy()
        }
        self.completed_forms.append(completed_form)
    
    # Process completed forms for knowledge base learning (called after episodes)
    def process_completed_forms_for_learning(self) -> Dict[str, Any]:
        if not self.completed_forms:
            return {'message': 'No completed forms to process'}
        
        # Learning metrics from completed forms
        learning_results = {
            'forms_processed': len(self.completed_forms),
            'average_completion_rate': sum(f['completion_rate'] for f in self.completed_forms) / len(self.completed_forms),
            'total_fields_learned': sum(len(f['field_values']) for f in self.completed_forms),
            'knowledge_base_updated': True
        }
        
        self.completed_forms = []
        
        return learning_results
    
    # Get comprehensive episode information and metrics
    def get_info(self) -> Dict[str, Any]:
        return {
            'budget_spent': self.budget_spent,
            'latency_spent': self.latency_spent,
            'fields_filled': self.fields_filled,
            'fields_correct': self.fields_correct,
            'completion_rate': self.fields_filled / self.n_fields if self.n_fields > 0 else 0,
            'current_field': self.form_fields[self.current_field_idx] if self.current_field_idx < self.n_fields else None,
            'field_values': self.field_values.copy(),
            'field_confidences': self.field_confidences.copy(),
            'field_extraction_methods': self.field_extraction_methods.copy(),
            'document_quality': self.document_quality,
            'user_engagement': self.user_engagement,
            'multi_field_extractions': self.multi_field_extractions,
            'context_utilizations': self.context_utilizations,
            'user_corrections_learned': self.user_corrections_learned,
            'conversation_turns': self.conversation_turns,
            'retry_counts': self.retry_counts.copy(),
            'session_duration': time.time() - self.session_start_time,
            'completed_forms_count': len(self.completed_forms)
        }
    
    # Enhanced rendering with medical context
    def render(self, mode='human'):
        if mode == 'human':
            print(f"\n{'='*50}")
            print(f"MEDICAL FORM ASSISTANCE - Field {self.current_field_idx + 1}/{self.n_fields}")
            print(f"{'='*50}")
            
            if self.current_field_idx < self.n_fields:
                field = self.form_fields[self.current_field_idx]
                criticality = FIELD_CRITICALITY.get(field['type'], 1.0)
                print(f"Current field: {field['name']} ({field['type']})")
                print(f"Description: {field.get('description', 'N/A')}")
                print(f"Criticality: {criticality:.1f}/10.0")
                print(f"Required: {'Yes' if field.get('required') else 'No'}")
            
            print(f"\nBudget: ${self.budget_spent:.4f}/${MAX_BUDGET_PER_FORM}")
            print(f"Latency: {self.latency_spent:.1f}s/{MAX_LATENCY_PER_FORM}s")
            print(f"Progress: {self.fields_filled}/{self.n_fields} fields filled")
            print(f"Last confidence: {self.last_confidence:.2f}")
            print(f"Document quality: {self.document_quality}")
            print(f"User engagement: {self.user_engagement}")
            
            if self.multi_field_extractions > 0:
                print(f"Multi-field extractions: {self.multi_field_extractions}")
            if self.context_utilizations > 0:
                print(f"Context utilizations: {self.context_utilizations}")
            
            print(f"Completed forms ready for learning: {len(self.completed_forms)}")
            print(f"{'='*50}")
    
    # Get comprehensive episode summary
    def get_episode_summary(self) -> Dict[str, Any]:
        base_summary = {
            'total_reward': sum(self.episode_rewards),
            'fields_filled': self.fields_filled,
            'fields_correct': self.fields_correct,
            'completion_rate': self.fields_filled / self.n_fields if self.n_fields > 0 else 0,
            'accuracy': self.fields_correct / self.fields_filled if self.fields_filled > 0 else 0,
            'budget_spent': self.budget_spent,
            'latency_spent': self.latency_spent,
            'budget_efficiency': self.fields_correct / self.budget_spent if self.budget_spent > 0 else 0,
            'within_budget': self.budget_spent <= MAX_BUDGET_PER_FORM,
            'within_latency': self.latency_spent <= MAX_LATENCY_PER_FORM,
        }
        
        # Enhanced metrics
        enhanced_metrics = {
            'context_utilizations': self.context_utilizations,
            'multi_field_extractions': self.multi_field_extractions,
            'user_corrections_learned': self.user_corrections_learned,
            'conversation_turns': self.conversation_turns,
            'session_duration': time.time() - self.session_start_time,
            'average_field_criticality': self.calculate_average_criticality(),
            'critical_fields_filled': self.count_critical_fields_filled(),
            'extraction_method_distribution': self.get_extraction_method_stats(),
            'retry_rate': len(self.retry_counts) / self.n_fields if self.n_fields > 0 else 0,
            'completed_forms_for_learning': len(self.completed_forms)
        }
        
        return {**base_summary, **enhanced_metrics}
    
    # Calculate average criticality of filled fields
    def calculate_average_criticality(self) -> float:
        if not self.field_values:
            return 0.0
        
        total_criticality = 0.0
        for field_name in self.field_values:
            # Find field type
            field_type = None
            for field in self.form_fields:
                if field['name'] == field_name:
                    field_type = field['type']
                    break
            
            if field_type:
                total_criticality += FIELD_CRITICALITY.get(field_type, 1.0)
        
        return total_criticality / len(self.field_values)
    
    # Count high-criticality fields that were filled
    def count_critical_fields_filled(self) -> int:
        critical_count = 0
        for field_name in self.field_values:
            # Find field type
            field_type = None
            for field in self.form_fields:
                if field['name'] == field_name:
                    field_type = field['type']
                    break
            
            if field_type and FIELD_CRITICALITY.get(field_type, 1.0) >= 5.0:
                critical_count += 1
        
        return critical_count
    
    # Get statistics on extraction methods used
    def get_extraction_method_stats(self) -> Dict[str, int]:
        method_counts = {}
        for method in self.field_extraction_methods.values():
            method_counts[method] = method_counts.get(method, 0) + 1
        return method_counts


# Alias for backward compatibility
FormFillingEnv = EnhancedFormFillingEnv