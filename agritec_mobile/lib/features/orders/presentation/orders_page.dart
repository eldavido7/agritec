import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
import 'package:agritec_mobile/features/home/presentation/main_shell_page.dart';
import 'package:agritec_mobile/features/orders/application/order_providers.dart';
import 'package:agritec_mobile/features/orders/presentation/order_details_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

class OrdersPage extends ConsumerStatefulWidget {
  const OrdersPage({super.key});
  static const _pageSize = 10;

  static const routeName = 'orders';
  static const routePath = '/orders';

  @override
  ConsumerState<OrdersPage> createState() => _OrdersPageState();
}

class _OrdersPageState extends ConsumerState<OrdersPage> {
  int _page = 1;

  @override
  Widget build(BuildContext context) {
    if (!isBuyerAuthenticated(ref)) {
      return AuthRequiredPage(
        title: ref.tr('orders.title'),
        message: ref.tr('auth.required.orders'),
        onBack: () {
          final nav = Navigator.of(context);
          if (nav.canPop()) {
            nav.pop();
            return;
          }
          ref.read(shellTabProvider.notifier).setTab(0);
          context.go(MainShellPage.routePath);
        },
      );
    }
    final orders = ref.watch(ordersProvider);
    final money = NumberFormat.currency(locale: 'en_NG', symbol: 'NGN ', decimalDigits: 0);
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () {
            final nav = Navigator.of(context);
            if (nav.canPop()) {
              nav.pop();
              return;
            }
            ref.read(shellTabProvider.notifier).setTab(0);
            context.go(MainShellPage.routePath);
          },
        ),
        title: Text(ref.tr('orders.title')),
        actions: [
          IconButton(
            icon: const Icon(Icons.home_rounded),
            onPressed: () {
              ref.read(shellTabProvider.notifier).setTab(0);
              context.go(MainShellPage.routePath);
            },
          ),
        ],
      ),
      body: orders.isEmpty
          ? Center(child: Text(ref.tr('orders.empty')))
          : Builder(
              builder: (context) {
                final totalPages = (orders.length / OrdersPage._pageSize).ceil().clamp(1, 9999);
                final safePage = _page.clamp(1, totalPages);
                final start = (safePage - 1) * OrdersPage._pageSize;
                final end = (start + OrdersPage._pageSize).clamp(0, orders.length);
                final pageItems = orders.sublist(start, end);
                return Column(
                  children: [
                    Expanded(
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: pageItems.length,
                        itemBuilder: (context, index) {
                          final order = pageItems[index];
                          return Card(
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(14),
                              title: Text('Order ${order.id}'),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  Text('${ref.tr('orders.paymentRef')}: ${order.paymentReference}'),
                                  Text('${order.sellerGroups.length} seller group${order.sellerGroups.length == 1 ? '' : 's'} • ${order.itemCount} item${order.itemCount == 1 ? '' : 's'}'),
                                  const SizedBox(height: 6),
                                  Wrap(
                                    spacing: 6,
                                    runSpacing: 6,
                                    children: [
                                      for (final group in order.sellerGroups)
                                        Chip(
                                          label: Text('${group.farmName}: ${group.status}'),
                                          visualDensity: VisualDensity.compact,
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                              trailing: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(money.format(order.grandTotal), style: const TextStyle(fontWeight: FontWeight.w700)),
                                  const SizedBox(height: 4),
                                  Text(order.statusSummary, style: const TextStyle(color: Color(0xFF65706B), fontSize: 12)),
                                ],
                              ),
                              onTap: () => context.goNamed(
                                OrderDetailsPage.routeName,
                                pathParameters: {'orderId': order.id},
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    if (orders.length > OrdersPage._pageSize)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                        child: Row(
                          children: [
                            Text('${ref.tr('orders.page')} $safePage/$totalPages'),
                            const Spacer(),
                            IconButton(
                              onPressed: safePage > 1 ? () => setState(() => _page = safePage - 1) : null,
                              icon: const Icon(Icons.chevron_left_rounded),
                            ),
                            IconButton(
                              onPressed: safePage < totalPages ? () => setState(() => _page = safePage + 1) : null,
                              icon: const Icon(Icons.chevron_right_rounded),
                            ),
                          ],
                        ),
                      ),
                  ],
                );
              },
            ),
    );
  }
}


