import 'package:agritec_mobile/core/api/mobile_api.dart';
import 'package:agritec_mobile/features/auth/data/auth_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AuthStoreState {
  const AuthStoreState({this.activeUser, this.token});

  final BuyerSessionUser? activeUser;
  final String? token;
}

class LocalAuthNotifier extends AsyncNotifier<AuthStoreState> {
  static const demoEmail = 'demo@agritec.app';
  static const demoPassword = 'Demo@1234';

  @override
  Future<AuthStoreState> build() async {
    final authService = ref.read(authServiceProvider);
    final token = await authService.readToken();
    if (token == null || token.trim().isEmpty) {
      return const AuthStoreState();
    }

    try {
      final user = await authService.fetchCurrentUser(token);
      return AuthStoreState(activeUser: user, token: token);
    } on MobileApiException catch (error) {
      if (error.statusCode == 401) {
        await authService.clearToken();
        return const AuthStoreState();
      }
      rethrow;
    }
  }

  Future<BuyerSessionUser> signIn({
    required String email,
    required String password,
  }) async {
    final authService = ref.read(authServiceProvider);
    final response = await authService.signIn(email: email, password: password);
    await authService.saveToken(response.token);
    state = AsyncData(
      AuthStoreState(activeUser: response.user, token: response.token),
    );
    return response.user;
  }

  Future<BuyerSessionUser> register({
    required String fullName,
    required String email,
    required String phone,
    required String password,
  }) async {
    final authService = ref.read(authServiceProvider);
    final response = await authService.signUp(
      fullName: fullName,
      email: email,
      phone: phone,
      password: password,
    );
    await authService.saveToken(response.token);
    state = AsyncData(
      AuthStoreState(activeUser: response.user, token: response.token),
    );
    return response.user;
  }

  Future<void> forgotPassword({required String email}) async {
    await ref.read(authServiceProvider).forgotPassword(email: email);
  }

  Future<BuyerSessionUser> updateProfile({
    required String fullName,
    required String email,
    required String phone,
  }) async {
    final currentState = state.asData?.value;
    final token = currentState?.token;
    if (token == null || token.trim().isEmpty) {
      throw const MobileApiException(message: 'Buyer session not found');
    }

    final user = await ref.read(authServiceProvider).updateProfile(
          token: token,
          fullName: fullName,
          email: email,
          phone: phone,
        );

    state = AsyncData(AuthStoreState(activeUser: user, token: token));
    return user;
  }

  Future<void> signOut() async {
    await ref.read(authServiceProvider).clearToken();
    state = const AsyncData(AuthStoreState());
  }
}

final localAuthProvider = AsyncNotifierProvider<LocalAuthNotifier, AuthStoreState>(
  LocalAuthNotifier.new,
);

final currentBuyerUserProvider = Provider<BuyerSessionUser?>((ref) {
  final auth = ref.watch(localAuthProvider);
  return auth.asData?.value.activeUser;
});

final currentBuyerUserIdProvider = Provider<String?>((ref) {
  return ref.watch(currentBuyerUserProvider)?.id;
});

final buyerAuthTokenProvider = Provider<String?>((ref) {
  final auth = ref.watch(localAuthProvider);
  return auth.asData?.value.token;
});
