import 'dart:async';

import 'package:agritec_mobile/core/api/mobile_api.dart';
import 'package:agritec_mobile/core/storage/cache_providers.dart';
import 'package:agritec_mobile/core/utils/wat_time.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:agritec_mobile/features/auth/data/auth_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum ChatChannelType { seller, support }

enum ChatParticipantRole { buyer, seller, support }

class ChatAttachment {
  const ChatAttachment({
    required this.id,
    required this.secureUrl,
    required this.publicId,
    this.mimeType,
    this.createdAt,
  });

  final String id;
  final String secureUrl;
  final String publicId;
  final String? mimeType;
  final DateTime? createdAt;

  Map<String, dynamic> toJson() => {
        'id': id,
        'secureUrl': secureUrl,
        'publicId': publicId,
        'mimeType': mimeType,
        'createdAt': createdAt?.toIso8601String(),
      };

  factory ChatAttachment.fromJson(Map<String, dynamic> json) {
    return ChatAttachment(
      id: '${json['id'] ?? ''}',
      secureUrl: '${json['secureUrl'] ?? ''}',
      publicId: '${json['publicId'] ?? ''}',
      mimeType: json['mimeType'] as String?,
      createdAt: json['createdAt'] is String
          ? parseWatDateTime(json['createdAt'] as String)
          : null,
    );
  }
}
class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.senderRole,
    required this.text,
    required this.sentAt,
    required this.isMine,
    this.relatedOrderId,
    this.readAt,
    this.attachments = const [],
    this.isSending = false,
    this.hasFailed = false,
  });

  final String id;
  final String senderId;
  final String senderName;
  final ChatParticipantRole senderRole;
  final String text;
  final DateTime sentAt;
  final bool isMine;
  final String? relatedOrderId;
  final DateTime? readAt;
  final List<ChatAttachment> attachments;
  final bool isSending;
  final bool hasFailed;

  ChatMessage copyWith({
    String? id,
    String? senderId,
    String? senderName,
    ChatParticipantRole? senderRole,
    String? text,
    DateTime? sentAt,
    bool? isMine,
    String? relatedOrderId,
    DateTime? readAt,
    List<ChatAttachment>? attachments,
    bool? isSending,
    bool? hasFailed,
  }) {
    return ChatMessage(
      id: id ?? this.id,
      senderId: senderId ?? this.senderId,
      senderName: senderName ?? this.senderName,
      senderRole: senderRole ?? this.senderRole,
      text: text ?? this.text,
      sentAt: sentAt ?? this.sentAt,
      isMine: isMine ?? this.isMine,
      relatedOrderId: relatedOrderId ?? this.relatedOrderId,
      readAt: readAt ?? this.readAt,
      attachments: attachments ?? this.attachments,
      isSending: isSending ?? this.isSending,
      hasFailed: hasFailed ?? this.hasFailed,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'senderId': senderId,
        'senderName': senderName,
        'senderRole': senderRole.name,
        'text': text,
        'sentAt': sentAt.toIso8601String(),
        'isMine': isMine,
        'relatedOrderId': relatedOrderId,
        'readAt': readAt?.toIso8601String(),
        'attachments': attachments.map((attachment) => attachment.toJson()).toList(),
        'isSending': isSending,
        'hasFailed': hasFailed,
      };

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: '${json['id']}',
      senderId: '${json['senderId']}',
      senderName: '${json['senderName'] ?? 'Unknown'}',
      senderRole: ChatParticipantRole.values.firstWhere(
        (role) => role.name == json['senderRole'],
        orElse: () => ChatParticipantRole.seller,
      ),
      text: '${json['text'] ?? ''}',
      sentAt: parseWatDateTime('${json['sentAt'] ?? ''}'),
      isMine: json['isMine'] as bool? ?? false,
      relatedOrderId: json['relatedOrderId'] as String?,
      readAt: json['readAt'] is String
          ? parseWatDateTime(json['readAt'] as String)
          : null,
      attachments: (json['attachments'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(ChatAttachment.fromJson)
          .toList(),
      isSending: json['isSending'] as bool? ?? false,
      hasFailed: json['hasFailed'] as bool? ?? false,
    );
  }
}

class ChatConversation {
  const ChatConversation({
    required this.id,
    required this.channelType,
    required this.participantId,
    required this.participantName,
    required this.participantRole,
    required this.avatarLabel,
    required this.messages,
    required this.unreadCount,
    this.participantSubtitle,
    this.relatedOrderId,
    this.lastMessageAt,
    this.latestMessage,
  });

  final String id;
  final ChatChannelType channelType;
  final String participantId;
  final String participantName;
  final ChatParticipantRole participantRole;
  final String avatarLabel;
  final String? participantSubtitle;
  final String? relatedOrderId;
  final DateTime? lastMessageAt;
  final ChatMessage? latestMessage;
  final int unreadCount;
  final List<ChatMessage> messages;

  String get title => participantName;

  String get subtitle {
    if (participantSubtitle != null && participantSubtitle!.trim().isNotEmpty) {
      return participantSubtitle!;
    }
    return switch (channelType) {
      ChatChannelType.support => 'Customer helpdesk',
      ChatChannelType.seller => 'Seller conversation',
    };
  }

  ChatConversation copyWith({
    String? participantId,
    String? participantName,
    ChatParticipantRole? participantRole,
    String? avatarLabel,
    String? participantSubtitle,
    String? relatedOrderId,
    DateTime? lastMessageAt,
    ChatMessage? latestMessage,
    int? unreadCount,
    List<ChatMessage>? messages,
  }) {
    return ChatConversation(
      id: id,
      channelType: channelType,
      participantId: participantId ?? this.participantId,
      participantName: participantName ?? this.participantName,
      participantRole: participantRole ?? this.participantRole,
      avatarLabel: avatarLabel ?? this.avatarLabel,
      participantSubtitle: participantSubtitle ?? this.participantSubtitle,
      relatedOrderId: relatedOrderId ?? this.relatedOrderId,
      lastMessageAt: lastMessageAt ?? this.lastMessageAt,
      latestMessage: latestMessage ?? this.latestMessage,
      unreadCount: unreadCount ?? this.unreadCount,
      messages: messages ?? this.messages,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'channelType': channelType.name,
        'participantId': participantId,
        'participantName': participantName,
        'participantRole': participantRole.name,
        'avatarLabel': avatarLabel,
        'participantSubtitle': participantSubtitle,
        'relatedOrderId': relatedOrderId,
        'lastMessageAt': lastMessageAt?.toIso8601String(),
        'latestMessage': latestMessage?.toJson(),
        'unreadCount': unreadCount,
        'messages': messages.map((message) => message.toJson()).toList(),
      };

  factory ChatConversation.fromJson(Map<String, dynamic> json) {
    return ChatConversation(
      id: '${json['id']}',
      channelType: ChatChannelType.values.firstWhere(
        (type) => type.name == json['channelType'],
        orElse: () => ChatChannelType.seller,
      ),
      participantId: '${json['participantId'] ?? ''}',
      participantName: '${json['participantName'] ?? ''}',
      participantRole: ChatParticipantRole.values.firstWhere(
        (role) => role.name == json['participantRole'],
        orElse: () => ChatParticipantRole.seller,
      ),
      avatarLabel: '${json['avatarLabel'] ?? 'SL'}',
      participantSubtitle: json['participantSubtitle'] as String?,
      relatedOrderId: json['relatedOrderId'] as String?,
      lastMessageAt: json['lastMessageAt'] is String
          ? parseWatDateTime(json['lastMessageAt'] as String)
          : null,
      latestMessage: json['latestMessage'] is Map<String, dynamic>
          ? ChatMessage.fromJson(json['latestMessage'] as Map<String, dynamic>)
          : null,
      unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
      messages: (json['messages'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(ChatMessage.fromJson)
          .toList(),
    );
  }
}

class ChatState {
  const ChatState({
    required this.selectedConversationId,
    required this.conversations,
    required this.isLoading,
    required this.isSending,
  });

  final String? selectedConversationId;
  final List<ChatConversation> conversations;
  final bool isLoading;
  final bool isSending;

  ChatState copyWith({
    String? selectedConversationId,
    bool clearSelectedConversationId = false,
    List<ChatConversation>? conversations,
    bool? isLoading,
    bool? isSending,
  }) {
    return ChatState(
      selectedConversationId: clearSelectedConversationId
          ? null
          : (selectedConversationId ?? this.selectedConversationId),
      conversations: conversations ?? this.conversations,
      isLoading: isLoading ?? this.isLoading,
      isSending: isSending ?? this.isSending,
    );
  }

  Map<String, dynamic> toJson() => {
        'selectedConversationId': selectedConversationId,
        'conversations': conversations
            .map((conversation) => conversation.toJson())
            .toList(),
      };

  factory ChatState.fromJson(Map<String, dynamic> json) {
    return ChatState(
      selectedConversationId: json['selectedConversationId'] as String?,
      conversations: (json['conversations'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(ChatConversation.fromJson)
          .toList(),
      isLoading: false,
      isSending: false,
    );
  }
}

class ChatNotifier extends Notifier<ChatState> {
  static const _cacheKeyPrefix = 'cache_chat_state_v3';
  static const _conversationPollInterval = Duration(seconds: 12);
  static const _messagePollInterval = Duration(seconds: 4);

  ChatState _seedState = const ChatState(
    selectedConversationId: null,
    conversations: [],
    isLoading: false,
    isSending: false,
  );
  String? _sessionStamp;
  bool _didPrime = false;
  Timer? _conversationPoller;
  Timer? _messagePoller;

  @override
  ChatState build() {
    final userId = ref.watch(currentBuyerUserIdProvider);
    final token = ref.watch(buyerAuthTokenProvider);
    final stamp = '${userId ?? 'guest'}:${token ?? 'none'}';
    if (_sessionStamp != stamp) {
      _sessionStamp = stamp;
      _didPrime = false;
      _cancelPollers();
      _seedState = const ChatState(
        selectedConversationId: null,
        conversations: [],
        isLoading: false,
        isSending: false,
      );
    }

    ref.onDispose(_cancelPollers);

    if (token != null && token.trim().isNotEmpty && userId != null) {
      _prime();
    }

    return _seedState;
  }

  String _cacheKey() {
    final userId = ref.read(currentBuyerUserIdProvider) ?? 'guest';
    return '$_cacheKeyPrefix-$userId';
  }

  Future<void> _prime() async {
    if (_didPrime) return;
    _didPrime = true;
    await _hydrate();
    await refreshConversations();
    _startConversationPolling();
  }

  Future<void> _hydrate() async {
    final cache = await ref.read(localCacheServiceProvider.future);
    final raw = cache.readJson(_cacheKey());
    if (raw == null) return;
    final payload = raw['chatState'];
    if (payload is! Map<String, dynamic>) return;
    final parsed = ChatState.fromJson(payload);
    _setState(parsed);
    if (parsed.selectedConversationId != null) {
      _startMessagePolling(parsed.selectedConversationId!);
    }
  }

  Future<void> _persist() async {
    final cache = await ref.read(localCacheServiceProvider.future);
    await cache.saveJson(_cacheKey(), {
      'chatState': state.toJson(),
    });
  }

  void _setState(ChatState next) {
    _seedState = next;
    state = next;
  }

  void _cancelPollers() {
    _conversationPoller?.cancel();
    _conversationPoller = null;
    _messagePoller?.cancel();
    _messagePoller = null;
  }

  void _startConversationPolling() {
    _conversationPoller?.cancel();
    _conversationPoller = Timer.periodic(_conversationPollInterval, (_) {
      unawaited(refreshConversations());
    });
  }

  void _startMessagePolling(String conversationId) {
    _messagePoller?.cancel();
    _messagePoller = Timer.periodic(_messagePollInterval, (_) {
      unawaited(fetchMessages(conversationId, silent: true));
    });
  }

  ChatConversation? conversationById(String conversationId) {
    for (final conversation in state.conversations) {
      if (conversation.id == conversationId) return conversation;
    }
    return null;
  }

  Future<void> refreshConversations() async {
    final token = ref.read(buyerAuthTokenProvider);
    final currentUserId = ref.read(currentBuyerUserIdProvider);
    if (token == null || token.trim().isEmpty || currentUserId == null) {
      _setState(const ChatState(
        selectedConversationId: null,
        conversations: [],
        isLoading: false,
        isSending: false,
      ));
      return;
    }

    final api = ref.read(mobileApiClientProvider);
    final response = await api.get('/api/conversations', token: token);
    final rawItems = response['conversations'];
    if (rawItems is! List<dynamic>) {
      return;
    }

    final previousById = {
      for (final conversation in state.conversations) conversation.id: conversation,
    };

    final conversations = rawItems
        .whereType<Map<String, dynamic>>()
        .map((item) => _conversationFromApiJson(
              item,
              currentUserId: currentUserId,
              previous: previousById[item['id']?.toString()],
            ))
        .where(
          (conversation) =>
              !(
                conversation.channelType == ChatChannelType.support &&
                conversation.latestMessage == null &&
                state.selectedConversationId != conversation.id
              ),
        )
        .toList()
      ..sort((a, b) {
        final aTime = a.lastMessageAt ?? DateTime.fromMillisecondsSinceEpoch(0);
        final bTime = b.lastMessageAt ?? DateTime.fromMillisecondsSinceEpoch(0);
        return bTime.compareTo(aTime);
      });

    final selectedId = state.selectedConversationId;
    final safeSelectedId = conversations.any((item) => item.id == selectedId)
        ? selectedId
        : null;

    _setState(state.copyWith(
      conversations: conversations,
      selectedConversationId: safeSelectedId,
      isLoading: false,
    ));
    await _persist();
  }

  Future<void> ensureSupportConversation({bool selectIfCreated = false}) async {
    final token = ref.read(buyerAuthTokenProvider);
    if (token == null || token.trim().isEmpty) return;
    final existing = state.conversations.where(
      (conversation) => conversation.channelType == ChatChannelType.support,
    );
    if (existing.isNotEmpty) return;

    final api = ref.read(mobileApiClientProvider);
    final response = await api.post(
      '/api/conversations',
      token: token,
      data: {'type': 'BUYER_SUPPORT'},
    );
    final conversationJson = response['conversation'];
    final currentUserId = ref.read(currentBuyerUserIdProvider);
    if (conversationJson is! Map<String, dynamic> || currentUserId == null) {
      return;
    }
    final conversation = _conversationFromApiJson(
      conversationJson,
      currentUserId: currentUserId,
      previous: conversationById('${conversationJson['id']}'),
    );
    _upsertConversation(
      conversation,
      select: selectIfCreated,
    );
  }

  Future<void> selectConversation(String conversationId) async {
    if (conversationById(conversationId) == null) {
      await refreshConversations();
    }
    _setState(state.copyWith(selectedConversationId: conversationId));
    _startMessagePolling(conversationId);
    await fetchMessages(conversationId);
  }

  void clearSelectedConversation() {
    _messagePoller?.cancel();
    _messagePoller = null;
    _setState(state.copyWith(clearSelectedConversationId: true));
    _persist();
  }

  Future<void> startSupportConversation() async {
    await ensureSupportConversation(selectIfCreated: true);
    final supportConversation = state.conversations.firstWhere(
      (conversation) => conversation.channelType == ChatChannelType.support,
      orElse: () => const ChatConversation(
        id: '',
        channelType: ChatChannelType.support,
        participantId: '',
        participantName: '',
        participantRole: ChatParticipantRole.support,
        avatarLabel: 'AS',
        participantSubtitle: 'Customer helpdesk',
        unreadCount: 0,
        messages: [],
      ),
    );
    if (supportConversation.id.isNotEmpty) {
      await selectConversation(supportConversation.id);
    }
  }

  Future<void> startSellerChat({
    required String sellerId,
    required String farmName,
    required String sellerName,
  }) async {
    final token = ref.read(buyerAuthTokenProvider);
    final currentUserId = ref.read(currentBuyerUserIdProvider);
    if (token == null || token.trim().isEmpty || currentUserId == null) {
      return;
    }

    final api = ref.read(mobileApiClientProvider);
    final response = await api.post(
      '/api/conversations',
      token: token,
      data: {
        'type': 'BUYER_SELLER',
        'sellerId': sellerId,
      },
    );

    final conversationJson = response['conversation'];
    if (conversationJson is! Map<String, dynamic>) {
      return;
    }

    final conversation = _conversationFromApiJson(
      conversationJson,
      currentUserId: currentUserId,
      previous: conversationById('${conversationJson['id']}'),
      participantNameOverride: farmName,
      participantSubtitleOverride: 'Seller: $sellerName',
    );
    _upsertConversation(conversation, select: true);
    await fetchMessages(conversation.id);
  }

  Future<void> fetchMessages(String conversationId, {bool silent = false}) async {
    final token = ref.read(buyerAuthTokenProvider);
    final currentUserId = ref.read(currentBuyerUserIdProvider);
    if (token == null || token.trim().isEmpty || currentUserId == null) {
      return;
    }

    final api = ref.read(mobileApiClientProvider);
    final response = await api.get('/api/conversations/$conversationId/messages', token: token);
    final rawItems = response['messages'];
    if (rawItems is! List<dynamic>) return;

    final messages = rawItems
        .whereType<Map<String, dynamic>>()
        .map((item) => _messageFromApiJson(item, currentUserId))
        .toList();

    var existing = conversationById(conversationId);
    if (existing == null) {
      await refreshConversations();
      existing = conversationById(conversationId);
    }
    if (existing == null) return;

    final latestMessage = messages.isEmpty ? existing.latestMessage : messages.last;
    final nextConversation = existing.copyWith(
      messages: messages,
      latestMessage: latestMessage,
      lastMessageAt: messages.isEmpty ? existing.lastMessageAt : messages.last.sentAt,
      unreadCount: 0,
    );
    _upsertConversation(nextConversation, select: true, persist: !silent);
  }

  Future<void> sendMessage(String text, {List<ChatAttachment> attachments = const []}) async {
    final trimmed = text.trim();
    final conversationId = state.selectedConversationId;
    final currentUser = ref.read(currentBuyerUserProvider);
    final token = ref.read(buyerAuthTokenProvider);
    if ((trimmed.isEmpty && attachments.isEmpty) || conversationId == null || currentUser == null || token == null || token.trim().isEmpty) {
      return;
    }

    var existing = conversationById(conversationId);
    if (existing == null) {
      await refreshConversations();
      existing = conversationById(conversationId);
    }
    if (existing == null) return;

    final optimistic = ChatMessage(
      id: 'temp-${DateTime.now().microsecondsSinceEpoch}',
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderRole: ChatParticipantRole.buyer,
      text: trimmed,
      sentAt: DateTime.now(),
      isMine: true,
      relatedOrderId: existing.relatedOrderId,
      attachments: attachments,
      isSending: true,
    );

    final updatedMessages = [...existing.messages, optimistic];
    _upsertConversation(
      existing.copyWith(
        messages: updatedMessages,
        latestMessage: optimistic.copyWith(
          text: trimmed.isEmpty ? 'Sent an attachment' : trimmed,
        ),
        lastMessageAt: optimistic.sentAt,
      ),
      select: true,
      persist: false,
    );
    _setState(state.copyWith(isSending: true));

    try {
      final api = ref.read(mobileApiClientProvider);
      final response = await api.post(
        '/api/conversations/$conversationId/messages',
        token: token,
        data: {
          'body': trimmed.isEmpty ? null : trimmed,
          'type': attachments.isNotEmpty && trimmed.isEmpty ? 'IMAGE' : 'TEXT',
          'attachments': attachments
              .map((attachment) => {
                    'secureUrl': attachment.secureUrl,
                    'publicId': attachment.publicId,
                    'mimeType': attachment.mimeType,
                  })
              .toList(),
        },
      );
      final messageJson = response['message'];
      if (messageJson is! Map<String, dynamic>) {
        throw const MobileApiException(message: 'Invalid message response');
      }
      final saved = _messageFromApiJson(
        messageJson,
        currentUser.id,
      );
      final refreshedConversation = conversationById(conversationId);
      if (refreshedConversation != null) {
        final replaced = [
          for (final message in refreshedConversation.messages)
            if (message.id == optimistic.id) saved else message,
        ];
        _upsertConversation(
          refreshedConversation.copyWith(
            messages: replaced,
            latestMessage: saved.copyWith(
              text: saved.text.isEmpty ? 'Sent an attachment' : saved.text,
            ),
            lastMessageAt: saved.sentAt,
          ),
          select: true,
        );
      }
      await refreshConversations();
    } catch (_) {
      final refreshedConversation = conversationById(conversationId);
      if (refreshedConversation != null) {
        final replaced = [
          for (final message in refreshedConversation.messages)
            if (message.id == optimistic.id)
              optimistic.copyWith(isSending: false, hasFailed: true)
            else
              message,
        ];
        _upsertConversation(
          refreshedConversation.copyWith(messages: replaced),
          select: true,
        );
      }
    } finally {
      _setState(state.copyWith(isSending: false));
      await _persist();
    }
  }

  void _upsertConversation(
    ChatConversation conversation, {
    bool select = false,
    bool persist = true,
  }) {
    final next = [...state.conversations];
    final index = next.indexWhere((item) => item.id == conversation.id);
    if (index >= 0) {
      next[index] = conversation;
    } else {
      next.insert(0, conversation);
    }
    next.sort((a, b) {
      final aTime = a.lastMessageAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bTime = b.lastMessageAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bTime.compareTo(aTime);
    });
    _setState(state.copyWith(
      conversations: next,
      selectedConversationId: select ? conversation.id : state.selectedConversationId,
    ));
    if (persist) {
      unawaited(_persist());
    }
  }
}

ChatConversation _conversationFromApiJson(
  Map<String, dynamic> json, {
  required String currentUserId,
  ChatConversation? previous,
  String? participantNameOverride,
  String? participantSubtitleOverride,
}) {
  final type = '${json['type'] ?? ''}'.toUpperCase();
  final participants = (json['participants'] as List<dynamic>? ?? const [])
      .whereType<Map<String, dynamic>>()
      .toList();
  final otherParticipant = participants.cast<Map<String, dynamic>?>().firstWhere(
        (participant) => participant?['userId']?.toString() != currentUserId,
        orElse: () => participants.isNotEmpty ? participants.first : null,
      );
  final latestMessageJson = json['latestMessage'] is Map<String, dynamic>
      ? json['latestMessage'] as Map<String, dynamic>
      : null;

  final channelType =
      type == 'BUYER_SUPPORT' ? ChatChannelType.support : ChatChannelType.seller;
  final participantRole = channelType == ChatChannelType.support
      ? ChatParticipantRole.support
      : ChatParticipantRole.seller;
  final fallbackName = channelType == ChatChannelType.support
      ? 'Agritec Support'
      : '${otherParticipant?['fullName'] ?? 'Seller'}';
  final participantName = participantNameOverride ??
      previous?.participantName ??
      fallbackName;

  return ChatConversation(
    id: '${json['id']}',
    channelType: channelType,
    participantId: '${otherParticipant?['userId'] ?? ''}',
    participantName: participantName,
    participantRole: participantRole,
    avatarLabel: _avatarLabel(participantName),
    participantSubtitle: participantSubtitleOverride ??
        previous?.participantSubtitle ??
        (channelType == ChatChannelType.support
            ? 'Customer helpdesk'
            : 'Seller conversation'),
    relatedOrderId: json['relatedParentOrderId']?.toString() ??
        latestMessageJson?['relatedParentOrderId']?.toString() ??
        previous?.relatedOrderId,
    lastMessageAt: json['lastMessageAt'] != null || json['updatedAt'] != null
        ? parseWatDateTime(
            '${json['lastMessageAt'] ?? json['updatedAt'] ?? ''}',
            fallback: previous?.lastMessageAt,
          )
        : previous?.lastMessageAt,
    latestMessage: latestMessageJson == null
        ? previous?.latestMessage
        : _messageFromConversationPreview(latestMessageJson, currentUserId),
    unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
    messages: previous?.messages ?? const [],
  );
}

ChatMessage _messageFromConversationPreview(
  Map<String, dynamic> json,
  String currentUserId,
) {
  final senderId = '${json['senderId'] ?? ''}';
  return ChatMessage(
    id: '${json['id']}',
    senderId: senderId,
    senderName: '${json['senderName'] ?? 'Unknown'}',
    senderRole: _roleFromApi('${json['senderRole'] ?? ''}'),
    text: '${json['body'] ?? ''}',
    sentAt: parseWatDateTime('${json['createdAt'] ?? ''}'),
    isMine: senderId == currentUserId,
    relatedOrderId: json['relatedParentOrderId']?.toString(),
    attachments: (json['attachments'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(ChatAttachment.fromJson)
        .toList(),
  );
}

ChatMessage _messageFromApiJson(
  Map<String, dynamic> json,
  String currentUserId,
) {
  final sender = json['sender'] is Map<String, dynamic>
      ? json['sender'] as Map<String, dynamic>
      : const <String, dynamic>{};
  final senderId = '${sender['id'] ?? ''}';
  return ChatMessage(
    id: '${json['id']}',
    senderId: senderId,
    senderName: '${sender['fullName'] ?? 'Unknown'}',
    senderRole: _roleFromApi('${sender['role'] ?? ''}'),
    text: '${json['body'] ?? ''}',
    sentAt: parseWatDateTime('${json['createdAt'] ?? ''}'),
    isMine: senderId == currentUserId,
    relatedOrderId: json['relatedParentOrderId']?.toString(),
    attachments: (json['attachments'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(ChatAttachment.fromJson)
        .toList(),
  );
}

ChatParticipantRole _roleFromApi(String value) {
  switch (value.toUpperCase()) {
    case 'BUYER':
      return ChatParticipantRole.buyer;
    case 'ADMIN':
      return ChatParticipantRole.support;
    default:
      return ChatParticipantRole.seller;
  }
}

String _avatarLabel(String value) {
  final parts = value
      .trim()
      .split(' ')
      .where((part) => part.trim().isNotEmpty)
      .take(2)
      .toList();
  if (parts.isEmpty) return 'SL';
  if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
  return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
}

final chatProvider = NotifierProvider<ChatNotifier, ChatState>(
  ChatNotifier.new,
);

final unreadChatCountProvider = Provider<int>((ref) {
  final conversations = ref.watch(chatProvider).conversations;
  return conversations.fold<int>(
    0,
    (sum, conversation) => sum + conversation.unreadCount,
  );
});
