import 'package:agritec_mobile/core/connectivity/connectivity_provider.dart';
import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/core/state/session_refresh.dart';
import 'package:agritec_mobile/features/account/presentation/profile_page.dart';
import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
import 'package:agritec_mobile/features/cart/application/cart_providers.dart';
import 'package:agritec_mobile/features/cart/presentation/cart_page.dart';
import 'package:agritec_mobile/features/catalog/application/catalog_providers.dart';
import 'package:agritec_mobile/features/catalog/presentation/catalog_hub_page.dart';
import 'package:agritec_mobile/features/catalog/presentation/catalog_listing_page.dart';
import 'package:agritec_mobile/features/chat/application/chat_providers.dart';
import 'package:agritec_mobile/features/chat/presentation/chat_page.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
import 'package:agritec_mobile/features/home/presentation/home_page.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class MainShellPage extends ConsumerStatefulWidget {
  const MainShellPage({super.key});

  static const routeName = 'home-shell';
  static const routePath = '/home';

  @override
  ConsumerState<MainShellPage> createState() => _MainShellPageState();
}

class _MainShellPageState extends ConsumerState<MainShellPage> {
  DateTime? _lastBackPressAt;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      showWelcomeGuestPromptIfNeeded(context, ref);
    });
  }

  Future<void> _handleSystemBack() async {
    final tab = ref.read(shellTabProvider);
    if (tab != 0) {
      ref.read(shellTabProvider.notifier).setTab(0);
      return;
    }

    final now = DateTime.now();
    final last = _lastBackPressAt;
    if (last == null || now.difference(last) > const Duration(seconds: 2)) {
      _lastBackPressAt = now;
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(ref.tr('common.backAgainToExit')),
            duration: Duration(seconds: 2),
          ),
        );
      return;
    }

    await SystemNavigator.pop();
  }

  Future<void> _openAllProductsFromHome() async {
    ref.read(catalogQueryProvider.notifier).setQuery('');
    ref.read(catalogCategoryProvider.notifier).setCategory(null);
    ref.read(catalogSortProvider.notifier).setSort(CatalogSortOption.relevance);
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const CatalogListingPage()));
  }

  @override
  Widget build(BuildContext context) {
    final cartCount = ref.watch(cartItemCountProvider);
    final unreadChatCount = isBuyerAuthenticated(ref) ? ref.watch(unreadChatCountProvider) : 0;
    final tab = ref.watch(shellTabProvider);
    final isOnline = ref.watch(connectivityStatusProvider);
    ref.listen<String?>(currentBuyerUserIdProvider, (previous, next) {
      if (previous == next) return;
      refreshBuyerScopedStateFromWidget(ref);
    });
    ref.listen<AsyncValue<bool>>(connectivityStatusProvider, (previous, next) {
      final wasOnline = previous?.asData?.value ?? false;
      final nowOnline = next.asData?.value ?? false;
      if (!wasOnline && nowOnline) {
        syncBuyerScopedStateFromWidget(ref);
      }
    });

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        _handleSystemBack();
      },
      child: Scaffold(
        body: Column(
          children: [
            isOnline.when(
              data: (online) => online
                  ? const SizedBox.shrink()
                  : Container(
                      width: double.infinity,
                      color: const Color(0xFFCC3D1F),
                      padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
                      child: SafeArea(
                        bottom: false,
                        child: Text(
                          ref.tr('common.offlineCached'),
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
              loading: () => const SizedBox.shrink(),
              error: (_, _) => const SizedBox.shrink(),
            ),
            Expanded(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 240),
                child: KeyedSubtree(
                  key: ValueKey<int>(tab),
                  child: switch (tab) {
                    0 => HomePage(
                      onOpenSearchPage: (categorySlug) {
                        ref
                            .read(catalogCategoryProvider.notifier)
                            .setCategory(categorySlug);
                        ref.read(shellTabProvider.notifier).setTab(1);
                      },
                      onBrowseProducts: _openAllProductsFromHome,
                    ),
                    1 => const CatalogHubPage(),
                    2 => const ChatPage(),
                    3 => const CartPage(),
                    _ => const ProfilePage(),
                  },
                ),
              ),
            ),
          ],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: tab,
          onDestinationSelected: (value) {
            if (!isBuyerAuthenticated(ref) && (value == 2 || value == 4)) {
              showBuyerAuthPrompt(
                context,
                ref,
                message: value == 2
                    ? ref.tr('auth.required.contactSupport')
                    : ref.tr('auth.required.account'),
              );
              return;
            }
            ref.read(shellTabProvider.notifier).setTab(value);
          },
          destinations: [
            NavigationDestination(
              icon: const Icon(Icons.home_rounded),
              label: ref.tr('nav.home'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.search_rounded),
              label: ref.tr('nav.search'),
            ),
            NavigationDestination(
              icon: _ChatIconWithBadge(count: unreadChatCount),
              label: ref.tr('nav.chat'),
            ),
            NavigationDestination(
              icon: _CartIconWithBadge(count: cartCount),
              label: ref.tr('nav.cart'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.person_rounded),
              label: ref.tr('nav.profile'),
            ),
          ],
        ),
      ),
    );
  }
}

class _CartIconWithBadge extends StatelessWidget {
  const _CartIconWithBadge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        const Icon(Icons.shopping_bag_rounded),
        if (count > 0)
          Positioned(
            right: -8,
            top: -7,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: const Color(0xFFCC3D1F),
                borderRadius: BorderRadius.circular(999),
              ),
              constraints: const BoxConstraints(minWidth: 18),
              child: Text(
                count > 99 ? '99+' : '$count',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _ChatIconWithBadge extends StatelessWidget {
  const _ChatIconWithBadge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        const Icon(Icons.chat_bubble_rounded),
        if (count > 0)
          Positioned(
            right: -8,
            top: -7,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: const Color(0xFFCC3D1F),
                borderRadius: BorderRadius.circular(999),
              ),
              constraints: const BoxConstraints(minWidth: 18),
              child: Text(
                count > 99 ? '99+' : '$count',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
