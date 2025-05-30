-- Temporary Fix: Allow QIG Users Full Access to All Profiles
-- This is a simpler, more permissive policy for testing
-- Run this in Supabase SQL Editor

-- Show current policies
SELECT 'Current profiles policies before fix:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';

-- Drop existing policy
DROP POLICY IF EXISTS "Users can access profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "QIG admins can manage all profiles, others restricted to their org" ON profiles;

-- Create a simple policy that allows QIG users to do anything with profiles
-- and normal users to only access their own profile
CREATE POLICY "QIG admin access to all profiles" ON profiles
    FOR ALL 
    USING (
        -- Always allow access to own profile
        id = auth.uid()
        OR
        -- QIG users can access ANY profile
        EXISTS (
            SELECT 1 FROM profiles p2 
            JOIN organizations o ON p2.organization_id = o.id
            WHERE p2.id = auth.uid() 
            AND o.name = 'QIG'
        )
    ) 
    WITH CHECK (
        -- Always allow updating own profile
        id = auth.uid()
        OR
        -- QIG users can update ANY profile (including organization assignment)
        EXISTS (
            SELECT 1 FROM profiles p2 
            JOIN organizations o ON p2.organization_id = o.id
            WHERE p2.id = auth.uid() 
            AND o.name = 'QIG'
        )
    );

-- Verify new policy
SELECT 'New simplified policy created:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';

-- Test current user's access
SELECT 'Current user can now access:' as info;
SELECT 
    auth.uid() as your_user_id,
    (SELECT COUNT(*) FROM profiles) as total_profiles_you_can_see,
    (SELECT COUNT(*) FROM organizations) as total_orgs_you_can_see;

SELECT 'Fix applied. QIG users should now be able to assign any user to any organization.' as message; 