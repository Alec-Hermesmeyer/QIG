-- Temporarily Disable RLS Restrictions for Testing
-- Run this in Supabase SQL Editor

-- Show current policies
SELECT 'Current policies before removal:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'client_configurations';

-- Remove ALL existing policies (using the exact names from the output)
DROP POLICY IF EXISTS "Users can create their organization's configurations" ON client_configurations;
DROP POLICY IF EXISTS "Users can delete their organization's configurations" ON client_configurations;
DROP POLICY IF EXISTS "Users can update their organization's configurations" ON client_configurations;
DROP POLICY IF EXISTS "Users can view their organization's configurations" ON client_configurations;
DROP POLICY IF EXISTS "QIG admins can manage all client configurations" ON client_configurations;

-- Verify all policies are removed
SELECT 'Policies after removal (should be empty):' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'client_configurations';

-- Create a temporary permissive policy that allows all operations
-- This is ONLY for testing - you'll want proper security later
CREATE POLICY "Temporary allow all operations" ON client_configurations
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Verify the new policy
SELECT 'New temporary policy created:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'client_configurations';

-- Test message
SELECT 'RLS temporarily disabled for testing. You should now be able to add backend URLs in the admin interface.' as message; 