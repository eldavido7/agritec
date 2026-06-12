import 'package:agritec_mobile/features/chat/application/chat_providers.dart';
import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
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
      final chatState = ref.read(chatProvider);
      if (chatState.activeDraft == null &&
          chatState.selectedConversationId != null) {
        ref.read(chatProvider.notifier).clearSelectedConversation();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
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
    final filtered = chatState.conversations
        .where((conversation) => conversation.channelType == _filter)
        .toList();
    final selected =
        filtered.any((c) => c.id == chatState.selectedConversationId)
        ? filtered.firstWhere((c) => c.id == chatState.selectedConversationId)
        : null;
    final dateFormat = DateFormat('d MMM, y - h:mm a');
    final hasDraftSellerChat =
        _filter == ChatChannelType.seller && chatState.activeDraft != null;

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
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
                  ),
                  const Spacer(),
                  SegmentedButton<ChatChannelType>(
                    segments: [
                      ButtonSegment(
                        value: ChatChannelType.seller,
                        icon: Icon(Icons.storefront_rounded),
                        label: Text(ref.tr('chat.filter.sellers')),
                      ),
                      ButtonSegment(
                        value: ChatChannelType.support,
                        icon: Icon(Icons.support_agent_rounded),
                        label: Text(ref.tr('chat.filter.support')),
                      ),
                    ],
                    selected: {_filter},
                    onSelectionChanged: (selection) {
                      setState(() => _filter = selection.first);
                    },
                  ),
                ],
              ),
            ),
            if (filtered.isEmpty && !hasDraftSellerChat)
              Expanded(
                child: Center(
                  child: Text(
                    ref.tr('chat.empty'),
                    style: TextStyle(color: Color(0xFF66716C)),
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
                      onTap: () => ref
                          .read(chatProvider.notifier)
                          .selectConversation(conversation.id),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? const Color(0xFF0D8A66)
                              : Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isSelected
                                ? const Color(0xFF0D8A66)
                                : const Color(0xFFE2E8E4),
                          ),
                        ),
                        child: Row(
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
                            const SizedBox(width: 10),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  conversation.title,
                                  style: TextStyle(
                                    color: isSelected
                                        ? Colors.white
                                        : const Color(0xFF1D2522),
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                Text(
                                  conversation.subtitle,
                                  style: TextStyle(
                                    color: isSelected
                                        ? Colors.white.withValues(alpha: 0.85)
                                        : const Color(0xFF6A756F),
                                    fontSize: 12,
                                  ),
                                ),
                              ],
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
                            const Icon(
                              Icons.chat_bubble_outline_rounded,
                              size: 18,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                selected?.title ??
                                    chatState.activeDraft?.farmName ??
                                    ref.tr('chat.conversation'),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
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
                                constraints: const BoxConstraints(
                                  maxWidth: 280,
                                ),
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
                                    Text(
                                      dateFormat.format(message.sentAt),
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: message.isMine
                                            ? Colors.white70
                                            : const Color(0xFF73807A),
                                      ),
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
                                  decoration: InputDecoration(
                                    hintText: ref.tr('chat.placeholder'),
                                    isDense: true,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              IconButton.filled(
                                onPressed: () {
                                  ref
                                      .read(chatProvider.notifier)
                                      .sendMessage(_controller.text);
                                  _controller.clear();
                                },
                                icon: const Icon(Icons.send_rounded),
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



