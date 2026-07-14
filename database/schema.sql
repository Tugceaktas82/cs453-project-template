CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,               -- auto-incrementing id, unique for each task
    title TEXT NOT NULL,                 -- required, can't be empty
    description TEXT,                    -- optional, can be null
    status TEXT NOT NULL DEFAULT 'todo', -- defaults to 'todo' if not provided
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- set once when row is created
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()  -- gets refreshed by the trigger below
);

-- function that just sets updated_at to the current time
-- this runs automatically, we don't call it directly from our code
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW(); -- NEW = the row being updated
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- drop old trigger first so we can safely re-run this script
DROP TRIGGER IF EXISTS update_tasks_modtime ON tasks;

-- attach the trigger: runs before every UPDATE on tasks
-- so we never have to manually set updated_at in our queries
CREATE TRIGGER update_tasks_modtime
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();