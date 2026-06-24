import 'package:agritec_mobile/core/storage/cache_providers.dart';
import 'package:agritec_mobile/core/utils/wat_time.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:agritec_mobile/features/auth/data/auth_service.dart';
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
    this.relatedConversationId,
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
  final String? relatedConversationId;

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
      relatedConversationId: relatedConversationId,
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
    'relatedConversationId': relatedConversationId,
  };

  factory BuyerNotification.fromJson(Map<String, dynamic> json) {
    return BuyerNotification(
      id: '${json['id']}',
      type: BuyerNotificationType.values.firstWhere(
        (type) => type.name == json['type'],
        orElse: () => BuyerNotificationType.system,
      ),
      title: '${json['title'] ?? ''}',
      body: '${json['body'] ?? ''}',
      createdAt: parseWatDateTime('${json['createdAt']}'),
      read: json['read'] as bool? ?? false,
      buyerUserId: (json['buyerUserId'] as String?) ?? '',
      relatedOrderId: json['relatedOrderId'] as String?,
      relatedSellerId: json['relatedSellerId'] as String?,
      relatedConversationId: json['relatedConversationId'] as String?,
    );
  }

  factory BuyerNotification.fromApiJson(Map<String, dynamic> json, String buyerUserId) {
    final metadata = json['metadata'] is Map
        ? Map<String, dynamic>.from(json['metadata'] as Map)
        : const <String, dynamic>{};
    final targetType = '${json['targetType'] ?? ''}';
    final targetId = json['targetId']?.toString();
    return BuyerNotification(
      id: '${json['id']}',
      type: _typeFromApi('${json['type'] ?? ''}'),
      title: '${json['title'] ?? ''}',
      body: '${json['body'] ?? ''}',
      createdAt: parseWatDateTime('${json['createdAt'] ?? ''}'),
      read: json['isRead'] as bool? ?? false,
      buyerUserId: buyerUserId,
      relatedOrderId: targetType == 'parentOrder'
          ? targetId
          : metadata['parentOrderId']?.toString(),
      relatedSellerId: metadata['sellerId']?.toString(),
      relatedConversationId: targetType == 'conversation'
          ? targetId
          : metadata['conversationId']?.toString(),
    );
  }
}

BuyerNotificationType _typeFromApi(String value) {
  switch (value.toUpperCase()) {
    case 'ORDER':
      return BuyerNotificationType.order;
    case 'MESSAGE':
      return BuyerNotificationType.message;
    case 'PROMO':
      return BuyerNotificationType.promo;
    default:
      return BuyerNotificationType.system;
  }
}

class NotificationsNotifier extends Notifier<List<BuyerNotification>> {
  static const _cacheKeyPrefix = 'cache_buyer_notifications_v1';

  @override
  List<BuyerNotification> build() {
    ref.watch(currentBuyerUserIdProvider);
    ref.watch(buyerAuthTokenProvider);
    _prime();
    return const [];
  }

  String _cacheKey() {
    final userId = ref.read(currentBuyerUserIdProvider) ?? 'guest';
    return '$_cacheKeyPrefix-$userId';
  }

  Future<void> _prime() async {
    await _hydrate();
    await refresh();
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
      'notifications': state.map((notification) => notification.toJson()).toList(),
    });
  }

  Future<void> refresh() async {
    final token = ref.read(buyerAuthTokenProvider);
    final userId = ref.read(currentBuyerUserIdProvider);
    if (token == null || token.isEmpty || userId == null) {
      return;
    }

    try {
      final response = await ref.read(mobileApiClientProvider).get(
        '/api/notifications',
        token: token,
        queryParameters: const {'page': 1, 'pageSize': 50},
      );
      final items = response['notifications'];
      if (items is! List<dynamic>) return;
      state = [
        for (final item in items)
          if (item is Map<String, dynamic>)
            BuyerNotification.fromApiJson(item, userId),
      ];
      await _persist();
    } catch (_) {}
  }

  Future<void> markRead(String id) async {
    final previous = state;
    state = [
      for (final notification in state)
        notification.id == id ? notification.copyWith(read: true) : notification,
    ];
    await _persist();

    final token = ref.read(buyerAuthTokenProvider);
    if (token == null || token.isEmpty) return;
    try {
      await ref.read(mobileApiClientProvider).patch(
        '/api/notifications/$id/read',
        token: token,
      );
    } catch (_) {
      state = previous;
      await _persist();
    }
  }

  Future<void> markAllRead() async {
    final previous = state;
    state = [
      for (final notification in state) notification.copyWith(read: true),
    ];
    await _persist();

    final token = ref.read(buyerAuthTokenProvider);
    if (token == null || token.isEmpty) return;
    try {
      await ref.read(mobileApiClientProvider).patch(
        '/api/notifications/read-all',
        token: token,
      );
    } catch (_) {
      state = previous;
      await _persist();
    }
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

