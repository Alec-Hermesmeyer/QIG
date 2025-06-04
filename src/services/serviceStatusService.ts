'use client';

import { 
  QIGService, 
  ServiceUpdate, 
  ServiceMetrics, 
  ServiceStatus, 
  ServiceCategory, 
  ServicePriority,
  UpdateType 
} from '@/types/services';

class ServiceStatusService {
  private readonly STORAGE_KEY = 'qig_service_status';
  private readonly UPDATES_KEY = 'qig_service_updates';

  constructor() {
    this.initializeDefaultServices();
  }

  /**
   * Initialize with default QIG services
   */
  private initializeDefaultServices(): void {
    const existing = this.getAllServices();
    if (existing.length === 0) {
      const defaultServices: QIGService[] = [
        {
          id: 'contract-analyst',
          name: 'Contract Analyst',
          description: 'AI-powered contract analysis and review tool for legal document processing',
          category: 'AI_ANALYSIS',
          status: 'LIVE',
          progress: 100,
          priority: 'HIGH',
          team: 'AI Development',
          owner: 'QIG Team',
          lastUpdated: new Date().toISOString(),
          createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
          actualLaunchDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 3 months ago
          keyFeatures: [
            'Contract clause extraction',
            'Risk assessment',
            'Compliance checking',
            'Term comparison',
            'Automated redlining'
          ],
          dependencies: ['GroundX RAG API', 'Document Processing Pipeline'],
          technicalStack: ['Next.js', 'OpenAI GPT-4', 'GroundX', 'PDF Processing'],
          clientFacing: true,
          internalOnly: false,
          documentation: '/docs/contract-analyst',
          demoUrl: '/contract-analyst',
          tags: ['AI', 'Legal', 'Contract', 'Analysis']
        },
        {
          id: 'insurance-broker',
          name: 'Insurance Broker',
          description: 'Intelligent insurance policy comparison and recommendation system',
          category: 'AI_ANALYSIS',
          status: 'LIVE',
          progress: 100,
          priority: 'HIGH',
          team: 'AI Development',
          owner: 'QIG Team',
          lastUpdated: new Date().toISOString(),
          createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(), // 5 months ago
          actualLaunchDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 2 months ago
          keyFeatures: [
            'Policy comparison',
            'Coverage gap analysis',
            'Premium optimization',
            'Risk profiling',
            'Automated recommendations'
          ],
          dependencies: ['Chat Stream API', 'Insurance Data APIs'],
          technicalStack: ['Next.js', 'OpenAI GPT-4', 'Real-time Chat', 'Data Analytics'],
          clientFacing: true,
          internalOnly: false,
          documentation: '/docs/insurance-broker',
          demoUrl: '/insurance-broker',
          tags: ['AI', 'Insurance', 'Broker', 'Comparison']
        },
        {
          id: 'open-records',
          name: 'Open Records',
          description: 'Automated FOIA request generation and public records research tool',
          category: 'AUTOMATION',
          status: 'LIVE',
          progress: 100,
          priority: 'MEDIUM',
          team: 'Automation Team',
          owner: 'QIG Team',
          lastUpdated: new Date().toISOString(),
          createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(), // 4 months ago
          actualLaunchDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month ago
          keyFeatures: [
            'FOIA request generation',
            'Public records search',
            'Request tracking',
            'Response analysis',
            'Document classification'
          ],
          dependencies: ['Document Analysis API', 'Government APIs'],
          technicalStack: ['Next.js', 'Document Processing', 'Web Scraping', 'OCR'],
          clientFacing: true,
          internalOnly: false,
          documentation: '/docs/open-records',
          demoUrl: '/open-records',
          tags: ['FOIA', 'Public Records', 'Government', 'Automation']
        }
      ];

      this.saveServices(defaultServices);
      
      // Add some sample updates for the main services
      const sampleUpdates: ServiceUpdate[] = [
        {
          id: 'update-1',
          serviceId: 'contract-analyst',
          title: 'Performance Optimization Complete',
          description: 'Improved contract processing speed by 40% through optimized document parsing and enhanced AI model efficiency.',
          type: 'FEATURE',
          author: 'AI Development Team',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          version: '2.1.0'
        },
        {
          id: 'update-2',
          serviceId: 'insurance-broker',
          title: 'New Policy Comparison Features',
          description: 'Added support for additional insurance providers and enhanced coverage gap analysis capabilities.',
          type: 'FEATURE',
          author: 'AI Development Team',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          version: '1.8.0'
        },
        {
          id: 'update-3',
          serviceId: 'open-records',
          title: 'Enhanced FOIA Request Processing',
          description: 'Improved automated request generation with better jurisdiction detection and template matching.',
          type: 'FEATURE',
          author: 'Automation Team',
          timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          version: '1.5.2'
        },
        {
          id: 'update-4',
          serviceId: 'contract-analyst',
          title: 'Security Enhancement',
          description: 'Implemented additional data encryption and improved access controls for sensitive contract data.',
          type: 'BUGFIX',
          author: 'Security Team',
          timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'update-5',
          serviceId: 'insurance-broker',
          title: 'Mobile Interface Improvements',
          description: 'Enhanced mobile responsiveness and improved user experience on tablet and phone devices.',
          type: 'FEATURE',
          author: 'UI/UX Team',
          timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      this.saveUpdates(sampleUpdates);
    }
  }

  /**
   * Get all services
   */
  getAllServices(): QIGService[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading services:', error);
      return [];
    }
  }

  /**
   * Get service by ID
   */
  getServiceById(id: string): QIGService | null {
    const services = this.getAllServices();
    return services.find(service => service.id === id) || null;
  }

  /**
   * Get services by status
   */
  getServicesByStatus(status: ServiceStatus): QIGService[] {
    return this.getAllServices().filter(service => service.status === status);
  }

  /**
   * Get services by category
   */
  getServicesByCategory(category: ServiceCategory): QIGService[] {
    return this.getAllServices().filter(service => service.category === category);
  }

  /**
   * Create or update service
   */
  saveService(service: Omit<QIGService, 'id' | 'createdAt' | 'lastUpdated'> & { id?: string }): QIGService {
    const services = this.getAllServices();
    const now = new Date().toISOString();
    
    let updatedService: QIGService;
    
    if (service.id) {
      // Update existing service
      const index = services.findIndex(s => s.id === service.id);
      if (index === -1) {
        throw new Error('Service not found');
      }
      
      updatedService = {
        ...services[index],
        ...service,
        lastUpdated: now
      } as QIGService;
      
      services[index] = updatedService;
    } else {
      // Create new service
      updatedService = {
        ...service,
        id: this.generateId(),
        createdAt: now,
        lastUpdated: now
      } as QIGService;
      
      services.push(updatedService);
    }
    
    this.saveServices(services);
    return updatedService;
  }

  /**
   * Delete service
   */
  deleteService(id: string): boolean {
    const services = this.getAllServices();
    const index = services.findIndex(service => service.id === id);
    
    if (index === -1) {
      return false;
    }
    
    services.splice(index, 1);
    this.saveServices(services);
    
    // Also delete related updates
    const updates = this.getAllUpdates();
    const filteredUpdates = updates.filter(update => update.serviceId !== id);
    this.saveUpdates(filteredUpdates);
    
    return true;
  }

  /**
   * Update service status
   */
  updateServiceStatus(id: string, status: ServiceStatus, progress?: number): boolean {
    const services = this.getAllServices();
    const index = services.findIndex(service => service.id === id);
    
    if (index === -1) {
      return false;
    }
    
    services[index].status = status;
    services[index].lastUpdated = new Date().toISOString();
    
    if (progress !== undefined) {
      services[index].progress = Math.max(0, Math.min(100, progress));
    }
    
    // Set launch date if going live
    if (status === 'LIVE' && !services[index].actualLaunchDate) {
      services[index].actualLaunchDate = new Date().toISOString();
    }
    
    this.saveServices(services);
    return true;
  }

  /**
   * Get all service updates
   */
  getAllUpdates(): ServiceUpdate[] {
    try {
      const stored = localStorage.getItem(this.UPDATES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading updates:', error);
      return [];
    }
  }

  /**
   * Get updates for a specific service
   */
  getServiceUpdates(serviceId: string): ServiceUpdate[] {
    return this.getAllUpdates()
      .filter(update => update.serviceId === serviceId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Add service update
   */
  addServiceUpdate(update: Omit<ServiceUpdate, 'id' | 'timestamp'>): ServiceUpdate {
    const updates = this.getAllUpdates();
    
    const newUpdate: ServiceUpdate = {
      ...update,
      id: this.generateId(),
      timestamp: new Date().toISOString()
    };
    
    updates.unshift(newUpdate); // Add to beginning for chronological order
    this.saveUpdates(updates);
    
    return newUpdate;
  }

  /**
   * Get service metrics and analytics
   */
  getServiceMetrics(): ServiceMetrics {
    const services = this.getAllServices();
    const updates = this.getAllUpdates();
    
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
    const recentUpdates = updates
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
    
    return {
      totalServices: services.length,
      servicesByStatus,
      servicesByCategory,
      completionRate,
      upcomingDeadlines,
      recentUpdates
    };
  }

  /**
   * Search services
   */
  searchServices(query: string): QIGService[] {
    const services = this.getAllServices();
    const lowercaseQuery = query.toLowerCase();
    
    return services.filter(service =>
      service.name.toLowerCase().includes(lowercaseQuery) ||
      service.description.toLowerCase().includes(lowercaseQuery) ||
      service.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      service.keyFeatures.some(feature => feature.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Export all service data
   */
  exportData(): string {
    const data = {
      services: this.getAllServices(),
      updates: this.getAllUpdates(),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import service data
   */
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.services && Array.isArray(data.services)) {
        this.saveServices(data.services);
      }
      
      if (data.updates && Array.isArray(data.updates)) {
        this.saveUpdates(data.updates);
      }
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  /**
   * Reset all data and reinitialize with default services only
   */
  resetToDefaults(): void {
    try {
      // Clear existing data
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.UPDATES_KEY);
      
      // Reinitialize with defaults
      this.initializeDefaultServices();
    } catch (error) {
      console.error('Error resetting to defaults:', error);
    }
  }

  /**
   * Private helper methods
   */
  private saveServices(services: QIGService[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(services));
    } catch (error) {
      console.error('Error saving services:', error);
    }
  }

  private saveUpdates(updates: ServiceUpdate[]): void {
    try {
      localStorage.setItem(this.UPDATES_KEY, JSON.stringify(updates));
    } catch (error) {
      console.error('Error saving updates:', error);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const serviceStatusService = new ServiceStatusService();

// Export class for testing
export { ServiceStatusService }; 