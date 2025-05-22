import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';

export interface SampleQuestion {
  id: string;
  organization_id: string;
  question: string;
  category: string | null;
  created_at: string;
}

export const useSampleQuestions = () => {
  const [sampleQuestions, setSampleQuestions] = useState<SampleQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { organization } = useAuth();

  useEffect(() => {
    const fetchSampleQuestions = async () => {
      if (!organization?.id) {
        console.log('No organization ID found, cannot fetch sample questions');
        setSampleQuestions([]);
        setLoading(false);
        return;
      }

      console.log(`Fetching sample questions for organization ${organization.id}`);

      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('sample_questions')
          .select('*')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase error fetching sample questions:', error);
          throw new Error(error.message);
        }

        console.log(`Fetched ${data?.length || 0} sample questions from Supabase:`, data);
        setSampleQuestions(data || []);
      } catch (err) {
        console.error('Error fetching sample questions:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch sample questions'));
      } finally {
        setLoading(false);
      }
    };

    fetchSampleQuestions();
  }, [organization?.id]);

  return { sampleQuestions, loading, error };
}; 