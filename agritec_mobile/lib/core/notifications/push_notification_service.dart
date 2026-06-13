import 'dart:async';
import 'dart:convert';

import 'package:agritec_mobile/app/router.dart';
import 'package:agritec_mobile/core/api/mobile_api.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:agritec_mobile/features/auth/data/auth_service.dart';
import 'package:agritec_mobile/features/chat/application/chat_providers.dart';
import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
import 'package:agritec_mobile/features/home/presentation/main_shell_page.dart';
import 'package:agritec_mobile/features/notifications/application/notification_providers.dart';
import 'package:agritec_mobile/features/notifications/presentation/notifications_page.dart';
import 'package:agritec_mobile/features/orders/application/order_providers.dart';
import 'package:agritec_mobile/features/orders/presentation/order_details_page.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const _androidNotificationChannel = AndroidNotificationChannel(
  'agritec_general',
  'AgriTec Notifications',
  description: 'General AgriTec alerts and updates.',
  importance: Importance.high,
);

final flutterLocalNotificationsPluginProvider = Provider<FlutterLocalNotificationsPlugin>((ref) {
  return FlutterLocalNotificationsPlugin();
});

final pushNotificationServiceProvider = Provider<PushNotificationService>((ref) {
  return PushNotificationService(
    ref.read(mobileApiClientProvider),
    ref.read(flutterLocalNotificationsPluginProvider),
  );
});

class PushNotificationService {
  PushNotificationService(this._api, this._localNotifications);

  final MobileApiClient _api;
  final FlutterLocalNotificationsPlugin _localNotifications;

  bool _initialized = false;
  bool _permissionRequested = false;
  String? _currentToken;
  StreamSubscription<RemoteMessage>? _foregroundSubscription;
  StreamSubscription<RemoteMessage>? _openedSubscription;
  StreamSubscription<String>? _tokenRefreshSubscription;

  Future<void> initialize(WidgetRef ref) async {
    if (_initialized) return;
    _initialized = true;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();

    await _localNotifications.initialize(
      const InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      ),
      onDidReceiveNotificationResponse: (response) {
        _handleLocalNotificationTap(response.payload, ref);
      },
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_androidNotificationChannel);

    await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    _foregroundSubscription = FirebaseMessaging.onMessage.listen(
      (message) => _handleForegroundMessage(message, ref),
    );
    _openedSubscription = FirebaseMessaging.onMessageOpenedApp.listen(
      (message) => _handleRemoteMessageTap(message, ref),
    );
    _tokenRefreshSubscription = FirebaseMessaging.instance.onTokenRefresh.listen((token) {
      _currentToken = token;
      unawaited(_registerCurrentToken(ref, tokenOverride: token));
    });

    final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
    if (initialMessage != null) {
      Future.microtask(() => _handleRemoteMessageTap(initialMessage, ref));
    }
  }

  Future<void> syncAuthenticatedSession(WidgetRef ref, String? authToken) async {
    if (authToken == null || authToken.trim().isEmpty) {
      return;
    }
    await _requestPermissionIfNeeded();
    await _registerCurrentToken(ref, tokenOverride: await FirebaseMessaging.instance.getToken());
  }

  Future<void> unregisterCurrentDevice(WidgetRef ref, String? authToken) async {
    if (authToken == null || authToken.trim().isEmpty) {
      return;
    }
    final token = _currentToken ?? await FirebaseMessaging.instance.getToken();
    if (token == null || token.trim().isEmpty) {
      return;
    }

    try {
      await _api.delete(
        '/api/notifications/device-token',
        token: authToken,
        data: {'token': token},
      );
    } catch (_) {
      // best effort
    }
  }

  Future<void> dispose() async {
    await _foregroundSubscription?.cancel();
    await _openedSubscription?.cancel();
    await _tokenRefreshSubscription?.cancel();
  }

  Future<void> _requestPermissionIfNeeded() async {
    if (_permissionRequested) return;
    _permissionRequested = true;
    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
    await _localNotifications
        .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
        ?.requestPermissions(alert: true, badge: true, sound: true);
  }

  Future<void> _registerCurrentToken(WidgetRef ref, {String? tokenOverride}) async {
    final authToken = ref.read(buyerAuthTokenProvider);
    if (authToken == null || authToken.trim().isEmpty) {
      return;
    }

    final token = (tokenOverride ?? _currentToken ?? await FirebaseMessaging.instance.getToken())?.trim();
    if (token == null || token.isEmpty) {
      return;
    }

    _currentToken = token;

    try {
      await _api.post(
        '/api/notifications/device-token',
        token: authToken,
        data: {
          'token': token,
          'platform': _platformName,
        },
      );
    } catch (_) {
      // best effort
    }
  }

  Future<void> _handleForegroundMessage(RemoteMessage message, WidgetRef ref) async {
    await ref.read(notificationsProvider.notifier).refresh();
    final type = (message.data['type'] ?? '').toString().toUpperCase();
    if (type == 'ORDER') {
      await ref.read(ordersProvider.notifier).refresh();
    }

    final title = message.notification?.title ?? (message.data['title']?.toString() ?? 'AgriTec');
    final body = message.notification?.body ?? (message.data['body']?.toString() ?? 'You have a new update.');
    final payload = jsonEncode(message.data);

    await _localNotifications.show(
      title.hashCode ^ body.hashCode,
      title,
      body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _androidNotificationChannel.id,
          _androidNotificationChannel.name,
          channelDescription: _androidNotificationChannel.description,
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
      ),
      payload: payload,
    );
  }

  Future<void> _handleRemoteMessageTap(RemoteMessage message, WidgetRef ref) async {
    await _routeFromPayload(ref, Map<String, dynamic>.from(message.data));
  }

  Future<void> _handleLocalNotificationTap(String? payload, WidgetRef ref) async {
    if (payload == null || payload.trim().isEmpty) return;
    try {
      final decoded = jsonDecode(payload);
      if (decoded is Map<String, dynamic>) {
        await _routeFromPayload(ref, decoded);
      } else if (decoded is Map) {
        await _routeFromPayload(ref, Map<String, dynamic>.from(decoded));
      }
    } catch (_) {
      // ignore invalid payloads
    }
  }

  Future<void> _routeFromPayload(WidgetRef ref, Map<String, dynamic> payload) async {
    final router = ref.read(appRouterProvider);
    final type = (payload['type'] ?? '').toString().toUpperCase();
    final targetType = (payload['targetType'] ?? '').toString();
    final targetId = (payload['targetId'] ?? '').toString();
    final conversationId = (payload['conversationId'] ?? '').toString();
    final sellerId = (payload['sellerId'] ?? '').toString();
    final parentOrderId = (payload['parentOrderId'] ?? '').toString();

    await ref.read(notificationsProvider.notifier).refresh();

    if (type == 'MESSAGE' || targetType == 'conversation') {
      ref.read(shellTabProvider.notifier).setTab(2);
      if (conversationId.isNotEmpty) {
        ref.read(chatProvider.notifier).selectConversation(conversationId);
      } else if (sellerId.isNotEmpty) {
        final seller = ref.read(homeSellerByIdProvider(sellerId));
        ref.read(chatProvider.notifier).startSellerChat(
          sellerId: seller.id,
          farmName: seller.farmName,
          sellerName: seller.name,
        );
      }
      router.goNamed(MainShellPage.routeName);
      return;
    }

    final orderId = parentOrderId.isNotEmpty
        ? parentOrderId
        : (targetType == 'parentOrder' ? targetId : '');
    if (orderId.isNotEmpty) {
      await ref.read(ordersProvider.notifier).refresh();
      router.goNamed(
        OrderDetailsPage.routeName,
        pathParameters: {'orderId': orderId},
      );
      return;
    }

    router.pushNamed(NotificationsPage.routeName);
  }
}

String get _platformName {
  if (kIsWeb) return 'WEB';
  switch (defaultTargetPlatform) {
    case TargetPlatform.iOS:
    case TargetPlatform.macOS:
      return 'IOS';
    case TargetPlatform.android:
    case TargetPlatform.fuchsia:
    case TargetPlatform.linux:
    case TargetPlatform.windows:
      return 'ANDROID';
  }
}


