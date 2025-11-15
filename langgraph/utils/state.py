from typing import TypedDict, List, Dict, Any, Optional


class AgentState(TypedDict, total=False):
    """State for LangGraph agents"""
    # Chat-related
    message: Optional[str]
    messages: Optional[List[Dict[str, Any]]]
    question: Optional[str]
    response: Optional[str]
    chat_history: Optional[List[Dict[str, str]]]
    
    # User context
    user_id: Optional[str]
    user_context: Optional[Dict[str, Any]]
    
    # Control flow
    next_agent: Optional[str]
    exit_graph: Optional[bool]
    
    # Legacy fields (for compatibility)
    jd: Optional[Any]
    learningProgress: Optional[Any]

