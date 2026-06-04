import 'package:agritec_mobile/core/localization/app_locale.dart';
import 'package:agritec_mobile/core/localization/app_localizations.dart';
import 'package:agritec_mobile/core/localization/localization_controller.dart';
import 'package:agritec_mobile/features/account/application/account_settings_provider.dart';
import 'package:agritec_mobile/features/account/presentation/addresses_page.dart';
import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';
import 'package:agritec_mobile/features/notifications/application/notification_providers.dart';
import 'package:agritec_mobile/features/notifications/presentation/notifications_page.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
import 'package:agritec_mobile/features/orders/presentation/orders_page.dart';
import 'package:agritec_mobile/features/startup/application/startup_controller.dart';
import 'package:agritec_mobile/features/startup/presentation/splash_page.dart';
import 'package:agritec_mobile/features/wishlist/presentation/wishlist_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  late final TextEditingController _nameController;
  late final TextEditingController _emailController;
  late final TextEditingController _phoneController;

  @override
  void initState() {
    super.initState();
    final settings = ref.read(accountSettingsProvider);
    _nameController = TextEditingController(text: settings.fullName);
    _emailController = TextEditingController(text: settings.email);
    _phoneController = TextEditingController(text: settings.phone);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!isBuyerAuthenticated(ref)) {
      return AuthRequiredPage(
        title: ref.tr('profile.title'),
        message: ref.tr('auth.required.account'),
        onBack: () => ref.read(shellTabProvider.notifier).setTab(0),
      );
    }
    final settings = ref.watch(accountSettingsProvider);
    final locale = ref.watch(selectedLocaleProvider);
    final unreadNotifications = ref.watch(unreadNotificationsCountProvider);
    return Container(
      color: const Color(0xFFEAF1ED),
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 16),
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
              decoration: BoxDecoration(
                color: const Color(0xFF136A43),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(
                children: [
                  const CircleAvatar(
                    radius: 20,
                    backgroundColor: Color(0xFF2A7C56),
                    child: Icon(Icons.person_rounded, color: Colors.white),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      ref.tr('profile.title'),
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      ref.tr('profile.accountInfo'),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _nameController,
                      decoration: InputDecoration(
                        labelText: ref.tr('profile.fullName'),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: InputDecoration(
                        labelText: ref.tr('profile.email'),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        labelText: ref.tr('profile.phone'),
                      ),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          ref
                              .read(accountSettingsProvider.notifier)
                              .updateProfile(
                                fullName: _nameController.text.trim(),
                                email: _emailController.text.trim(),
                                phone: _phoneController.text.trim(),
                              );
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(ref.tr('profile.updated'))),
                          );
                        },
                        child: Text(ref.tr('profile.saveProfile')),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      ref.tr('profile.language'),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<AppLocale>(
                      initialValue: locale,
                      decoration: InputDecoration(
                        labelText: ref.tr('profile.appLanguage'),
                      ),
                      items: [
                        for (final locale in AppLocale.values)
                          DropdownMenuItem(
                            value: locale,
                            child: Text(locale.label),
                          ),
                      ],
                      onChanged: (nextLocale) {
                        if (nextLocale == null) return;
                        ref
                            .read(localizationControllerProvider.notifier)
                            .setLocale(nextLocale);
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  SwitchListTile(
                    value: settings.orderNotifications,
                    onChanged: (value) => ref
                        .read(accountSettingsProvider.notifier)
                        .setOrderNotifications(value),
                    title: Text(ref.tr('profile.orderNotifications')),
                  ),
                  SwitchListTile(
                    value: settings.promoNotifications,
                    onChanged: (value) => ref
                        .read(accountSettingsProvider.notifier)
                        .setPromoNotifications(value),
                    title: Text(ref.tr('profile.promoNotifications')),
                  ),
                  SwitchListTile(
                    value: settings.chatNotifications,
                    onChanged: (value) => ref
                        .read(accountSettingsProvider.notifier)
                        .setChatNotifications(value),
                    title: Text(ref.tr('profile.chatNotifications')),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.notifications_rounded),
                    title: Text(ref.tr('notifications.title')),
                    trailing: unreadNotifications > 0
                        ? Badge(label: Text('$unreadNotifications'))
                        : const Icon(Icons.chevron_right_rounded),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const NotificationsPage(),
                      ),
                    ),
                  ),
                  ListTile(
                    leading: const Icon(Icons.favorite_rounded),
                    title: Text(ref.tr('profile.wishlist')),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const WishlistPage(),
                      ),
                    ),
                  ),
                  ListTile(
                    leading: const Icon(Icons.location_on_rounded),
                    title: Text(ref.tr('profile.savedAddresses')),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => context.pushNamed(AddressesPage.routeName),
                  ),
                  ListTile(
                    leading: const Icon(Icons.receipt_long_rounded),
                    title: Text(ref.tr('profile.myOrders')),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => context.pushNamed(OrdersPage.routeName),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () async {
                await ref.read(localAuthProvider.notifier).signOut();
                await ref.read(startupControllerProvider.notifier).signOut();
                if (!mounted || !context.mounted) return;
                context.go(SplashPage.routePath);
              },
              icon: const Icon(Icons.logout_rounded),
              label: Text(ref.tr('profile.logout')),
            ),
          ],
        ),
      ),
    );
  }
}


