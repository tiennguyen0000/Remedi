from fastapi import APIRouter, HTTPException, status, Depends
from ..models import ForumPost, ForumPostCreate, ForumCommentCreate
from ..database import get_db_connection
from ..auth import get_current_user
from datetime import datetime
from typing import Optional, List
from uuid import uuid4
import time

router = APIRouter()

@router.get("/posts", response_model=list[ForumPost])
async def list_posts():
    """List all forum posts"""
    async with get_db_connection() as conn:
        posts = await conn.fetch(
            """
            SELECT 
                p.id, p.title, p.content, p.images, p.attachments, p.tags, p.views, 
                p.author_id, p.created_at, p.updated_at, u.ho_ten as author_name
            FROM forum_posts p
            LEFT JOIN users u ON p.author_id = u.id
            ORDER BY p.created_at DESC
            """
        )
        
        result = []
        for post in posts:
            # Get comments for this post
            comments = await conn.fetch(
                """
                SELECT 
                    c.id, c.content, c.images, c.author_id, c.created_at,
                    u.ho_ten as author_name
                FROM forum_comments c
                LEFT JOIN users u ON c.author_id = u.id
                WHERE c.post_id = $1 
                ORDER BY c.created_at ASC
                """,
                post['id']
            )
            
            result.append({
                'id': str(post['id']),
                'title': post['title'],
                'content': post['content'],
                'images': post['images'] or [],
                'attachments': post['attachments'] or [],
                'tags': post['tags'] or [],
                'authorId': str(post['author_id']),
                'authorName': post['author_name'] or 'Unknown',
                'views': post['views'],
                'createdAt': post['created_at'],
                'updatedAt': post.get('updated_at'),
                'comments': [
                    {
                        'id': str(c['id']),
                        'content': c['content'],
                        'images': c['images'] or [],
                        'authorId': str(c['author_id']),
                        'authorName': c['author_name'] or 'Unknown',
                        'createdAt': c['created_at']
                    }
                    for c in comments
                ]
            })
        
        return result

@router.get("/posts/{post_id}", response_model=ForumPost)
async def get_post(post_id: str):
    """Get single post with comments"""
    async with get_db_connection() as conn:
        post = await conn.fetchrow(
            """
            SELECT 
                p.id, p.title, p.content, p.images, p.attachments, p.tags, p.views,
                p.author_id, p.created_at, p.updated_at, u.ho_ten as author_name
            FROM forum_posts p
            LEFT JOIN users u ON p.author_id = u.id
            WHERE p.id = $1
            """,
            post_id
        )
        
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        comments = await conn.fetch(
            """
            SELECT 
                c.id, c.content, c.images, c.author_id, c.created_at,
                u.ho_ten as author_name
            FROM forum_comments c
            LEFT JOIN users u ON c.author_id = u.id
            WHERE c.post_id = $1 
            ORDER BY c.created_at ASC
            """,
            post_id
        )
        
        return {
            'id': str(post['id']),
            'title': post['title'],
            'content': post['content'],
            'images': post['images'] or [],
            'attachments': post['attachments'] or [],
            'tags': post['tags'] or [],
            'authorId': str(post['author_id']),
            'authorName': post['author_name'] or 'Unknown',
            'views': post['views'],
            'createdAt': post['created_at'],
            'updatedAt': post.get('updated_at'),
            'comments': [
                {
                    'id': str(c['id']),
                    'content': c['content'],
                    'images': c['images'] or [],
                    'authorId': str(c['author_id']),
                    'authorName': c['author_name'] or 'Unknown',
                    'createdAt': c['created_at']
                }
                for c in comments
            ]
        }

@router.post("/posts", response_model=ForumPost, status_code=status.HTTP_201_CREATED)
async def create_post(
    post: ForumPostCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create new forum post"""
    async with get_db_connection() as conn:
        # Generate UUID
        post_id = str(uuid4())
        
        row = await conn.fetchrow(
            """
            INSERT INTO forum_posts 
            (id, title, content, images, attachments, tags, author_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            """,
            post_id,
            post.title,
            post.content,
            post.images or [],
            post.attachments or [],
            post.tags or [],
            current_user['id'],
            datetime.utcnow()
        )
        
        # Notify all admins about new post
        admins = await conn.fetch(
            "SELECT id FROM users WHERE role = 'ADMIN'"
        )
        
        for admin in admins:
            await conn.execute(
                """
                INSERT INTO thong_bao 
                (id, id_nguoi_gui, id_nguoi_nhan, noi_dung, loai_thong_bao, ngay_tao, da_xem)
                VALUES (gen_random_uuid(), $1, $2, $3, 'FORUM', $4, 0)
                """,
                current_user['id'],
                admin['id'],
                f"Bài viết mới: {post.title}",
                datetime.utcnow()
            )
        
        return {
            'id': str(row['id']),
            'title': row['title'],
            'content': row['content'],
            'images': row['images'] or [],
            'attachments': row['attachments'] or [],
            'tags': row['tags'] or [],
            'authorId': str(current_user['id']),
            'authorName': current_user['ho_ten'],
            'views': 0,
            'createdAt': row['created_at'],
            'comments': []
        }

@router.post("/posts/{post_id}/comments", status_code=status.HTTP_201_CREATED)
async def create_comment(
    post_id: str,
    comment: ForumCommentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add comment to post"""
    async with get_db_connection() as conn:
        # Check if post exists
        post = await conn.fetchrow(
            "SELECT * FROM forum_posts WHERE id = $1",
            post_id
        )
        
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        # Generate UUID
        comment_id = str(uuid4())
        
        row = await conn.fetchrow(
            """
            INSERT INTO forum_comments 
            (id, post_id, content, images, author_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            """,
            comment_id,
            post_id,
            comment.content,
            comment.images or [],
            current_user['id'],
            datetime.utcnow()
        )
        
        # Notify post author if different from commenter
        if post['author_id'] != current_user['id']:
            await conn.execute(
                """
                INSERT INTO thong_bao 
                (id, id_nguoi_gui, id_nguoi_nhan, noi_dung, loai_thong_bao, ngay_tao, da_xem)
                VALUES (gen_random_uuid(), $1, $2, $3, 'FORUM_COMMENT', $4, 0)
                """,
                current_user['id'],
                post['author_id'],
                f"Bài viết của bạn có bình luận mới: {post['title']}",
                datetime.utcnow()
            )
        
        return {
            'id': str(row['id']),
            'content': row['content'],
            'images': row['images'] or [],
            'authorId': str(current_user['id']),
            'authorName': current_user['ho_ten'],
            'createdAt': row['created_at']
        }

@router.put("/posts/{post_id}")
async def update_post(
    post_id: str,
    post: ForumPostCreate,
    current_user: dict = Depends(get_current_user)
):
    """Update forum post (author or admin)"""
    async with get_db_connection() as conn:
        existing = await conn.fetchrow(
            "SELECT * FROM forum_posts WHERE id = $1",
            post_id
        )
        
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        # Allow update if user is author OR admin
        is_author = str(existing['author_id']) == str(current_user['id'])
        is_admin = current_user.get('role') == 'ADMIN'
        
        if not (is_author or is_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        await conn.execute(
            """
            UPDATE forum_posts 
            SET title = $1, content = $2, images = $3, tags = $4, updated_at = $5
            WHERE id = $6
            """,
            post.title,
            post.content,
            post.images or [],
            post.tags or [],
            datetime.utcnow(),
            post_id
        )
        
        # Get updated post
        updated = await conn.fetchrow(
            """
            SELECT 
                p.id, p.title, p.content, p.images, p.attachments, p.tags, p.views,
                p.author_id, p.created_at, p.updated_at, u.ho_ten as author_name
            FROM forum_posts p
            LEFT JOIN users u ON p.author_id = u.id
            WHERE p.id = $1
            """,
            post_id
        )
        
        # Get comments
        comments = await conn.fetch(
            """
            SELECT 
                c.id, c.content, c.images, c.author_id, c.created_at,
                u.ho_ten as author_name
            FROM forum_comments c
            LEFT JOIN users u ON c.author_id = u.id
            WHERE c.post_id = $1 
            ORDER BY c.created_at ASC
            """,
            post_id
        )
        
        return {
            'id': str(updated['id']),
            'title': updated['title'],
            'content': updated['content'],
            'images': updated['images'] or [],
            'attachments': updated['attachments'] or [],
            'tags': updated['tags'] or [],
            'authorId': str(updated['author_id']),
            'authorName': updated['author_name'] or 'Unknown',
            'views': updated['views'],
            'createdAt': updated['created_at'],
            'updatedAt': updated['updated_at'],
            'comments': [
                {
                    'id': str(c['id']),
                    'content': c['content'],
                    'images': c['images'] or [],
                    'authorId': str(c['author_id']),
                    'authorName': c['author_name'] or 'Unknown',
                    'createdAt': c['created_at']
                }
                for c in comments
            ]
        }

@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete forum post (author or admin only)"""
    async with get_db_connection() as conn:
        post = await conn.fetchrow(
            "SELECT * FROM forum_posts WHERE id = $1",
            post_id
        )
        
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        # Allow delete if user is author OR admin
        is_author = str(post['author_id']) == str(current_user['id'])
        is_admin = current_user.get('role') == 'ADMIN'
        
        if not (is_author or is_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        await conn.execute(
            "DELETE FROM forum_posts WHERE id = $1",
            post_id
        )
        
        return {"ok": True}
