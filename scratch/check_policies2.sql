SELECT pol.polname, pol.polcmd, pol.polqual, pol.polwithcheck FROM pg_policy pol JOIN pg_class cl ON pol.polrelid = cl.oid WHERE cl.relname = 'tasks';
