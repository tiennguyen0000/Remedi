from typing import List, Dict, Any
import os
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.language_models.chat_models import BaseChatModel


class ChatSupportAgent:
    def __init__(self, llm: BaseChatModel):
        self.llm = llm
        self.knowledge_base = self._load_knowledge_base()
        
        self.system_prompt = """Bạn là trợ lý AI của hệ thống Remedi.

Sử dụng knowledge base để trả lời chính xác về:
- Nộp thuốc
- Điểm thưởng
- Đổi voucher
- Diễn đàn
- Hỗ trợ kỹ thuật
- Các vấn đề cuộc sống

KNOWLEDGE BASE:
{knowledge_base}
"""
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", self.system_prompt),
            ("human", "{question}")
        ])
    
    def _load_knowledge_base(self) -> str:
        knowledge_dir = os.path.join(os.path.dirname(__file__), '../../knowledge')
        knowledge_content = []
        
        if not os.path.exists(knowledge_dir):
            return "No knowledge base."
        
        for filename in sorted(os.listdir(knowledge_dir)):
            if filename.endswith('.txt'):
                filepath = os.path.join(knowledge_dir, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        knowledge_content.append(f"=== {filename} ===\n{content}\n")
                except Exception as e:
                    print(f"Error loading {filename}: {e}")
        
        if knowledge_content:
            full_knowledge = "\n".join(knowledge_content)
            print(f"[KNOWLEDGE] Loaded {len(knowledge_content)} files")
            return full_knowledge
        return "No knowledge files."
    
    def process_message(
        self,
        question: str,
        chat_history: List[Dict] = None,
        user_context: Dict[str, Any] = None
    ) -> str:
        enhanced_question = question
        if user_context:
            ctx = []
            if user_context.get("points"):
                ctx.append(f"Điểm: {user_context['points']}")
            if ctx:
                enhanced_question = f"{question}\n[User: {', '.join(ctx)}]"
        
        chain = self.prompt | self.llm
        response = chain.invoke({
            "question": enhanced_question,
            "knowledge_base": self.knowledge_base[:10000]
        })
        
        if hasattr(response, 'content'):
            return response.content
        return str(response)
