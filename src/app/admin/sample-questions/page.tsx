'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  Edit, 
  Plus, 
  Save, 
  X, 
  Loader2, 
  Building2, 
  Filter, 
  MessageSquare,
  Tag,
  Calendar,
  Search,
  FileQuestion,
  Sparkles,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { SampleQuestion } from '@/hooks/useSampleQuestions';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Organization {
  id: string;
  name: string;
  theme_color: string;
}

interface QuestionWithOrg extends SampleQuestion {
  organization_name?: string;
}

export default function SampleQuestionsAdmin() {
  const [questions, setQuestions] = useState<QuestionWithOrg[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // New/edit question form
  const [formData, setFormData] = useState({
    question: '',
    category: '',
    organization_id: '',
  });
  
  const { organization, user } = useAuth();
  const { toast } = useToast();
  
  // Check if user is QIG admin
  const isQIGAdmin = organization?.name === 'QIG';
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  // Load organizations and questions
  useEffect(() => {
    fetchOrganizations();
    fetchQuestions();
  }, []);
  
  // Set default organization for non-QIG users
  useEffect(() => {
    if (!isQIGAdmin && organization?.id && !formData.organization_id) {
      setFormData(prev => ({ ...prev, organization_id: organization.id }));
    }
  }, [isQIGAdmin, organization?.id, formData.organization_id]);
  
  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, theme_color')
        .order('name');
        
      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };
  
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching sample questions...');
      
      let query = supabase
        .from('sample_questions')
        .select('*')
        .order('created_at', { ascending: false });
        
      // If not QIG admin, only show questions for their organization
      if (!isQIGAdmin && organization?.id) {
        query = query.eq('organization_id', organization.id);
        console.log('Filtering for organization:', organization.id);
      }
        
      const { data, error } = await query;
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log('Raw questions data:', data);
      
      // If we have questions, try to get organization names separately
      if (data && data.length > 0) {
        const orgIds = [...new Set(data.map(q => q.organization_id))];
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds);
          
        if (orgsError) {
          console.error('Organizations error:', orgsError);
        }
        
        console.log('Organizations data:', orgsData);
        
        // Transform data to include organization name
        const questionsWithOrg = data.map(q => ({
          ...q,
          organization_name: orgsData?.find(org => org.id === q.organization_id)?.name || 'Unknown'
        }));
        
        setQuestions(questionsWithOrg);
      } else {
        setQuestions([]);
      }
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data?.map(q => q.category).filter(Boolean))];
      setCategories(uniqueCategories as string[]);
      
      console.log('Final questions:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching sample questions:', error);
      toast({
        title: 'Error',
        description: `Failed to load sample questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveQuestion = async () => {
    if (!formData.question.trim()) {
      toast({
        title: 'Error',
        description: 'Question text is required',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.organization_id) {
      toast({
        title: 'Error',
        description: 'Please select an organization',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setSaving(true);
      
      const questionData = {
        question: formData.question.trim(),
        category: formData.category && formData.category !== "none" ? formData.category : null,
        organization_id: formData.organization_id,
      };
      
      if (editingQuestionId) {
        // Update existing question
        const { error } = await supabase
          .from('sample_questions')
          .update(questionData)
          .eq('id', editingQuestionId);
          
        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Question updated successfully',
        });
      } else {
        // Add new question
        const { error } = await supabase
          .from('sample_questions')
          .insert([questionData]);
          
        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Question added successfully',
        });
      }
      
      // Reset form
      setFormData({ question: '', category: '', organization_id: isQIGAdmin ? '' : organization?.id || '' });
      setEditingQuestionId(null);
      
      // Refresh questions list
      fetchQuestions();
      
      // Add new category to list if it's new
      if (formData.category && !categories.includes(formData.category)) {
        setCategories([...categories, formData.category]);
      }
    } catch (error) {
      console.error('Error saving sample question:', error);
      toast({
        title: 'Error',
        description: 'Failed to save question',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (id: string, questionText: string) => {
    if (confirm(`Are you sure you want to delete this question?\n\n"${questionText}"`)) {
      try {
        setSaving(true);
        
        const { error } = await supabase
          .from('sample_questions')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        
        // Update local state with animation
        setQuestions(questions.filter(q => q.id !== id));
        
        toast({
          title: 'Success',
          description: 'Question deleted successfully',
        });
      } catch (error) {
        console.error('Error deleting sample question:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete question',
          variant: 'destructive',
        });
      } finally {
        setSaving(false);
      }
    }
  };
  
  const handleEditQuestion = (question: QuestionWithOrg) => {
    setFormData({
      question: question.question,
      category: question.category || '',
      organization_id: question.organization_id || '',
    });
    setEditingQuestionId(question.id);
  };
  
  const handleCancelEdit = () => {
    setFormData({ 
      question: '', 
      category: '', 
      organization_id: isQIGAdmin ? '' : organization?.id || ''
    });
    setEditingQuestionId(null);
  };
  
  const addCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const trimmedCategory = newCategory.trim();
      setCategories([...categories, trimmedCategory]);
      setFormData({ ...formData, category: trimmedCategory });
      setNewCategory('');
      toast({
        title: 'Category added',
        description: `"${trimmedCategory}" category has been added`,
      });
    }
  };

  // If not logged in or no organization, show message
  if (!user || !organization) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen flex-col items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="w-full max-w-md shadow-lg">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-xl">Access Denied</CardTitle>
                <CardDescription>
                  You need to be logged in with an organization to manage sample questions.
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        </div>
      </ProtectedRoute>
    );
  }

  // Filter questions based on search, organization, and category
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOrg = selectedOrgFilter === 'all' || q.organization_id === selectedOrgFilter;
    const matchesCategory = selectedCategory === 'all' || q.category === selectedCategory;
    return matchesSearch && matchesOrg && matchesCategory;
  });

  const getCategoryBadgeStyle = (category: string) => {
    const styles = {
      'Contract': 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      'Document': 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      'Policy': 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
      'Analysis': 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
      'Comparison': 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
      'Extraction': 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
    };
    return styles[category as keyof typeof styles] || 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <motion.div 
          className="max-w-7xl mx-auto p-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div 
            className="mb-8"
            variants={itemVariants}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileQuestion className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Sample Questions Management</h1>
                <p className="text-gray-600 mt-1">
                  {isQIGAdmin 
                    ? 'Create and manage sample questions across all organizations' 
                    : `Manage sample questions for ${organization.name}`
                  }
                </p>
              </div>
            </div>
          </motion.div>

          {/* Filters Section - Enhanced for QIG admins */}
          {isQIGAdmin && (
            <motion.div variants={itemVariants}>
              <Card className="mb-6 shadow-sm border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Filter className="w-5 h-5 text-blue-600" />
                    Filters & Search
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search questions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Organization Filter */}
                    <Select value={selectedOrgFilter} onValueChange={setSelectedOrgFilter}>
                      <SelectTrigger>
                        <Building2 className="w-4 h-4 mr-2 text-gray-500" />
                        <SelectValue placeholder="All Organizations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Organizations</SelectItem>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Category Filter */}
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <Tag className="w-4 h-4 mr-2 text-gray-500" />
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          
          {/* Add/Edit Question Form */}
          <motion.div variants={itemVariants}>
            <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {editingQuestionId ? (
                      <Edit className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Plus className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      {editingQuestionId ? 'Edit Question' : 'Add New Question'}
                    </CardTitle>
                    <CardDescription>
                      {editingQuestionId 
                        ? 'Update the question details below' 
                        : 'Create a new sample question to display in the FastRAG and DeepRAG components'
                      }
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Organization Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Organization
                    </label>
                    <Select
                      value={formData.organization_id}
                      onValueChange={(value) => setFormData({ ...formData, organization_id: value })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select an organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {isQIGAdmin ? (
                          // QIG admins can assign to any organization
                          organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: org.theme_color || '#3B82F6' }}
                                />
                                <span>{org.name}</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          // Regular users can only assign to their own organization
                          <SelectItem value={organization.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: organization.theme_color || '#3B82F6' }}
                              />
                              <span>{organization.name}</span>
                            </div>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Question Text */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Question Text
                    </label>
                    <Textarea 
                      placeholder="Enter a compelling question that users might ask..."
                      value={formData.question}
                      onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                  
                  {/* Category Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Category
                    </label>
                    <div className="flex gap-3">
                      <Select
                        value={formData.category || "none"}
                        onValueChange={(value) => setFormData({ ...formData, category: value === "none" ? "" : value })}
                      >
                        <SelectTrigger className="flex-1 h-11">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-gray-500">No Category</span>
                          </SelectItem>
                          <div className="h-px my-1 bg-gray-200" />
                          
                          {/* Predefined categories with icons */}
                          <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            FastRAG Categories
                          </div>
                          <SelectItem value="Contract">📄 Contract</SelectItem>
                          <SelectItem value="Document">📋 Document</SelectItem>
                          <SelectItem value="Policy">📜 Policy</SelectItem>
                          
                          <div className="h-px my-1 bg-gray-200" />
                          <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            DeepRAG Categories
                          </div>
                          <SelectItem value="Analysis">🔍 Analysis</SelectItem>
                          <SelectItem value="Comparison">⚖️ Comparison</SelectItem>
                          <SelectItem value="Extraction">📊 Extraction</SelectItem>
                          
                          {/* Custom categories */}
                          {categories
                            .filter(category => !['Contract', 'Document', 'Policy', 'Analysis', 'Comparison', 'Extraction'].includes(category))
                            .length > 0 && (
                              <>
                                <div className="h-px my-1 bg-gray-200" />
                                <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                  Custom Categories
                                </div>
                                {categories
                                  .filter(category => !['Contract', 'Document', 'Policy', 'Analysis', 'Comparison', 'Extraction'].includes(category))
                                  .map((category) => (
                                    <SelectItem key={category} value={category}>
                                      🏷️ {category}
                                    </SelectItem>
                                  ))}
                              </>
                          )}
                        </SelectContent>
                      </Select>
                      
                      <div className="flex gap-2">
                        <Input 
                          placeholder="New category..."
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          className="w-40"
                          onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                        />
                        <Button 
                          variant="outline" 
                          onClick={addCategory} 
                          disabled={!newCategory.trim()}
                          className="whitespace-nowrap"
                        >
                          <Plus size={16} className="mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 rounded-b-lg px-6 py-4">
                <div className="flex justify-between items-center w-full">
                  {editingQuestionId ? (
                    <>
                      <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                        <X size={16} className="mr-2" />
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSaveQuestion} 
                        disabled={saving || !formData.question.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {saving ? (
                          <Loader2 size={16} className="mr-2 animate-spin" />
                        ) : (
                          <Save size={16} className="mr-2" />
                        )}
                        Update Question
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={handleSaveQuestion} 
                      disabled={saving || !formData.question.trim()}
                      className="ml-auto bg-blue-600 hover:bg-blue-700"
                    >
                      {saving ? (
                        <Loader2 size={16} className="mr-2 animate-spin" />
                      ) : (
                        <Sparkles size={16} className="mr-2" />
                      )}
                      Add Question
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          </motion.div>
          
          {/* Questions List */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <MessageSquare className="w-5 h-5 text-gray-600" />
                      Sample Questions
                      {filteredQuestions.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {filteredQuestions.length}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {searchQuery ? (
                        <>Showing {filteredQuestions.length} results for "{searchQuery}"</>
                      ) : (
                        <>
                          {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''} 
                          {selectedOrgFilter === 'all' ? ' across all organizations' : ` for ${organizations.find(o => o.id === selectedOrgFilter)?.name || organization.name}`}
                        </>
                      )}
                    </CardDescription>
                  </div>
                  {filteredQuestions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-sm font-normal">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date().toLocaleDateString()}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="text-gray-500">Loading questions...</p>
                  </div>
                ) : filteredQuestions.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <FileQuestion className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {searchQuery ? 'No matching questions found' : 'No sample questions yet'}
                      </h3>
                      <p className="text-gray-500">
                        {searchQuery 
                          ? `No questions match "${searchQuery}". Try adjusting your search or filters.`
                          : 'Get started by adding your first sample question above.'
                        }
                      </p>
                    </div>
                    {searchQuery && (
                      <Button 
                        variant="outline" 
                        onClick={() => setSearchQuery('')}
                        className="mt-4"
                      >
                        Clear Search
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="font-semibold">Question</TableHead>
                          {isQIGAdmin && <TableHead className="font-semibold">Organization</TableHead>}
                          <TableHead className="font-semibold">Category</TableHead>
                          <TableHead className="font-semibold">Created</TableHead>
                          <TableHead className="w-20 font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {filteredQuestions.map((question, index) => (
                            <motion.tr
                              key={question.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                              className="hover:bg-blue-50/50 transition-colors duration-200"
                            >
                              <TableCell className="font-medium max-w-md py-4">
                                <div className="flex items-start gap-3">
                                  <div className="mt-1 p-1 bg-blue-100 rounded">
                                    <MessageSquare className="w-3 h-3 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 leading-relaxed">
                                      {question.question}
                                    </div>
                                    {question.question.length > 80 && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {question.question.length} characters
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              {isQIGAdmin && (
                                <TableCell className="py-4">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full"
                                      style={{ 
                                        backgroundColor: organizations.find(o => o.id === question.organization_id)?.theme_color || '#3B82F6' 
                                      }}
                                    />
                                    <span className="font-medium text-gray-700">
                                      {question.organization_name}
                                    </span>
                                  </div>
                                </TableCell>
                              )}
                              <TableCell className="py-4">
                                {question.category ? (
                                  <Badge 
                                    variant="outline" 
                                    className={`${getCategoryBadgeStyle(question.category)} transition-colors duration-200`}
                                  >
                                    {question.category}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400 text-sm italic">No category</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-gray-500 py-4">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(question.created_at).toLocaleDateString()}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleEditQuestion(question)}
                                    className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                                    disabled={saving}
                                  >
                                    <Edit size={14} />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleDeleteQuestion(question.id, question.question)}
                                    className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                                    disabled={saving}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </ProtectedRoute>
  );
} 