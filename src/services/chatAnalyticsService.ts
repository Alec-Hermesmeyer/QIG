import { indexedDBChatService, ChatSession, ChatMessage } from './indexedDBChatService';

export interface ChatAnalytics {
  // Basic metrics
  totalSessions: number;
  totalMessages: number;
  totalUserMessages: number;
  totalAssistantMessages: number;
  
  // Time-based metrics
  sessionsThisMonth: number;
  messagesThisMonth: number;
  activeToday: boolean;
  activeDays: number;
  averageMessagesPerSession: number;
  
  // Growth metrics
  monthlySessionGrowth: number;
  monthlyMessageGrowth: number;
  
  // Recent activity
  recentSessions: Array<{
    id: string;
    title: string;
    createdAt: string;
    messageCount: number;
    lastActivity: string;
  }>;
  
  // Usage patterns
  mostActiveDay: string;
  averageSessionDuration: number; // in minutes
  peakUsageHour: number;
}

class ChatAnalyticsService {
  /**
   * Get comprehensive chat analytics from IndexedDB
   */
  async getChatAnalytics(): Promise<ChatAnalytics> {
    try {
      // Fetch all sessions and their messages
      const sessions = await indexedDBChatService.getAllSessions();
      const allMessages: (ChatMessage & { sessionId: string })[] = [];
      
      // Collect all messages with session context
      for (const session of sessions) {
        const messages = await indexedDBChatService.getMessages(session.id);
        allMessages.push(...messages.map((msg: ChatMessage) => ({ ...msg, sessionId: session.id })));
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const today = now.toDateString();
      
      // Basic metrics
      const totalSessions = sessions.length;
      const totalMessages = allMessages.length;
      const totalUserMessages = allMessages.filter((msg: ChatMessage) => msg.role === 'user').length;
      const totalAssistantMessages = allMessages.filter((msg: ChatMessage) => msg.role === 'assistant').length;
      
      // Current month metrics
      const sessionsThisMonth = sessions.filter((session: ChatSession) => {
        const sessionDate = new Date(session.createdAt);
        return sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear;
      }).length;
      
      const messagesThisMonth = allMessages.filter((msg: ChatMessage) => {
        const msgDate = new Date(msg.timestamp);
        return msgDate.getMonth() === currentMonth && msgDate.getFullYear() === currentYear;
      }).length;
      
      // Activity metrics
      const activeToday = sessions.some((session: ChatSession) => {
        const lastActivity = new Date(session.updatedAt || session.createdAt);
        return lastActivity.toDateString() === today;
      });
      
      // Calculate active days (days with any activity)
      const activeDaysSet = new Set<string>();
      sessions.forEach((session: ChatSession) => {
        const date = new Date(session.createdAt).toDateString();
        activeDaysSet.add(date);
        
        // Also check message dates for sessions with recent activity
        const sessionMessages = allMessages.filter((msg: ChatMessage & { sessionId: string }) => msg.sessionId === session.id);
        sessionMessages.forEach((msg: ChatMessage) => {
          const msgDate = new Date(msg.timestamp).toDateString();
          activeDaysSet.add(msgDate);
        });
      });
      const activeDays = activeDaysSet.size;
      
      // Average messages per session
      const averageMessagesPerSession = totalSessions > 0 ? totalMessages / totalSessions : 0;
      
      // Growth calculations
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      
      const sessionsLastMonth = sessions.filter((session: ChatSession) => {
        const sessionDate = new Date(session.createdAt);
        return sessionDate.getMonth() === lastMonth && sessionDate.getFullYear() === lastMonthYear;
      }).length;
      
      const messagesLastMonth = allMessages.filter((msg: ChatMessage) => {
        const msgDate = new Date(msg.timestamp);
        return msgDate.getMonth() === lastMonth && msgDate.getFullYear() === lastMonthYear;
      }).length;
      
      const monthlySessionGrowth = sessionsLastMonth > 0 ? 
        ((sessionsThisMonth - sessionsLastMonth) / sessionsLastMonth) * 100 : 
        sessionsThisMonth > 0 ? 100 : 0;
        
      const monthlyMessageGrowth = messagesLastMonth > 0 ? 
        ((messagesThisMonth - messagesLastMonth) / messagesLastMonth) * 100 : 
        messagesThisMonth > 0 ? 100 : 0;
      
      // Recent sessions (last 10, with message counts and last activity)
      const recentSessions = sessions
        .sort((a: ChatSession, b: ChatSession) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
        .slice(0, 10)
        .map((session: ChatSession) => {
          const sessionMessages = allMessages.filter((msg: ChatMessage & { sessionId: string }) => msg.sessionId === session.id);
          const lastMessage = sessionMessages.sort((a: ChatMessage, b: ChatMessage) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
          
          return {
            id: session.id,
            title: session.title,
            createdAt: session.createdAt,
            messageCount: sessionMessages.length,
            lastActivity: lastMessage ? lastMessage.timestamp : session.updatedAt || session.createdAt
          };
        });
      
      // Usage patterns
      const dayActivity: { [key: string]: number } = {};
      const hourActivity: { [key: number]: number } = {};
      
      allMessages.forEach((msg: ChatMessage) => {
        const msgDate = new Date(msg.timestamp);
        const dayKey = msgDate.toLocaleDateString('en-US', { weekday: 'long' });
        const hour = msgDate.getHours();
        
        dayActivity[dayKey] = (dayActivity[dayKey] || 0) + 1;
        hourActivity[hour] = (hourActivity[hour] || 0) + 1;
      });
      
      const mostActiveDay = Object.entries(dayActivity).length > 0 ? 
        Object.entries(dayActivity).reduce((a: [string, number], b: [string, number]) => 
          dayActivity[a[0]] > dayActivity[b[0]] ? a : b)[0] : 'No activity';
        
      const peakUsageHour = Object.entries(hourActivity).length > 0 ? 
        Number(Object.entries(hourActivity).reduce((a: [string, number], b: [string, number]) => 
          hourActivity[Number(a[0])] > hourActivity[Number(b[0])] ? a : b)[0]) : 0;
      
      // Calculate average session duration (rough estimate based on first and last message times)
      let totalDuration = 0;
      let sessionsWithDuration = 0;
      
      for (const session of sessions) {
        const sessionMessages = allMessages
          .filter((msg: ChatMessage & { sessionId: string }) => msg.sessionId === session.id)
          .sort((a: ChatMessage, b: ChatMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          
        if (sessionMessages.length >= 2) {
          const firstMsg = new Date(sessionMessages[0].timestamp);
          const lastMsg = new Date(sessionMessages[sessionMessages.length - 1].timestamp);
          const duration = (lastMsg.getTime() - firstMsg.getTime()) / (1000 * 60); // minutes
          
          // Only count sessions with reasonable duration (< 8 hours)
          if (duration > 0 && duration < 480) {
            totalDuration += duration;
            sessionsWithDuration++;
          }
        }
      }
      
      const averageSessionDuration = sessionsWithDuration > 0 ? totalDuration / sessionsWithDuration : 0;
      
      return {
        totalSessions,
        totalMessages,
        totalUserMessages,
        totalAssistantMessages,
        sessionsThisMonth,
        messagesThisMonth,
        activeToday,
        activeDays,
        averageMessagesPerSession: Math.round(averageMessagesPerSession * 10) / 10,
        monthlySessionGrowth: Math.round(monthlySessionGrowth),
        monthlyMessageGrowth: Math.round(monthlyMessageGrowth),
        recentSessions,
        mostActiveDay,
        averageSessionDuration: Math.round(averageSessionDuration * 10) / 10,
        peakUsageHour
      };
      
    } catch (error) {
      console.error('Error calculating chat analytics:', error);
      
      // Return empty analytics if there's an error
      return {
        totalSessions: 0,
        totalMessages: 0,
        totalUserMessages: 0,
        totalAssistantMessages: 0,
        sessionsThisMonth: 0,
        messagesThisMonth: 0,
        activeToday: false,
        activeDays: 0,
        averageMessagesPerSession: 0,
        monthlySessionGrowth: 0,
        monthlyMessageGrowth: 0,
        recentSessions: [],
        mostActiveDay: 'No activity',
        averageSessionDuration: 0,
        peakUsageHour: 0
      };
    }
  }

  /**
   * Get quick stats for dashboard cards
   */
  async getQuickStats(): Promise<{
    totalSessions: number;
    totalQuestions: number;
    totalMessages: number;
    activeToday: boolean;
  }> {
    try {
      const analytics = await this.getChatAnalytics();
      return {
        totalSessions: analytics.totalSessions,
        totalQuestions: analytics.totalUserMessages,
        totalMessages: analytics.totalMessages,
        activeToday: analytics.activeToday
      };
    } catch (error) {
      console.error('Error getting quick stats:', error);
      return {
        totalSessions: 0,
        totalQuestions: 0,
        totalMessages: 0,
        activeToday: false
      };
    }
  }

  /**
   * Check if IndexedDB is available and has data
   */
  async hasData(): Promise<boolean> {
    try {
      const sessions = await indexedDBChatService.getAllSessions();
      return sessions.length > 0;
    } catch (error) {
      return false;
    }
  }
}

export const chatAnalyticsService = new ChatAnalyticsService(); 