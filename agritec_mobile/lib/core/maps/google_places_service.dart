import 'package:dio/dio.dart';
import 'package:flutter/services.dart';

class PlaceSuggestion {
  const PlaceSuggestion({
    required this.placeId,
    required this.mainText,
    required this.secondaryText,
    required this.displayName,
  });

  final String placeId;
  final String mainText;
  final String secondaryText;
  final String displayName;
}

class PlaceDetailsResult {
  const PlaceDetailsResult({
    required this.displayName,
    required this.formattedAddress,
    required this.latitude,
    required this.longitude,
    this.city,
    this.state,
  });

  final String displayName;
  final String formattedAddress;
  final double latitude;
  final double longitude;
  final String? city;
  final String? state;
}

class GooglePlacesService {
  GooglePlacesService(this._apiKey)
      : _dio = Dio(
          BaseOptions(
            connectTimeout: const Duration(seconds: 10),
            receiveTimeout: const Duration(seconds: 10),
          ),
        );

  final String _apiKey;
  final Dio _dio;

  static const _channel = MethodChannel('agritec/config');

  static Future<String> getApiKey() async {
    final value =
        await _channel.invokeMethod<String>('getGoogleMapsApiKey') ?? '';
    return value.trim();
  }

  Future<List<PlaceSuggestion>> autocomplete(String query) async {
    if (_apiKey.isEmpty || query.trim().length < 3) return const [];
    final response = await _dio.get<dynamic>(
      'https://maps.googleapis.com/maps/api/place/autocomplete/json',
      queryParameters: <String, dynamic>{
        'input': query.trim(),
        'key': _apiKey,
        'components': 'country:ng',
      },
    );
    final data = response.data;
    if (data is! Map<String, dynamic>) return const [];
    final predictions = data['predictions'];
    if (predictions is! List) return const [];
    return predictions
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .map((item) {
          final structured =
              item['structured_formatting'] as Map<String, dynamic>?;
          final mainText = (structured?['main_text'] as String?) ?? '';
          final secondaryText =
              (structured?['secondary_text'] as String?) ?? '';
          return PlaceSuggestion(
            placeId: (item['place_id'] as String?) ?? '',
            mainText: mainText,
            secondaryText: secondaryText,
            displayName: (item['description'] as String?) ?? mainText,
          );
        })
        .where((item) => item.placeId.isNotEmpty)
        .toList();
  }

  Future<PlaceDetailsResult?> getPlaceDetails(String placeId) async {
    if (_apiKey.isEmpty || placeId.isEmpty) return null;
    final response = await _dio.get<dynamic>(
      'https://maps.googleapis.com/maps/api/place/details/json',
      queryParameters: <String, dynamic>{
        'place_id': placeId,
        'key': _apiKey,
        'fields':
            'geometry/location,formatted_address,address_components,name',
      },
    );
    final data = response.data;
    if (data is! Map<String, dynamic>) return null;
    final result = data['result'];
    if (result is! Map<String, dynamic>) return null;
    final geometry = result['geometry'] as Map<String, dynamic>?;
    final location = geometry?['location'] as Map<String, dynamic>?;
    final lat = (location?['lat'] as num?)?.toDouble();
    final lng = (location?['lng'] as num?)?.toDouble();
    if (lat == null || lng == null) return null;
    final components = (result['address_components'] as List<dynamic>? ?? [])
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
    final city = _componentLongName(
      components,
      const ['locality', 'administrative_area_level_2'],
    );
    final state = _componentLongName(
      components,
      const ['administrative_area_level_1'],
    );
    return PlaceDetailsResult(
      displayName: (result['name'] as String?) ??
          (result['formatted_address'] as String?) ??
          '',
      formattedAddress: (result['formatted_address'] as String?) ?? '',
      latitude: lat,
      longitude: lng,
      city: city,
      state: state,
    );
  }

  Future<PlaceDetailsResult?> reverseGeocode({
    required double latitude,
    required double longitude,
  }) async {
    if (_apiKey.isEmpty) return null;
    final response = await _dio.get<dynamic>(
      'https://maps.googleapis.com/maps/api/geocode/json',
      queryParameters: <String, dynamic>{
        'latlng': '$latitude,$longitude',
        'key': _apiKey,
      },
    );
    final data = response.data;
    if (data is! Map<String, dynamic>) return null;
    final results = data['results'];
    if (results is! List || results.isEmpty) return null;
    final first = Map<String, dynamic>.from(results.first as Map);
    final components = (first['address_components'] as List<dynamic>? ?? [])
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
    return PlaceDetailsResult(
      displayName: (first['formatted_address'] as String?) ?? '',
      formattedAddress: (first['formatted_address'] as String?) ?? '',
      latitude: latitude,
      longitude: longitude,
      city: _componentLongName(
        components,
        const ['locality', 'administrative_area_level_2'],
      ),
      state: _componentLongName(
        components,
        const ['administrative_area_level_1'],
      ),
    );
  }

  String? _componentLongName(
    List<Map<String, dynamic>> components,
    List<String> wantedTypes,
  ) {
    for (final component in components) {
      final types =
          (component['types'] as List<dynamic>? ?? []).map((e) => '$e').toSet();
      for (final type in wantedTypes) {
        if (types.contains(type)) {
          return component['long_name'] as String?;
        }
      }
    }
    return null;
  }
}
