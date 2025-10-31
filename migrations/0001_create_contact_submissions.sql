-- Migration: Create contact_submissions table
-- Date: 2025-10-31

CREATE TABLE IF NOT EXISTS contact_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  vehicle TEXT,
  service_interest TEXT,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_contact_email ON contact_submissions(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_contact_created_at ON contact_submissions(created_at DESC);
