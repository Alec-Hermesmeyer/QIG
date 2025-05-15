'use client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Edit, Mail, Users, Building, User, Calendar, ArrowRight,
  Briefcase, Shield, Save, X, Plus, UserPlus, RefreshCw,
  CheckCircle, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import CreateOrganizationDialog from '@/components/CreateOrganizationDialog';
import SimpleNav from '@/components/SimpleNav';

// Helper function to get organization display info
const getUserOrgInfo = (userData: any, allOrganizations: any[]) => {
  // If user has an organization_name directly from the query
  if (userData.organization_name) {
    return {
      name: userData.organization_name,
      id: userData.organization_id
    };
  }

  // If not, find the organization from allOrganizations
  if (userData.organization_id) {
    const org = allOrganizations.find(o => o.id === userData.organization_id);
    return {
      name: org ? org.name : 'Unknown Organization',
      id: userData.organization_id
    };
  }

  // User has no organization
  return {
    name: 'No Organization',
    id: null
  };
};

// Define types for our state
interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  organization_id: string | null;
  email: string | null;
  organization_name?: string | null;
  created_at?: string;
}

interface Organization {
  id: string;
  name: string;
  logo_url?: string | null;
  theme_color?: string;
  is_qig?: boolean;
  created_at?: string;
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
    getAllOrganizations,
    isQIGOrganization
  } = useAuth();

  // State
  const [orgUsers, setOrgUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
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

  // New Org Form State
  const [newOrgName, setNewOrgName] = useState('');
  const [isOrgQIG, setIsOrgQIG] = useState(false);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [showNewOrgDialog, setShowNewOrgDialog] = useState(false);

  // New User Form State
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserOrg, setNewUserOrg] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);

  // Add User to Org Form State
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [isAssigningUser, setIsAssigningUser] = useState(false);
  const [showAssignUserDialog, setShowAssignUserDialog] = useState(false);

  // Admin View Filter State
  const [userSearch, setUserSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState('all');
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);

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
          setOrgUsers(data as UserProfile[]);
          setMemberCount(data.length);
        }

        // QIG organization can see all users
        if (isQIGOrganization) {
          await fetchAllUsersAndOrgs();
        }

        setIsLoadingUsers(false);
      }
    };

    if (!isLoading && organization) {
      fetchUsers();
    }
  }, [user, profile, organization, isLoading, getUsersInOrganization, getAllUsers, isQIGOrganization, router]);

  // Fetch all users and organizations for admin
  const fetchAllUsersAndOrgs = async () => {
    setIsLoadingUsers(true);
    setIsLoadingOrgs(true);

    try {
      // Fetch all organizations
      const { data: orgsData, error: orgsError } = await getAllOrganizations();
      if (orgsError) throw orgsError;

      if (orgsData) {
        setAllOrganizations(orgsData);
      }

      // Fetch all users
      const { data: usersData, error: usersError } = await getAllUsers();
      if (usersError) throw usersError;

      if (usersData) {
        setAllUsers(usersData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Failed to load data",
        description: "There was a problem loading the users and organizations.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingUsers(false);
      setIsLoadingOrgs(false);
    }
  };

  // Refresh users and organizations data
  const refreshData = async () => {
    if (!isQIGOrganization) return;

    await fetchAllUsersAndOrgs();

    toast({
      title: "Data refreshed",
      description: "User and organization data has been updated.",
      variant: "success"
    });
  };

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

  // Create new organization
  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      toast({
        title: "Organization name required",
        description: "Please enter a name for the organization.",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingOrg(true);
    try {
      // Default logo URL and theme color
      const defaultLogoUrl = "https://toyvsnymdhiwnywkbufd.supabase.co/storage/v1/object/public/organization-logos/default-logo.png";
      const defaultThemeColor = "bg-blue-500"; // Default theme color

      // Add organization to Supabase with all required fields
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: newOrgName.trim(),
          is_qig: isOrgQIG,
          logo_url: defaultLogoUrl,
          theme_color: defaultThemeColor
        })
        .select();

      console.log("Supabase response:", { data, error });

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }

      // Update local state
      if (data && data.length > 0) {
        setAllOrganizations(prev => [...prev, data[0]]);

        toast({
          title: "Organization created",
          description: `"${newOrgName}" has been created successfully.`,
          variant: "success"
        });

        // Reset form
        setNewOrgName('');
        setIsOrgQIG(false);
        setShowNewOrgDialog(false);
      } else {
        throw new Error("No data returned from insert operation");
      }
    } catch (error) {
      console.error('Detailed error creating organization:', error);

      // Generate a helpful error message
      let errorMessage = "There was a problem creating the organization.";

      if (error instanceof Error) {
        if (error.message.includes("duplicate key")) {
          errorMessage = "An organization with this name already exists.";
        } else if (error.message.includes("violates not-null constraint")) {
          errorMessage = "Missing required fields. Please contact an administrator.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      toast({
        title: "Creation failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsCreatingOrg(false);
    }
  };
  
  // Create new user
  const handleCreateUser = async () => {
    if (!newUserEmail.trim() || !newUserFirstName.trim() || !newUserLastName.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingUser(true);
    try {
      // Create a temporary password
      const temporaryPassword = Math.random().toString(36).slice(-8);

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUserEmail.trim(),
        password: temporaryPassword,
        email_confirm: true
      });

      if (authError) throw authError;

      if (authData && authData.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              first_name: newUserFirstName.trim(),
              last_name: newUserLastName.trim(),
              organization_id: newUserOrg || null
            }
          ]);

        if (profileError) throw profileError;

        // Refresh user list
        await refreshData();

        toast({
          title: "User created",
          description: `User "${newUserEmail}" has been created successfully. A password reset email will be sent to the user.`,
          variant: "success"
        });

        // Reset form
        setNewUserEmail('');
        setNewUserFirstName('');
        setNewUserLastName('');
        setNewUserOrg('');
        setShowNewUserDialog(false);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Creation failed",
        description: "There was a problem creating the user.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Assign user to organization
  const handleAssignUserToOrg = async () => {
    if (!selectedUser || !selectedOrg) {
      toast({
        title: "Selection required",
        description: "Please select both a user and an organization.",
        variant: "destructive"
      });
      return;
    }

    setIsAssigningUser(true);
    try {
      // Update user's organization in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ organization_id: selectedOrg })
        .eq('id', selectedUser);

      if (error) throw error;

      // Refresh user list
      await refreshData();

      toast({
        title: "User assigned",
        description: "User has been assigned to the organization successfully.",
        variant: "success"
      });

      // Reset form
      setSelectedUser('');
      setSelectedOrg('');
      setShowAssignUserDialog(false);
    } catch (error) {
      console.error('Error assigning user:', error);
      toast({
        title: "Assignment failed",
        description: "There was a problem assigning the user to the organization.",
        variant: "destructive"
      });
    } finally {
      setIsAssigningUser(false);
    }
  };

  // Filter users in admin view
  const filteredUsers = allUsers.filter(user => {
    const nameMatch =
      `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(userSearch.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(userSearch.toLowerCase());

    const orgMatch =
      orgFilter === 'all' ||
      (orgFilter === 'none' && !user.organization_id) ||
      user.organization_id === orgFilter;

    return nameMatch && orgMatch;
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
            <p className="mt-6 text-slate-600 font-medium text-xl">Loading profile information...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (!profile || !organization) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden border border-red-200">
            <div className="p-8">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-100 rounded-full p-3">
                  <X className="h-8 w-8 text-red-500" />
                </div>
                <div className="ml-5">
                  <h3 className="text-xl font-semibold text-red-800">Profile not found</h3>
                  <div className="mt-2 text-red-700">
                    <p>No profile or organization information was found. Please try logging out and back in.</p>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <Button
                  className="w-full shadow-sm transition-all hover:shadow"
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
    <div className="min-h-screen bg-slate-50">
      <SimpleNav title="Profile" />
      <div className="container mx-auto px-4 py-8">
        {/* Header with user info */}
        <div className="mb-8 bg-white rounded-lg shadow-sm p-6 border border-slate-200">
          <div className="flex flex-col md:flex-row items-center md:items-center justify-between">
            <div className="flex flex-col md:flex-row items-center mb-6 md:mb-0">
              <div className="relative mb-4 md:mb-0">
                <div className="h-24 w-24 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={`${profile.first_name} ${profile.last_name}`}
                      className="h-full w-full object-cover"
                      onError={() => setAvatarUrl(null)}
                    />
                  ) : (
                    <User className="h-10 w-10 text-slate-400" />
                  )}
                </div>
                {!editMode && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full h-8 w-8 p-0 bg-blue-600 text-white shadow-sm"
                    onClick={() => setEditMode(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="ml-0 md:ml-6 text-center md:text-left">
                <h1 className="text-2xl font-bold text-slate-800">
                  {profile.first_name} {profile.last_name}
                </h1>
                <div className="flex items-center justify-center md:justify-start text-slate-600 mt-2">
                  <Mail className="h-4 w-4 mr-2 text-slate-500" />
                  <span>{user?.email}</span>
                </div>
              </div>
            </div>
            <div>
              <Badge
                className={`text-xs px-3 py-1 rounded-md ${
                  isQIGOrganization 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {isQIGOrganization ? 'QIG Administrator' : 'Member'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Main content with tabs */}
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 md:grid-cols-3 w-full md:w-[400px] mb-6 bg-white shadow-sm rounded-md mx-auto">
            <TabsTrigger 
              value="profile" 
              className="py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger 
              value="organization" 
              className="py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              Organization
            </TabsTrigger>
            {isQIGOrganization && (
              <TabsTrigger 
                value="admin" 
                className="py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="bg-blue-600 text-white">
                <CardTitle>{editMode ? "Edit Profile" : "Profile Information"}</CardTitle>
                <CardDescription className="text-blue-100">
                  {editMode
                    ? "Update your profile information below"
                    : "Your personal information and account details"}
                </CardDescription>
              </CardHeader>

              {editMode ? (
                /* Edit Mode */
                <CardContent className="space-y-6 p-6">
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative">
                      <div className="h-24 w-24 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="Profile"
                            className="h-full w-full object-cover"
                            onError={() => setAvatarUrl(null)}
                          />
                        ) : (
                          <User className="h-12 w-12 text-slate-400" />
                        )}
                      </div>
                      <label
                        htmlFor="avatar-upload"
                        className="absolute bottom-0 right-0 rounded-full h-8 w-8 flex items-center justify-center bg-blue-600 text-white cursor-pointer shadow-sm"
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
                    <p className="text-xs text-slate-500 mt-2">Click the edit button to change your avatar</p>
                  </div>

                  {/* Edit Form */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="firstName" className="text-sm font-medium text-slate-700">
                          First name
                        </label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="border-slate-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="lastName" className="text-sm font-medium text-slate-700">
                          Last name
                        </label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="border-slate-300"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium text-slate-700">
                        Email
                      </label>
                      <Input
                        id="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-slate-50 border-slate-200 text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end space-x-3">
                    <Button 
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="border-slate-300"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={isSaving}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save changes
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              ) : (
                /* View Mode */
                <CardContent className="space-y-6 p-6">
                  {/* Account Info */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg flex items-center text-slate-800">
                      <User className="h-5 w-5 mr-2 text-blue-600" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                      <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                        <p className="text-sm text-slate-500 mb-1">Full Name</p>
                        <p className="font-medium">{profile.first_name} {profile.last_name}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                        <p className="text-sm text-slate-500 mb-1">Email</p>
                        <p className="font-medium">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Organization Info */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg flex items-center text-slate-800">
                      <Building className="h-5 w-5 mr-2 text-blue-600" />
                      Organization
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                      <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                        <p className="text-sm text-slate-500 mb-1">Organization</p>
                        <p className="font-medium">{organization.name}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                        <p className="text-sm text-slate-500 mb-1">Role</p>
                        <p className="font-medium">{isQIGOrganization ? 'Administrator' : 'Member'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg flex items-center text-slate-800">
                      <Shield className="h-5 w-5 mr-2 text-blue-600" />
                      Account Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                      <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                        <p className="text-sm text-slate-500 mb-1">User ID</p>
                        <p className="font-medium text-sm truncate">{user?.id}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                        <p className="text-sm text-slate-500 mb-1">Joined</p>
                        <p className="font-medium">{joinDate || 'Unknown'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}

              {!editMode && (
                <CardFooter className="flex justify-end bg-slate-50 p-4 border-t border-slate-200">
                  <Button
                    variant="default"
                    onClick={() => setEditMode(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </CardFooter>
              )}
            </Card>
          </TabsContent>

          {/* Organization Tab */}
          <TabsContent value="organization" className="space-y-6">
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="bg-teal-600 text-white">
                <div className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  <CardTitle>Organization: {organization.name}</CardTitle>
                </div>
                <CardDescription className="text-teal-100">
                  Details about your organization and team members
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {/* Organization Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                    <h3 className="text-sm font-medium text-slate-500 mb-1">Organization</h3>
                    <p className="text-xl font-bold text-slate-800">{organization.name}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                    <h3 className="text-sm font-medium text-slate-500 mb-1">Members</h3>
                    <p className="text-xl font-bold text-slate-800">{memberCount}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                    <h3 className="text-sm font-medium text-slate-500 mb-1">Your Role</h3>
                    <p className="text-xl font-bold text-slate-800">{isQIGOrganization ? 'Admin' : 'Member'}</p>
                  </div>
                </div>

                {/* Organization Members */}
                <div>
                  <h3 className="text-lg font-medium mb-4 text-slate-800 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-teal-600" />
                    Organization Members
                  </h3>
                  {isLoadingUsers ? (
                    <div className="flex justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-600"></div>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Role
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                          {orgUsers.map((orgUser) => (
                            <tr key={orgUser.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                                    {orgUser.avatar_url ? (
                                      <img
                                        src={orgUser.avatar_url}
                                        alt={`${orgUser.first_name} ${orgUser.last_name}`}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <User className="h-4 w-4 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-slate-800">
                                      {orgUser.first_name} {orgUser.last_name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-slate-600">{orgUser.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-md ${
                                  orgUser.id === user?.id
                                    ? 'bg-teal-100 text-teal-800'
                                    : 'bg-slate-100 text-slate-700'
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
            <TabsContent value="admin" className="space-y-6">
              {/* Admin Actions */}
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-800 text-white">
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    <CardTitle>Administrator Actions</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300">
                    Manage users and organizations across the system
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Create Organization Button */}
                    <div>
                      <Button 
                        onClick={() => setShowNewOrgDialog(true)}
                        className="flex items-center justify-center w-full h-16 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Building className="h-5 w-5 mr-2" />
                        <span>Create Organization</span>
                      </Button>
                    </div>

                    {/* Create User Button */}
                    <div>
                      <Button 
                        onClick={() => setShowNewUserDialog(true)}
                        className="flex items-center justify-center w-full h-16 bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        <UserPlus className="h-5 w-5 mr-2" />
                        <span>Create User</span>
                      </Button>
                    </div>

                    {/* Assign User Button */}
                    <div>
                      <Button 
                        onClick={() => setShowAssignUserDialog(true)}
                        className="flex items-center justify-center w-full h-16 bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Users className="h-5 w-5 mr-2" />
                        <span>Assign User to Org</span>
                      </Button>
                    </div>
                  </div>

                  <CreateOrganizationDialog
                    isOpen={showNewOrgDialog}
                    onOpenChange={setShowNewOrgDialog}
                    onSuccess={refreshData}
                  />

                  <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center">
                          <UserPlus className="h-5 w-5 mr-2 text-teal-600" />
                          Create New User
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                          Add a new user to the system
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label htmlFor="userEmail" className="text-sm font-medium text-slate-700">
                            Email Address*
                          </label>
                          <Input
                            id="userEmail"
                            type="email"
                            placeholder="user@example.com"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            className="border-slate-300"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label htmlFor="userFirstName" className="text-sm font-medium text-slate-700">
                              First Name*
                            </label>
                            <Input
                              id="userFirstName"
                              placeholder="First name"
                              value={newUserFirstName}
                              onChange={(e) => setNewUserFirstName(e.target.value)}
                              className="border-slate-300"
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="userLastName" className="text-sm font-medium text-slate-700">
                              Last Name*
                            </label>
                            <Input
                              id="userLastName"
                              placeholder="Last name"
                              value={newUserLastName}
                              onChange={(e) => setNewUserLastName(e.target.value)}
                              className="border-slate-300"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="userOrg" className="text-sm font-medium text-slate-700">
                            Organization (Optional)
                          </label>
                          <Select value={newUserOrg} onValueChange={setNewUserOrg}>
                            <SelectTrigger className="border-slate-300">
                              <SelectValue placeholder="Select an organization" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Organization</SelectItem>
                              {allOrganizations.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-700 border border-blue-100">
                          <div className="flex items-start">
                            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-blue-500" />
                            <span>
                              A temporary password will be generated, and the user will be prompted
                              to change it upon first login.
                            </span>
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowNewUserDialog(false)}
                          className="border-slate-300"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateUser} 
                          disabled={isCreatingUser}
                          className="bg-teal-600 hover:bg-teal-700"
                        >
                          {isCreatingUser ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Create User
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showAssignUserDialog} onOpenChange={setShowAssignUserDialog}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center">
                          <Users className="h-5 w-5 mr-2 text-purple-600" />
                          Assign User to Organization
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                          Change a user's organization membership
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label htmlFor="selectUser" className="text-sm font-medium text-slate-700">
                            Select User*
                          </label>
                          <Select value={selectedUser} onValueChange={setSelectedUser}>
                            <SelectTrigger className="border-slate-300">
                              <SelectValue placeholder="Choose a user" />
                            </SelectTrigger>
                            <SelectContent>
                              {allUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.first_name} {user.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="selectOrg" className="text-sm font-medium text-slate-700">
                            Select Organization*
                          </label>
                          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                            <SelectTrigger className="border-slate-300">
                              <SelectValue placeholder="Choose an organization" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Organization</SelectItem>
                              {allOrganizations.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter className="gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowAssignUserDialog(false)}
                          className="border-slate-300"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAssignUserToOrg} 
                          disabled={isAssigningUser}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {isAssigningUser ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Assigning...
                            </>
                          ) : (
                            <>
                              <Users className="h-4 w-4 mr-2" />
                              Assign User
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              {/* Admin View */}
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between bg-slate-800 text-white">
                  <div>
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 mr-2" />
                      <CardTitle>Administrator View</CardTitle>
                    </div>
                    <CardDescription className="text-slate-300">
                      Manage all users and organizations across the system
                    </CardDescription>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={refreshData}
                    disabled={isLoadingUsers || isLoadingOrgs}
                    className="bg-white/10 hover:bg-white/20 text-white"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${(isLoadingUsers || isLoadingOrgs) ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent className="p-6">
                  <Accordion type="single" collapsible className="w-full">
                    {/* Organizations Section */}
                    <AccordionItem 
                      value="organizations" 
                      className="border border-slate-200 rounded-md mb-4"
                    >
                      <AccordionTrigger className="text-base font-medium px-4 py-3 hover:bg-slate-50">
                        <div className="flex items-center text-slate-800">
                          <Building className="h-4 w-4 mr-2 text-blue-600" />
                          Organizations
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 px-4 pb-4">
                        {isLoadingOrgs ? (
                          <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                          </div>
                        ) : (
                          <div className="bg-white rounded-md overflow-hidden border border-slate-200 shadow-sm">
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                      Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                      Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                      Member Count
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                      ID
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                  {allOrganizations.map((org) => {
                                    // Count members of this organization
                                    const memberCount = allUsers.filter(u => u.organization_id === org.id).length;

                                    return (
                                      <tr key={org.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm font-medium text-slate-800">{org.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <span className={`px-2 py-1 text-xs font-medium rounded-md ${
                                            org.is_qig
                                              ? 'bg-blue-100 text-blue-800'
                                              : 'bg-slate-100 text-slate-700'
                                            }`}>
                                            {org.is_qig ? 'QIG Admin' : 'Regular'}
                                          </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm text-slate-600">{memberCount}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm text-slate-500 truncate max-w-xs">{org.id}</div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    {/* Users Section */}
                    <AccordionItem 
                      value="users" 
                      className="border border-slate-200 rounded-md"
                    >
                      <AccordionTrigger className="text-base font-medium px-4 py-3 hover:bg-slate-50">
                        <div className="flex items-center text-slate-800">
                          <Users className="h-4 w-4 mr-2 text-blue-600" />
                          Users
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 px-4 pb-4">
                        {isLoadingUsers ? (
                          <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                          </div>
                        ) : (
                          <>
                            {/* Filter Controls */}
                            <div className="mb-4 p-4 bg-slate-50 rounded-md border border-slate-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label htmlFor="userSearch" className="text-sm font-medium text-slate-700 flex items-center">
                                    <User className="h-4 w-4 mr-2 text-slate-500" />
                                    Search Users
                                  </label>
                                  <Input
                                    id="userSearch"
                                    placeholder="Search by name or email"
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    className="border-slate-300"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label htmlFor="orgFilter" className="text-sm font-medium text-slate-700 flex items-center">
                                    <Building className="h-4 w-4 mr-2 text-slate-500" />
                                    Filter by Organization
                                  </label>
                                  <Select value={orgFilter} onValueChange={setOrgFilter}>
                                    <SelectTrigger className="border-slate-300">
                                      <SelectValue placeholder="All Organizations" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All Organizations</SelectItem>
                                      <SelectItem value="none">No Organization</SelectItem>
                                      {allOrganizations.map((org) => (
                                        <SelectItem key={org.id} value={org.id}>
                                          {org.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            {/* Users Table */}
                            <div className="bg-white rounded-md overflow-hidden border border-slate-200 shadow-sm">
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                  <thead className="bg-slate-50">
                                    <tr>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Name
                                      </th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Email
                                      </th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Organization
                                      </th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-slate-100">
                                    {filteredUsers.map((userData) => (
                                      <tr key={userData.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                                              {userData.avatar_url ? (
                                                <img
                                                  src={userData.avatar_url}
                                                  alt={`${userData.first_name} ${userData.last_name}`}
                                                  className="h-full w-full object-cover"
                                                />
                                              ) : (
                                                <User className="h-4 w-4 text-slate-400" />
                                              )}
                                            </div>
                                            <div className="ml-4">
                                              <div className="text-sm font-medium text-slate-800">
                                                {userData.first_name} {userData.last_name}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm text-slate-600">{userData.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm text-slate-600">
                                            {(() => {
                                              const orgInfo = getUserOrgInfo(userData, allOrganizations);
                                              return (
                                                <span className="px-2 py-1 text-xs font-medium bg-slate-100 rounded-md">
                                                  {orgInfo.name || 'No Organization'}
                                                </span>
                                              );
                                            })()}
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedUser(userData.id);
                                              setSelectedOrg(userData.organization_id || '');
                                              setShowAssignUserDialog(true);
                                            }}
                                            className="border-slate-300 text-purple-600 hover:bg-slate-50 hover:text-purple-700"
                                          >
                                            <Users className="h-4 w-4 mr-1" />
                                            Reassign
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}