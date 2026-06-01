import 'package:agritec_mobile/features/notifications/application/notification_providers.dart';
import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
import 'package:agritec_mobile/features/chat/application/chat_providers.dart';
import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
import 'package:agritec_mobile/features/orders/application/order_providers.dart';
import 'package:agritec_mobile/features/orders/presentation/order_details_page.dart';
import 'package:agritec_mobile/features/orders/presentation/orders_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class NotificationsPage extends ConsumerStatefulWidget {
  const NotificationsPage({super.key});

  static const _pageSize = 10;

  @override
  ConsumerState<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends ConsumerState<NotificationsPage> {
  int _page = 1;

  @override
  Widget build(BuildContext context) {
    if (!isBuyerAuthenticated(ref)) {
      return AuthRequiredPage(
        title: 'Notifications',
        message: 'Sign in to receive and view account-specific notifications.',
        onBack: () {
          if (Navigator.of(context).canPop()) {
            Navigator.of(context).pop();
          } else {
            ref.read(shellTabProvider.notifier).setTab(0);
          }
        },
      );
    }
    final notifications = ref.watch(notificationsProvider);
    final dateFormat = DateFormat('d MMM, y - h:mm a');

    return Scaffold(
      backgroundColor: const Color(0xFFEAF1ED),
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () {
            if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            } else {
              ref.read(shellTabProvider.notifier).setTab(0);
            }
          },
        ),
        title: const Text('Notifications'),
        actions: [
          IconButton(
            icon: const Icon(Icons.home_rounded),
            onPressed: () {
              ref.read(shellTabProvider.notifier).setTab(0);
              Navigator.of(context).popUntil((route) => route.isFirst);
            },
          ),
          TextButton(
            onPressed: notifications.any((notification) => !notification.read)
                ? () => ref.read(notificationsProvider.notifier).markAllRead()
                : null,
            child: const Text('Mark all read'),
          ),
        ],
      ),
      body: notifications.isEmpty
          ? const Center(
              child: Text(
                'No notifications yet.',
                style: TextStyle(color: Color(0xFF65706B)),
              ),
            )
          : Builder(
              builder: (context) {
                final totalPages =
                    (notifications.length / NotificationsPage._pageSize)
                        .ceil()
                        .clamp(1, 9999);
                final safePage = _page.clamp(1, totalPages);
                final start = (safePage - 1) * NotificationsPage._pageSize;
                final end = (start + NotificationsPage._pageSize).clamp(
                  0,
                  notifications.length,
                );
                final pageItems = notifications.sublist(start, end);
                return Column(
                  children: [
                    Container(
                      margin: const EdgeInsets.fromLTRB(14, 14, 14, 8),
                      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF136A43),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Row(
                        children: [
                          Icon(
                            Icons.notifications_active_rounded,
                            color: Colors.white,
                          ),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Updates on orders, messages, and account activity',
                              style: TextStyle(
                                color: Color(0xFFD4EADF),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
                        itemBuilder: (context, index) {
                          final notification = pageItems[index];
                          return Card(
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: ListTile(
                              onTap: () {
                                ref
                                    .read(notificationsProvider.notifier)
                                    .markRead(notification.id);
                                _openTarget(notification);
                              },
                              leading: CircleAvatar(
                                backgroundColor: notification.read
                                    ? const Color(0xFFE9EEE9)
                                    : const Color(0xFFEAF7F2),
                                child: Icon(
                                  _iconFor(notification.type),
                                  color: notification.read
                                      ? const Color(0xFF65706B)
                                      : const Color(0xFF0D8A66),
                                ),
                              ),
                              title: Text(
                                notification.title,
                                style: TextStyle(
                                  fontWeight: notification.read
                                      ? FontWeight.w500
                                      : FontWeight.w700,
                                ),
                              ),
                              subtitle: Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(notification.body),
                                    const SizedBox(height: 4),
                                    Text(
                                      dateFormat.format(notification.createdAt),
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                        separatorBuilder: (context, index) =>
                            const SizedBox(height: 8),
                        itemCount: pageItems.length,
                      ),
                    ),
                    if (notifications.length > NotificationsPage._pageSize)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                        child: Row(
                          children: [
                            Text('Page $safePage/$totalPages'),
                            const Spacer(),
                            IconButton(
                              onPressed: safePage > 1
                                  ? () => setState(() => _page = safePage - 1)
                                  : null,
                              icon: const Icon(Icons.chevron_left_rounded),
                            ),
                            IconButton(
                              onPressed: safePage < totalPages
                                  ? () => setState(() => _page = safePage + 1)
                                  : null,
                              icon: const Icon(Icons.chevron_right_rounded),
                            ),
                          ],
                        ),
                      ),
                  ],
                );
              },
            ),
    );
  }

  void _openTarget(BuyerNotification notification) {
    if (notification.type == BuyerNotificationType.order &&
        notification.relatedOrderId != null) {
      final found =
          ref.read(orderByIdProvider(notification.relatedOrderId!)) != null;
      if (!found) {
        Navigator.of(
          context,
        ).push(MaterialPageRoute<void>(builder: (_) => const OrdersPage()));
        return;
      }
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) =>
              OrderDetailsPage(orderId: notification.relatedOrderId!),
        ),
      );
      return;
    }
    if (notification.type == BuyerNotificationType.message &&
        notification.relatedSellerId != null) {
      final seller = ref.read(
        homeSellerByIdProvider(notification.relatedSellerId!),
      );
      ref
          .read(chatProvider.notifier)
          .startSellerChat(
            sellerId: seller.id,
            farmName: seller.farmName,
            sellerName: seller.name,
          );
      ref.read(shellTabProvider.notifier).setTab(2);
      Navigator.of(context).popUntil((route) => route.isFirst);
      return;
    }
  }

  IconData _iconFor(BuyerNotificationType type) {
    return switch (type) {
      BuyerNotificationType.order => Icons.receipt_long_rounded,
      BuyerNotificationType.message => Icons.chat_bubble_rounded,
      BuyerNotificationType.promo => Icons.local_offer_rounded,
      BuyerNotificationType.system => Icons.info_rounded,
    };
  }
}
