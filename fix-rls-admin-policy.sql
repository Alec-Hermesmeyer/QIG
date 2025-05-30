-- Admin RLS Policy for QIG to Manage All Client Configurations
-- Run this in Supabase SQL Editor

-- First, check what columns exist in profiles table
SELECT 'Profiles table structure:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current user and organization (using only basic columns)
SELECT 'Current user information:' as info;
SELECT 
    auth.uid() as current_user_id,
    p.id as profile_id,
    p.email,
    o.name as organization_name,
    o.id as organization_id
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE p.id = auth.uid();

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their organization's configurations" ON client_configurations;
DROP POLICY IF EXISTS "Users can create their organization's configurations" ON client_configurations;
DROP POLICY IF EXISTS "Users can update their organization's configurations" ON client_configurations;
DROP POLICY IF EXISTS "Users can delete their organization's configurations" ON client_configurations;
DROP POLICY IF EXISTS "QIG admins can manage all client configurations" ON client_configurations;

-- Create admin-friendly policies that allow QIG to manage all configurations
-- This is what you need for the admin interface to work properly

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

-- Verify the policy was created
SELECT 'New admin policy created:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'client_configurations';

-- Test that the current user can now see all organizations (if they're QIG)
SELECT 'Organizations visible to current user:' as info;
SELECT DISTINCT o.id, o.name
FROM organizations o
WHERE 
    -- QIG users can see all organizations
    EXISTS (
        SELECT 1 FROM profiles p 
        JOIN organizations org ON p.organization_id = org.id
        WHERE p.id = auth.uid() 
        AND org.name = 'QIG'
    )
    OR
    -- Non-QIG users can only see their own organization
    o.id IN (
        SELECT p.organization_id 
        FROM profiles p 
        WHERE p.id = auth.uid()
    )
ORDER BY o.name; 