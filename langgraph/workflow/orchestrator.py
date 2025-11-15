"""
LangGraph Orchestrator for Remedi Chatbot
"""
import os
from typing import Optional
from langgraph.graph import StateGraph, END, START
from langgraph.checkpoint.memory import MemorySaver
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from utils.state import AgentState
from utils.tools import default_tools_mapping
from workflow.agents.chat_support_agent import ChatSupportAgent
from factories.llm_provider import LLMFactory


class ChatbotOrchestrator:
    """Orchestrator for chatbot workflow using LangGraph"""
    
    def __init__(self, checkpointer=None):
        # Initialize LLM - Read from environment variables
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")
        
        config = {
            "model_name": os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
            "api_key": api_key,
            "temperature": 0.7,
            "max_tokens": 1024,
        }
        
        print(f"[ORCHESTRATOR] Initializing with model: {config['model_name']}")
        
        # Use Groq for fast inference (free tier)
        self.llm = LLMFactory.create_llm(LLMFactory.Provider.GROQ, config)
        
        if not self.llm:
            raise ValueError("LLM initialization failed. Check GROQ_API_KEY.")
        
        # Initialize tools
        self.tools = default_tools_mapping()
        
        # Initialize checkpointer for conversation memory
        self.checkpointer = checkpointer or MemorySaver()
        
        # Build graph
        self.graph = None
        self.app = None
    
    def build_graph(self):
        """Build the LangGraph workflow"""
        graph = StateGraph(AgentState)
        
        # Initialize chat agent
        chat_agent = ChatSupportAgent(llm=self.llm)
        
        # Add chat node
        def chat_node(state: AgentState) -> AgentState:
            """Process user message with chat agent"""
            question = state.get("question", "")
            chat_history = state.get("chat_history", [])
            user_context = state.get("user_context", {})
            
            # Get AI response
            response = chat_agent.process_message(
                question=question,
                chat_history=chat_history,
                user_context=user_context
            )
            
            # Update state
            return {
                "response": response,
                "messages": state.get("messages", []) + [
                    {"role": "user", "content": question},
                    {"role": "assistant", "content": response}
                ],
                "exit_graph": True
            }
        
        graph.add_node("chat", chat_node)
        
        # Add edges
        graph.add_edge(START, "chat")
        graph.add_edge("chat", END)
        
        self.graph = graph
        self.app = graph.compile(checkpointer=self.checkpointer)
        
        return self.app
    
    def invoke(
        self, 
        question: str, 
        user_id: Optional[str] = None,
        session_id: str = "default",
        chat_history: list = None
    ) -> str:
        """
        Invoke chatbot with a question
        
        Args:
            question: User's question
            user_id: User ID for context
            session_id: Session ID for conversation memory
            chat_history: Previous chat messages
        
        Returns:
            AI response string
        """
        if not self.app:
            self.build_graph()
        
        # Build user context if user_id provided
        user_context = {}
        if user_id:
            try:
                user_info = self.tools["get_user_info"](user_id)
                submissions = self.tools["get_user_submissions"](user_id)
                user_context = {
                    "points": user_info.get("diem_tich_luy", 0),
                    "role": user_info.get("role", "USER"),
                    "submissions_count": submissions.get("total", 0),
                }
            except Exception as e:
                print(f"Error building user context: {e}")
        
        # Prepare initial state
        initial_state = {
            "question": question,
            "user_id": user_id,
            "user_context": user_context,
            "chat_history": chat_history or [],
            "messages": [],
        }
        
        # Invoke graph with session config
        config = {"configurable": {"thread_id": session_id}}
        result = self.app.invoke(initial_state, config=config)
        
        return result.get("response", "Xin lỗi, tôi không thể trả lời câu hỏi này.")

