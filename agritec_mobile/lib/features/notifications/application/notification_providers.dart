import 'package:agritec_mobile/core/storage/cache_providers.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum BuyerNotificationType { order, message, promo, system }

class BuyerNotification {
  const BuyerNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.createdAt,
    required this.read,
    required this.buyerUserId,
    this.relatedOrderId,
    this.relatedSellerId,
  });

  final String id;
  final BuyerNotificationType type;
  final String title;
  final String body;
  final DateTime createdAt;
  final bool read;
  final String buyerUserId;
  final String? relatedOrderId;
  final String? relatedSellerId;

  BuyerNotification copyWith({bool? read}) {
    return BuyerNotification(
      id: id,
      type: type,
      title: title,
      body: body,
      createdAt: createdAt,
      read: read ?? this.read,
      buyerUserId: buyerUserId,
      relatedOrderId: relatedOrderId,
      relatedSellerId: relatedSellerId,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type.name,
    'title': title,
    'body': body,
    'createdAt': createdAt.toIso8601String(),
    'read': read,
    'buyerUserId': buyerUserId,
    'relatedOrderId': relatedOrderId,
    'relatedSellerId': relatedSellerId,
  };

  factory BuyerNotification.fromJson(Map<String, dynamic> json) {
    return BuyerNotification(
      id: json['id'] as String,
      type: BuyerNotificationType.values.firstWhere(
        (type) => type.name == json['type'],
        orElse: () => BuyerNotificationType.system,
      ),
      title: json['title'] as String,
      body: json['body'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      read: json['read'] as bool? ?? false,
      buyerUserId: (json['buyerUserId'] as String?) ?? 'buyer-demo-1',
      relatedOrderId: json['relatedOrderId'] as String?,
      relatedSellerId: json['relatedSellerId'] as String?,
    );
  }
}

class NotificationsNotifier extends Notifier<List<BuyerNotification>> {
  static const _cacheKeyPrefix = 'cache_buyer_notifications_v1';

  @override
  List<BuyerNotification> build() {
    ref.watch(currentBuyerUserIdProvider);
    _hydrate();
    return _seedNotificationsForCurrentUser();
  }

  String _cacheKey() {
    final userId = ref.read(currentBuyerUserIdProvider) ?? 'guest';
    return '$_cacheKeyPrefix-$userId';
  }

  List<BuyerNotification> _seedNotificationsForCurrentUser() {
    final userId = ref.read(currentBuyerUserIdProvider);
    if (userId == 'buyer-demo-1') return _mockNotifications;
    return const [];
  }

  Future<void> _hydrate() async {
    final cache = await ref.read(localCacheServiceProvider.future);
    final raw = cache.readJson(_cacheKey());
    if (raw == null) return;
    final items = raw['notifications'];
    if (items is! List<dynamic>) return;
    state = [
      for (final item in items)
        if (item is Map<String, dynamic>) BuyerNotification.fromJson(item),
    ];
  }

  Future<void> _persist() async {
    final cache = await ref.read(localCacheServiceProvider.future);
    await cache.saveJson(_cacheKey(), {
      'notifications': state
          .map((notification) => notification.toJson())
          .toList(),
    });
  }

  void markRead(String id) {
    state = [
      for (final notification in state)
        notification.id == id
            ? notification.copyWith(read: true)
            : notification,
    ];
    _persist();
  }

  void markAllRead() {
    state = [
      for (final notification in state) notification.copyWith(read: true),
    ];
    _persist();
  }
}

final notificationsProvider =
    NotifierProvider<NotificationsNotifier, List<BuyerNotification>>(
      NotificationsNotifier.new,
    );

final unreadNotificationsCountProvider = Provider<int>((ref) {
  return ref
      .watch(notificationsProvider)
      .where((notification) => !notification.read)
      .length;
});

final _mockNotifications = <BuyerNotification>[
  BuyerNotification(
    id: 'buyer-notif-1',
    type: BuyerNotificationType.order,
    title: 'Order update',
    body: 'Your Kingsley Family Farm order is ready for dispatch.',
    createdAt: DateTime(2026, 5, 31, 10, 30),
    read: false,
    buyerUserId: 'buyer-demo-1',
    relatedOrderId: 'buyer-order-1025',
    relatedSellerId: 'seller-kingsley',
  ),
  BuyerNotification(
    id: 'buyer-notif-2',
    type: BuyerNotificationType.message,
    title: 'New seller message',
    body: 'A seller replied to your product question.',
    createdAt: DateTime(2026, 5, 31, 9, 45),
    read: false,
    buyerUserId: 'buyer-demo-1',
    relatedSellerId: 'seller-amina',
  ),
  BuyerNotification(
    id: 'buyer-notif-3',
    type: BuyerNotificationType.promo,
    title: 'Discount available',
    body: 'Use RICE15 at checkout for eligible rice products.',
    createdAt: DateTime(2026, 5, 30, 16, 20),
    read: true,
    buyerUserId: 'buyer-demo-1',
    relatedSellerId: 'seller-kingsley',
  ),
];
