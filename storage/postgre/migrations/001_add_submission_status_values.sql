-- Migration: Add new values to submission_status ENUM
-- Run this if your database already exists

-- Add new values to submission_status enum
ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'returned_to_pharmacy';
ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'recalled';

-- Note: PostgreSQL doesn't support IF NOT EXISTS for ADD VALUE in older versions
-- If you get an error, the values may already exist, which is fine.

