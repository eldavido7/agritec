import 'dart:async';

import 'package:agritec_mobile/core/maps/google_places_service.dart';
import 'package:agritec_mobile/features/account/application/address_providers.dart';
import 'package:agritec_mobile/features/auth/application/auth_prompt.dart';
import 'package:agritec_mobile/features/home/application/shell_navigation_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:go_router/go_router.dart';

class AddressesPage extends ConsumerWidget {
  const AddressesPage({super.key});

  static const routeName = 'addresses';
  static const routePath = '/addresses';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!isBuyerAuthenticated(ref)) {
      return AuthRequiredPage(
        title: 'Saved Addresses',
        message: 'Sign in to manage delivery addresses.',
        onBack: () {
          if (Navigator.of(context).canPop()) {
            Navigator.of(context).pop();
          } else {
            ref.read(shellTabProvider.notifier).setTab(0);
            context.goNamed('home-shell');
          }
        },
      );
    }
    final addresses = ref.watch(addressBookProvider);
    return Scaffold(
      backgroundColor: const Color(0xFFEAF1ED),
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () {
            if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            } else {
              ref.read(shellTabProvider.notifier).setTab(4);
              context.goNamed('home-shell');
            }
          },
        ),
        title: const Text('Saved Addresses'),
        actions: [
          IconButton(
            icon: const Icon(Icons.home_rounded),
            onPressed: () {
              ref.read(shellTabProvider.notifier).setTab(0);
              context.goNamed('home-shell');
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 16),
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            decoration: BoxDecoration(
              color: const Color(0xFF136A43),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Text(
              'Manage delivery locations and default checkout address.',
              style: TextStyle(
                color: Color(0xFFD4EADF),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _openAddressDialog(context, ref),
              icon: const Icon(Icons.add_rounded),
              label: const Text('Add Address'),
            ),
          ),
          const SizedBox(height: 10),
          for (final address in addresses)
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              child: ListTile(
                title: Text(
                  '${address.label}${address.isDefault ? ' (Default)' : ''}',
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(address.fullAddress),
                    if (address.isManualAddress || !address.hasMapLocation)
                      const Padding(
                        padding: EdgeInsets.only(top: 4),
                        child: Text(
                          'Map location missing',
                          style: TextStyle(
                            color: Color(0xFF9A6C00),
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ),
                  ],
                ),
                trailing: PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert_rounded),
                  onSelected: (value) {
                    if (value == 'default') {
                      ref
                          .read(addressBookProvider.notifier)
                          .setDefault(address.id);
                      return;
                    }
                    if (value == 'edit') {
                      _openAddressDialog(context, ref, address: address);
                      return;
                    }
                    if (value == 'delete') {
                      ref
                          .read(addressBookProvider.notifier)
                          .deleteAddress(address.id);
                    }
                  },
                  itemBuilder: (context) => [
                    if (!address.isDefault)
                      const PopupMenuItem<String>(
                        value: 'default',
                        child: Text('Mark as default address'),
                      ),
                    const PopupMenuItem<String>(
                      value: 'edit',
                      child: Text('Edit'),
                    ),
                    const PopupMenuItem<String>(
                      value: 'delete',
                      child: Text('Delete'),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _openAddressDialog(
    BuildContext context,
    WidgetRef ref, {
    BuyerAddress? address,
  }) async {
    final key = await GooglePlacesService.getApiKey();
    if (!context.mounted) return;
    final places = GooglePlacesService(key);
    final labelController = TextEditingController(text: address?.label ?? '');
    final fullAddressController = TextEditingController(
      text: address?.fullAddress ?? '',
    );
    final latController = TextEditingController(
      text: address?.latitude != null ? '${address!.latitude}' : '',
    );
    final lngController = TextEditingController(
      text: address?.longitude != null ? '${address!.longitude}' : '',
    );
    final landmarkController = TextEditingController(
      text: address?.landmark ?? '',
    );

    var selectedLat = address?.latitude ?? 6.5244;
    var selectedLng = address?.longitude ?? 3.3792;
    var selectedDisplayName = address?.displayName ?? address?.fullAddress;
    var selectedCity = address?.city;
    var selectedState = address?.state;
    var makeDefault = address?.isDefault ?? false;
    var loadingSuggestions = false;
    var loadingReverseGeocode = false;
    String? suggestionError;
    final suggestions = <PlaceSuggestion>[];
    Timer? debounce;
    GoogleMapController? mapController;
    void Function(VoidCallback fn)? setDialogState;

    Future<void> loadSuggestions(String query) async {
      if (query.trim().length < 3) {
        setDialogState?.call(() {
          suggestions.clear();
          suggestionError = null;
          loadingSuggestions = false;
        });
        return;
      }
      setDialogState?.call(() {
        loadingSuggestions = true;
        suggestionError = null;
      });
      try {
        final found = await places.autocomplete(query);
        setDialogState?.call(() {
          suggestions
            ..clear()
            ..addAll(found);
          loadingSuggestions = false;
          suggestionError = null;
        });
      } catch (_) {
        setDialogState?.call(() {
          suggestions.clear();
          loadingSuggestions = false;
          suggestionError = 'Could not load suggestions.';
        });
      }
    }

    Future<void> applyPlaceDetails(PlaceDetailsResult details) async {
      selectedLat = details.latitude;
      selectedLng = details.longitude;
      selectedDisplayName = details.displayName;
      selectedCity = details.city;
      selectedState = details.state;
      fullAddressController.text = details.formattedAddress;
      latController.text = details.latitude.toStringAsFixed(6);
      lngController.text = details.longitude.toStringAsFixed(6);
      mapController?.animateCamera(
        CameraUpdate.newLatLngZoom(
          LatLng(details.latitude, details.longitude),
          15,
        ),
      );
      setDialogState?.call(() {});
    }

    Future<void> reverseGeocodeAndApply(double lat, double lng) async {
      setDialogState?.call(() => loadingReverseGeocode = true);
      try {
        final details = await places.reverseGeocode(
          latitude: lat,
          longitude: lng,
        );
        if (details != null) {
          await applyPlaceDetails(details);
        } else {
          selectedLat = lat;
          selectedLng = lng;
          latController.text = lat.toStringAsFixed(6);
          lngController.text = lng.toStringAsFixed(6);
          setDialogState?.call(() {});
        }
      } finally {
        setDialogState?.call(() => loadingReverseGeocode = false);
      }
    }

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setState) {
            setDialogState = setState;
            final marker = Marker(
              markerId: const MarkerId('selected'),
              position: LatLng(selectedLat, selectedLng),
              draggable: true,
              onDragEnd: (position) =>
                  reverseGeocodeAndApply(position.latitude, position.longitude),
            );
            final maxDialogHeight = MediaQuery.of(context).size.height * 0.9;
            return Dialog(
              insetPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 20,
              ),
              child: SizedBox(
                width: 680,
                height: maxDialogHeight.clamp(520.0, 820.0).toDouble(),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              address == null ? 'Add Address' : 'Edit Address',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: () => Navigator.of(dialogContext).pop(),
                            icon: const Icon(Icons.close_rounded),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            TextField(
                              controller: labelController,
                              decoration: const InputDecoration(
                                labelText: 'Label (Home, Office)',
                              ),
                            ),
                            TextField(
                              controller: fullAddressController,
                              decoration: const InputDecoration(
                                labelText: 'Delivery Address',
                              ),
                              onChanged: (value) {
                                selectedDisplayName = null;
                                selectedCity = null;
                                selectedState = null;
                                debounce?.cancel();
                                debounce = Timer(
                                  const Duration(milliseconds: 450),
                                  () => loadSuggestions(value),
                                );
                              },
                            ),
                            const SizedBox(height: 8),
                            if (loadingSuggestions)
                              const Align(
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  'Loading suggestions...',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF65706B),
                                  ),
                                ),
                              ),
                            if (suggestionError != null)
                              Align(
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  suggestionError!,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFFCC3D1F),
                                  ),
                                ),
                              ),
                            if (!loadingSuggestions &&
                                suggestionError == null &&
                                fullAddressController.text.trim().length >= 3 &&
                                suggestions.isEmpty)
                              const Align(
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  'No suggestions found.',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Color(0xFF65706B),
                                  ),
                                ),
                              ),
                            if (suggestions.isNotEmpty)
                              Container(
                                margin: const EdgeInsets.only(
                                  top: 4,
                                  bottom: 10,
                                ),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: const Color(0xFFDCE4E0),
                                  ),
                                ),
                                child: ConstrainedBox(
                                  constraints: const BoxConstraints(
                                    maxHeight: 180,
                                  ),
                                  child: ListView.builder(
                                    shrinkWrap: true,
                                    itemCount: suggestions.length,
                                    itemBuilder: (context, index) {
                                      final item = suggestions[index];
                                      return ListTile(
                                        dense: true,
                                        title: Text(item.mainText),
                                        subtitle: Text(item.secondaryText),
                                        onTap: () async {
                                          final details = await places
                                              .getPlaceDetails(item.placeId);
                                          if (details == null) {
                                            setDialogState?.call(() {
                                              suggestionError =
                                                  'Could not load place details.';
                                            });
                                            return;
                                          }
                                          suggestions.clear();
                                          await applyPlaceDetails(details);
                                        },
                                      );
                                    },
                                  ),
                                ),
                              ),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: SizedBox(
                                height: 230,
                                child: GoogleMap(
                                  initialCameraPosition: CameraPosition(
                                    target: LatLng(selectedLat, selectedLng),
                                    zoom: 14,
                                  ),
                                  myLocationButtonEnabled: false,
                                  zoomControlsEnabled: false,
                                  markers: {marker},
                                  onMapCreated: (controller) {
                                    mapController = controller;
                                  },
                                  onTap: (point) => reverseGeocodeAndApply(
                                    point.latitude,
                                    point.longitude,
                                  ),
                                ),
                              ),
                            ),
                            if (loadingReverseGeocode)
                              const Padding(
                                padding: EdgeInsets.only(top: 6),
                                child: Align(
                                  alignment: Alignment.centerLeft,
                                  child: Text(
                                    'Updating address from selected pin...',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF65706B),
                                    ),
                                  ),
                                ),
                              ),
                            const SizedBox(height: 8),
                            TextField(
                              controller: latController,
                              decoration: const InputDecoration(
                                labelText: 'Latitude',
                              ),
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                            ),
                            TextField(
                              controller: lngController,
                              decoration: const InputDecoration(
                                labelText: 'Longitude',
                              ),
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                            ),
                            TextField(
                              controller: landmarkController,
                              decoration: const InputDecoration(
                                labelText: 'Landmark (optional)',
                              ),
                            ),
                            CheckboxListTile(
                              value: makeDefault,
                              contentPadding: EdgeInsets.zero,
                              onChanged: (value) =>
                                  setState(() => makeDefault = value ?? false),
                              title: const Text('Set as default'),
                            ),
                          ],
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      child: Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () =>
                                  Navigator.of(dialogContext).pop(),
                              child: const Text('Cancel'),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () {
                                final lat = double.tryParse(
                                  latController.text.trim(),
                                );
                                final lng = double.tryParse(
                                  lngController.text.trim(),
                                );
                                if (labelController.text.trim().isEmpty ||
                                    fullAddressController.text.trim().isEmpty ||
                                    lat == null ||
                                    lng == null) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                        'Please fill all required fields.',
                                      ),
                                    ),
                                  );
                                  return;
                                }
                                final notifier = ref.read(
                                  addressBookProvider.notifier,
                                );
                                final newAddress = BuyerAddress(
                                  id:
                                      address?.id ??
                                      'addr-${DateTime.now().millisecondsSinceEpoch}',
                                  label: labelController.text.trim(),
                                  displayName:
                                      selectedDisplayName ??
                                      fullAddressController.text.trim(),
                                  fullAddress: fullAddressController.text
                                      .trim(),
                                  latitude: lat,
                                  longitude: lng,
                                  city: selectedCity,
                                  state: selectedState,
                                  landmark:
                                      landmarkController.text.trim().isEmpty
                                      ? null
                                      : landmarkController.text.trim(),
                                  isManualAddress: false,
                                  isDefault: makeDefault,
                                );
                                if (address == null) {
                                  notifier.addAddress(newAddress);
                                } else {
                                  notifier.updateAddress(newAddress);
                                }
                                if (makeDefault) {
                                  notifier.setDefault(newAddress.id);
                                }
                                Navigator.of(dialogContext).pop();
                              },
                              child: const Text('Save'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
    debounce?.cancel();
    mapController?.dispose();
  }
}
