'use client';

import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useLogisticsStore } from '@/lib/store/logistics-store';
import { motion } from 'framer-motion';
import { Bell, CheckCircle, MessageSquare, Package, Truck } from 'lucide-react';

const notificationIcons: Record<string, typeof Bell> = {
  ORDER: Package,
  MESSAGE: MessageSquare,
  PAYOUT: Truck,
};

const notificationColors: Record<string, string> = {
  ORDER: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
  MESSAGE: 'text-purple-500 bg-purple-50 dark:bg-purple-950',
  PAYOUT: 'text-green-500 bg-green-50 dark:bg-green-950',
};

export default function NotificationsPage() {
  const notifications = useLogisticsStore((state) => state.notifications);
  const unreadCount = useLogisticsStore((state) => state.unreadCount);
  const fetchNotifications = useLogisticsStore((state) => state.fetchNotifications);
  const markAsRead = useLogisticsStore((state) => state.markNotificationAsRead);
  const markAllAsRead = useLogisticsStore((state) => state.markAllNotificationsAsRead);
  const isLoadingNotifications = useLogisticsStore((state) => state.isLoadingNotifications);

  useEffect(() => {
    void fetchNotifications({ force: true }).catch(() => undefined);

    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void fetchNotifications({ force: true }).catch(() => undefined);
      }
    };

    const interval = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [fetchNotifications]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
      },
    },
  };

  if (isLoadingNotifications && notifications.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
            <p className="mt-2 text-muted-foreground">
              You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
          {unreadCount > 0 ? (
            <Button onClick={() => void markAllAsRead()} variant="outline">
              Mark All as Read
            </Button>
          ) : null}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-3">
        {notifications.length > 0 ? (
          notifications.map((notification) => {
            const Icon = notificationIcons[notification.type] || Bell;
            return (
              <motion.div key={notification.id} variants={itemVariants}>
                <Card
                  className={`cursor-pointer p-4 transition-all ${
                    !notification.isRead ? 'border-primary/50 bg-primary/5' : ''
                  }`}
                  onClick={() => !notification.isRead && void markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`rounded-lg p-3 ${notificationColors[notification.type] || 'bg-muted text-foreground'}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{notification.title}</h3>
                        {!notification.isRead ? (
                          <Badge className="bg-primary text-primary-foreground text-xs">New</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {notification.isRead ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : null}
                  </div>
                </Card>
              </motion.div>
            );
          })
        ) : (
          <Card className="p-12 text-center">
            <Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No notifications yet</p>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}
