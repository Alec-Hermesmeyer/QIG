-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add missing columns to existing services table (if they don't exist)
-- This approach safely adds columns only if they don't already exist

DO $$ 
BEGIN
    -- Add key_features column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'key_features') THEN
        ALTER TABLE services ADD COLUMN key_features TEXT[] DEFAULT '{}';
    END IF;

    -- Add dependencies column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'dependencies') THEN
        ALTER TABLE services ADD COLUMN dependencies TEXT[] DEFAULT '{}';
    END IF;

    -- Add technical_stack column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'technical_stack') THEN
        ALTER TABLE services ADD COLUMN technical_stack TEXT[] DEFAULT '{}';
    END IF;

    -- Add client_facing column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'client_facing') THEN
        ALTER TABLE services ADD COLUMN client_facing BOOLEAN DEFAULT false;
    END IF;

    -- Add internal_only column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'internal_only') THEN
        ALTER TABLE services ADD COLUMN internal_only BOOLEAN DEFAULT false;
    END IF;

    -- Add documentation_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'documentation_url') THEN
        ALTER TABLE services ADD COLUMN documentation_url TEXT;
    END IF;

    -- Add demo_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'demo_url') THEN
        ALTER TABLE services ADD COLUMN demo_url TEXT;
    END IF;

    -- Add tags column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'tags') THEN
        ALTER TABLE services ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;

    -- Add target_launch_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'target_launch_date') THEN
        ALTER TABLE services ADD COLUMN target_launch_date TIMESTAMPTZ;
    END IF;

    -- Add actual_launch_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'actual_launch_date') THEN
        ALTER TABLE services ADD COLUMN actual_launch_date TIMESTAMPTZ;
    END IF;

    -- Add progress column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'progress') THEN
        ALTER TABLE services ADD COLUMN progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);
    END IF;

    -- Add priority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'priority') THEN
        ALTER TABLE services ADD COLUMN priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));
    END IF;

    -- Add team column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'team') THEN
        ALTER TABLE services ADD COLUMN team TEXT;
    END IF;

    -- Add owner column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'owner') THEN
        ALTER TABLE services ADD COLUMN owner TEXT;
    END IF;

    -- Add category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'category') THEN
        ALTER TABLE services ADD COLUMN category TEXT DEFAULT 'AI_ANALYSIS' CHECK (category IN ('AI_ANALYSIS', 'AUTOMATION', 'INFRASTRUCTURE', 'INTEGRATION', 'RESEARCH'));
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'status') THEN
        ALTER TABLE services ADD COLUMN status TEXT DEFAULT 'LIVE' CHECK (status IN ('PLANNING', 'IN_DEVELOPMENT', 'TESTING', 'BETA', 'LIVE', 'ON_HOLD', 'DEPRECATED'));
    END IF;
END $$;

-- Tasks table for individual tasks within services
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'REVIEW', 'TESTING', 'DONE', 'BLOCKED', 'CANCELLED')),
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  assignee_id UUID REFERENCES auth.users(id),
  assignee_name TEXT,
  estimated_hours INTEGER,
  actual_hours INTEGER,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service updates table for tracking changes and announcements
CREATE TABLE IF NOT EXISTS service_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'FEATURE' CHECK (type IN ('FEATURE', 'BUGFIX', 'MAINTENANCE', 'ANNOUNCEMENT', 'RELEASE')),
  author TEXT NOT NULL,
  version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task updates/comments table for tracking task progress
CREATE TABLE IF NOT EXISTS task_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'COMMENT' CHECK (type IN ('COMMENT', 'STATUS_CHANGE', 'ASSIGNMENT', 'TIME_LOG', 'ATTACHMENT')),
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task dependencies table for managing task relationships
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id)
);

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_priority ON services(priority);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON services(created_at);

CREATE INDEX IF NOT EXISTS idx_tasks_service_id ON tasks(service_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

CREATE INDEX IF NOT EXISTS idx_service_updates_service_id ON service_updates(service_id);
CREATE INDEX IF NOT EXISTS idx_service_updates_created_at ON service_updates(created_at);

CREATE INDEX IF NOT EXISTS idx_task_updates_task_id ON task_updates(task_id);
CREATE INDEX IF NOT EXISTS idx_task_updates_created_at ON task_updates(created_at);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_services_updated_at') THEN
        CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tasks_updated_at') THEN
        CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable Row Level Security on new tables
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS service_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables

-- Tasks policies
DROP POLICY IF EXISTS "Tasks are viewable by authenticated users" ON tasks;
CREATE POLICY "Tasks are viewable by authenticated users" ON tasks
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Tasks are manageable by QIG users" ON tasks;
CREATE POLICY "Tasks are manageable by QIG users" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = auth.uid() AND o.name = 'QIG'
    )
  );

-- Service updates policies
DROP POLICY IF EXISTS "Service updates are viewable by authenticated users" ON service_updates;
CREATE POLICY "Service updates are viewable by authenticated users" ON service_updates
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service updates are manageable by QIG users" ON service_updates;
CREATE POLICY "Service updates are manageable by QIG users" ON service_updates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = auth.uid() AND o.name = 'QIG'
    )
  );

-- Task updates policies
DROP POLICY IF EXISTS "Task updates are viewable by authenticated users" ON task_updates;
CREATE POLICY "Task updates are viewable by authenticated users" ON task_updates
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Task updates are manageable by QIG users" ON task_updates;
CREATE POLICY "Task updates are manageable by QIG users" ON task_updates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = auth.uid() AND o.name = 'QIG'
    )
  );

-- Task dependencies policies
DROP POLICY IF EXISTS "Task dependencies are viewable by authenticated users" ON task_dependencies;
CREATE POLICY "Task dependencies are viewable by authenticated users" ON task_dependencies
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Task dependencies are manageable by QIG users" ON task_dependencies;
CREATE POLICY "Task dependencies are manageable by QIG users" ON task_dependencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.user_id = auth.uid() AND o.name = 'QIG'
    )
  );

-- Update existing services with enhanced data (only if records exist and don't have these values already)
DO $$
BEGIN
    -- Update Contract Analyst service if it exists
    UPDATE services 
    SET 
        category = COALESCE(category, 'AI_ANALYSIS'),
        status = COALESCE(status, 'LIVE'),
        progress = COALESCE(progress, 100),
        priority = COALESCE(priority, 'HIGH'),
        team = COALESCE(team, 'AI Development'),
        owner = COALESCE(owner, 'QIG Team'),
        key_features = CASE 
            WHEN key_features = '{}' OR key_features IS NULL 
            THEN ARRAY['Contract clause extraction', 'Risk assessment', 'Compliance checking', 'Term comparison', 'Automated redlining']
            ELSE key_features 
        END,
        dependencies = CASE 
            WHEN dependencies = '{}' OR dependencies IS NULL 
            THEN ARRAY['GroundX RAG API', 'Document Processing Pipeline']
            ELSE dependencies 
        END,
        technical_stack = CASE 
            WHEN technical_stack = '{}' OR technical_stack IS NULL 
            THEN ARRAY['Next.js', 'OpenAI GPT-4', 'GroundX', 'PDF Processing']
            ELSE technical_stack 
        END,
        client_facing = COALESCE(client_facing, true),
        internal_only = COALESCE(internal_only, false),
        documentation_url = COALESCE(documentation_url, '/docs/contract-analyst'),
        demo_url = COALESCE(demo_url, '/contract-analyst'),
        tags = CASE 
            WHEN tags = '{}' OR tags IS NULL 
            THEN ARRAY['AI', 'Legal', 'Contract', 'Analysis']
            ELSE tags 
        END,
        actual_launch_date = COALESCE(actual_launch_date, NOW() - INTERVAL '90 days')
    WHERE service_name ILIKE '%contract%analyst%' OR display_name ILIKE '%contract%analyst%';

    -- Update Insurance Broker service if it exists
    UPDATE services 
    SET 
        category = COALESCE(category, 'AI_ANALYSIS'),
        status = COALESCE(status, 'LIVE'),
        progress = COALESCE(progress, 100),
        priority = COALESCE(priority, 'HIGH'),
        team = COALESCE(team, 'AI Development'),
        owner = COALESCE(owner, 'QIG Team'),
        key_features = CASE 
            WHEN key_features = '{}' OR key_features IS NULL 
            THEN ARRAY['Policy comparison', 'Coverage gap analysis', 'Premium optimization', 'Risk profiling', 'Automated recommendations']
            ELSE key_features 
        END,
        dependencies = CASE 
            WHEN dependencies = '{}' OR dependencies IS NULL 
            THEN ARRAY['Chat Stream API', 'Insurance Data APIs']
            ELSE dependencies 
        END,
        technical_stack = CASE 
            WHEN technical_stack = '{}' OR technical_stack IS NULL 
            THEN ARRAY['Next.js', 'OpenAI GPT-4', 'Real-time Chat', 'Data Analytics']
            ELSE technical_stack 
        END,
        client_facing = COALESCE(client_facing, true),
        internal_only = COALESCE(internal_only, false),
        documentation_url = COALESCE(documentation_url, '/docs/insurance-broker'),
        demo_url = COALESCE(demo_url, '/insurance-broker'),
        tags = CASE 
            WHEN tags = '{}' OR tags IS NULL 
            THEN ARRAY['AI', 'Insurance', 'Broker', 'Comparison']
            ELSE tags 
        END,
        actual_launch_date = COALESCE(actual_launch_date, NOW() - INTERVAL '60 days')
    WHERE service_name ILIKE '%insurance%broker%' OR display_name ILIKE '%insurance%broker%';

    -- Update Open Records service if it exists
    UPDATE services 
    SET 
        category = COALESCE(category, 'AUTOMATION'),
        status = COALESCE(status, 'LIVE'),
        progress = COALESCE(progress, 100),
        priority = COALESCE(priority, 'MEDIUM'),
        team = COALESCE(team, 'Automation Team'),
        owner = COALESCE(owner, 'QIG Team'),
        key_features = CASE 
            WHEN key_features = '{}' OR key_features IS NULL 
            THEN ARRAY['FOIA request generation', 'Public records search', 'Request tracking', 'Response analysis', 'Document classification']
            ELSE key_features 
        END,
        dependencies = CASE 
            WHEN dependencies = '{}' OR dependencies IS NULL 
            THEN ARRAY['Document Analysis API', 'Government APIs']
            ELSE dependencies 
        END,
        technical_stack = CASE 
            WHEN technical_stack = '{}' OR technical_stack IS NULL 
            THEN ARRAY['Next.js', 'Document Processing', 'Web Scraping', 'OCR']
            ELSE technical_stack 
        END,
        client_facing = COALESCE(client_facing, true),
        internal_only = COALESCE(internal_only, false),
        documentation_url = COALESCE(documentation_url, '/docs/open-records'),
        demo_url = COALESCE(demo_url, '/open-records'),
        tags = CASE 
            WHEN tags = '{}' OR tags IS NULL 
            THEN ARRAY['FOIA', 'Public Records', 'Government', 'Automation']
            ELSE tags 
        END,
        actual_launch_date = COALESCE(actual_launch_date, NOW() - INTERVAL '30 days')
    WHERE service_name ILIKE '%open%records%' OR display_name ILIKE '%open%records%';
END $$;

-- Insert sample service updates if they don't exist
INSERT INTO service_updates (service_id, title, description, type, author, version) 
SELECT 
  s.id,
  'Performance Optimization Complete',
  'Improved contract processing speed by 40% through optimized document parsing and enhanced AI model efficiency.',
  'FEATURE',
  'AI Development Team',
  '2.1.0'
FROM services s 
WHERE (s.service_name ILIKE '%contract%analyst%' OR s.display_name ILIKE '%contract%analyst%')
AND NOT EXISTS (
  SELECT 1 FROM service_updates su 
  WHERE su.service_id = s.id AND su.title = 'Performance Optimization Complete'
);

INSERT INTO service_updates (service_id, title, description, type, author, version)
SELECT 
  s.id,
  'New Policy Comparison Features',
  'Added support for additional insurance providers and enhanced coverage gap analysis capabilities.',
  'FEATURE',
  'AI Development Team',
  '1.8.0'
FROM services s 
WHERE (s.service_name ILIKE '%insurance%broker%' OR s.display_name ILIKE '%insurance%broker%')
AND NOT EXISTS (
  SELECT 1 FROM service_updates su 
  WHERE su.service_id = s.id AND su.title = 'New Policy Comparison Features'
);

INSERT INTO service_updates (service_id, title, description, type, author, version)
SELECT 
  s.id,
  'Enhanced FOIA Request Processing',
  'Improved automated request generation with better jurisdiction detection and template matching.',
  'FEATURE',
  'Automation Team',
  '1.5.2'
FROM services s 
WHERE (s.service_name ILIKE '%open%records%' OR s.display_name ILIKE '%open%records%')
AND NOT EXISTS (
  SELECT 1 FROM service_updates su 
  WHERE su.service_id = s.id AND su.title = 'Enhanced FOIA Request Processing'
); 