-- Migration: Add amount_received to earnings table
-- Feature: Pending Remuneration Tile (Phase 2, F2.1)
--
-- Adds a column to track the actual amount received when a user settles up,
-- which may differ from the calculated R_calc.

-- Add amount_received column if it doesn't exist
ALTER TABLE public.earnings
  ADD COLUMN IF NOT EXISTS amount_received NUMERIC DEFAULT 0;

-- Ensure claimed is false by default if it wasn't already (usually is)
ALTER TABLE public.earnings
  ALTER COLUMN claimed SET DEFAULT false;
