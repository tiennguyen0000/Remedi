from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4
import httpx
import os

from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import get_current_user
from ..database import get_db_connection
from ..models import ChatMessage, ChatMessageCreate

router = APIRouter()

LANGGRAPH_URL = os.getenv("LANGGRAPH_URL", "http://langgraph:8001")


async def _call_langgraph_chatbot(message: str, user_id: str, session_id: str, chat_history: list = None) -> str:
    """Call LangGraph chatbot service"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{LANGGRAPH_URL}/chat",
                json={
                    "message": message,
                    "user_id": user_id,
                    "session_id": session_id,
                    "chat_history": chat_history or []
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("response", "Xin lỗi, tôi không thể trả lời lúc này.")
            else:
                print(f"[CHATBOT] LangGraph error: {response.status_code}")
                return "Xin lỗi, chatbot đang bận. Vui lòng thử lại sau."
    
    except httpx.TimeoutException:
        print("[CHATBOT] LangGraph timeout")
        return "Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại."
    except Exception as e:
        print(f"[CHATBOT] Error calling LangGraph: {e}")
        return "Đã xảy ra lỗi khi kết nối với chatbot. Vui lòng thử lại."



async def _fetch_admin_ids(conn) -> List[UUID]:
    """Get all admin and CTV IDs"""
    admin_rows = await conn.fetch(
        "SELECT id FROM users WHERE role IN ('ADMIN', 'CONGTACVIEN')"
    )
    return [row["id"] for row in admin_rows]


async def _get_or_create_conversation_id(
    conn, sender_id: UUID, recipient_id: Optional[UUID]
) -> UUID:
    """Get or create conversation ID for two users"""
    if not recipient_id:
        # For chatbot, use sender_id as conversation_id
        return sender_id
    
    # Find existing conversation
    row = await conn.fetchrow(
        """
        SELECT conversation_id 
        FROM message 
        WHERE (
            (sender_id = $1 AND recipient_id = $2) 
            OR (sender_id = $2 AND recipient_id = $1)
        )
        AND conversation_id IS NOT NULL
        LIMIT 1
        """,
        sender_id,
        recipient_id,
    )
    
    if row and row["conversation_id"]:
        return row["conversation_id"]
    
    # Create new conversation ID
    return uuid4()


@router.get("/messages", response_model=list[ChatMessage])
async def list_messages(
    user_id: Optional[UUID] = Query(None),
    conversation_type: Optional[str] = Query(None),  # 'admin' or 'chatbot'
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieve chat messages.
    - User: Get messages with admin (conversation_type='admin') or chatbot (conversation_type='chatbot')
    - Admin: Must provide user_id to get messages with specific user
    """
    try:
        async with get_db_connection() as conn:
            if current_user["role"] == "ADMIN":
                # Admin: Must provide user_id for user chat, or use conversation_type for admin/chatbot
                if user_id:
                    # Chat with specific user
                    rows = await conn.fetch(
                        """
                        SELECT m.id,
                               m.sender_id,
                               m.recipient_id,
                               m.content,
                               m.message_type,
                               m.conversation_id,
                               m.created_at,
                               sender.ho_ten AS sender_name,
                               sender.role AS sender_role,
                               recipient.ho_ten AS recipient_name,
                               COALESCE(md.is_read, false) AS is_read
                        FROM message m
                        LEFT JOIN users sender ON sender.id = m.sender_id
                        LEFT JOIN users recipient ON recipient.id = m.recipient_id
                        LEFT JOIN message_detail md ON md.message_id = m.id AND md.user_id = $1
                        WHERE m.message_type = 'user_chat'
                          AND (
                            (m.sender_id = $1 AND m.recipient_id = $2)
                            OR (m.sender_id = $2 AND m.recipient_id = $1)
                          )
                        ORDER BY m.created_at ASC
                        """,
                        current_user["id"],
                        user_id,
                    )
                elif conversation_type == "chatbot":
                    # Admin chatbot conversation
                    rows = await conn.fetch(
                        """
                        SELECT m.id,
                               m.sender_id,
                               m.recipient_id,
                               m.content,
                               m.message_type,
                               m.conversation_id,
                               m.created_at,
                               sender.ho_ten AS sender_name,
                               sender.role AS sender_role,
                               NULL AS recipient_name,
                               COALESCE(md.is_read, false) AS is_read
                        FROM message m
                        LEFT JOIN users sender ON sender.id = m.sender_id
                        LEFT JOIN message_detail md ON md.message_id = m.id AND md.user_id = $1
                        WHERE m.message_type = 'chatbot'
                          AND m.sender_id = $1
                        ORDER BY m.created_at ASC
                        """,
                        current_user["id"],
                    )
                else:
                    raise HTTPException(
                        status_code=400,
                        detail="user_id or conversation_type='chatbot' is required for admin",
                    )
            else:
                # Regular user or CTV
                if conversation_type == "chatbot":
                    # Chatbot conversation
                    rows = await conn.fetch(
                        """
                        SELECT m.id,
                               m.sender_id,
                               m.recipient_id,
                               m.content,
                               m.message_type,
                               m.conversation_id,
                               m.created_at,
                               sender.ho_ten AS sender_name,
                               sender.role AS sender_role,
                               NULL AS recipient_name,
                               COALESCE(md.is_read, false) AS is_read
                        FROM message m
                        LEFT JOIN users sender ON sender.id = m.sender_id
                        LEFT JOIN message_detail md ON md.message_id = m.id AND md.user_id = $1
                        WHERE m.message_type = 'chatbot'
                          AND m.sender_id = $1
                        ORDER BY m.created_at ASC
                        """,
                        current_user["id"],
                    )
                else:
                    # Chat with admin (default)
                    admin_ids = await _fetch_admin_ids(conn)
                    if not admin_ids:
                        return []

                    rows = await conn.fetch(
                        """
                        SELECT m.id,
                               m.sender_id,
                               m.recipient_id,
                               m.content,
                               m.message_type,
                               m.conversation_id,
                               m.created_at,
                               sender.ho_ten AS sender_name,
                               sender.role AS sender_role,
                               recipient.ho_ten AS recipient_name,
                               COALESCE(md.is_read, false) AS is_read
                        FROM message m
                        LEFT JOIN users sender ON sender.id = m.sender_id
                        LEFT JOIN users recipient ON recipient.id = m.recipient_id
                        LEFT JOIN message_detail md ON md.message_id = m.id AND md.user_id = $1
                        WHERE m.message_type = 'user_chat'
                          AND (
                            (m.sender_id = $1 AND m.recipient_id = ANY($2::uuid[]))
                            OR (m.recipient_id = $1 AND m.sender_id = ANY($2::uuid[]))
                          )
                        ORDER BY m.created_at ASC
                        """,
                        current_user["id"],
                        admin_ids,
                    )

            return [
                ChatMessage(
                    id=row["id"],
                    sender_id=row["sender_id"],
                    recipient_id=row["recipient_id"],
                    content=row["content"],
                    message_type=row["message_type"],
                    conversation_id=row["conversation_id"],
                    created_at=row["created_at"],
                    sender_name=row["sender_name"],
                    sender_role=row["sender_role"],
                    recipient_name=row["recipient_name"],
                    is_read=row["is_read"],
                )
                for row in rows
            ]
    except Exception as e:
        print(f"[CHAT] Error in list_messages: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error loading messages: {str(e)}"
        )


@router.post("/messages")
async def create_message(
    payload: ChatMessageCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a chat message."""
    content = (payload.content or "").strip()
    if not content:
        raise HTTPException(
            status_code=400, detail="Nội dung tin nhắn không được để trống"
        )

    async with get_db_connection() as conn:
        now = datetime.utcnow()
        created_messages = []

        if current_user["role"] == "ADMIN":
            if payload.user_id:
                # Admin sending to specific user
                user = await conn.fetchrow(
                    "SELECT id, ho_ten FROM users WHERE id = $1", payload.user_id
                )
                if not user:
                    raise HTTPException(
                        status_code=404, detail="Không tìm thấy người dùng"
                    )

                conversation_id = await _get_or_create_conversation_id(
                    conn, current_user["id"], user["id"]
                )

                # Insert message
                msg_row = await conn.fetchrow(
                    """
                    INSERT INTO message 
                    (id, sender_id, recipient_id, content, message_type, conversation_id, created_at)
                    VALUES ($1, $2, $3, $4, 'user_chat', $5, $6)
                    RETURNING id, sender_id, recipient_id, content, message_type, conversation_id, created_at
                    """,
                    uuid4(),
                    current_user["id"],
                    user["id"],
                    content,
                    conversation_id,
                    now,
                )

                # Create message_detail for recipient
                await conn.execute(
                    """
                    INSERT INTO message_detail (message_id, user_id, is_read, is_delivered)
                    VALUES ($1, $2, false, true)
                    ON CONFLICT (message_id, user_id) DO UPDATE
                    SET is_delivered = true, delivered_at = CURRENT_TIMESTAMP
                    """,
                    msg_row["id"],
                    user["id"],
                )

                created_messages.append(msg_row)
            else:
                raise HTTPException(
                    status_code=400,
                    detail="user_id is required when admin sends message",
                )
        else:
            # Regular user or CTV sending to admin
            admin_ids = await _fetch_admin_ids(conn)
            if not admin_ids:
                raise HTTPException(
                    status_code=503,
                    detail="Hiện chưa có quản trị viên khả dụng. Vui lòng thử lại sau.",
                )

            for admin_id in admin_ids:
                conversation_id = await _get_or_create_conversation_id(
                    conn, current_user["id"], admin_id
                )

                # Insert message
                msg_row = await conn.fetchrow(
                    """
                    INSERT INTO message 
                    (id, sender_id, recipient_id, content, message_type, conversation_id, created_at)
                    VALUES ($1, $2, $3, $4, 'user_chat', $5, $6)
                    RETURNING id, sender_id, recipient_id, content, message_type, conversation_id, created_at
                    """,
                    uuid4(),
                    current_user["id"],
                    admin_id,
                    content,
                    conversation_id,
                    now,
                )

                # Create message_detail for recipient
                await conn.execute(
                    """
                    INSERT INTO message_detail (message_id, user_id, is_read, is_delivered)
                    VALUES ($1, $2, false, true)
                    ON CONFLICT (message_id, user_id) DO UPDATE
                    SET is_delivered = true, delivered_at = CURRENT_TIMESTAMP
                    """,
                    msg_row["id"],
                    admin_id,
                )

                created_messages.append(msg_row)

        return {
            "ok": True,
            "messages": [
                {
                    "id": str(msg["id"]),
                    "sender_id": str(msg["sender_id"]),
                    "recipient_id": str(msg["recipient_id"]) if msg["recipient_id"] else None,
                    "content": msg["content"],
                    "message_type": msg["message_type"],
                    "conversation_id": str(msg["conversation_id"]) if msg["conversation_id"] else None,
                    "created_at": msg["created_at"].isoformat(),
                }
                for msg in created_messages
            ],
        }


@router.get("/conversations")
async def get_conversations(
    current_user: dict = Depends(get_current_user),
):
    """
    Get list of conversations for current user.
    - Admin: Returns list of users they've chatted with + chatbot
    - User/CTV: Returns admin and chatbot conversations
    """
    async with get_db_connection() as conn:
        if current_user["role"] == "ADMIN":
            # Get unique users admin has chatted with
            rows = await conn.fetch(
                """
                SELECT DISTINCT 
                    CASE 
                        WHEN m.sender_id = $1 THEN m.recipient_id
                        ELSE m.sender_id
                    END AS user_id,
                    u.ho_ten,
                    u.email,
                    u.so_dien_thoai,
                    MAX(m.created_at) AS last_message_at
                FROM message m
                JOIN users u ON (
                    CASE 
                        WHEN m.sender_id = $1 THEN u.id = m.recipient_id
                        ELSE u.id = m.sender_id
                    END
                )
                WHERE m.message_type = 'user_chat'
                  AND (m.sender_id = $1 OR m.recipient_id = $1)
                  AND u.role != 'ADMIN'
                GROUP BY user_id, u.ho_ten, u.email, u.so_dien_thoai
                ORDER BY last_message_at DESC
                """,
                current_user["id"],
            )

            conversations = [
                {
                    "id": str(row["user_id"]),
                    "name": row["ho_ten"],
                    "type": "user",
                    "userId": str(row["user_id"]),
                    "lastMessageTime": row["last_message_at"].isoformat() if row["last_message_at"] else None,
                }
                for row in rows
            ]

            # Always include chatbot
            conversations.insert(0, {
                "id": "chatbot",
                "name": "AI Chatbot",
                "type": "chatbot",
            })

            return conversations
        else:
            # User/CTV: Always return admin and chatbot
            return [
                {
                    "id": "admin",
                    "name": "Quản trị viên",
                    "type": "admin",
                },
                {
                    "id": "chatbot",
                    "name": "AI Chatbot",
                    "type": "chatbot",
                },
            ]


@router.get("/chatbot", response_model=list[dict])
async def get_chatbot_messages(
    current_user: dict = Depends(get_current_user),
):
    """Get chatbot conversation history"""
    async with get_db_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT m.id,
                   m.sender_id,
                   m.content,
                   m.created_at,
                   sender.ho_ten AS sender_name
            FROM message m
            LEFT JOIN users sender ON sender.id = m.sender_id
            WHERE m.message_type = 'chatbot'
              AND m.sender_id = $1
            ORDER BY m.created_at ASC
            """,
            current_user["id"],
        )

        return [
            {
                "id": str(row["id"]),
                "sender_id": str(row["sender_id"]),
                "content": row["content"],
                "created_at": row["created_at"].isoformat(),
                "sender_name": row["sender_name"],
            }
            for row in rows
        ]


@router.post("/chatbot")
async def send_chatbot_message(
    payload: ChatMessageCreate,
    current_user: dict = Depends(get_current_user),
):
    """Send message to AI chatbot via LangGraph"""
    content = (payload.content or "").strip()
    if not content:
        raise HTTPException(
            status_code=400, detail="Nội dung tin nhắn không được để trống"
        )

    async with get_db_connection() as conn:
        # Save user message
        conversation_id = current_user["id"]  # Use user_id as conversation_id for chatbot
        session_id = f"user_{current_user['id']}"
        
        user_msg = await conn.fetchrow(
            """
            INSERT INTO message 
            (id, sender_id, recipient_id, content, message_type, conversation_id, created_at)
            VALUES ($1, $2, NULL, $3, 'chatbot', $4, $5)
            RETURNING id, sender_id, content, created_at
            """,
            uuid4(),
            current_user["id"],
            content,
            conversation_id,
            datetime.utcnow(),
        )

        # Get recent chat history (last 10 messages)
        history_rows = await conn.fetch(
            """
            SELECT sender_id, content, created_at
            FROM message
            WHERE message_type = 'chatbot' AND conversation_id = $1
            ORDER BY created_at DESC
            LIMIT 10
            """,
            conversation_id
        )
        
        chat_history = []
        for row in reversed(history_rows):
            is_user = str(row["sender_id"]) == str(current_user["id"])
            content_text = row["content"]
            
            # Remove [BOT] prefix if exists
            if content_text.startswith("[BOT] "):
                content_text = content_text[6:]
                role = "assistant"
            else:
                role = "user" if is_user else "assistant"
            
            chat_history.append({
                "role": role,
                "content": content_text
            })

        # Call LangGraph chatbot service
        bot_response_text = await _call_langgraph_chatbot(
            message=content,
            user_id=str(current_user["id"]),
            session_id=session_id,
            chat_history=chat_history
        )

        # Save bot response
        bot_msg = await conn.fetchrow(
            """
            INSERT INTO message 
            (id, sender_id, recipient_id, content, message_type, conversation_id, created_at)
            VALUES ($1, $2, NULL, $3, 'chatbot', $4, $5)
            RETURNING id, sender_id, content, created_at
            """,
            uuid4(),
            current_user["id"],  # Same sender_id to group in same conversation
            f"[BOT] {bot_response_text}",
            conversation_id,
            datetime.utcnow(),
        )

        return {
            "ok": True,
            "user_message": {
                "id": str(user_msg["id"]),
                "content": user_msg["content"],
                "created_at": user_msg["created_at"].isoformat(),
            },
            "bot_response": {
                "id": str(bot_msg["id"]),
                "content": bot_msg["content"],
                "created_at": bot_msg["created_at"].isoformat(),
            },
        }


@router.post("/messages/{message_id}/read")
async def mark_message_read(
    message_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """Mark a message as read"""
    async with get_db_connection() as conn:
        await conn.execute(
            """
            INSERT INTO message_detail (message_id, user_id, is_read, read_at)
            VALUES ($1, $2, true, CURRENT_TIMESTAMP)
            ON CONFLICT (message_id, user_id) DO UPDATE
            SET is_read = true, read_at = CURRENT_TIMESTAMP
            """,
            message_id,
            current_user["id"],
        )
        return {"ok": True}
