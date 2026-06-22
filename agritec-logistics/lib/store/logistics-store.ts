import { create } from 'zustand';
import { AssignedDelivery, Notification, DashboardAnalytics } from '@/lib/types';
import { mockDeliveries, mockNotifications, mockAnalytics } from '@/lib/mock-data';

interface LogisticsStore {
  deliveries: AssignedDelivery[];
  notifications: Notification[];
  analytics: DashboardAnalytics;
  
  // Delivery actions
  getDeliveries: () => AssignedDelivery[];
  getDelivery: (id: string) => AssignedDelivery | undefined;
  updateDeliveryStatus: (id: string, status: string, description: string, updatedByName: string) => void;
  
  // Notification actions
  getNotifications: () => Notification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  
  // Analytics actions
  getAnalytics: () => DashboardAnalytics;
}

export const useLogisticsStore = create<LogisticsStore>((set, get) => ({
  deliveries: mockDeliveries,
  notifications: mockNotifications,
  analytics: mockAnalytics,
  
  getDeliveries: () => get().deliveries,
  
  getDelivery: (id: string) => {
    return get().deliveries.find((d) => d.id === id);
  },
  
  updateDeliveryStatus: (id: string, status: string, description: string, updatedByName: string) => {
    set((state) => ({
      deliveries: state.deliveries.map((delivery) => {
        if (delivery.id === id) {
          const newStatusEntry = {
            id: `SH${Date.now()}`,
            deliveryId: id,
            status: status as any,
            description,
            updatedByUserId: 'CURRENT_USER',
            updatedByName,
            createdAt: new Date(),
          };
          
          return {
            ...delivery,
            currentStatus: status as any,
            updatedAt: new Date(),
            statusHistory: [...delivery.statusHistory, newStatusEntry],
          };
        }
        return delivery;
      }),
    }));
  },
  
  getNotifications: () => get().notifications,
  
  markNotificationAsRead: (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      ),
    }));
  },
  
  markAllNotificationsAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((notif) => ({
        ...notif,
        read: true,
      })),
    }));
  },
  
  getAnalytics: () => get().analytics,
}));
