-- Fix Profiles RLS Policy for QIG Admin Access
-- This allows QIG users to assign users to any organization
-- Run this in Supabase SQL Editor

-- First, check current policies on profiles table
SELECT 'Current profiles policies:' as info;
SELECT policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check current user info
SELECT 'Current user information:' as info;
SELECT 
    auth.uid() as current_user_id,
    p.id as profile_id,
    p.email,
    o.name as organization_name,
    o.id as organization_id
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.id = auth.uid();

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can access profiles in their organization" ON profiles;

-- Create a new policy that allows QIG users to manage ALL profiles
-- while restricting non-QIG users to their own organization
CREATE POLICY "QIG admins can manage all profiles, others restricted to their org" ON profiles
    FOR ALL 
    USING (
        -- Allow access to own profile always
        id = auth.uid() 
        OR
        -- QIG users can access/view ANY profile
        EXISTS (
            SELECT 1 FROM profiles p 
            JOIN organizations o ON p.organization_id = o.id
            WHERE p.id = auth.uid() 
            AND o.name = 'QIG'
        )
        OR
        -- Non-QIG users can only access profiles in their organization
        (organization_id IN (
            SELECT p.organization_id 
            FROM profiles p 
            WHERE p.id = auth.uid()
        ) AND NOT EXISTS (
            SELECT 1 FROM profiles p 
            JOIN organizations o ON p.organization_id = o.id
            WHERE p.id = auth.uid() 
            AND o.name = 'QIG'
        ))
    ) 
    WITH CHECK (
        -- Allow updating own profile always
        id = auth.uid()
        OR
        -- QIG users can create/update ANY profile (including changing organization_id)
        EXISTS (
            SELECT 1 FROM profiles p 
            JOIN organizations o ON p.organization_id = o.id
            WHERE p.id = auth.uid() 
            AND o.name = 'QIG'
        )
        OR
        -- Non-QIG users can only update profiles in their organization
        -- and cannot change the organization_id
        (organization_id IN (
            SELECT p.organization_id 
            FROM profiles p 
            WHERE p.id = auth.uid()
        ) AND NOT EXISTS (
            SELECT 1 FROM profiles p 
            JOIN organizations o ON p.organization_id = o.id
            WHERE p.id = auth.uid() 
            AND o.name = 'QIG'
        ))
    );

-- Verify the new policy was created
SELECT 'New profiles policy created:' as info;
SELECT policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Test message
SELECT 'Profiles RLS policy updated. QIG users should now be able to assign users to any organization.' as message;

-- Quick test: Show all organizations that current user can see
SELECT 'Organizations visible to current user:' as info;
SELECT id, name, created_at
FROM organizations
ORDER BY name; 