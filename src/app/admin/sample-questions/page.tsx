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
import { Trash2, Edit, Plus, Save, X, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { SampleQuestion } from '@/hooks/useSampleQuestions';

export default function SampleQuestionsAdmin() {
  const [questions, setQuestions] = useState<SampleQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  
  // New/edit question form
  const [formData, setFormData] = useState({
    question: '',
    category: '',
  });
  
  const { organization, user } = useAuth();
  const { toast } = useToast();
  
  // Load questions
  useEffect(() => {
    if (organization?.id) {
      fetchQuestions();
    }
  }, [organization?.id]);
  
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('sample_questions')
        .select('*')
        .eq('organization_id', organization?.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setQuestions(data || []);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data?.map(q => q.category).filter(Boolean))];
      setCategories(uniqueCategories as string[]);
    } catch (error) {
      console.error('Error fetching sample questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sample questions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveQuestion = async () => {
    if (!formData.question) {
      toast({
        title: 'Error',
        description: 'Question text is required',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const questionData = {
        question: formData.question,
        category: formData.category || null,
        organization_id: organization?.id,
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
      setFormData({ question: '', category: '' });
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
      setLoading(false);
    }
  };
  
  const handleDeleteQuestion = async (id: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      try {
        setLoading(true);
        
        const { error } = await supabase
          .from('sample_questions')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        
        // Update local state
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
        setLoading(false);
      }
    }
  };
  
  const handleEditQuestion = (question: SampleQuestion) => {
    setFormData({
      question: question.question,
      category: question.category || '',
    });
    setEditingQuestionId(question.id);
  };
  
  const handleCancelEdit = () => {
    setFormData({ question: '', category: '' });
    setEditingQuestionId(null);
  };
  
  const addCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setFormData({ ...formData, category: newCategory });
      setNewCategory('');
    }
  };
  
  // If not logged in or no organization, show message
  if (!user || !organization) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need to be logged in with an organization to manage sample questions.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Sample Questions Management</h1>
          <p className="text-gray-600">Add and manage sample questions for {organization.name}</p>
        </div>
        
        {/* Add/Edit Question Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{editingQuestionId ? 'Edit Question' : 'Add New Question'}</CardTitle>
            <CardDescription>
              {editingQuestionId 
                ? 'Update the question details below' 
                : 'Create a new sample question to display in the FastRAG and DeepRAG components'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Question Text</label>
                <Textarea 
                  placeholder="Enter the question text..."
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  rows={3}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <div className="flex gap-2">
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                                          <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {/* FastRAG categories */}
                        <SelectItem value="Contract">Contract</SelectItem>
                        <SelectItem value="Document">Document</SelectItem>
                        <SelectItem value="Policy">Policy</SelectItem>
                        {/* DeepRAG categories */}
                        <SelectItem value="Analysis">Analysis</SelectItem>
                        <SelectItem value="Comparison">Comparison</SelectItem>
                        <SelectItem value="Extraction">Extraction</SelectItem>
                        {/* Custom categories */}
                        {categories
                          .filter(category => !['Contract', 'Document', 'Policy', 'Analysis', 'Comparison', 'Extraction'].includes(category))
                          .map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  
                  <div className="flex gap-2">
                    <Input 
                      placeholder="New category..."
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-40"
                    />
                    <Button variant="outline" onClick={addCategory} disabled={!newCategory}>
                      <Plus size={16} className="mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            {editingQuestionId ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X size={16} className="mr-1" />
                  Cancel
                </Button>
                <Button onClick={handleSaveQuestion} disabled={loading}>
                  {loading ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Save size={16} className="mr-1" />}
                  Update Question
                </Button>
              </>
            ) : (
              <Button onClick={handleSaveQuestion} disabled={loading} className="ml-auto">
                {loading ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Plus size={16} className="mr-1" />}
                Add Question
              </Button>
            )}
          </CardFooter>
        </Card>
        
        {/* Questions List */}
        <Card>
          <CardHeader>
            <CardTitle>Sample Questions</CardTitle>
            <CardDescription>
              {questions.length} questions available for {organization.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No sample questions yet. Add your first question above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-medium">{question.question}</TableCell>
                                      <TableCell>
                      {question.category ? (
                        <Badge 
                          variant="outline" 
                          className={
                            // FastRAG categories
                            question.category === 'Contract' || 
                            question.category === 'Document' || 
                            question.category === 'Policy' 
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                            // DeepRAG categories
                            : question.category === 'Analysis' || 
                              question.category === 'Comparison' || 
                              question.category === 'Extraction'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                            // Other categories
                            : ''
                          }
                        >
                          {question.category}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">None</span>
                      )}
                    </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(question.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditQuestion(question)}>
                            <Edit size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteQuestion(question.id)}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 