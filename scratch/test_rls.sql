BEGIN;
-- Create dummy user and task
INSERT INTO auth.users (id) VALUES ('00000000-0000-0000-0000-000000000000') ON CONFLICT DO NOTHING;
INSERT INTO tasks (id, user_id, log_date, name, type, original_date) VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', '2026-07-09', 'Test', 'normal', '2026-07-09');

-- Verify insertion
SELECT count(*) as inserted FROM tasks WHERE id = '11111111-1111-1111-1111-111111111111';

-- Set up RLS context
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000000"}';

-- Try to delete
DELETE FROM tasks WHERE id = '11111111-1111-1111-1111-111111111111';

-- Verify
SELECT count(*) as remaining FROM tasks WHERE id = '11111111-1111-1111-1111-111111111111';

ROLLBACK;
