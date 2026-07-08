SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'tasks' AND constraint_type = 'FOREIGN KEY';
