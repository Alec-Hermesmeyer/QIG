'use client';

import { createClient } from '@supabase/supabase-js';
import { 
  QIGService, 
  ServiceUpdate, 
  ServiceMetrics, 
  ServiceStatus, 
  ServiceCategory, 
  ServicePriority,
  UpdateType 
} from '@/types/services';

// Task types
export interface Task {
  id: string;
  service_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string;
  assignee_name?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  completed_at?: string;
  tags: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskUpdate {
  id: string;
  task_id: string;
  content: string;
  type: TaskUpdateType;
  author_id?: string;
  author_name?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'TESTING' | 'DONE' | 'BLOCKED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskUpdateType = 'COMMENT' | 'STATUS_CHANGE' | 'ASSIGNMENT' | 'TIME_LOG' | 'ATTACHMENT';

// Supabase database service types
interface DBService {
  id: string;
  service_name?: string;  // This is the actual column in your database
  display_name?: string;  // This is the actual column in your database
  name?: string;          // Keep this as optional fallback
  description?: string;
  category: ServiceCategory;
  status: ServiceStatus;
  progress: number;
  priority: ServicePriority;
  team?: string;
  owner?: string;
  key_features: string[];
  dependencies: string[];
  technical_stack: string[];
  client_facing: boolean;
  internal_only: boolean;
  documentation_url?: string;
  demo_url?: string;
  tags: string[];
  target_launch_date?: string;
  actual_launch_date?: string;
  created_at: string;
  updated_at: string;
}

interface DBServiceUpdate {
  id: string;
  service_id: string;
  title: string;
  description?: string;
  type: UpdateType;
  author: string;
  version?: string;
  created_at: string;
}

class SupabaseServiceStatusService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  // Convert DB service to QIG service format
  private dbServiceToQIG(dbService: DBService): QIGService {
    return {
      id: dbService.id,
      name: dbService.service_name || dbService.display_name || dbService.name || 'Unnamed Service',
      description: dbService.description || '',
      category: dbService.category,
      status: dbService.status,
      progress: dbService.progress,
      priority: dbService.priority,
      team: dbService.team || '',
      owner: dbService.owner || '',
      keyFeatures: dbService.key_features,
      dependencies: dbService.dependencies,
      technicalStack: dbService.technical_stack,
      clientFacing: dbService.client_facing,
      internalOnly: dbService.internal_only,
      documentation: dbService.documentation_url,
      demoUrl: dbService.demo_url,
      tags: dbService.tags,
      targetLaunchDate: dbService.target_launch_date,
      actualLaunchDate: dbService.actual_launch_date,
      createdAt: dbService.created_at,
      lastUpdated: dbService.updated_at
    };
  }

  // Convert QIG service to DB format
  private qigServiceToDB(service: Partial<QIGService>): Partial<DBService> {
    return {
      service_name: service.name,  // Map name to service_name
      display_name: service.name,  // Also set display_name for consistency
      description: service.description,
      category: service.category,
      status: service.status,
      progress: service.progress,
      priority: service.priority,
      team: service.team,
      owner: service.owner,
      key_features: service.keyFeatures || [],
      dependencies: service.dependencies || [],
      technical_stack: service.technicalStack || [],
      client_facing: service.clientFacing || false,
      internal_only: service.internalOnly || false,
      documentation_url: service.documentation,
      demo_url: service.demoUrl,
      tags: service.tags || [],
      target_launch_date: service.targetLaunchDate,
      actual_launch_date: service.actualLaunchDate
    };
  }

  // Convert DB service update to ServiceUpdate format
  private dbUpdateToServiceUpdate(dbUpdate: DBServiceUpdate): ServiceUpdate {
    return {
      id: dbUpdate.id,
      serviceId: dbUpdate.service_id,
      title: dbUpdate.title,
      description: dbUpdate.description || '',
      type: dbUpdate.type,
      author: dbUpdate.author,
      version: dbUpdate.version,
      timestamp: dbUpdate.created_at
    };
  }

  /**
   * Get all services
   */
  async getAllServices(): Promise<QIGService[]> {
    try {
      const { data, error } = await this.supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.dbServiceToQIG);
    } catch (error) {
      console.error('Error loading services:', error);
      throw error;
    }
  }

  /**
   * Get service by ID
   */
  async getServiceById(id: string): Promise<QIGService | null> {
    try {
      const { data, error } = await this.supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return this.dbServiceToQIG(data);
    } catch (error) {
      console.error('Error loading service:', error);
      return null;
    }
  }

  /**
   * Get services by status
   */
  async getServicesByStatus(status: ServiceStatus): Promise<QIGService[]> {
    try {
      const { data, error } = await this.supabase
        .from('services')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.dbServiceToQIG);
    } catch (error) {
      console.error('Error loading services by status:', error);
      return [];
    }
  }

  /**
   * Get services by category
   */
  async getServicesByCategory(category: ServiceCategory): Promise<QIGService[]> {
    try {
      const { data, error } = await this.supabase
        .from('services')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.dbServiceToQIG);
    } catch (error) {
      console.error('Error loading services by category:', error);
      return [];
    }
  }

  /**
   * Create or update service
   */
  async saveService(service: Omit<QIGService, 'id' | 'createdAt' | 'lastUpdated'> & { id?: string }): Promise<QIGService> {
    try {
      const dbService = this.qigServiceToDB(service);

      if (service.id) {
        // Update existing service
        const { data, error } = await this.supabase
          .from('services')
          .update(dbService)
          .eq('id', service.id)
          .select()
          .single();

        if (error) throw error;
        return this.dbServiceToQIG(data);
      } else {
        // Create new service
        const { data, error } = await this.supabase
          .from('services')
          .insert([dbService])
          .select()
          .single();

        if (error) throw error;
        return this.dbServiceToQIG(data);
      }
    } catch (error) {
      console.error('Error saving service:', error);
      throw error;
    }
  }

  /**
   * Delete service
   */
  async deleteService(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting service:', error);
      return false;
    }
  }

  /**
   * Update service status
   */
  async updateServiceStatus(id: string, status: ServiceStatus, progress?: number): Promise<boolean> {
    try {
      const updateData: any = { status };
      
      if (progress !== undefined) {
        updateData.progress = Math.max(0, Math.min(100, progress));
      }

      // Set launch date if going live
      if (status === 'LIVE') {
        updateData.actual_launch_date = new Date().toISOString();
      }

      const { error } = await this.supabase
        .from('services')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating service status:', error);
      return false;
    }
  }

  /**
   * Get all service updates
   */
  async getAllUpdates(): Promise<ServiceUpdate[]> {
    try {
      const { data, error } = await this.supabase
        .from('service_updates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.dbUpdateToServiceUpdate);
    } catch (error) {
      console.error('Error loading updates:', error);
      return [];
    }
  }

  /**
   * Get updates for a specific service
   */
  async getServiceUpdates(serviceId: string): Promise<ServiceUpdate[]> {
    try {
      const { data, error } = await this.supabase
        .from('service_updates')
        .select('*')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.dbUpdateToServiceUpdate);
    } catch (error) {
      console.error('Error loading service updates:', error);
      return [];
    }
  }

  /**
   * Add service update
   */
  async addServiceUpdate(update: Omit<ServiceUpdate, 'id' | 'timestamp'>): Promise<ServiceUpdate> {
    try {
      const { data, error } = await this.supabase
        .from('service_updates')
        .insert([{
          service_id: update.serviceId,
          title: update.title,
          description: update.description,
          type: update.type,
          author: update.author,
          version: update.version
        }])
        .select()
        .single();

      if (error) throw error;
      return this.dbUpdateToServiceUpdate(data);
    } catch (error) {
      console.error('Error adding service update:', error);
      throw error;
    }
  }

  /**
   * Get service metrics and analytics
   */
  async getServiceMetrics(): Promise<ServiceMetrics> {
    try {
      const services = await this.getAllServices();
      const updates = await this.getAllUpdates();

      // Count services by status
      const servicesByStatus = services.reduce((acc, service) => {
        acc[service.status] = (acc[service.status] || 0) + 1;
        return acc;
      }, {} as Record<ServiceStatus, number>);

      // Count services by category
      const servicesByCategory = services.reduce((acc, service) => {
        acc[service.category] = (acc[service.category] || 0) + 1;
        return acc;
      }, {} as Record<ServiceCategory, number>);

      // Calculate completion rate
      const totalProgress = services.reduce((sum, service) => sum + service.progress, 0);
      const completionRate = services.length > 0 ? totalProgress / services.length : 0;

      // Get upcoming deadlines (services with target launch dates in next 30 days)
      const thirtyDaysFromNow = Date.now() + (30 * 24 * 60 * 60 * 1000);
      const upcomingDeadlines = services
        .filter(service => 
          service.targetLaunchDate && 
          new Date(service.targetLaunchDate).getTime() <= thirtyDaysFromNow &&
          service.status !== 'LIVE'
        )
        .sort((a, b) => 
          new Date(a.targetLaunchDate!).getTime() - new Date(b.targetLaunchDate!).getTime()
        );

      // Get recent updates (last 10)
      const recentUpdates = updates.slice(0, 10);

      return {
        totalServices: services.length,
        servicesByStatus,
        servicesByCategory,
        completionRate,
        upcomingDeadlines,
        recentUpdates
      };
    } catch (error) {
      console.error('Error getting service metrics:', error);
      throw error;
    }
  }

  /**
   * Search services
   */
  async searchServices(query: string): Promise<QIGService[]> {
    try {
      const { data, error } = await this.supabase
        .from('services')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.dbServiceToQIG);
    } catch (error) {
      console.error('Error searching services:', error);
      return [];
    }
  }

  // TASK MANAGEMENT METHODS

  /**
   * Get all tasks for a service
   */
  async getServiceTasks(serviceId: string): Promise<Task[]> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading service tasks:', error);
      return [];
    }
  }

  /**
   * Get all tasks
   */
  async getAllTasks(): Promise<Task[]> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading tasks:', error);
      return [];
    }
  }

  /**
   * Get task by ID
   */
  async getTaskById(id: string): Promise<Task | null> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error loading task:', error);
      return null;
    }
  }

  /**
   * Create or update task
   */
  async saveTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<Task> {
    try {
      if (task.id) {
        // Update existing task
        const { data, error } = await this.supabase
          .from('tasks')
          .update(task)
          .eq('id', task.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new task
        const { data, error } = await this.supabase
          .from('tasks')
          .insert([task])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error saving task:', error);
      throw error;
    }
  }

  /**
   * Delete task
   */
  async deleteTask(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(id: string, status: TaskStatus): Promise<boolean> {
    try {
      const updateData: any = { status };
      
      if (status === 'DONE') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await this.supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating task status:', error);
      return false;
    }
  }

  /**
   * Get task updates
   */
  async getTaskUpdates(taskId: string): Promise<TaskUpdate[]> {
    try {
      const { data, error } = await this.supabase
        .from('task_updates')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading task updates:', error);
      return [];
    }
  }

  /**
   * Add task update
   */
  async addTaskUpdate(update: Omit<TaskUpdate, 'id' | 'created_at'>): Promise<TaskUpdate> {
    try {
      const { data, error } = await this.supabase
        .from('task_updates')
        .insert([update])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding task update:', error);
      throw error;
    }
  }

  /**
   * Get task dependencies
   */
  async getTaskDependencies(taskId: string): Promise<TaskDependency[]> {
    try {
      const { data, error } = await this.supabase
        .from('task_dependencies')
        .select('*')
        .eq('task_id', taskId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading task dependencies:', error);
      return [];
    }
  }

  /**
   * Add task dependency
   */
  async addTaskDependency(taskId: string, dependsOnTaskId: string): Promise<TaskDependency> {
    try {
      const { data, error } = await this.supabase
        .from('task_dependencies')
        .insert([{ task_id: taskId, depends_on_task_id: dependsOnTaskId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding task dependency:', error);
      throw error;
    }
  }

  /**
   * Remove task dependency
   */
  async removeTaskDependency(taskId: string, dependsOnTaskId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('task_dependencies')
        .delete()
        .eq('task_id', taskId)
        .eq('depends_on_task_id', dependsOnTaskId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing task dependency:', error);
      return false;
    }
  }

  /**
   * Export all data
   */
  async exportData(): Promise<string> {
    try {
      const services = await this.getAllServices();
      const updates = await this.getAllUpdates();
      const tasks = await this.getAllTasks();

      const data = {
        services,
        updates,
        tasks,
        exportedAt: new Date().toISOString(),
        version: '2.0'
      };

      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const supabaseServiceStatusService = new SupabaseServiceStatusService();

// Export class for testing
export { SupabaseServiceStatusService }; 