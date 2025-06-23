# Global constants and hyperparameters for Budget-Aware Document Orchestration

# Tool costs in USD
TOOL_COSTS = {
    'extract_from_document': 0.00005,
    'retrieve_information': 0.0002,
    'ask_user': 0.0003,
    'smart_autofill': 0.00008,
    'skip': 0.0,
    'process_filled_form': 0.0013,
}

# Tool latencies in seconds
TOOL_LATENCIES = {
    'extract_from_document': 3.0,
    'retrieve_information': 1.0,
    'ask_user': 15.0,
    'smart_autofill': 0.5,
    'skip': 0.0,
    'process_filled_form': 5.0,
}

# Budget constraints
MAX_BUDGET_PER_FORM = 0.02
MAX_LATENCY_PER_FORM = 30.0

# Q-learning hyperparameters
LEARNING_RATE = 0.1
DISCOUNT_FACTOR = 0.95
EPSILON_START = 1.0
EPSILON_END = 0.01
EPSILON_DECAY = 0.995
NUM_EPISODES = 5000

# Environment parameters
MAX_FIELDS_PER_FORM = 50
CONFIDENCE_THRESHOLD = 0.8

# Medical field criticality weights
FIELD_CRITICALITY = {
    'medication': 10.0,
    'ssn': 5.0,
    'insurance_id': 5.0,
    'date': 3.0,
    'address': 2.0,
    'phone': 2.0,
    'name': 2.0,
    'email': 1.0,
    'signature': 1.0,
    'checkbox': 1.0,
    'medical_condition': 8.0,
    'other': 1.0,
}

# Reward system
FIELD_BASE_REWARD = 1.0
FIELD_PENALTY = -1.0
LATENCY_PENALTY_FACTOR = 0.01
BUDGET_PENALTY_FACTOR = 10.0

CONTEXT_REWARDS = {
    'multi_field_extraction': 2.0,
    'context_utilization': 0.5,
    'user_correction_learned': 1.0,
    'session_efficiency': 0.3,
    'knowledge_growth': 1.5,
}

ERROR_PENALTIES = {
    'false_negative': -5.0,
    'false_positive': -2.0,
    'incomplete': -1.0,
}

# Tool confidence parameters
TOOL_CONFIDENCES = {
    'extract_from_document': 0.85,
    'retrieve_information': 0.90,
    'ask_user': 0.99,
    'smart_autofill': 0.93,
    'skip': 1.0,
    'process_filled_form': 0.95,
}

# State space discretization
BUDGET_BUCKETS = 5
CONFIDENCE_BUCKETS = 4
LATENCY_BUCKETS = 4
CRITICALITY_BUCKETS = 3
CONTEXT_AVAILABILITY_BUCKETS = 3
DOCUMENT_QUALITY_BUCKETS = 3
USER_ENGAGEMENT_BUCKETS = 3

# Field types
FIELD_TYPES = [
    'name', 'date', 'ssn', 'address', 'phone', 
    'email', 'insurance_id', 'medical_condition',
    'medication', 'signature', 'checkbox', 'other'
]

# Conversation parameters
MAX_CHAT_HISTORY_LENGTH = 1000
CONTEXT_WINDOW_SIZE = 5
USER_CORRECTION_WEIGHT = 2.0

# API configuration
OPENAI_MODEL = "gpt-4.1-nano"
EMBEDDING_MODEL = "text-embedding-3-small"
VECTOR_DB_DIR = "vector_db"
USER_INFO_JSON = "user_info.json"

# Session management
SESSION_TIMEOUT = 300
MAX_RETRY_ATTEMPTS = 3
CONVERSATION_MEMORY_SIZE = 50

# Document processing
INGESTION_BATCH_SIZE = 5
KNOWLEDGE_UPDATE_THRESHOLD = 0.8
LEARNING_REWARD_MULTIPLIER = 1.2

# State space size calculation
ESTIMATED_STATE_SPACE_SIZE = 1555200

# Action space
CORE_ACTIONS = ['extract_from_document', 'retrieve_information', 'ask_user', 'smart_autofill', 'skip']
UTILITY_TOOLS = ['process_filled_form']