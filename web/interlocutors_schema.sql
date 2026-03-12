-- Create interlocutors table
CREATE TABLE interlocutors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  relationship text,
  profile_md text default '',
  learned_md text default '',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Turn on row level security
ALTER TABLE interlocutors ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can insert their own interlocutors"
  ON interlocutors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own interlocutors"
  ON interlocutors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own interlocutors"
  ON interlocutors FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interlocutors"
  ON interlocutors FOR DELETE
  USING (auth.uid() = user_id);

-- Alter conversation_log to track interlocutors
ALTER TABLE conversation_log
ADD COLUMN interlocutor_id uuid references interlocutors(id) on delete set null;

-- Alter usage_events to track interlocutors
ALTER TABLE usage_events
ADD COLUMN interlocutor_id uuid references interlocutors(id) on delete set null;

-- Add updated_at trigger for interlocutors
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_interlocutors_updated_at
BEFORE UPDATE ON interlocutors
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
