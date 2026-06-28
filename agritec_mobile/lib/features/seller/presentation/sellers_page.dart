import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
import 'package:agritec_mobile/features/seller/presentation/seller_details_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class SellersPage extends ConsumerStatefulWidget {
  const SellersPage({super.key});

  @override
  ConsumerState<SellersPage> createState() => _SellersPageState();
}

class _SellersPageState extends ConsumerState<SellersPage> {
  static const _pageSize = 10;
  String _query = '';
  String _stateFilter = 'All';
  int _page = 0;

  @override
  Widget build(BuildContext context) {
    final sellers = ref.watch(homeSellersProvider);

    if (sellers.isEmpty) {
      return const Scaffold(
        backgroundColor: Color(0xFFDDE8E1),
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final states = <String>{
      'All',
      ...sellers
          .map((s) => s.state?.trim())
          .whereType<String>()
          .where((value) => value.isNotEmpty),
    }.toList();

    final filtered = sellers.where((seller) {
      final matchesQuery =
          _query.trim().isEmpty ||
          seller.farmName.toLowerCase().contains(_query.toLowerCase()) ||
          seller.name.toLowerCase().contains(_query.toLowerCase()) ||
          seller.location.toLowerCase().contains(_query.toLowerCase());
      final matchesState =
          _stateFilter == 'All' || seller.state == _stateFilter;
      return matchesQuery && matchesState;
    }).toList();

    final pageCount = (filtered.length / _pageSize).ceil().clamp(1, 9999);
    final currentPage = _page.clamp(0, pageCount - 1);
    final start = currentPage * _pageSize;
    final end = (start + _pageSize).clamp(0, filtered.length);
    final paged = filtered.sublist(start, end);

    return Scaffold(
      backgroundColor: const Color(0xFFDDE8E1),
      body: SafeArea(
        child: Container(
          margin: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFF0F5F1),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: const Color(0xFFC4D4C9), width: 1.4),
          ),
          child: Column(
            children: [
              _SellersTopBar(
                title: ref.tr('sellers.title'),
                onBack: () => Navigator.of(context).pop(),
                onHome: () {
                  ref.read(shellTabProvider.notifier).setTab(0);
                  Navigator.of(context).popUntil((route) => route.isFirst);
                },
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 18, 16, 18),
                child: Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 44,
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2EDE6)),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.search_rounded,
                              size: 16,
                              color: Color(0xFF7AAD8E),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextField(
                                decoration: InputDecoration(
                                  hintText: ref.tr('sellers.searchHint'),
                                  border: InputBorder.none,
                                  isDense: true,
                                ),
                                onChanged: (value) => setState(() {
                                  _query = value;
                                  _page = 0;
                                }),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      width: 112,
                      height: 44,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () => _openStateSheet(states),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFE2EDE6)),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  _stateFilter == 'All' ? 'All' : _stateFilter,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 12),
                                ),
                              ),
                              const SizedBox(width: 6),
                              const Icon(
                                Icons.keyboard_arrow_down_rounded,
                                size: 16,
                                color: Color(0xFF7AAD8E),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: filtered.isEmpty
                    ? Center(
                        child: Text(
                          ref.tr('sellers.empty'),
                          style: const TextStyle(color: Color(0xFF65706B)),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                        itemBuilder: (context, index) {
                          final seller = paged[index];
                          return InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () => Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) =>
                                    SellerDetailsPage(sellerId: seller.id),
                              ),
                            ),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: const Color(0xFFE2EDE6)),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 46,
                                    height: 46,
                                    decoration: BoxDecoration(
                                      color: _avatarBackground(index),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      _initials(seller.farmName),
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: _avatarText(index),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          seller.farmName,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w700,
                                            color: Color(0xFF1A2E22),
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            const Icon(
                                              Icons.person_outline_rounded,
                                              size: 12,
                                              color: Color(0xFF7AAD8E),
                                            ),
                                            const SizedBox(width: 4),
                                            Expanded(
                                              child: Text(
                                                seller.name,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                  fontSize: 11,
                                                  color: Color(0xFF7AAD8E),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 5),
                                        Row(
                                          children: [
                                            const Icon(
                                              Icons.place_outlined,
                                              size: 12,
                                              color: Color(0xFF9AB8A5),
                                            ),
                                            const SizedBox(width: 4),
                                            Expanded(
                                              child: Text(
                                                seller.location,
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                  fontSize: 11,
                                                  color: Color(0xFF9AB8A5),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Icon(
                                    Icons.chevron_right_rounded,
                                    color: Color(0xFF1A5C38),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                        separatorBuilder: (_, _) => const SizedBox(height: 10),
                        itemCount: paged.length,
                      ),
              ),
              if (filtered.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        Text('${currentPage + 1}/$pageCount'),
                        const Spacer(),
                        IconButton(
                          onPressed: currentPage > 0
                              ? () => setState(() => _page = currentPage - 1)
                              : null,
                          icon: const Icon(Icons.chevron_left_rounded),
                        ),
                        IconButton(
                          onPressed: currentPage < pageCount - 1
                              ? () => setState(() => _page = currentPage + 1)
                              : null,
                          icon: const Icon(Icons.chevron_right_rounded),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Color _avatarBackground(int index) {
    switch (index % 3) {
      case 0:
        return const Color(0xFFCECbf6);
      case 1:
        return const Color(0xFFF5C4B3);
      default:
        return const Color(0xFFC0DD97);
    }
  }

  Color _avatarText(int index) {
    switch (index % 3) {
      case 0:
        return const Color(0xFF26215C);
      case 1:
        return const Color(0xFF712B13);
      default:
        return const Color(0xFF27500A);
    }
  }

  String _initials(String value) {
    final parts = value.trim().split(' ').where((e) => e.isNotEmpty).toList();
    if (parts.isEmpty) return 'NA';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  void _openStateSheet(List<String> states) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) {
        return SafeArea(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.7,
            ),
            child: ListView(
              shrinkWrap: true,
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
              children: [
                const Text(
                  'Filter by state',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                ...states.map((state) {
                  final isSelected = state == _stateFilter;
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    onTap: () {
                      Navigator.of(sheetContext).pop();
                      setState(() {
                        _stateFilter = state;
                        _page = 0;
                      });
                    },
                    leading: Icon(
                      isSelected
                          ? Icons.radio_button_checked_rounded
                          : Icons.radio_button_unchecked_rounded,
                      color: isSelected
                          ? const Color(0xFF0D8A66)
                          : const Color(0xFF7A8580),
                    ),
                    title: Text(state == 'All' ? 'All' : state),
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _SellersTopBar extends StatelessWidget {
  const _SellersTopBar({
    required this.title,
    required this.onBack,
    required this.onHome,
  });

  final String title;
  final VoidCallback onBack;
  final VoidCallback onHome;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
      decoration: const BoxDecoration(
        color: Color(0xFF1A5C38),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Row(
        children: [
          _SellersTopBarButton(icon: Icons.arrow_back_rounded, onTap: onBack),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
          ),
          _SellersTopBarButton(icon: Icons.home_rounded, onTap: onHome),
        ],
      ),
    );
  }
}

class _SellersTopBarButton extends StatelessWidget {
  const _SellersTopBarButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: Colors.white, size: 17),
      ),
    );
  }
}



