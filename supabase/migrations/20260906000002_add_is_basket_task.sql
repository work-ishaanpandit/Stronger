-- Migration: Add is_basket_task column to public.tasks table
-- Distinguishes long-term Task Basket items from day-specific Dawn Alignment tasks

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_basket_task BOOLEAN DEFAULT FALSE;
