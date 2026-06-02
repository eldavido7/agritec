import 'package:agritec_mobile/features/cart/application/cart_providers.dart';
import 'package:agritec_mobile/features/chat/application/chat_providers.dart';
import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
import 'package:agritec_mobile/features/home/application/home_providers.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
import 'package:agritec_mobile/features/product/application/product_details_providers.dart';
import 'package:agritec_mobile/features/seller/presentation/seller_details_page.dart';
import 'package:agritec_mobile/features/wishlist/application/wishlist_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class ProductDetailsPage extends ConsumerStatefulWidget {
  const ProductDetailsPage({super.key, required this.productId});

  final int productId;

  @override
  ConsumerState<ProductDetailsPage> createState() => _ProductDetailsPageState();
}

class _ProductDetailsPageState extends ConsumerState<ProductDetailsPage> {
  int _selectedVariant = 0;
  final PageController _imageController = PageController();
  int _imageIndex = 0;

  @override
  Widget build(BuildContext context) {
    final products = ref.watch(homeFeaturedProductsProvider);
    final product = products.firstWhere(
      (p) => p.id == widget.productId,
      orElse: () => products.first,
    );
    final seller = ref.watch(homeSellerByIdProvider(product.sellerId));
    final variants = ref.watch(productVariantsProvider(product.id));
    final discount = ref.watch(productDiscountProvider(product.id));
    final cart = ref.watch(cartProvider);
    final authenticated = isBuyerAuthenticated(ref);
    final relatedProducts = products
        .where(
          (p) => p.id != product.id && p.categorySlug == product.categorySlug,
        )
        .take(10)
        .toList();
    final selectedVariant = variants.isNotEmpty
        ? variants[_selectedVariant.clamp(0, variants.length - 1)]
        : null;
    final selectedLineKey = cartLineKey(product.id, variantId: selectedVariant?.id);
    final inCart = cart.containsKey(selectedLineKey);
    final isSaved =
        authenticated && ref.watch(wishlistProvider).contains(product.id);

    final unitPrice = selectedVariant?.price ?? product.price;
    final money = NumberFormat.currency(
      locale: 'en_NG',
      symbol: 'NGN ',
      decimalDigits: 0,
    );

    return Scaffold(
      backgroundColor: const Color(0xFFEAF1ED),
      appBar: AppBar(
        title: const Text('Product Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.home_rounded),
            onPressed: () {
              ref.read(shellTabProvider.notifier).setTab(0);
              Navigator.of(context).popUntil((route) => route.isFirst);
            },
          ),
          IconButton(
            onPressed: () {
              if (!isBuyerAuthenticated(ref)) {
                showBuyerAuthPrompt(
                  context,
                  ref,
                  message: 'Sign in to save products to your wishlist.',
                );
                return;
              }
              ref.read(wishlistProvider.notifier).toggle(product.id);
            },
            icon: Icon(
              isSaved ? Icons.favorite_rounded : Icons.favorite_border_rounded,
              color: isSaved ? const Color(0xFFCC3D1F) : null,
            ),
          ),
        ],
      ),
      body: ListView(
        children: [
          Stack(
            children: [
              SizedBox(
                height: 280,
                width: double.infinity,
                child: PageView.builder(
                  controller: _imageController,
                  onPageChanged: (value) => setState(() => _imageIndex = value),
                  itemCount: product.images.length,
                  itemBuilder: (context, index) {
                    return Image.network(
                      product.images[index],
                      fit: BoxFit.cover,
                      width: double.infinity,
                    );
                  },
                ),
              ),
              if (product.images.length > 1)
                Positioned.fill(
                  child: Row(
                    children: [
                      _ArrowButton(
                        direction: Icons.chevron_left_rounded,
                        onPressed: _imageIndex > 0
                            ? () => _imageController.previousPage(
                                duration: const Duration(milliseconds: 220),
                                curve: Curves.easeOut,
                              )
                            : null,
                      ),
                      const Spacer(),
                      _ArrowButton(
                        direction: Icons.chevron_right_rounded,
                        onPressed: _imageIndex < product.images.length - 1
                            ? () => _imageController.nextPage(
                                duration: const Duration(milliseconds: 220),
                                curve: Curves.easeOut,
                              )
                            : null,
                      ),
                    ],
                  ),
                ),
            ],
          ),
          if (product.images.length > 1)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(product.images.length, (index) {
                  final active = index == _imageIndex;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    height: 6,
                    width: active ? 20 : 6,
                    decoration: BoxDecoration(
                      color: active
                          ? const Color(0xFF0D8A66)
                          : const Color(0xFFBFCAC4),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  );
                }),
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product.name,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '${seller.farmName} • ${product.category}',
                        style: const TextStyle(color: Color(0xFF5C6862)),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Text(
                            '${money.format(unitPrice)} per ${product.salesUnitLabel}',
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF0D8A66),
                            ),
                          ),
                          const SizedBox(width: 10),
                          if (discount != null && discount.isActive)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 5,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFE9CC),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                discount.code,
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFFB15F00),
                                ),
                              ),
                            ),
                        ],
                      ),
                      if (discount != null && discount.isActive) ...[
                        const SizedBox(height: 8),
                        Text(
                          'Use code ${discount.code.toLowerCase()} in checkout for ${discount.description.toLowerCase()}.',
                          style: const TextStyle(color: Color(0xFF6C7872)),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                const Text(
                  'Variants',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (var i = 0; i < variants.length; i++)
                      ChoiceChip(
                        label: Text(variants[i].name),
                        selected: _selectedVariant == i,
                        onSelected: (_) => setState(() => _selectedVariant = i),
                      ),
                  ],
                ),
                if (selectedVariant != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Stock: ${selectedVariant.inventory}',
                    style: const TextStyle(color: Color(0xFF6C7872)),
                  ),
                ],
                const SizedBox(height: 18),
                const Text(
                  'Seller',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
                ),
                const SizedBox(height: 8),
                Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: ListTile(
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => SellerDetailsPage(sellerId: seller.id),
                      ),
                    ),
                    title: Text(seller.farmName),
                    subtitle: Text('${seller.name} • ${seller.location}'),
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
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                const Text(
                  'Related Products',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
                ),
                const SizedBox(height: 8),
                if (relatedProducts.isEmpty)
                  const Text(
                    'No related products yet.',
                    style: TextStyle(color: Color(0xFF6C7872)),
                  )
                else
                  ...relatedProducts.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(20),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) =>
                                ProductDetailsPage(productId: item.id),
                          ),
                        ),
                        child: Card(
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(10),
                            child: Row(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: Image.network(
                                    item.imageUrl,
                                    width: 82,
                                    height: 82,
                                    fit: BoxFit.cover,
                                    errorBuilder:
                                        (context, error, stackTrace) =>
                                            Container(
                                              width: 82,
                                              height: 82,
                                              color: const Color(0xFFE8EEEA),
                                              alignment: Alignment.center,
                                              child: const Icon(
                                                Icons.broken_image_rounded,
                                                size: 18,
                                              ),
                                            ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.name,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        item.categoryNote != null &&
                                                item.categorySlug == 'other'
                                            ? '${item.category} (${item.categoryNote})'
                                            : item.category,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Color(0xFF66726B),
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          Text(
                                            '${money.format(item.price)} per ${item.salesUnitLabel}',
                                            style: const TextStyle(
                                              color: Color(0xFF0D8A66),
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          if (item.hasDiscount)
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    horizontal: 8,
                                                    vertical: 3,
                                                  ),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFFFFE9CC),
                                                borderRadius:
                                                    BorderRadius.circular(999),
                                              ),
                                              child: Text(
                                                item.discountLabel ?? 'Offer',
                                                style: const TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w700,
                                                  color: Color(0xFFB15F00),
                                                ),
                                              ),
                                            ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 6, 16, 14),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    if (!isBuyerAuthenticated(ref)) {
                      showBuyerAuthPrompt(
                        context,
                        ref,
                        message: 'Sign in to contact sellers.',
                      );
                      return;
                    }
                    ref
                        .read(chatProvider.notifier)
                        .startSellerChat(
                          sellerId: seller.id,
                          farmName: seller.farmName,
                          sellerName: seller.name,
                        );
                    ref.read(shellTabProvider.notifier).setTab(2);
                    Navigator.of(context).pop();
                  },
                  icon: const Icon(Icons.chat_bubble_outline_rounded),
                  label: const Text('Chat Seller'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: inCart
                      ? null
                      : () {
                          ref
                              .read(cartProvider.notifier)
                              .addProduct(product.id, variantId: selectedVariant?.id);
                          _showInfo(context, 'Added to cart.');
                        },
                  icon: Icon(
                    inCart
                        ? Icons.check_circle_rounded
                        : Icons.add_shopping_cart_rounded,
                  ),
                  label: Text(inCart ? 'Added to Cart' : 'Add to Cart'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showInfo(BuildContext context, String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }
}

class _ArrowButton extends StatelessWidget {
  const _ArrowButton({required this.direction, required this.onPressed});

  final IconData direction;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 6),
      child: CircleAvatar(
        radius: 18,
        backgroundColor: Colors.black45,
        child: IconButton(
          onPressed: onPressed,
          icon: Icon(direction, color: Colors.white),
          iconSize: 18,
          splashRadius: 20,
        ),
      ),
    );
  }
}




