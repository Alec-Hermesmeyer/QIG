-- Fix Row Level Security Policies for Client Configurations
-- Run this in Supabase SQL Editor

-- First, let's see the current policies
SELECT 'Current RLS Policies on client_configurations:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'client_configurations';

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can access their organization's configurations" ON client_configurations;
DROP POLICY IF EXISTS "Users can insert their organization's configurations" ON client_configurations;
DROP POLICY IF EXISTS "Users can update their organization's configurations" ON client_configurations;
DROP POLICY IF EXISTS "Users can delete their organization's configurations" ON client_configurations;

-- Create comprehensive RLS policies

-- 1. SELECT policy - users can view their organization's configurations
CREATE POLICY "Users can view their organization's configurations" ON client_configurations
    FOR SELECT USING (
        organization_id IN (
            SELECT p.organization_id 
            FROM profiles p 
            WHERE p.id = auth.uid()
        )
    );

-- 2. INSERT policy - users can create configurations for their organization
CREATE POLICY "Users can create their organization's configurations" ON client_configurations
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT p.organization_id 
            FROM profiles p 
            WHERE p.id = auth.uid()
        )
    );

-- 3. UPDATE policy - users can update their organization's configurations
CREATE POLICY "Users can update their organization's configurations" ON client_configurations
    FOR UPDATE USING (
        organization_id IN (
            SELECT p.organization_id 
            FROM profiles p 
            WHERE p.id = auth.uid()
        )
    ) WITH CHECK (
        organization_id IN (
            SELECT p.organization_id 
            FROM profiles p 
            WHERE p.id = auth.uid()
        )
    );

-- 4. DELETE policy - users can delete their organization's configurations
CREATE POLICY "Users can delete their organization's configurations" ON client_configurations
    FOR DELETE USING (
        organization_id IN (
            SELECT p.organization_id 
            FROM profiles p 
            WHERE p.id = auth.uid()
        )
    );

-- Alternative: If you want QIG organization to manage ALL configurations (admin override)
-- Uncomment these policies if QIG should be able to manage all client configurations

-- CREATE POLICY "QIG can manage all configurations" ON client_configurations
--     FOR ALL USING (
--         EXISTS (
--             SELECT 1 FROM profiles p 
--             JOIN organizations o ON p.organization_id = o.id
--             WHERE p.id = auth.uid() 
--             AND o.name = 'QIG'
--         )
--         OR
--         organization_id IN (
--             SELECT p.organization_id 
--             FROM profiles p 
--             WHERE p.id = auth.uid()
--         )
--     ) WITH CHECK (
--         EXISTS (
--             SELECT 1 FROM profiles p 
--             JOIN organizations o ON p.organization_id = o.id
--             WHERE p.id = auth.uid() 
--             AND o.name = 'QIG'
--         )
--         OR
--         organization_id IN (
--             SELECT p.organization_id 
--             FROM profiles p 
--             WHERE p.id = auth.uid()
--         )
--     );

-- Test the policies by checking what the current user can see
SELECT 'Testing policies - Current user can see these organizations:' as info;
SELECT p.organization_id, o.name
FROM profiles p
JOIN organizations o ON p.organization_id = o.id  
WHERE p.id = auth.uid();

-- Show the new policies
SELECT 'New RLS Policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'client_configurations'; 