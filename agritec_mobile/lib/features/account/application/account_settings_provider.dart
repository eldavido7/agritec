import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';

class AccountSettings {
  const AccountSettings({
    required this.fullName,
    required this.email,
    required this.phone,
    required this.orderNotifications,
    required this.promoNotifications,
    required this.chatNotifications,
  });

  final String fullName;
  final String email;
  final String phone;
  final bool orderNotifications;
  final bool promoNotifications;
  final bool chatNotifications;

  AccountSettings copyWith({
    String? fullName,
    String? email,
    String? phone,
    bool? orderNotifications,
    bool? promoNotifications,
    bool? chatNotifications,
  }) {
    return AccountSettings(
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      orderNotifications: orderNotifications ?? this.orderNotifications,
      promoNotifications: promoNotifications ?? this.promoNotifications,
      chatNotifications: chatNotifications ?? this.chatNotifications,
    );
  }
}

class AccountSettingsNotifier extends Notifier<AccountSettings> {
  @override
  AccountSettings build() {
    final user = ref.watch(currentBuyerUserProvider);
    return AccountSettings(
      fullName: user?.fullName ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      orderNotifications: true,
      promoNotifications: true,
      chatNotifications: true,
    );
  }

  void updateProfile({
    required String fullName,
    required String email,
    required String phone,
  }) {
    state = state.copyWith(fullName: fullName, email: email, phone: phone);
  }

  void setOrderNotifications(bool enabled) {
    state = state.copyWith(orderNotifications: enabled);
  }

  void setPromoNotifications(bool enabled) {
    state = state.copyWith(promoNotifications: enabled);
  }

  void setChatNotifications(bool enabled) {
    state = state.copyWith(chatNotifications: enabled);
  }
}

final accountSettingsProvider =
    NotifierProvider<AccountSettingsNotifier, AccountSettings>(
  AccountSettingsNotifier.new,
);
