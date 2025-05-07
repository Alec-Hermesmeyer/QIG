'use client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Mail, Users, Building, User, Calendar, ArrowRight, Briefcase, Shield, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase/client';

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  organization_id: string | null;
  email: string;
  organization_name: string | null;
  created_at?: string;
  role?: string;
}

export default function ProfilePage() {
  // Get auth context
  const { 
    user, 
    profile, 
    organization, 
    isLoading, 
    getUsersInOrganization, 
    getAllUsers, 
    isQIGOrganization 
  } = useAuth();
  
  // State
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [joinDate, setJoinDate] = useState<string | null>(null);
  const router = useRouter();

  // Load data when component mounts
  useEffect(() => {
    // Redirect if not authenticated
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    // Set initial profile data
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setAvatarUrl(profile.avatar_url);
      
      // Calculate join date
      if (user?.created_at) {
        const date = new Date(user.created_at);
        setJoinDate(date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }));
      }
    }

    // Fetch users based on organization access
    const fetchUsers = async () => {
      if (organization) {
        // Get users from the current organization
        const { data, error } = await getUsersInOrganization();
        if (data && !error) {
          setOrgUsers(data);
          setMemberCount(data.length);
        }
        
        // QIG organization can see all users
        if (isQIGOrganization) {
          const { data: allData, error: allError } = await getAllUsers();
          if (allData && !allError) {
            setAllUsers(allData);
          }
        }
        
        setIsLoadingUsers(false);
      }
    };

    if (!isLoading && organization) {
      fetchUsers();
    }
  }, [user, profile, organization, isLoading, getUsersInOrganization, getAllUsers, isQIGOrganization, router]);

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Update profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Handle avatar upload if needed
      if (avatar) {
        await handleAvatarUpload();
      }
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved.",
        variant: "success"
      });
      
      setEditMode(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: "There was a problem updating your profile.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async () => {
    if (!avatar || !user) return;
    
    setIsUploadingAvatar(true);
    try {
      // Create a unique filename
      const fileExt = avatar.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatar, {
          upsert: true,
          cacheControl: '3600'
        });
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
        
      const avatarUrl = data.publicUrl;
      
      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      // Update state
      setAvatarUrl(avatarUrl);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Avatar upload failed",
        description: "There was a problem uploading your avatar.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      // Create a preview URL
      const objectUrl = URL.createObjectURL(file);
      setAvatarUrl(objectUrl);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    // Reset form to original values
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setAvatarUrl(profile.avatar_url);
      setAvatar(null);
    }
    setEditMode(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading profile information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!profile || !organization) {
    return (
      <div className="container mx-auto p-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Profile not found</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>No profile or organization information was found. Please try logging out and back in.</p>
              </div>
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/login')}
                >
                  Return to Login
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      {/* Header with user info */}
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between">
        <div className="flex items-center mb-4 md:mb-0">
          <div className="relative">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border-2 border-white shadow">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={`${profile.first_name} ${profile.last_name}`} 
                  className="h-full w-full object-cover"
                  onError={() => setAvatarUrl(null)}
                />
              ) : (
                <User className="h-10 w-10 text-gray-400" />
              )}
            </div>
            {!editMode && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="absolute bottom-0 right-0 rounded-full h-8 w-8 p-0 bg-primary text-white shadow"
                onClick={() => setEditMode(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="ml-4">
            <h1 className="text-2xl font-bold">
              {profile.first_name} {profile.last_name}
            </h1>
            <div className="flex items-center text-gray-600 mt-1">
              <Mail className="h-4 w-4 mr-1" />
              <span>{user?.email}</span>
            </div>
          </div>
        </div>
        <div>
          <Badge
            className={`text-xs px-3 py-1 rounded-full ${isQIGOrganization ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}
          >
            {isQIGOrganization ? 'QIG Administrator' : 'Member'}
          </Badge>
        </div>
      </div>

      {/* Main content with tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:w-[400px] mb-8">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          {isQIGOrganization && (
            <TabsTrigger value="admin">Admin</TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{editMode ? "Edit Profile" : "Profile Information"}</CardTitle>
              <CardDescription>
                {editMode 
                  ? "Update your profile information below" 
                  : "Your personal information and account details"}
              </CardDescription>
            </CardHeader>
            
            {editMode ? (
              /* Edit Mode */
              <CardContent className="space-y-6">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center mb-4">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border-2 border-white shadow">
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt="Profile" 
                          className="h-full w-full object-cover"
                          onError={() => setAvatarUrl(null)}
                        />
                      ) : (
                        <User className="h-12 w-12 text-gray-400" />
                      )}
                    </div>
                    <label 
                      htmlFor="avatar-upload" 
                      className="absolute bottom-0 right-0 rounded-full h-8 w-8 flex items-center justify-center bg-primary text-white cursor-pointer shadow"
                    >
                      <Edit className="h-4 w-4" />
                    </label>
                    <input 
                      type="file" 
                      id="avatar-upload" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Click the edit button to change your avatar</p>
                </div>
                
                {/* Edit Form */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="firstName" className="text-sm font-medium">
                        First name
                      </label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="lastName" className="text-sm font-medium">
                        Last name
                      </label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>
                
                <div className="pt-4 flex justify-end space-x-2">
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save changes'}
                  </Button>
                </div>
              </CardContent>
            ) : (
              /* View Mode */
              <CardContent className="space-y-6">
                {/* Account Info */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg flex items-center">
                    <User className="h-5 w-5 mr-2 text-gray-500" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                    <div>
                      <p className="text-sm text-gray-500">Full Name</p>
                      <p className="font-medium">{profile.first_name} {profile.last_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{user?.email}</p>
                    </div>
                  </div>
                </div>
                
                {/* Organization Info */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg flex items-center">
                    <Building className="h-5 w-5 mr-2 text-gray-500" />
                    Organization
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                    <div>
                      <p className="text-sm text-gray-500">Organization</p>
                      <p className="font-medium">{organization.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Role</p>
                      <p className="font-medium">{isQIGOrganization ? 'Administrator' : 'Member'}</p>
                    </div>
                  </div>
                </div>
                
                {/* Account Details */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-gray-500" />
                    Account Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                    <div>
                      <p className="text-sm text-gray-500">User ID</p>
                      <p className="font-medium text-sm truncate">{user?.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Joined</p>
                      <p className="font-medium">{joinDate || 'Unknown'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
            
            {!editMode && (
              <CardFooter className="flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setEditMode(true)}
                >
                  Edit Profile
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization: {organization.name}</CardTitle>
              <CardDescription>
                Details about your organization and team members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Organization Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Organization</h3>
                  <p className="text-2xl font-bold">{organization.name}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Members</h3>
                  <p className="text-2xl font-bold">{memberCount}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Your Role</h3>
                  <p className="text-2xl font-bold">{isQIGOrganization ? 'Admin' : 'Member'}</p>
                </div>
              </div>
              
              {/* Organization Members */}
              <div>
                <h3 className="text-lg font-medium mb-4">Organization Members</h3>
                {isLoadingUsers ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-300"></div>
                  </div>
                ) : (
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {orgUsers.map((orgUser) => (
                          <tr key={orgUser.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                  {orgUser.avatar_url ? (
                                    <img 
                                      src={orgUser.avatar_url} 
                                      alt={`${orgUser.first_name} ${orgUser.last_name}`} 
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <User className="h-4 w-4 text-gray-400" />
                                  )}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {orgUser.first_name} {orgUser.last_name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{orgUser.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                orgUser.id === user?.id 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {orgUser.id === user?.id ? 'You' : 'Member'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Tab (QIG Only) */}
        {isQIGOrganization && (
          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle>Administrator View</CardTitle>
                <CardDescription>
                  As a QIG administrator, you have access to all users across organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-300"></div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Organization
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {allUsers.map((userData) => (
                            <tr key={userData.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                    {userData.avatar_url ? (
                                      <img 
                                        src={userData.avatar_url} 
                                        alt={`${userData.first_name} ${userData.last_name}`} 
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <User className="h-4 w-4 text-gray-400" />
                                    )}
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {userData.first_name} {userData.last_name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{userData.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">
                                  {userData.organization_name || 'No Organization'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Button variant="ghost" size="sm">
                                  <ArrowRight className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}