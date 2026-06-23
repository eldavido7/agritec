import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/core/localization/localized_text.dart';
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

  void _handleBack() {
    final nav = Navigator.of(context);
    if (nav.canPop()) {
      nav.pop();
      return;
    }
    ref.read(shellTabProvider.notifier).setTab(0);
    context.go(MainShellPage.routePath);
  }

  @override
  Widget build(BuildContext context) {
    if (!isBuyerAuthenticated(ref)) {
      return AuthRequiredPage(
        title: ref.tr('orders.title'),
        message: ref.tr('auth.required.orders'),
        onBack: _handleBack,
      );
    }
    final orders = ref.watch(ordersProvider);
    final money = NumberFormat.currency(locale: 'en_NG', symbol: 'NGN ', decimalDigits: 0);
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          _handleBack();
        }
      },
      child: Scaffold(
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
                _OrdersTopBar(
                  title: ref.tr('orders.title'),
                  onBack: _handleBack,
                  onHome: () {
                    ref.read(shellTabProvider.notifier).setTab(0);
                    context.go(MainShellPage.routePath);
                  },
                ),
                Expanded(
                  child: orders.isEmpty
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
                          padding: const EdgeInsets.fromLTRB(16, 18, 16, 12),
                          itemCount: pageItems.length,
                          itemBuilder: (context, index) {
                            final order = pageItems[index];
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(16),
                                onTap: () => context.pushNamed(
                                  OrderDetailsPage.routeName,
                                  pathParameters: {'orderId': order.id},
                                ),
                                child: Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: const Color(0xFFE2EDE6)),
                                  ),
                                  child: Column(
                                    children: [
                                      Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  trFormat(ref, 'orders.orderLabel', {
                                                    'id': order.id,
                                                  }),
                                                  style: const TextStyle(
                                                    fontSize: 14,
                                                    fontWeight: FontWeight.w700,
                                                    color: Color(0xFF1A2E22),
                                                  ),
                                                ),
                                                const SizedBox(height: 3),
                                                Text(
                                                  order.paymentReference,
                                                  maxLines: 2,
                                                  overflow: TextOverflow.ellipsis,
                                                  style: const TextStyle(
                                                    fontSize: 10,
                                                    color: Color(0xFF9AB8A5),
                                                    fontFamily: 'Courier',
                                                  ),
                                                ),
                                                const SizedBox(height: 4),
                                                Text(
                                                  '${order.sellerGroups.length} ${order.sellerGroups.length == 1 ? ref.tr('orders.sellerGroupSingular') : ref.tr('orders.sellerGroupPlural')} • ${order.itemCount} ${order.itemCount == 1 ? ref.tr('common.item') : ref.tr('common.items')}',
                                                  style: const TextStyle(
                                                    fontSize: 11,
                                                    color: Color(0xFF7AAD8E),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Column(
                                            crossAxisAlignment: CrossAxisAlignment.end,
                                            children: [
                                              Text(
                                                money.format(order.grandTotal),
                                                style: const TextStyle(
                                                  fontSize: 14,
                                                  fontWeight: FontWeight.w700,
                                                  color: Color(0xFF1A5C38),
                                                ),
                                              ),
                                              const SizedBox(height: 6),
                                              _OrderStatusPill(
                                                status: trOrderStatus(
                                                  ref,
                                                  order.statusSummary,
                                                ),
                                                rawStatus: order.statusSummary,
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                      const Padding(
                                        padding: EdgeInsets.symmetric(vertical: 10),
                                        child: Divider(height: 1, color: Color(0xFFEEF4F0)),
                                      ),
                                      ...order.sellerGroups.map(
                                        (group) => Padding(
                                          padding: const EdgeInsets.only(bottom: 6),
                                          child: Row(
                                            children: [
                                              Container(
                                                width: 6,
                                                height: 6,
                                                decoration: BoxDecoration(
                                                  color: _groupDotColor(group.farmName),
                                                  shape: BoxShape.circle,
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              Expanded(
                                                child: Text(
                                                  group.farmName,
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                  style: const TextStyle(
                                                    fontSize: 11,
                                                    color: Color(0xFF5F5E5A),
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              _OrderStatusPill(status: group.status, compact: true),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      if (orders.length > OrdersPage._pageSize)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                            ),
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
                        ),
                    ],
                  );
                },
              ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Color _groupDotColor(String farmName) {
    switch (farmName.hashCode.abs() % 3) {
      case 0:
        return const Color(0xFFCECbf6);
      case 1:
        return const Color(0xFFC0DD97);
      default:
        return const Color(0xFFF5C4B3);
    }
  }
}

class _OrdersTopBar extends StatelessWidget {
  const _OrdersTopBar({
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
          _TopBarIconButton(icon: Icons.arrow_back_rounded, onTap: onBack),
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
          _TopBarIconButton(icon: Icons.home_rounded, onTap: onHome),
        ],
      ),
    );
  }
}

class _TopBarIconButton extends StatelessWidget {
  const _TopBarIconButton({required this.icon, required this.onTap});

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

class _OrderStatusPill extends StatelessWidget {
  const _OrderStatusPill({
    required this.status,
    this.rawStatus,
    this.compact = false,
  });

  final String status;
  final String? rawStatus;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final normalized = (rawStatus ?? status).toLowerCase();
    final isDelivered = normalized.contains('delivered');
    final bgColor = isDelivered
        ? const Color(0xFFEAF3DE)
        : const Color(0xFFFAEEDA);
    final textColor = isDelivered
        ? const Color(0xFF3B6D11)
        : const Color(0xFF854F0B);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 10,
        vertical: compact ? 2 : 3,
      ),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: compact ? 10 : 10,
          fontWeight: FontWeight.w700,
          color: textColor,
        ),
      ),
    );
  }
}

