-- Migration: Add vehicle column to contact_submissions table
-- Date: 2025-10-31

ALTER TABLE contact_submissions ADD COLUMN vehicle TEXT;
