import 'package:agritec_mobile/core/storage/cache_providers.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum ChatChannelType { seller, support }

enum ChatParticipantRole { buyer, seller, support }

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
      };

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] as String,
      senderId: json['senderId'] as String,
      senderName: json['senderName'] as String? ?? 'Unknown',
      senderRole: ChatParticipantRole.values.firstWhere(
        (role) => role.name == json['senderRole'],
        orElse: () => ChatParticipantRole.seller,
      ),
      text: json['text'] as String,
      sentAt: DateTime.parse(json['sentAt'] as String),
      isMine: json['isMine'] as bool? ?? false,
      relatedOrderId: json['relatedOrderId'] as String?,
      readAt: json['readAt'] is String
          ? DateTime.parse(json['readAt'] as String)
          : null,
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
    this.participantSubtitle,
    this.relatedOrderId,
  });

  final String id;
  final ChatChannelType channelType;
  final String participantId;
  final String participantName;
  final ChatParticipantRole participantRole;
  final String avatarLabel;
  final String? participantSubtitle;
  final String? relatedOrderId;
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

  Map<String, dynamic> toJson() => {
        'id': id,
        'channelType': channelType.name,
        'participantId': participantId,
        'participantName': participantName,
        'participantRole': participantRole.name,
        'avatarLabel': avatarLabel,
        'participantSubtitle': participantSubtitle,
        'relatedOrderId': relatedOrderId,
        'messages': messages.map((message) => message.toJson()).toList(),
      };

  factory ChatConversation.fromJson(Map<String, dynamic> json) {
    return ChatConversation(
      id: json['id'] as String,
      channelType: ChatChannelType.values.firstWhere(
        (type) => type.name == json['channelType'],
        orElse: () => ChatChannelType.seller,
      ),
      participantId: json['participantId'] as String,
      participantName: json['participantName'] as String,
      participantRole: ChatParticipantRole.values.firstWhere(
        (role) => role.name == json['participantRole'],
        orElse: () => ChatParticipantRole.seller,
      ),
      avatarLabel: json['avatarLabel'] as String? ?? 'SL',
      participantSubtitle: json['participantSubtitle'] as String?,
      relatedOrderId: json['relatedOrderId'] as String?,
      messages: (json['messages'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(ChatMessage.fromJson)
          .toList(),
    );
  }
}

class SellerChatDraft {
  const SellerChatDraft({
    required this.sellerId,
    required this.farmName,
    required this.sellerName,
  });

  final String sellerId;
  final String farmName;
  final String sellerName;

  Map<String, dynamic> toJson() => {
        'sellerId': sellerId,
        'farmName': farmName,
        'sellerName': sellerName,
      };

  factory SellerChatDraft.fromJson(Map<String, dynamic> json) {
    return SellerChatDraft(
      sellerId: json['sellerId'] as String,
      farmName: json['farmName'] as String,
      sellerName: json['sellerName'] as String,
    );
  }
}

class ChatState {
  const ChatState({
    required this.selectedConversationId,
    required this.activeDraft,
    required this.conversations,
  });

  final String? selectedConversationId;
  final SellerChatDraft? activeDraft;
  final List<ChatConversation> conversations;

  ChatState copyWith({
    String? selectedConversationId,
    bool clearSelectedConversationId = false,
    SellerChatDraft? activeDraft,
    bool clearActiveDraft = false,
    List<ChatConversation>? conversations,
  }) {
    return ChatState(
      selectedConversationId: clearSelectedConversationId
          ? null
          : (selectedConversationId ?? this.selectedConversationId),
      activeDraft: clearActiveDraft ? null : (activeDraft ?? this.activeDraft),
      conversations: conversations ?? this.conversations,
    );
  }

  Map<String, dynamic> toJson() => {
        'selectedConversationId': selectedConversationId,
        'activeDraft': activeDraft?.toJson(),
        'conversations': conversations
            .map((conversation) => conversation.toJson())
            .toList(),
      };

  factory ChatState.fromJson(Map<String, dynamic> json) {
    return ChatState(
      selectedConversationId: json['selectedConversationId'] as String?,
      activeDraft: json['activeDraft'] is Map<String, dynamic>
          ? SellerChatDraft.fromJson(json['activeDraft'] as Map<String, dynamic>)
          : null,
      conversations: (json['conversations'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(ChatConversation.fromJson)
          .toList(),
    );
  }
}

class ChatNotifier extends Notifier<ChatState> {
  static const _cacheKeyPrefix = 'cache_chat_state_v2';
  bool _didHydrate = false;

  @override
  ChatState build() {
    ref.watch(currentBuyerUserIdProvider);
    _hydrate();
    return _seedStateForCurrentUser();
  }

  String _cacheKey() {
    final userId = ref.read(currentBuyerUserIdProvider) ?? 'guest';
    return '$_cacheKeyPrefix-$userId';
  }

  ChatState _seedStateForCurrentUser() {
    final userId = ref.read(currentBuyerUserIdProvider);
    if (userId != 'buyer-demo-1') {
      return ChatState(
        selectedConversationId: null,
        activeDraft: null,
        conversations: [
          ChatConversation(
            id: 'conv-support',
            channelType: ChatChannelType.support,
            participantId: 'support',
            participantName: 'Agritec Support',
            participantRole: ChatParticipantRole.support,
            avatarLabel: 'AS',
            participantSubtitle: 'Customer helpdesk',
            messages: [
              ChatMessage(
                id: 'm-support-1',
                senderId: 'support',
                senderName: 'Agritec Support',
                senderRole: ChatParticipantRole.support,
                text: 'Hi, how can we help you today?',
                sentAt: DateTime(2026, 5, 31, 9, 5),
                isMine: false,
              ),
            ],
          ),
        ],
      );
    }

    return ChatState(
      selectedConversationId: null,
      activeDraft: null,
      conversations: [
        ChatConversation(
          id: 'conv-support',
          channelType: ChatChannelType.support,
          participantId: 'support',
          participantName: 'Agritec Support',
          participantRole: ChatParticipantRole.support,
          avatarLabel: 'AS',
          participantSubtitle: 'Customer helpdesk',
          messages: [
            ChatMessage(
              id: 'm-support-1',
              senderId: 'support',
              senderName: 'Agritec Support',
              senderRole: ChatParticipantRole.support,
              text: 'Hi, how can we help you today?',
              sentAt: DateTime(2026, 5, 31, 9, 5),
              isMine: false,
            ),
          ],
        ),
        ChatConversation(
          id: 'conv-seller-amina',
          channelType: ChatChannelType.seller,
          participantId: 'seller-amina',
          participantName: 'Bello Fresh Produce',
          participantRole: ChatParticipantRole.seller,
          avatarLabel: 'BP',
          participantSubtitle: 'Seller: Amina Bello',
          relatedOrderId: 'buyer-order-3001',
          messages: [
            ChatMessage(
              id: 'm-amina-1',
              senderId: 'seller-amina',
              senderName: 'Amina Bello',
              senderRole: ChatParticipantRole.seller,
              text: 'Your sweet corn group is packed and waiting for rider pickup.',
              sentAt: DateTime(2026, 5, 31, 9, 45),
              isMine: false,
              relatedOrderId: 'buyer-order-3001',
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _hydrate() async {
    if (_didHydrate) return;
    _didHydrate = true;
    final cache = await ref.read(localCacheServiceProvider.future);
    final raw = cache.readJson(_cacheKey());
    if (raw == null) return;
    final payload = raw['chatState'];
    if (payload is! Map<String, dynamic>) return;
    final parsed = ChatState.fromJson(payload);
    if (parsed.conversations.isNotEmpty) {
      state = parsed;
    }
  }

  Future<void> _persist() async {
    final cache = await ref.read(localCacheServiceProvider.future);
    await cache.saveJson(_cacheKey(), {
      'chatState': state.toJson(),
    });
  }

  void selectConversation(String conversationId) {
    state = state.copyWith(
      selectedConversationId: conversationId,
      clearActiveDraft: true,
    );
    _persist();
  }

  void clearSelectedConversation() {
    state = state.copyWith(
      clearSelectedConversationId: true,
      clearActiveDraft: true,
    );
    _persist();
  }

  void startSellerChat({
    required String sellerId,
    required String farmName,
    required String sellerName,
  }) {
    final existing = state.conversations.where((conversation) {
      return conversation.channelType == ChatChannelType.seller &&
          conversation.participantId == sellerId;
    }).toList();
    if (existing.isNotEmpty) {
      state = state.copyWith(
        selectedConversationId: existing.first.id,
        clearActiveDraft: true,
      );
      _persist();
      return;
    }
    state = state.copyWith(
      activeDraft: SellerChatDraft(
        sellerId: sellerId,
        farmName: farmName,
        sellerName: sellerName,
      ),
      clearSelectedConversationId: true,
    );
    _persist();
  }

  void sendMessage(String text) {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;
    if (state.selectedConversationId == null && state.activeDraft != null) {
      final draft = state.activeDraft!;
      final conversation = ChatConversation(
        id: 'conv-${draft.sellerId}',
        channelType: ChatChannelType.seller,
        participantId: draft.sellerId,
        participantName: draft.farmName,
        participantRole: ChatParticipantRole.seller,
        avatarLabel: _avatarLabel(draft.farmName),
        participantSubtitle: 'Seller: ${draft.sellerName}',
        messages: [
          ChatMessage(
            id: 'm-${DateTime.now().millisecondsSinceEpoch}',
            senderId: 'buyer',
            senderName: 'Buyer',
            senderRole: ChatParticipantRole.buyer,
            text: trimmed,
            sentAt: DateTime.now(),
            isMine: true,
          ),
        ],
      );
      state = state.copyWith(
        conversations: [conversation, ...state.conversations],
        selectedConversationId: conversation.id,
        clearActiveDraft: true,
      );
      _persist();
      return;
    }

    final selectedConversationId = state.selectedConversationId;
    if (selectedConversationId == null) return;
    final updated = state.conversations.map((conversation) {
      if (conversation.id != selectedConversationId) return conversation;
      final next = [
        ...conversation.messages,
        ChatMessage(
          id: 'm-${DateTime.now().millisecondsSinceEpoch}',
          senderId: 'buyer',
          senderName: 'Buyer',
          senderRole: ChatParticipantRole.buyer,
          text: trimmed,
          sentAt: DateTime.now(),
          isMine: true,
          relatedOrderId: conversation.relatedOrderId,
        ),
      ];
      return ChatConversation(
        id: conversation.id,
        channelType: conversation.channelType,
        participantId: conversation.participantId,
        participantName: conversation.participantName,
        participantRole: conversation.participantRole,
        avatarLabel: conversation.avatarLabel,
        participantSubtitle: conversation.participantSubtitle,
        relatedOrderId: conversation.relatedOrderId,
        messages: next,
      );
    }).toList();
    state = state.copyWith(conversations: updated, clearActiveDraft: true);
    _persist();
  }
}

String _avatarLabel(String farmName) {
  final parts = farmName
      .split(' ')
      .where((part) => part.trim().isNotEmpty)
      .take(2)
      .toList();
  if (parts.isEmpty) return 'SL';
  if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
  return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
}

final chatProvider = NotifierProvider<ChatNotifier, ChatState>(ChatNotifier.new);
