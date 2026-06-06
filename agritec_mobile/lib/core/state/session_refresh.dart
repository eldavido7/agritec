import 'package:agritec_mobile/features/account/application/account_settings_provider.dart';
import 'package:agritec_mobile/features/account/application/address_providers.dart';
import 'package:agritec_mobile/features/cart/application/cart_providers.dart';
import 'package:agritec_mobile/features/chat/application/chat_providers.dart';
import 'package:agritec_mobile/features/notifications/application/notification_providers.dart';
import 'package:agritec_mobile/features/orders/application/order_providers.dart';
import 'package:agritec_mobile/features/wishlist/application/wishlist_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void refreshBuyerScopedState(Ref ref) {
  ref.invalidate(accountSettingsProvider);
  ref.invalidate(addressBookProvider);
  ref.invalidate(defaultAddressProvider);
  ref.invalidate(cartProvider);
  ref.invalidate(cartGroupsProvider);
  ref.invalidate(cartItemCountProvider);
  ref.invalidate(cartTotalProvider);
  ref.invalidate(ordersProvider);
  ref.invalidate(chatProvider);
  ref.invalidate(notificationsProvider);
  ref.invalidate(unreadNotificationsCountProvider);
  ref.invalidate(wishlistProvider);
  ref.invalidate(wishlistProductsProvider);
}

void refreshBuyerScopedStateFromWidget(WidgetRef ref) {
  ref.invalidate(accountSettingsProvider);
  ref.invalidate(addressBookProvider);
  ref.invalidate(defaultAddressProvider);
  ref.invalidate(cartProvider);
  ref.invalidate(cartGroupsProvider);
  ref.invalidate(cartItemCountProvider);
  ref.invalidate(cartTotalProvider);
  ref.invalidate(ordersProvider);
  ref.invalidate(chatProvider);
  ref.invalidate(notificationsProvider);
  ref.invalidate(unreadNotificationsCountProvider);
  ref.invalidate(wishlistProvider);
  ref.invalidate(wishlistProductsProvider);
}
