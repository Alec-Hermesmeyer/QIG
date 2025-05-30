-- Simple Admin RLS Policy for QIG to Manage All Client Configurations
-- Run this in Supabase SQL Editor

-- First, let's see what tables exist and their structure
SELECT 'Available tables:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'organizations', 'client_configurations')
ORDER BY table_name;

-- Check profiles table structure
SELECT 'Profiles table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check what's in profiles table
SELECT 'Profiles table data:' as info;
SELECT * FROM profiles LIMIT 3;

-- Check what's in organizations table
SELECT 'Organizations table data:' as info;
SELECT id, name FROM organizations ORDER BY name;

-- Check current user
SELECT 'Current user ID:' as info, auth.uid() as user_id;

-- Drop ALL existing policies on client_configurations to start fresh
DROP POLICY IF EXISTS "Users can access their organization's configurations" ON client_configurations;
DROP POLICY IF EXISTS "Users can view their organization's configurations" ON client_configurations;
DROP POLICY IF EXISTS "Users can create their organization's configurations" ON client_configurations;
DROP POLICY IF EXISTS "Users can update their organization's configurations" ON client_configurations;
DROP POLICY IF EXISTS "Users can delete their organization's configurations" ON client_configurations;
DROP POLICY IF EXISTS "QIG admins can manage all client configurations" ON client_configurations;

-- Create a simple admin policy that allows QIG users to manage everything
-- This assumes your current user is from QIG organization
CREATE POLICY "QIG admins can manage all client configurations" ON client_configurations
    FOR ALL USING (
        -- QIG users can access/modify ANY organization's configurations
        EXISTS (
            SELECT 1 FROM profiles p 
            JOIN organizations o ON p.organization_id = o.id
            WHERE p.id = auth.uid() 
            AND o.name = 'QIG'
        )
        OR
        -- Non-QIG users can only access their own organization's configurations
        organization_id IN (
            SELECT p.organization_id 
            FROM profiles p 
            WHERE p.id = auth.uid()
        )
    ) WITH CHECK (
        -- QIG users can create/update ANY organization's configurations
        EXISTS (
            SELECT 1 FROM profiles p 
            JOIN organizations o ON p.organization_id = o.id
            WHERE p.id = auth.uid() 
            AND o.name = 'QIG'
        )
        OR
        -- Non-QIG users can only create/update their own organization's configurations
        organization_id IN (
            SELECT p.organization_id 
            FROM profiles p 
            WHERE p.id = auth.uid()
        )
    );

-- Alternative: If the above doesn't work, create a more permissive policy temporarily
-- Uncomment these lines if you want to temporarily allow all operations for testing:

-- DROP POLICY IF EXISTS "QIG admins can manage all client configurations" ON client_configurations;
-- CREATE POLICY "Temporary allow all" ON client_configurations FOR ALL USING (true) WITH CHECK (true);

-- Verify the policy was created
SELECT 'Current policies on client_configurations:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'client_configurations';

-- Test: Try to see if current user can access organizations
SELECT 'Testing access - try to see organizations:' as info;
SELECT COUNT(*) as organization_count FROM organizations; 