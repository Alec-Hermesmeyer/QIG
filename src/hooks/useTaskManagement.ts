'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseServiceStatusService, Task, TaskUpdate, TaskDependency, TaskStatus, TaskPriority } from '@/services/supabaseServiceStatusService';

export interface UseTaskManagementOptions {
  serviceId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseTaskManagementReturn {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTask: (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<Task>;
  updateTask: (id: string, taskData: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<boolean>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<boolean>;
  getTasksByStatus: (status: TaskStatus) => Task[];
  getTasksByPriority: (priority: TaskPriority) => Task[];
  getTasksByAssignee: (assigneeId: string) => Task[];
  getOverdueTasks: () => Task[];
}

export function useTaskManagement(options: UseTaskManagementOptions = {}): UseTaskManagementReturn {
  const { serviceId, autoRefresh = false, refreshInterval = 30000 } = options;
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use refs to track mounted state and prevent race conditions
  const isMountedRef = useRef(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const loadTasks = useCallback(async () => {
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // Set loading with a timeout to prevent infinite loading
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    // Set a timeout to force loading to false if it takes too long
    loadingTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsLoading(false);
        setError('Request timed out. Please try refreshing the page.');
      }
    }, 30000); // 30 second timeout

    try {
      const taskData = serviceId 
        ? await supabaseServiceStatusService.getServiceTasks(serviceId)
        : await supabaseServiceStatusService.getAllTasks();
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setTasks(taskData);
        setError(null);
        retryCountRef.current = 0; // Reset retry count on success
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks';
        console.error('Task loading error:', err);
        
        // Implement retry logic for failed requests
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          console.log(`Retrying task fetch (attempt ${retryCountRef.current}/${maxRetries})`);
          
          // Retry with exponential backoff
          setTimeout(() => {
            if (isMountedRef.current) {
              loadTasks();
            }
          }, Math.pow(2, retryCountRef.current) * 1000);
          return;
        }
        
        setError(errorMessage);
      }
    } finally {
      // Clear timeout and set loading to false
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [serviceId]); // Only include serviceId in dependencies

  // Initial load with proper cleanup
  useEffect(() => {
    isMountedRef.current = true;
    loadTasks();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [serviceId]); // Re-run when serviceId changes

  // Auto-refresh interval with proper cleanup
  useEffect(() => {
    if (!autoRefresh || !isMountedRef.current) return;

    const interval = setInterval(() => {
      if (isMountedRef.current && !isLoading) {
        loadTasks();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isLoading, loadTasks]);

  const createTask = useCallback(async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newTask = await supabaseServiceStatusService.saveTask(taskData);
      // Only refresh if component is still mounted
      if (isMountedRef.current) {
        await loadTasks();
      }
      return newTask;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      throw err;
    }
  }, [loadTasks]);

  const updateTask = useCallback(async (id: string, taskData: Partial<Task>) => {
    try {
      const existingTask = await supabaseServiceStatusService.getTaskById(id);
      if (!existingTask) {
        throw new Error('Task not found');
      }
      
      const updatedTask = await supabaseServiceStatusService.saveTask({ 
        ...existingTask, 
        ...taskData, 
        id 
      });
      
      // Only refresh if component is still mounted
      if (isMountedRef.current) {
        await loadTasks();
      }
      return updatedTask;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      throw err;
    }
  }, [loadTasks]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const success = await supabaseServiceStatusService.deleteTask(id);
      if (success && isMountedRef.current) {
        await loadTasks();
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      throw err;
    }
  }, [loadTasks]);

  const updateTaskStatus = useCallback(async (id: string, status: TaskStatus) => {
    try {
      const success = await supabaseServiceStatusService.updateTaskStatus(id, status);
      if (success && isMountedRef.current) {
        await loadTasks();
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task status';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      throw err;
    }
  }, [loadTasks]);

  // Filter functions
  const getTasksByStatus = useCallback((status: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  }, [tasks]);

  const getTasksByPriority = useCallback((priority: TaskPriority) => {
    return tasks.filter(task => task.priority === priority);
  }, [tasks]);

  const getTasksByAssignee = useCallback((assigneeId: string) => {
    return tasks.filter(task => task.assignee_id === assigneeId);
  }, [tasks]);

  const getOverdueTasks = useCallback(() => {
    const now = new Date();
    return tasks.filter(task => 
      task.due_date && 
      new Date(task.due_date) < now && 
      task.status !== 'DONE' && 
      task.status !== 'CANCELLED'
    );
  }, [tasks]);

  const refresh = useCallback(async () => {
    if (isMountedRef.current) {
      retryCountRef.current = 0; // Reset retry count on manual refresh
      await loadTasks();
    }
  }, [loadTasks]);

  return {
    tasks,
    isLoading,
    error,
    refresh,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    getTasksByStatus,
    getTasksByPriority,
    getTasksByAssignee,
    getOverdueTasks
  };
}

// Hook for task details with updates
export function useTaskDetails(taskId: string) {
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTaskDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [taskUpdates, taskDependencies] = await Promise.all([
        supabaseServiceStatusService.getTaskUpdates(taskId),
        supabaseServiceStatusService.getTaskDependencies(taskId)
      ]);
      
      setUpdates(taskUpdates);
      setDependencies(taskDependencies);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task details');
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId) {
      loadTaskDetails();
    }
  }, [taskId, loadTaskDetails]);

  const addUpdate = useCallback(async (update: Omit<TaskUpdate, 'id' | 'created_at'>) => {
    try {
      await supabaseServiceStatusService.addTaskUpdate({ ...update, task_id: taskId });
      await loadTaskDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add task update');
      throw err;
    }
  }, [taskId, loadTaskDetails]);

  const addDependency = useCallback(async (dependsOnTaskId: string) => {
    try {
      await supabaseServiceStatusService.addTaskDependency(taskId, dependsOnTaskId);
      await loadTaskDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add task dependency');
      throw err;
    }
  }, [taskId, loadTaskDetails]);

  const removeDependency = useCallback(async (dependsOnTaskId: string) => {
    try {
      await supabaseServiceStatusService.removeTaskDependency(taskId, dependsOnTaskId);
      await loadTaskDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove task dependency');
      throw err;
    }
  }, [taskId, loadTaskDetails]);

  return {
    updates,
    dependencies,
    isLoading,
    error,
    addUpdate,
    addDependency,
    removeDependency,
    refresh: loadTaskDetails
  };
}

// Hook for task analytics and metrics
export function useTaskAnalytics(serviceId?: string) {
  const { tasks } = useTaskManagement({ serviceId });
  
  const calculateAnalytics = useCallback(() => {
    const totalTasks = tasks.length;
    
    // Task completion metrics
    const completedTasks = tasks.filter(t => t.status === 'DONE').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // Status distribution
    const tasksByStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<TaskStatus, number>);
    
    // Priority distribution
    const tasksByPriority = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<TaskPriority, number>);
    
    // Overdue tasks
    const now = new Date();
    const overdueTasks = tasks.filter(task => 
      task.due_date && 
      new Date(task.due_date) < now && 
      task.status !== 'DONE' && 
      task.status !== 'CANCELLED'
    );
    
    // Average completion time for completed tasks
    const completedTasksWithTimes = tasks.filter(task => 
      task.status === 'DONE' && task.completed_at && task.created_at
    );
    
    const totalCompletionTime = completedTasksWithTimes.reduce((sum, task) => {
      const created = new Date(task.created_at).getTime();
      const completed = new Date(task.completed_at!).getTime();
      return sum + (completed - created);
    }, 0);
    
    const averageCompletionTime = completedTasksWithTimes.length > 0 
      ? totalCompletionTime / (completedTasksWithTimes.length * 24 * 60 * 60 * 1000) // Convert to days
      : 0;
    
    // Time tracking
    const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
    const totalActualHours = tasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0);
    const timeAccuracy = totalEstimatedHours > 0 
      ? ((totalEstimatedHours - Math.abs(totalEstimatedHours - totalActualHours)) / totalEstimatedHours) * 100
      : 0;
    
    return {
      totalTasks,
      completedTasks,
      completionRate,
      tasksByStatus,
      tasksByPriority,
      overdueTasks: overdueTasks.length,
      averageCompletionTime,
      totalEstimatedHours,
      totalActualHours,
      timeAccuracy
    };
  }, [tasks]);
  
  return calculateAnalytics();
} 