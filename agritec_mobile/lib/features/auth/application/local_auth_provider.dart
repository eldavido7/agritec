import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _usersKey = 'buyer_local_users_v1';
const _activeUserKey = 'buyer_local_active_user_v1';

class LocalBuyerUser {
  const LocalBuyerUser({
    required this.id,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.password,
  });

  final String id;
  final String fullName;
  final String email;
  final String phone;
  final String password;

  Map<String, dynamic> toJson() => {
    'id': id,
    'fullName': fullName,
    'email': email,
    'phone': phone,
    'password': password,
  };

  factory LocalBuyerUser.fromJson(Map<String, dynamic> json) => LocalBuyerUser(
    id: json['id'] as String,
    fullName: json['fullName'] as String,
    email: json['email'] as String,
    phone: json['phone'] as String,
    password: json['password'] as String,
  );
}

class AuthStoreState {
  const AuthStoreState({required this.users, this.activeUserId});
  final List<LocalBuyerUser> users;
  final String? activeUserId;

  LocalBuyerUser? get activeUser {
    if (activeUserId == null) return null;
    for (final user in users) {
      if (user.id == activeUserId) return user;
    }
    return null;
  }
}

class LocalAuthNotifier extends AsyncNotifier<AuthStoreState> {
  static const demoEmail = 'demo@agritec.app';
  static const demoPassword = 'Demo@1234';

  @override
  Future<AuthStoreState> build() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_usersKey);
    final activeUserId = prefs.getString(_activeUserKey);
    if (raw == null) {
      final seeded = [
        const LocalBuyerUser(
          id: 'buyer-demo-1',
          fullName: 'Demo Buyer',
          email: demoEmail,
          phone: '+234 801 000 1111',
          password: demoPassword,
        ),
      ];
      await _saveUsers(seeded, prefs);
      return AuthStoreState(users: seeded, activeUserId: activeUserId);
    }
    final decoded = jsonDecode(raw) as List<dynamic>;
    final users = decoded
        .whereType<Map<String, dynamic>>()
        .map(LocalBuyerUser.fromJson)
        .toList();
    return AuthStoreState(users: users, activeUserId: activeUserId);
  }

  Future<LocalBuyerUser?> signIn({
    required String email,
    required String password,
  }) async {
    final current = state.value;
    if (current == null) return null;
    final normalized = email.trim().toLowerCase();
    for (final user in current.users) {
      if (user.email.toLowerCase() == normalized && user.password == password) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_activeUserKey, user.id);
        state = AsyncData(AuthStoreState(users: current.users, activeUserId: user.id));
        return user;
      }
    }
    return null;
  }

  Future<LocalBuyerUser?> register({
    required String fullName,
    required String email,
    required String phone,
    required String password,
  }) async {
    final current = state.value;
    if (current == null) return null;
    final normalized = email.trim().toLowerCase();
    final exists = current.users.any((u) => u.email.toLowerCase() == normalized);
    if (exists) return null;
    final user = LocalBuyerUser(
      id: 'buyer-${DateTime.now().millisecondsSinceEpoch}',
      fullName: fullName.trim(),
      email: normalized,
      phone: phone.trim(),
      password: password,
    );
    final updated = [user, ...current.users];
    final prefs = await SharedPreferences.getInstance();
    await _saveUsers(updated, prefs);
    await prefs.setString(_activeUserKey, user.id);
    state = AsyncData(AuthStoreState(users: updated, activeUserId: user.id));
    return user;
  }

  Future<void> signOut() async {
    final current = state.value;
    if (current == null) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_activeUserKey);
    state = AsyncData(AuthStoreState(users: current.users, activeUserId: null));
  }

  Future<void> _saveUsers(
    List<LocalBuyerUser> users,
    SharedPreferences prefs,
  ) async {
    await prefs.setString(
      _usersKey,
      jsonEncode(users.map((user) => user.toJson()).toList()),
    );
  }
}

final localAuthProvider = AsyncNotifierProvider<LocalAuthNotifier, AuthStoreState>(
  LocalAuthNotifier.new,
);

final currentBuyerUserProvider = Provider<LocalBuyerUser?>((ref) {
  final auth = ref.watch(localAuthProvider);
  return auth.asData?.value.activeUser;
});

final currentBuyerUserIdProvider = Provider<String?>((ref) {
  return ref.watch(currentBuyerUserProvider)?.id;
});

