import 'package:flutter_riverpod/flutter_riverpod.dart';

enum ChatChannelType { seller, support }

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.senderId,
    required this.text,
    required this.sentAt,
    required this.isMine,
  });

  final String id;
  final String senderId;
  final String text;
  final DateTime sentAt;
  final bool isMine;
}

class ChatConversation {
  const ChatConversation({
    required this.id,
    required this.channelType,
    required this.title,
    required this.subtitle,
    required this.avatarLabel,
    required this.messages,
  });

  final String id;
  final ChatChannelType channelType;
  final String title;
  final String subtitle;
  final String avatarLabel;
  final List<ChatMessage> messages;
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
}

class ChatNotifier extends Notifier<ChatState> {
  @override
  ChatState build() {
    return ChatState(
      selectedConversationId: 'conv-support',
      activeDraft: null,
      conversations: [
        ChatConversation(
          id: 'conv-support',
          channelType: ChatChannelType.support,
          title: 'Agritec Support',
          subtitle: 'Customer helpdesk',
          avatarLabel: 'AS',
          messages: [
            ChatMessage(
              id: 'm4',
              senderId: 'support',
              text: 'Hi, how can we help you today?',
              sentAt: DateTime(2026, 5, 31, 9, 5),
              isMine: false,
            ),
          ],
        ),
      ],
    );
  }

  void selectConversation(String conversationId) {
    state = state.copyWith(
      selectedConversationId: conversationId,
      clearActiveDraft: true,
    );
  }

  void startSellerChat({
    required String sellerId,
    required String farmName,
    required String sellerName,
  }) {
    final existing = state.conversations.where((conversation) {
      return conversation.channelType == ChatChannelType.seller &&
          conversation.id == 'conv-$sellerId';
    }).toList();
    if (existing.isNotEmpty) {
      state = state.copyWith(
        selectedConversationId: existing.first.id,
        clearActiveDraft: true,
      );
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
  }

  void sendMessage(String text) {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;
    if (state.selectedConversationId == null && state.activeDraft != null) {
      final draft = state.activeDraft!;
      final conversation = ChatConversation(
        id: 'conv-${draft.sellerId}',
        channelType: ChatChannelType.seller,
        title: draft.farmName,
        subtitle: 'Seller: ${draft.sellerName}',
        avatarLabel: _avatarLabel(draft.farmName),
        messages: [
          ChatMessage(
            id: 'm-${DateTime.now().millisecondsSinceEpoch}',
            senderId: 'buyer',
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
          text: trimmed,
          sentAt: DateTime.now(),
          isMine: true,
        ),
      ];
      return ChatConversation(
        id: conversation.id,
        channelType: conversation.channelType,
        title: conversation.title,
        subtitle: conversation.subtitle,
        avatarLabel: conversation.avatarLabel,
        messages: next,
      );
    }).toList();
    state = state.copyWith(conversations: updated, clearActiveDraft: true);
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
