import 'dart:convert';

import 'package:dio/dio.dart';

const mobileApiBaseUrl = 'https://agritec-api.vercel.app';

class MobileApiException implements Exception {
  const MobileApiException({
    required this.message,
    this.statusCode,
    this.payload,
  });

  final String message;
  final int? statusCode;
  final Object? payload;

  @override
  String toString() => 'MobileApiException($statusCode): $message';
}

class MobileApiClient {
  MobileApiClient({Dio? dio})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: mobileApiBaseUrl,
              connectTimeout: const Duration(seconds: 15),
              receiveTimeout: const Duration(seconds: 15),
              sendTimeout: const Duration(seconds: 15),
              headers: const {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
            ),
          );

  final Dio _dio;

  Future<Map<String, dynamic>> get(
    String path, {
    String? token,
    Map<String, dynamic>? queryParameters,
  }) {
    return _request(
      () => _dio.get<dynamic>(
        path,
        queryParameters: queryParameters,
        options: _options(token),
      ),
    );
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Object? data,
    String? token,
    Map<String, dynamic>? queryParameters,
  }) {
    return _request(
      () => _dio.post<dynamic>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: _options(token),
      ),
    );
  }

  Future<Map<String, dynamic>> patch(
    String path, {
    Object? data,
    String? token,
    Map<String, dynamic>? queryParameters,
  }) {
    return _request(
      () => _dio.patch<dynamic>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: _options(token),
      ),
    );
  }

  Future<Map<String, dynamic>> delete(
    String path, {
    Object? data,
    String? token,
    Map<String, dynamic>? queryParameters,
  }) {
    return _request(
      () => _dio.delete<dynamic>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: _options(token),
      ),
    );
  }

  Options _options(String? token) {
    final headers = <String, dynamic>{};
    if (token != null && token.trim().isNotEmpty) {
      headers['Authorization'] = 'Bearer ${token.trim()}';
    }
    return Options(headers: headers);
  }

  Future<Map<String, dynamic>> _request(
    Future<Response<dynamic>> Function() request,
  ) async {
    try {
      final response = await request();
      final data = _normalize(response.data);
      if (response.statusCode != null && response.statusCode! >= 400) {
        throw _toException(
          payload: data,
          statusCode: response.statusCode,
        );
      }
      return data;
    } on DioException catch (error) {
      final payload = _normalize(error.response?.data);
      throw _toException(
        payload: payload,
        statusCode: error.response?.statusCode,
        fallbackMessage: _fallbackMessage(error),
      );
    } on FormatException catch (_) {
      throw const MobileApiException(
        message: 'Invalid server response',
      );
    }
  }

  Map<String, dynamic> _normalize(Object? data) {
    if (data is Map<String, dynamic>) {
      return data;
    }
    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }
    if (data is String && data.isNotEmpty) {
      final decoded = jsonDecode(data);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      if (decoded is Map) {
        return Map<String, dynamic>.from(decoded);
      }
    }
    return const <String, dynamic>{};
  }

  MobileApiException _toException({
    required Map<String, dynamic> payload,
    int? statusCode,
    String? fallbackMessage,
  }) {
    final message =
        (payload['message'] as String?)?.trim().isNotEmpty == true
            ? payload['message'] as String
            : fallbackMessage ?? 'Request failed';
    return MobileApiException(
      message: message,
      statusCode: statusCode,
      payload: payload,
    );
  }

  String _fallbackMessage(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return 'Request timed out. Try again.';
      case DioExceptionType.connectionError:
        return 'Unable to reach the server. Check your connection.';
      case DioExceptionType.badCertificate:
      case DioExceptionType.cancel:
      case DioExceptionType.unknown:
      case DioExceptionType.badResponse:
        return 'Request failed';
    }
  }
}
