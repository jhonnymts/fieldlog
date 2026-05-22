-- Migration: add contracted_days to projects
-- Run once in Supabase Dashboard → SQL Editor → New Query → Run
alter table projects
  add column if not exists contracted_days integer;
