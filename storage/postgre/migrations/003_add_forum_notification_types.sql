-- Migration: Add FORUM and FORUM_COMMENT to notification_type ENUM
-- Created: 2024

-- Add new notification types
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'FORUM';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'FORUM_COMMENT';

