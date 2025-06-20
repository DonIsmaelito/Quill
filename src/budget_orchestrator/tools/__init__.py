# Core tools for medical form filling

import os
import sys
from typing import Dict, Any

# Add current directory to path for imports
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, current_dir)

# Import core tool implementations
from .document_extraction_tool import DocumentExtractionTool, DocumentExtractionToolStub
from .information_retrieval_tool import InformationRetrievalTool, InformationRetrievalToolStub
from .ask_user_tool import AskUserTool, AskUserToolStub
from .smart_autofill_tool import SmartAutoFillTool, SmartAutoFillToolStub

# Core 5 actions for medical form filling (updated with smart autofill)
CORE_ACTIONS = [
    'extract_from_document',
    'retrieve_information', 
    'ask_user',
    'smart_autofill',
    'skip'
]

# Tool registry for the 5 core actions (updated with smart autofill)
TOOL_REGISTRY = {
    'extract_from_document': {
        'real': DocumentExtractionTool,
        'stub': DocumentExtractionToolStub,
        'description': 'Extract field values from form images using OCR and pattern matching'
    },
    'retrieve_information': {
        'real': InformationRetrievalTool,
        'stub': InformationRetrievalToolStub,
        'description': 'Retrieve information from user context and chat history'
    },
    'ask_user': {
        'real': AskUserTool,
        'stub': AskUserToolStub,
        'description': 'Ask user for missing information with context-aware questions'
    },
    'smart_autofill': {
        'real': SmartAutoFillTool,
        'stub': SmartAutoFillToolStub,
        'description': 'Intelligently complete form fields with validation and multi-field capabilities'
    }
    # Note: 'skip' is handled directly in the environment, not as a tool
}

# Get a tool instance by name
def get_tool(tool_name: str, use_stub: bool = False, **kwargs) -> Any:
    if tool_name == 'skip':
        # Skip is handled in the environment, not a tool instance
        return None
        
    if tool_name not in TOOL_REGISTRY:
        raise ValueError(f"Unknown tool: {tool_name}. Available tools: {list(TOOL_REGISTRY.keys())}")
    
    tool_info = TOOL_REGISTRY[tool_name]
    tool_class = tool_info['stub'] if use_stub else tool_info['real']
    
    return tool_class(**kwargs)

# Get core action tools for form filling episodes
def get_core_tools(use_stub: bool = False, **kwargs) -> Dict[str, Any]:
    tools = {}
    for name in TOOL_REGISTRY.keys():
        tools[name] = get_tool(name, use_stub, **kwargs)
    return tools

# Get list of core action names for environment action space
def get_core_action_names() -> list:
    return CORE_ACTIONS

# Simple tool context for conversation awareness
class ToolContext:
    # Initialize tool context with user data and conversation history
    def __init__(self, chat_history=None, user_info=None, session_context=None, vector_db_path=None):
        self.chat_history = chat_history or []
        self.user_info = user_info or {}
        self.session_context = session_context or {}
        self.vector_db_path = vector_db_path
    
    # Update chat history with new conversation exchange
    def update_chat_history(self, user_message: str, assistant_response: str):
        import time
        timestamp = int(time.time())
        
        self.chat_history.append({
            'type': 'user',
            'content': user_message,
            'timestamp': timestamp
        })
        self.chat_history.append({
            'type': 'assistant', 
            'content': assistant_response,
            'timestamp': timestamp + 1
        })
        
        # Keep only recent history (last 50 exchanges)
        if len(self.chat_history) > 50:
            self.chat_history = self.chat_history[-50:]
    
    # Get recent conversation context for tool use
    def get_recent_context(self, window_size: int = 10):
        return self.chat_history[-window_size*2:] if self.chat_history else []

# Create tools with shared context for conversation awareness
def create_context_aware_tools(tool_context: ToolContext, use_stub: bool = False, 
                             tools_category: str = 'core') -> Dict[str, Any]:
    tools = {}
    
    # Only core tools are supported now
    for tool_name in TOOL_REGISTRY.keys():
        if tool_name == 'ask_user':
            tools[tool_name] = get_tool(
                tool_name, 
                use_stub, 
                context=tool_context
            )
        elif tool_name == 'retrieve_information':
            tools[tool_name] = get_tool(
                tool_name,
                use_stub,
                context=tool_context,
                user_info=tool_context.user_info
            )
        else:
            tools[tool_name] = get_tool(tool_name, use_stub, context=tool_context)
    
    return tools

# Simple knowledge base manager for basic learning functionality
class KnowledgeBaseManager:
    # Initialize with tool context
    def __init__(self, tool_context: ToolContext):
        self.tool_context = tool_context
        self.completed_forms = []
    
    # Record a completed form for learning
    def record_completed_form(self, form_data: Dict[str, Any]):
        self.completed_forms.append(form_data)
    
    # Get basic statistics about completed forms
    def get_stats(self) -> Dict[str, Any]:
        if not self.completed_forms:
            return {'total_forms': 0}
        
        return {
            'total_forms': len(self.completed_forms),
            'avg_completion_rate': sum(f.get('completion_rate', 0) for f in self.completed_forms) / len(self.completed_forms),
            'total_fields_filled': sum(len(f.get('field_values', {})) for f in self.completed_forms)
        }

# Export commonly used classes and functions
__all__ = [
    'DocumentExtractionTool', 'DocumentExtractionToolStub',
    'InformationRetrievalTool', 'InformationRetrievalToolStub', 
    'AskUserTool', 'AskUserToolStub',
    'SmartAutoFillTool', 'SmartAutoFillToolStub',
    'get_tool', 'get_core_tools', 'get_core_action_names',
    'ToolContext', 'create_context_aware_tools', 'KnowledgeBaseManager',
    'TOOL_REGISTRY'
]
