import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/core/localization/localized_text.dart';
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
  String _locationFilter = 'All';
  int _page = 0;

  @override
  Widget build(BuildContext context) {
    final sellers = ref.watch(homeSellersProvider);
    final locations = <String>{
      'All',
      ...sellers.map((s) => s.location),
    }.toList();

    final filtered = sellers.where((seller) {
      final matchesQuery =
          _query.trim().isEmpty ||
          seller.farmName.toLowerCase().contains(_query.toLowerCase()) ||
          seller.name.toLowerCase().contains(_query.toLowerCase());
      final matchesLocation =
          _locationFilter == 'All' || seller.location == _locationFilter;
      return matchesQuery && matchesLocation;
    }).toList();

    final pageCount = (filtered.length / _pageSize).ceil().clamp(1, 9999);
    final currentPage = _page.clamp(0, pageCount - 1);
    final start = currentPage * _pageSize;
    final end = (start + _pageSize).clamp(0, filtered.length);
    final paged = filtered.sublist(start, end);

    return Scaffold(
      appBar: AppBar(
        title: Text(ref.tr('sellers.title')),
        actions: [
          IconButton(
            icon: const Icon(Icons.home_rounded),
            onPressed: () {
              ref.read(shellTabProvider.notifier).setTab(0);
              Navigator.of(context).popUntil((route) => route.isFirst);
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: ref.tr('sellers.searchHint'),
                      prefixIcon: Icon(Icons.search_rounded),
                    ),
                    onChanged: (value) => setState(() {
                      _query = value;
                      _page = 0;
                    }),
                  ),
                ),
                const SizedBox(width: 10),
                DropdownButton<String>(
                  value: _locationFilter,
                  items: locations
                      .map(
                        (location) => DropdownMenuItem(
                          value: location,
                          child: Text(location),
                        ),
                      )
                      .toList(),
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() {
                      _locationFilter = value;
                      _page = 0;
                    });
                  },
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
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemBuilder: (context, index) {
                      final seller = paged[index];
                      return Card(
                        child: ListTile(
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) =>
                                  SellerDetailsPage(sellerId: seller.id),
                            ),
                          ),
                          title: Text(seller.farmName),
                          subtitle: Text('${seller.name} * ${seller.location}'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.star_rounded,
                                size: 16,
                                color: Color(0xFFFFB649),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                seller.rating.toStringAsFixed(1),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemCount: paged.length,
                  ),
          ),
          if (filtered.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Row(
                children: [
                  Text(trFormat(ref, 'sellers.pageOf', {'page': '', 'total': ''})),
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
        ],
      ),
    );
  }
}



