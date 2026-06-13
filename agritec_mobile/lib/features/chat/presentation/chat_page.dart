import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
import 'package:agritec_mobile/features/chat/application/chat_providers.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class ChatPage extends ConsumerStatefulWidget {
  const ChatPage({super.key});

  @override
  ConsumerState<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends ConsumerState<ChatPage> {
  final _controller = TextEditingController();
  ChatChannelType _filter = ChatChannelType.seller;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !isBuyerAuthenticated(ref)) return;
      ref.read(chatProvider.notifier).refreshConversations();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }


  String _conversationSubtitle(ChatConversation conversation) {
    final subtitle = conversation.participantSubtitle?.trim() ?? '';
    if (subtitle.isNotEmpty) {
      if (subtitle.startsWith('Seller: ')) {
        return "${ref.tr('product.seller')}: ${subtitle.substring(8)}";
      }
      return subtitle;
    }
    return conversation.channelType == ChatChannelType.support
        ? ref.tr('chat.supportSubtitle')
        : ref.tr('chat.sellerSubtitle');
  }

  @override
  Widget build(BuildContext context) {
    if (!isBuyerAuthenticated(ref)) {
      return AuthRequiredPage(
        title: ref.tr('chat.title'),
        message: ref.tr('auth.required.contactSupport'),
        onBack: () => ref.read(shellTabProvider.notifier).setTab(0),
      );
    }

    final chatState = ref.watch(chatProvider);
    final notifier = ref.read(chatProvider.notifier);
    final selectedConversation = chatState.selectedConversationId == null
        ? null
        : (() {
            for (final conversation in chatState.conversations) {
              if (conversation.id == chatState.selectedConversationId) {
                return conversation;
              }
            }
            return null;
          })();
    final effectiveFilter = selectedConversation?.channelType ?? _filter;
    final filtered = chatState.conversations
        .where((conversation) => conversation.channelType == effectiveFilter)
        .toList();
    final selected = filtered.any((c) => c.id == chatState.selectedConversationId)
        ? filtered.firstWhere((c) => c.id == chatState.selectedConversationId)
        : null;
    final dateFormat = DateFormat('d MMM, y - h:mm a');

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFEAF7F2), Color(0xFFF7FAF8)],
        ),
      ),
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
              child: Row(
                children: [
                  Text(
                    ref.tr('chat.title'),
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
                  ),
                  const Spacer(),
                  SegmentedButton<ChatChannelType>(
                    segments: [
                      ButtonSegment(
                        value: ChatChannelType.seller,
                        icon: const Icon(Icons.storefront_rounded),
                        label: Text(ref.tr('chat.filter.sellers')),
                      ),
                      ButtonSegment(
                        value: ChatChannelType.support,
                        icon: const Icon(Icons.support_agent_rounded),
                        label: Text(ref.tr('chat.filter.support')),
                      ),
                    ],
                    selected: {effectiveFilter},
                    onSelectionChanged: (selection) async {
                      final next = selection.first;
                      setState(() => _filter = next);
                      if (selectedConversation != null &&
                          selectedConversation.channelType != next) {
                        notifier.clearSelectedConversation();
                      }
                      if (next == ChatChannelType.support) {
                        await notifier.startSupportConversation();
                      }
                    },
                  ),
                ],
              ),
            ),
            if (filtered.isEmpty)
              Expanded(
                child: Center(
                  child: Text(
                    ref.tr('chat.empty'),
                    style: const TextStyle(color: Color(0xFF66716C)),
                  ),
                ),
              )
            else ...[
              SizedBox(
                height: 84,
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  scrollDirection: Axis.horizontal,
                  itemBuilder: (context, index) {
                    final conversation = filtered[index];
                    final isSelected = selected?.id == conversation.id;
                    return InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: () => notifier.selectConversation(conversation.id),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFF0D8A66) : Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isSelected
                                ? const Color(0xFF0D8A66)
                                : const Color(0xFFE2E8E4),
                          ),
                        ),
                        child: Row(
                          children: [
                            Stack(
                              clipBehavior: Clip.none,
                              children: [
                                CircleAvatar(
                                  backgroundColor: isSelected
                                      ? Colors.white
                                      : const Color(0xFFEAF7F2),
                                  child: Text(
                                    conversation.avatarLabel,
                                    style: TextStyle(
                                      color: isSelected
                                          ? const Color(0xFF0D8A66)
                                          : const Color(0xFF0E5A43),
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                if (conversation.unreadCount > 0)
                                  Positioned(
                                    right: -6,
                                    top: -4,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 5,
                                        vertical: 1,
                                      ),
                                      decoration: BoxDecoration(
                                        color: isSelected
                                            ? Colors.white
                                            : const Color(0xFFCC3D1F),
                                        borderRadius: BorderRadius.circular(999),
                                      ),
                                      child: Text(
                                        conversation.unreadCount > 99
                                            ? '99+'
                                            : '${conversation.unreadCount}',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          color: isSelected
                                              ? const Color(0xFF0D8A66)
                                              : Colors.white,
                                        ),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(width: 10),
                            ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 150),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    conversation.title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: isSelected
                                          ? Colors.white
                                          : const Color(0xFF1D2522),
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  Text(
                                    conversation.latestMessage?.text ?? _conversationSubtitle(conversation),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: isSelected
                                          ? Colors.white.withValues(alpha: 0.85)
                                          : const Color(0xFF6A756F),
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemCount: filtered.length,
                ),
              ),
              const SizedBox(height: 10),
              Expanded(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
                        child: Row(
                          children: [
                            IconButton(
                              onPressed: selected == null
                                  ? null
                                  : () => notifier.clearSelectedConversation(),
                              icon: const Icon(Icons.arrow_back_rounded),
                              tooltip: ref.tr('common.back'),
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                selected?.title ?? ref.tr('chat.conversation'),
                                style: const TextStyle(fontWeight: FontWeight.w700),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Divider(height: 1),
                      Expanded(
                        child: selected == null
                            ? Center(
                                child: Text(
                                  ref.tr('chat.conversation'),
                                  style: const TextStyle(
                                    color: Color(0xFF66716C),
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.all(12),
                                itemCount: selected.messages.length,
                                itemBuilder: (context, index) {
                                  final message = selected.messages[index];
                                  return Align(
                                    alignment: message.isMine
                                        ? Alignment.centerRight
                                        : Alignment.centerLeft,
                                    child: Container(
                                      margin: const EdgeInsets.only(bottom: 8),
                                      constraints: const BoxConstraints(maxWidth: 280),
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 9,
                                      ),
                                      decoration: BoxDecoration(
                                        color: message.isMine
                                            ? const Color(0xFF0D8A66)
                                            : const Color(0xFFF1F5F3),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            message.text,
                                            style: TextStyle(
                                              color: message.isMine
                                                  ? Colors.white
                                                  : const Color(0xFF1E2623),
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Text(
                                                dateFormat.format(message.sentAt),
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  color: message.isMine
                                                      ? Colors.white70
                                                      : const Color(0xFF73807A),
                                                ),
                                              ),
                                              if (message.isSending) ...[
                                                const SizedBox(width: 6),
                                                SizedBox(
                                                  width: 10,
                                                  height: 10,
                                                  child: CircularProgressIndicator(
                                                    strokeWidth: 1.5,
                                                    valueColor: AlwaysStoppedAnimation<Color>(
                                                      message.isMine
                                                          ? Colors.white70
                                                          : const Color(0xFF73807A),
                                                    ),
                                                  ),
                                                ),
                                              ],
                                              if (message.hasFailed) ...[
                                                const SizedBox(width: 6),
                                                Icon(
                                                  Icons.error_outline_rounded,
                                                  size: 12,
                                                  color: message.isMine
                                                      ? Colors.white70
                                                      : const Color(0xFFCC3D1F),
                                                ),
                                              ],
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                      ),
                      SafeArea(
                        top: false,
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                          child: Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _controller,
                                  minLines: 1,
                                  maxLines: 4,
                                  enabled: selected != null && !chatState.isSending,
                                  decoration: InputDecoration(
                                    hintText: ref.tr('chat.placeholder'),
                                    isDense: true,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              IconButton.filled(
                                onPressed: selected == null || chatState.isSending
                                    ? null
                                    : () async {
                                        final text = _controller.text;
                                        _controller.clear();
                                        await notifier.sendMessage(text);
                                      },
                                icon: chatState.isSending
                                    ? const SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                        ),
                                      )
                                    : const Icon(Icons.send_rounded),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 10),
            ],
          ],
        ),
      ),
    );
  }
}







