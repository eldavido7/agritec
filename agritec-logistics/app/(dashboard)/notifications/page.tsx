'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLogisticsStore } from '@/lib/store/logistics-store';
import { motion } from 'framer-motion';
import { Bell, Package, AlertCircle, MessageSquare, CheckCircle, Trash2 } from 'lucide-react';

const notificationIcons: Record<string, typeof Bell> = {
  new_delivery: Package,
  status_update: CheckCircle,
  failed_delivery: AlertCircle,
  admin_message: MessageSquare,
};

const notificationColors: Record<string, string> = {
  new_delivery: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
  status_update: 'text-green-500 bg-green-50 dark:bg-green-950',
  failed_delivery: 'text-red-500 bg-red-50 dark:bg-red-950',
  admin_message: 'text-purple-500 bg-purple-50 dark:bg-purple-950',
};

export default function NotificationsPage() {
  const notifications = useLogisticsStore((state) => state.notifications);
  const markAsRead = useLogisticsStore((state) => state.markNotificationAsRead);
  const markAllAsRead = useLogisticsStore((state) => state.markAllNotificationsAsRead);

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground mt-2">
              You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={() => markAllAsRead()} variant="outline">
              Mark All as Read
            </Button>
          )}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-3">
        {notifications.length > 0 ? (
          notifications.map((notification, i) => {
            const Icon = notificationIcons[notification.type] || Bell;
            return (
              <motion.div key={notification.id} variants={itemVariants}>
                <Card
                  className={`p-4 cursor-pointer transition-all ${
                    !notification.read ? 'border-primary/50 bg-primary/5' : ''
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${notificationColors[notification.type]}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{notification.title}</h3>
                        {!notification.read && (
                          <Badge className="bg-primary text-primary-foreground text-xs">New</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })
        ) : (
          <Card className="p-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No notifications yet</p>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}
