-- Sprint 4: Add tags column to log_entries, assets, and punch_items
-- Run in Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to re-run (uses IF NOT EXISTS pattern via DO block)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'tags'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN tags text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'tags'
  ) THEN
    ALTER TABLE assets ADD COLUMN tags text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'punch_items' AND column_name = 'tags'
  ) THEN
    ALTER TABLE punch_items ADD COLUMN tags text[] DEFAULT '{}';
  END IF;
END $$;
