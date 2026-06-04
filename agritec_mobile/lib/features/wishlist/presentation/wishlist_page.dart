import 'package:agritec_mobile/features/product/presentation/product_details_page.dart';
import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
import 'package:agritec_mobile/features/wishlist/application/wishlist_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

class WishlistPage extends ConsumerStatefulWidget {
  const WishlistPage({super.key});
  static const _pageSize = 10;

  @override
  ConsumerState<WishlistPage> createState() => _WishlistPageState();
}

class _WishlistPageState extends ConsumerState<WishlistPage> {
  int _page = 1;

  void _handleBack() {
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
      return;
    }
    ref.read(shellTabProvider.notifier).setTab(0);
    context.goNamed('home-shell');
  }

  @override
  Widget build(BuildContext context) {
    if (!isBuyerAuthenticated(ref)) {
      return AuthRequiredPage(
        title: 'Wishlist',
        message: ref.tr('auth.required.wishlist'),
        onBack: _handleBack,
      );
    }
    final products = ref.watch(wishlistProductsProvider);
    final money = NumberFormat.currency(
      locale: 'en_NG',
      symbol: 'NGN ',
      decimalDigits: 0,
    );

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          _handleBack();
        }
      },
      child: Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: _handleBack,
        ),
        title: Text(ref.tr('profile.wishlist')),
        actions: [
          IconButton(
            icon: const Icon(Icons.home_rounded),
            onPressed: () {
              ref.read(shellTabProvider.notifier).setTab(0);
              context.goNamed('home-shell');
            },
          ),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFEAF7F2), Color(0xFFF7FAF8)],
          ),
        ),
        child: SafeArea(
          child: products.isEmpty
              ? const Center(
                  child: Text(
                    'No saved products yet.',
                    style: TextStyle(color: Color(0xFF65706B)),
                  ),
                )
              : Builder(
                  builder: (context) {
                    final totalPages =
                        (products.length / WishlistPage._pageSize).ceil().clamp(
                          1,
                          9999,
                        );
                    final safePage = _page.clamp(1, totalPages);
                    final start = (safePage - 1) * WishlistPage._pageSize;
                    final end = (start + WishlistPage._pageSize).clamp(
                      0,
                      products.length,
                    );
                    final pageItems = products.sublist(start, end);
                    return Column(
                      children: [
                        Expanded(
                          child: ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemBuilder: (context, index) {
                              final product = pageItems[index];
                              return Card(
                                child: ListTile(
                                  onTap: () {
                                    Navigator.of(context).push(
                                      MaterialPageRoute<void>(
                                        builder: (_) => ProductDetailsPage(
                                          productId: product.id,
                                        ),
                                      ),
                                    );
                                  },
                                  leading: ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: Image.network(
                                      product.imageUrl,
                                      width: 54,
                                      height: 54,
                                      fit: BoxFit.cover,
                                      errorBuilder:
                                          (context, error, stackTrace) =>
                                              Container(
                                                width: 54,
                                                height: 54,
                                                color: const Color(0xFFE8EEEA),
                                                alignment: Alignment.center,
                                                child: const Icon(
                                                  Icons.broken_image_rounded,
                                                  size: 16,
                                                ),
                                              ),
                                    ),
                                  ),
                                  title: Text(
                                    product.name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  subtitle: Text(money.format(product.price)),
                                  trailing: IconButton(
                                    onPressed: () => ref
                                        .read(wishlistProvider.notifier)
                                        .toggle(product.id),
                                    icon: const Icon(
                                      Icons.favorite_rounded,
                                      color: Color(0xFFCC3D1F),
                                    ),
                                  ),
                                ),
                              );
                            },
                            separatorBuilder: (context, index) =>
                                const SizedBox(height: 8),
                            itemCount: pageItems.length,
                          ),
                        ),
                        if (products.length > WishlistPage._pageSize)
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                            child: Row(
                              children: [
                                Text('Page $safePage/$totalPages'),
                                const Spacer(),
                                IconButton(
                                  onPressed: safePage > 1
                                      ? () =>
                                            setState(() => _page = safePage - 1)
                                      : null,
                                  icon: const Icon(Icons.chevron_left_rounded),
                                ),
                                IconButton(
                                  onPressed: safePage < totalPages
                                      ? () =>
                                            setState(() => _page = safePage + 1)
                                      : null,
                                  icon: const Icon(Icons.chevron_right_rounded),
                                ),
                              ],
                            ),
                          ),
                      ],
                    );
                  },
                ),
        ),
      ),
      ),
    );
  }
}


