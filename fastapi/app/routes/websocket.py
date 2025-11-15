"""WebSocket routes for real-time chat"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict, Set
from uuid import UUID
import json
from datetime import datetime

from ..database import get_db_connection
from ..jwt_auth import decode_token

router = APIRouter()

# Store active connections: user_id -> Set of WebSocket connections
active_connections: Dict[str, Set[WebSocket]] = {}


class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Connect a user"""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        print(f"[WS] User {user_id} connected. Total connections: {len(self.active_connections[user_id])}")
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        """Disconnect a user"""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        print(f"[WS] User {user_id} disconnected")
    
    async def send_personal_message(self, message: dict, user_id: str):
        """Send message to a specific user (all their connections)"""
        if user_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"[WS] Error sending to {user_id}: {e}")
                    disconnected.add(connection)
            
            # Clean up disconnected connections
            for conn in disconnected:
                self.active_connections[user_id].discard(conn)
    
    async def send_to_admins(self, message: dict):
        """Send message to all admin users"""
        async with get_db_connection() as conn:
            admin_rows = await conn.fetch(
                "SELECT id FROM users WHERE role = 'ADMIN'"
            )
            admin_ids = [str(row['id']) for row in admin_rows]
        
        for admin_id in admin_ids:
            await self.send_personal_message(message, admin_id)
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected users"""
        disconnected = []
        for user_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.append((user_id, connection))
        
        # Clean up disconnected
        for user_id, conn in disconnected:
            self.disconnect(conn, user_id)


manager = ConnectionManager()


@router.websocket("/ws/chat")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    """WebSocket endpoint for chat"""
    try:
        # Verify JWT token
        payload = decode_token(token)
        user_id = payload.get("sub")
        
        if not user_id or payload.get("type") != "access":
            await websocket.close(code=1008, reason="Invalid token")
            return
        
        # Get user info
        async with get_db_connection() as conn:
            user = await conn.fetchrow(
                "SELECT id, ho_ten, role FROM users WHERE id = $1",
                user_id
            )
            
            if not user:
                await websocket.close(code=1008, reason="User not found")
                return
        
        # Connect user
        await manager.connect(websocket, user_id)
        
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to chat server",
            "user_id": user_id
        })
        
        # Listen for messages
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            message_type = message_data.get("type")
            
            if message_type == "chat_message":
                # Handle chat message
                await handle_chat_message(message_data, user_id, user)
            
            elif message_type == "chatbot_message":
                # Handle chatbot message
                await handle_chatbot_message(message_data, user_id, user)
            
            elif message_type == "typing":
                # Handle typing indicator
                recipient_id = message_data.get("recipient_id")
                if recipient_id:
                    await manager.send_personal_message({
                        "type": "typing",
                        "user_id": user_id,
                        "user_name": user['ho_ten']
                    }, recipient_id)
            
            elif message_type == "mark_read":
                # Mark messages as read
                await handle_mark_read(message_data, user_id)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        print(f"[WS] User {user_id} disconnected normally")
    
    except Exception as e:
        print(f"[WS] Error in websocket: {e}")
        import traceback
        traceback.print_exc()
        manager.disconnect(websocket, user_id)


async def handle_chat_message(message_data: dict, sender_id: str, sender):
    """Handle regular chat message"""
    from uuid import uuid4
    from ..routes.chat import _fetch_admin_ids, _get_or_create_conversation_id
    
    content = message_data.get("content", "").strip()
    recipient_id = message_data.get("recipient_id")
    
    if not content:
        return
    
    async with get_db_connection() as conn:
        now = datetime.utcnow()
        
        # If sender is admin and has recipient_id
        if sender['role'] == 'ADMIN' and recipient_id:
            # Admin sending to specific user
            conversation_id = await _get_or_create_conversation_id(
                conn, UUID(sender_id), UUID(recipient_id)
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
                UUID(sender_id),
                UUID(recipient_id),
                content,
                conversation_id,
                now,
            )
            
            # Create message_detail for recipient
            await conn.execute(
                """
                INSERT INTO message_detail (message_id, user_id, is_read, is_delivered)
                VALUES ($1, $2, false, true)
                ON CONFLICT (message_id, user_id) DO NOTHING
                """,
                msg_row["id"],
                UUID(recipient_id),
            )
            
            # Send to recipient via WebSocket
            await manager.send_personal_message({
                "type": "new_message",
                "message": {
                    "id": str(msg_row["id"]),
                    "sender_id": str(msg_row["sender_id"]),
                    "recipient_id": str(msg_row["recipient_id"]),
                    "content": msg_row["content"],
                    "message_type": msg_row["message_type"],
                    "conversation_id": str(msg_row["conversation_id"]) if msg_row["conversation_id"] else None,
                    "created_at": msg_row["created_at"].isoformat(),
                    "sender_name": sender['ho_ten'],
                    "sender_role": sender['role'],
                }
            }, recipient_id)
            
            # Echo back to sender
            await manager.send_personal_message({
                "type": "message_sent",
                "message": {
                    "id": str(msg_row["id"]),
                    "sender_id": str(msg_row["sender_id"]),
                    "recipient_id": str(msg_row["recipient_id"]),
                    "content": msg_row["content"],
                    "message_type": msg_row["message_type"],
                    "conversation_id": str(msg_row["conversation_id"]) if msg_row["conversation_id"] else None,
                    "created_at": msg_row["created_at"].isoformat(),
                    "sender_name": sender['ho_ten'],
                    "sender_role": sender['role'],
                }
            }, sender_id)
        
        else:
            # Regular user sending to admin(s)
            admin_ids = await _fetch_admin_ids(conn)
            
            for admin_id in admin_ids:
                conversation_id = await _get_or_create_conversation_id(
                    conn, UUID(sender_id), admin_id
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
                    UUID(sender_id),
                    admin_id,
                    content,
                    conversation_id,
                    now,
                )
                
                # Create message_detail for admin
                await conn.execute(
                    """
                    INSERT INTO message_detail (message_id, user_id, is_read, is_delivered)
                    VALUES ($1, $2, false, true)
                    ON CONFLICT (message_id, user_id) DO NOTHING
                    """,
                    msg_row["id"],
                    admin_id,
                )
                
                # Send to admin via WebSocket
                await manager.send_personal_message({
                    "type": "new_message",
                    "message": {
                        "id": str(msg_row["id"]),
                        "sender_id": str(msg_row["sender_id"]),
                        "recipient_id": str(msg_row["recipient_id"]),
                        "content": msg_row["content"],
                        "message_type": msg_row["message_type"],
                        "conversation_id": str(msg_row["conversation_id"]) if msg_row["conversation_id"] else None,
                        "created_at": msg_row["created_at"].isoformat(),
                        "sender_name": sender['ho_ten'],
                        "sender_role": sender['role'],
                    }
                }, str(admin_id))
            
            # Echo back to sender
            await manager.send_personal_message({
                "type": "message_sent",
                "message": {
                    "id": str(msg_row["id"]),
                    "sender_id": str(msg_row["sender_id"]),
                    "recipient_id": str(msg_row["recipient_id"]),
                    "content": msg_row["content"],
                    "message_type": msg_row["message_type"],
                    "conversation_id": str(msg_row["conversation_id"]) if msg_row["conversation_id"] else None,
                    "created_at": msg_row["created_at"].isoformat(),
                    "sender_name": sender['ho_ten'],
                    "sender_role": sender['role'],
                }
            }, sender_id)


async def handle_chatbot_message(message_data: dict, user_id: str, user):
    """Handle chatbot message"""
    from uuid import uuid4
    import httpx
    import os
    
    content = message_data.get("content", "").strip()
    if not content:
        return
    
    LANGGRAPH_URL = os.getenv("LANGGRAPH_URL", "http://langgraph:8000")
    
    async with get_db_connection() as conn:
        now = datetime.utcnow()
        
        # Save user message
        user_msg_row = await conn.fetchrow(
            """
            INSERT INTO message 
            (id, sender_id, content, message_type, created_at)
            VALUES ($1, $2, $3, 'chatbot', $4)
            RETURNING id, sender_id, content, message_type, created_at
            """,
            uuid4(),
            UUID(user_id),
            content,
            now,
        )
        
        # Call LangGraph
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{LANGGRAPH_URL}/invoke",
                    json={
                        "user_id": user_id,
                        "user_name": user['ho_ten'],
                        "message": content,
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                bot_response_data = response.json()
                bot_text = bot_response_data.get("response", "Xin lỗi, tôi không thể trả lời lúc này.")
        except Exception as e:
            print(f"[WS] Error calling LangGraph: {e}")
            bot_text = "Xin lỗi, dịch vụ chatbot tạm thời không khả dụng."
        
        # Save bot response
        bot_msg_row = await conn.fetchrow(
            """
            INSERT INTO message 
            (id, sender_id, content, message_type, created_at)
            VALUES ($1, $2, $3, 'chatbot', $4)
            RETURNING id, sender_id, content, message_type, created_at
            """,
            uuid4(),
            UUID(user_id),
            f"[BOT] {bot_text}",
            datetime.utcnow(),
        )
        
        # Send both messages to user
        await manager.send_personal_message({
            "type": "chatbot_response",
            "user_message": {
                "id": str(user_msg_row["id"]),
                "sender_id": str(user_msg_row["sender_id"]),
                "content": user_msg_row["content"],
                "message_type": "chatbot",
                "created_at": user_msg_row["created_at"].isoformat(),
                "isBot": False,
            },
            "bot_message": {
                "id": str(bot_msg_row["id"]),
                "sender_id": str(bot_msg_row["sender_id"]),
                "content": bot_text,
                "message_type": "chatbot",
                "created_at": bot_msg_row["created_at"].isoformat(),
                "isBot": True,
            }
        }, user_id)


async def handle_mark_read(message_data: dict, user_id: str):
    """Mark messages as read"""
    message_ids = message_data.get("message_ids", [])
    
    if not message_ids:
        return
    
    async with get_db_connection() as conn:
        await conn.execute(
            """
            UPDATE message_detail 
            SET is_read = true, read_at = NOW()
            WHERE message_id = ANY($1::uuid[]) AND user_id = $2
            """,
            message_ids,
            UUID(user_id)
        )

