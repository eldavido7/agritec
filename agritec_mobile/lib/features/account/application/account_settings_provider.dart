import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:agritec_mobile/features/auth/application/local_auth_provider.dart';

class AccountSettings {
  const AccountSettings({
    required this.fullName,
    required this.email,
    required this.phone,
  });

  final String fullName;
  final String email;
  final String phone;

  AccountSettings copyWith({
    String? fullName,
    String? email,
    String? phone,
  }) {
    return AccountSettings(
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
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
    );
  }

  void updateProfile({
    required String fullName,
    required String email,
    required String phone,
  }) {
    state = state.copyWith(fullName: fullName, email: email, phone: phone);
  }
}

final accountSettingsProvider =
    NotifierProvider<AccountSettingsNotifier, AccountSettings>(
  AccountSettingsNotifier.new,
);