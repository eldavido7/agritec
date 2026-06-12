import 'package:agritec_mobile/core/api/mobile_api.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const buyerAuthTokenStorageKey = 'buyer_auth_token_v1';
const buyerSessionFlagKey = 'buyer_authenticated_session_v1';

class BuyerSessionUser {
  const BuyerSessionUser({
    required this.id,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.role,
    this.buyerProfileId,
    this.isActive = true,
  });

  final String id;
  final String fullName;
  final String email;
  final String phone;
  final String role;
  final String? buyerProfileId;
  final bool isActive;

  factory BuyerSessionUser.fromJson(Map<String, dynamic> json) {
    final buyerProfile = json['buyerProfile'];
    final buyerProfileMap =
        buyerProfile is Map ? Map<String, dynamic>.from(buyerProfile) : null;
    return BuyerSessionUser(
      id: '${json['id'] ?? ''}',
      fullName: '${json['fullName'] ?? ''}',
      email: '${json['email'] ?? ''}',
      phone: '${json['phone'] ?? ''}',
      role: '${json['role'] ?? ''}',
      buyerProfileId: buyerProfileMap?['id']?.toString(),
      isActive: json['isActive'] as bool? ?? true,
    );
  }
}

class AuthResponse {
  const AuthResponse({
    required this.token,
    required this.user,
  });

  final String token;
  final BuyerSessionUser user;
}

class AuthService {
  AuthService(this._client, this._storage);

  final MobileApiClient _client;
  final FlutterSecureStorage _storage;

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    final response = await _client.post(
      '/api/auth/buyer/signin',
      data: {
        'email': email.trim(),
        'password': password,
      },
    );
    return _parseAuthResponse(response);
  }

  Future<AuthResponse> signUp({
    required String fullName,
    required String email,
    required String phone,
    required String password,
  }) async {
    final response = await _client.post(
      '/api/auth/buyer/signup',
      data: {
        'fullName': fullName.trim(),
        'email': email.trim(),
        'phone': phone.trim(),
        'password': password,
      },
    );
    return _parseAuthResponse(response);
  }

  Future<void> forgotPassword({required String email}) async {
    await _client.post(
      '/api/auth/forgot-password',
      data: {'email': email.trim(), 'role': 'BUYER'},
    );
  }

  Future<BuyerSessionUser> fetchCurrentUser(String token) async {
    final response = await _client.get('/api/auth/me', token: token);
    final userJson = response['user'];
    if (userJson is! Map) {
      throw const MobileApiException(message: 'Invalid session response');
    }
    final user = BuyerSessionUser.fromJson(Map<String, dynamic>.from(userJson));
    if (user.role.toUpperCase() != 'BUYER') {
      throw const MobileApiException(message: 'Invalid buyer session');
    }
    return user;
  }

  Future<void> saveToken(String token) {
    return _storage.write(key: buyerAuthTokenStorageKey, value: token);
  }

  Future<String?> readToken() {
    return _storage.read(key: buyerAuthTokenStorageKey);
  }

  Future<void> clearToken() {
    return _storage.delete(key: buyerAuthTokenStorageKey);
  }

  AuthResponse _parseAuthResponse(Map<String, dynamic> response) {
    final token = (response['token'] as String?)?.trim() ?? '';
    final userJson = response['user'];
    if (token.isEmpty || userJson is! Map) {
      throw const MobileApiException(message: 'Invalid authentication response');
    }
    final user = BuyerSessionUser.fromJson(Map<String, dynamic>.from(userJson));
    if (user.role.toUpperCase() != 'BUYER') {
      throw const MobileApiException(message: 'This account is not a buyer account');
    }
    return AuthResponse(token: token, user: user);
  }
}

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final mobileApiClientProvider = Provider<MobileApiClient>((ref) {
  return MobileApiClient();
});

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(
    ref.watch(mobileApiClientProvider),
    ref.watch(secureStorageProvider),
  );
});

