import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/core/localization/localized_text.dart';
import 'package:agritec_mobile/core/ui/category_visuals.dart';
import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
import 'package:agritec_mobile/features/cart/application/cart_providers.dart';
import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
import 'package:agritec_mobile/features/home/domain/home_models.dart';
import 'package:agritec_mobile/features/notifications/application/notification_providers.dart';
import 'package:agritec_mobile/features/notifications/presentation/notifications_page.dart';
import 'package:agritec_mobile/features/product/presentation/product_details_page.dart';
import 'package:agritec_mobile/features/seller/presentation/sellers_page.dart';
import 'package:agritec_mobile/features/wishlist/application/wishlist_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class HomePage extends ConsumerWidget {
  const HomePage({
    super.key,
    required this.onOpenSearchPage,
    required this.onBrowseProducts,
  });

  final void Function(String? categorySlug) onOpenSearchPage;
  final VoidCallback onBrowseProducts;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = DateTime.now();
    final greeting = switch (now.hour) {
      >= 5 && < 12 => ref.tr('home.greeting.morning'),
      >= 12 && < 17 => ref.tr('home.greeting.afternoon'),
      _ => ref.tr('home.greeting.evening'),
    };
    final authenticated = isBuyerAuthenticated(ref);
    final unreadNotifications = authenticated
        ? ref.watch(unreadNotificationsCountProvider)
        : 0;
    final cartCount = ref.watch(cartItemCountProvider);
    final categories = ref.watch(homeCategoriesProvider);
    final products = ref.watch(homeFeaturedProductsProvider);
    final sellers = ref.watch(homeSellersProvider);
    final featuredProducts = [...products]
      ..sort((a, b) {
        final discountRank = (b.hasDiscount ? 1 : 0) - (a.hasDiscount ? 1 : 0);
        if (discountRank != 0) return discountRank;
        return b.inventory.compareTo(a.inventory);
      });
    final topSellers = [...sellers]
      ..sort((a, b) => b.rating.compareTo(a.rating));
    final money = NumberFormat.currency(
      locale: 'en_NG',
      symbol: 'NGN ',
      decimalDigits: 0,
    );

    return Container(
      color: const Color(0xFFDDE8E1),
      child: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFDDE8E1),
                    borderRadius: BorderRadius.circular(30),
                    border: Border.all(
                      color: const Color(0xFFC4D4C9),
                      width: 1.4,
                    ),
                  ),
                  padding: const EdgeInsets.all(10),
                  child: Column(
                    children: [
                      _TopHero(
                        greeting: greeting,
                        title: ref.tr('home.title'),
                        subtitle: ref.tr('home.subtitle'),
                        unreadNotifications: unreadNotifications,
                        cartCount: cartCount,
                        onOpenNotifications: () {
                          if (!isBuyerAuthenticated(ref)) {
                            showBuyerAuthPrompt(
                              context,
                              ref,
                              message: ref.tr('auth.required.notifications'),
                            );
                            return;
                          }
                          Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => const NotificationsPage(),
                            ),
                          );
                        },
                        onOpenCart: () =>
                            ref.read(shellTabProvider.notifier).setTab(3),
                      ),
                      const SizedBox(height: 8),
                      _CategoriesSection(
                        categories: categories.take(4).toList(),
                        onOpenSearchPage: onOpenSearchPage,
                        seeAllLabel: ref.tr('home.seeAll'),
                        title: ref.tr('home.categories'),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(8, 10, 8, 0),
                        child: _PromoBanner(onBrowseProducts: onBrowseProducts),
                      ),
                      const SizedBox(height: 10),
                      _SectionHeader(
                        title: ref.tr('home.featuredProducts'),
                        actionLabel: ref.tr('home.browse'),
                        onPressed: onBrowseProducts,
                      ),
                      const SizedBox(height: 8),
                      ...featuredProducts.take(5).map((product) {
                        final seller = ref.watch(
                          homeSellerByIdProvider(product.sellerId),
                        );
                        final isSaved = authenticated &&
                            ref.watch(wishlistProvider).contains(product.id);
                        return _ProductTile(
                          product: product,
                          seller: seller,
                          priceText: '${money.format(product.price)} per ${product.salesUnitLabel}',
                          isSaved: isSaved,
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) =>
                                    ProductDetailsPage(productId: product.id),
                              ),
                            );
                          },
                          onToggleSave: () {
                            if (!isBuyerAuthenticated(ref)) {
                              showBuyerAuthPrompt(
                                context,
                                ref,
                                message: ref.tr('auth.required.wishlist'),
                              );
                              return;
                            }
                            ref
                                .read(wishlistProvider.notifier)
                                .toggle(product.id);
                          },
                        );
                      }),
                      const SizedBox(height: 6),
                      _SectionHeader(
                        title: ref.tr('home.topSellers'),
                        actionLabel: ref.tr('home.viewAll'),
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => const SellersPage(),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 8),
                      _SellersGrid(sellers: topSellers.take(5).toList()),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TopHero extends ConsumerWidget {
  const _TopHero({
    required this.greeting,
    required this.title,
    required this.subtitle,
    required this.unreadNotifications,
    required this.cartCount,
    required this.onOpenNotifications,
    required this.onOpenCart,
  });

  final String greeting;
  final String title;
  final String subtitle;
  final int unreadNotifications;
  final int cartCount;
  final VoidCallback onOpenNotifications;
  final VoidCallback onOpenCart;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1A5C38),
        borderRadius: BorderRadius.circular(22),
      ),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      greeting,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.4,
                        color: Color(0xFF9DD6B5),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 18,
                        height: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              _HeroIcon(
                icon: Icons.notifications_none_rounded,
                count: unreadNotifications,
                onTap: onOpenNotifications,
              ),
              const SizedBox(width: 8),
              _HeroIcon(
                icon: Icons.shopping_bag_outlined,
                count: cartCount,
                onTap: onOpenCart,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              subtitle,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFFBFE0CF),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroIcon extends StatelessWidget {
  const _HeroIcon({
    required this.icon,
    required this.count,
    required this.onTap,
  });

  final IconData icon;
  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: onTap,
          child: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              size: 18,
              color: Colors.white,
            ),
          ),
        ),
        if (count > 0)
          Positioned(
            right: -5,
            top: -5,
            child: Container(
              constraints: const BoxConstraints(minWidth: 16),
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              decoration: BoxDecoration(
                color: const Color(0xFFCC3D1F),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: const Color(0xFF1A5C38), width: 1),
              ),
              child: Text(
                count > 99 ? '99+' : '$count',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _CategoriesSection extends ConsumerWidget {
  const _CategoriesSection({
    required this.categories,
    required this.onOpenSearchPage,
    required this.seeAllLabel,
    required this.title,
  });

  final List<HomeCategory> categories;
  final void Function(String? categorySlug) onOpenSearchPage;
  final String seeAllLabel;
  final String title;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF0F5F1),
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.fromLTRB(8, 14, 8, 10),
      child: Column(
        children: [
          _SectionHeader(
            title: title,
            actionLabel: seeAllLabel,
            onPressed: () => onOpenSearchPage(null),
          ),
          const SizedBox(height: 10),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: categories.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              childAspectRatio: 0.9,
            ),
            itemBuilder: (context, index) {
              final category = categories[index];
              final style = categoryVisualForSlug(category.slug);
              return InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: () => onOpenSearchPage(category.slug),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2EDE6)),
                  ),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: style.bgColor,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        alignment: Alignment.center,
                        child: Icon(
                          style.icon,
                          size: 18,
                          color: style.iconColor,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        trCategory(ref, category.slug, category.name).split(' ').first,
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF2D5E3E),
                        ),
                      ),
                      Text(
                        '${category.productCount} ${ref.tr('common.items')}',
                        style: const TextStyle(
                          fontSize: 9.5,
                          color: Color(0xFF7AAD8E),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

}

class _PromoBanner extends ConsumerWidget {
  const _PromoBanner({required this.onBrowseProducts});

  final VoidCallback onBrowseProducts;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1A5C38),
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  ref.tr('home.promoEyebrow'),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.4,
                    color: Color(0xFF9DD6B5),
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  ref.tr('home.promoTitle'),
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    height: 1.25,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 32,
                  child: TextButton(
                    onPressed: onBrowseProducts,
                    style: TextButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF1A5C38),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(9),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                    ),
                    child: Text(
                      ref.tr('home.browseAll'),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: Colors.white.withValues(alpha: 0.10)),
            ),
            child: const Icon(
              Icons.spa_outlined,
              color: Colors.white,
              size: 30,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductTile extends ConsumerWidget {
  const _ProductTile({
    required this.product,
    required this.seller,
    required this.priceText,
    required this.isSaved,
    required this.onTap,
    required this.onToggleSave,
  });

  final HomeProduct product;
  final HomeSeller seller;
  final String priceText;
  final bool isSaved;
  final VoidCallback onTap;
  final VoidCallback onToggleSave;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoryLabel = trCategory(ref, product.categorySlug, product.category);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2EDE6)),
          ),
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  product.imageUrl,
                  width: 64,
                  height: 64,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      width: 64,
                      height: 64,
                      color: const Color(0xFFE8EEEA),
                      alignment: Alignment.center,
                      padding: const EdgeInsets.all(6),
                      child: Text(
                        ref.tr('common.imageUnavailable'),
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 9,
                          color: Color(0xFF607069),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1A2E22),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${seller.farmName} * $categoryLabel${product.categorySlug == 'other' && (product.categoryNote ?? '').isNotEmpty ? ' (${product.categoryNote})' : ''}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF7AAD8E),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Text(
                          priceText,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF1A5C38),
                          ),
                        ),
                        if (product.hasDiscount) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFDF3E7),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              product.discountLabel ?? ref.tr('product.offer'),
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF854F0B),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: onToggleSave,
                icon: Icon(
                  isSaved
                      ? Icons.favorite_rounded
                      : Icons.favorite_border_rounded,
                  color: isSaved
                      ? const Color(0xFFE24B4A)
                      : const Color(0xFFC9DECE),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SellersGrid extends StatelessWidget {
  const _SellersGrid({required this.sellers});

  final List<HomeSeller> sellers;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: sellers.length >= 2 ? 2 : sellers.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 1.5,
      ),
      itemBuilder: (context, index) {
        final seller = sellers[index];
        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2EDE6)),
          ),
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                seller.farmName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1A2E22),
                ),
              ),
              const SizedBox(height: 3),
              Row(
                children: [
                  const Icon(
                    Icons.place_outlined,
                    size: 12,
                    color: Color(0xFF7AAD8E),
                  ),
                  const SizedBox(width: 3),
                  Expanded(
                    child: Text(
                      seller.location,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 10,
                        color: Color(0xFF7AAD8E),
                      ),
                    ),
                  ),
                ],
              ),
              const Spacer(),
              Row(
                children: [
                  CircleAvatar(
                    radius: 11,
                    backgroundColor: index.isEven
                        ? const Color(0xFFC0DD97)
                        : const Color(0xFFF5C4B3),
                    child: Text(
                      _initials(seller.name),
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        color: index.isEven
                            ? const Color(0xFF27500A)
                            : const Color(0xFF712B13),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(
                    Icons.star_rounded,
                    size: 14,
                    color: Color(0xFFEF9F27),
                  ),
                  const SizedBox(width: 3),
                  Text(
                    seller.rating.toStringAsFixed(1),
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1A2E22),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  String _initials(String value) {
    final parts = value.trim().split(' ').where((e) => e.isNotEmpty).toList();
    if (parts.isEmpty) return 'NA';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.actionLabel,
    this.onPressed,
  });

  final String title;
  final String actionLabel;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1A2E22),
            ),
          ),
        ),
        TextButton(
          onPressed: onPressed,
          style: TextButton.styleFrom(
            foregroundColor: const Color(0xFF1A5C38),
            textStyle: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          child: Text(actionLabel),
        ),
      ],
    );
  }
}





