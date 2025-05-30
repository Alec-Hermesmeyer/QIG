-- Create sample_questions table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sample_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sample_questions_organization_id ON sample_questions(organization_id);
CREATE INDEX IF NOT EXISTS idx_sample_questions_category ON sample_questions(category);
CREATE INDEX IF NOT EXISTS idx_sample_questions_created_at ON sample_questions(created_at);

-- Add Row Level Security (RLS)
ALTER TABLE sample_questions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- QIG can access all questions
CREATE POLICY "QIG can access all sample questions" ON sample_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organizations 
            WHERE organizations.id = (
                SELECT organization_id FROM profiles 
                WHERE profiles.id = auth.uid()
            ) 
            AND organizations.name = 'QIG'
        )
    );

-- Organizations can access their own questions
CREATE POLICY "Organizations can access their own sample questions" ON sample_questions
    FOR ALL USING (
        organization_id = (
            SELECT organization_id FROM profiles 
            WHERE profiles.id = auth.uid()
        )
    );

-- Insert some sample data for testing
INSERT INTO sample_questions (organization_id, question, category) VALUES
    -- Get QIG organization ID and add some default questions
    ((SELECT id FROM organizations WHERE name = 'QIG' LIMIT 1), 'What are the key contract terms?', 'Contract'),
    ((SELECT id FROM organizations WHERE name = 'QIG' LIMIT 1), 'How do I analyze document sentiment?', 'Analysis'),
    ((SELECT id FROM organizations WHERE name = 'QIG' LIMIT 1), 'What policies apply to remote work?', 'Policy')
ON CONFLICT DO NOTHING;

-- Verify the table was created
SELECT 'sample_questions table created successfully' as status;
SELECT COUNT(*) as sample_count FROM sample_questions; 