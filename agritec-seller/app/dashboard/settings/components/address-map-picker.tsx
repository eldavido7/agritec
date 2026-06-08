"use client";

import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

type AddressMapPickerProps = {
  latitude: number;
  longitude: number;
  addressText: string;
  onAddressTextChange: (value: string) => void;
  onAddressSelect: (payload: {
    displayName: string;
    latitude: number;
    longitude: number;
    city?: string;
    state?: string;
  }) => void;
  onCoordinateChange: (latitude: number, longitude: number) => void;
};

type Suggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
  displayName: string;
  prediction: google.maps.places.PlacePrediction;
};

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const SUGGESTION_DEBOUNCE_MS = 1500;

export function AddressMapPicker({
  latitude,
  longitude,
  addressText,
  onAddressTextChange,
  onAddressSelect,
  onCoordinateChange,
}: AddressMapPickerProps) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteSuggestionRef = useRef<
    typeof google.maps.places.AutocompleteSuggestion | null
  >(null);
  const autocompleteSessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const debounceRef = useRef<number | null>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [showNoSuggestions, setShowNoSuggestions] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [reverseGeocodeLoading, setReverseGeocodeLoading] = useState(false);

  const center = useMemo(
    () => ({ lat: latitude, lng: longitude }),
    [latitude, longitude],
  );

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!mapEl.current) return;
      if (!GOOGLE_MAPS_KEY) {
        setMapError("Google Maps API key is missing.");
        return;
      }
      try {
        const loader = new Loader({
          apiKey: GOOGLE_MAPS_KEY,
          version: "weekly",
          libraries: ["places"],
        });
        await loader.load();
        if (cancelled || !mapEl.current) return;
        const map = new google.maps.Map(mapEl.current, {
          center,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
        });
        mapRef.current = map;
        const marker = new google.maps.Marker({
          position: center,
          draggable: true,
          map,
        });
        markerRef.current = marker;
        const placesLibrary =
          (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
        autocompleteSuggestionRef.current = placesLibrary.AutocompleteSuggestion;
        autocompleteSessionTokenRef.current =
          new placesLibrary.AutocompleteSessionToken();
        geocoderRef.current = new google.maps.Geocoder();

        marker.addListener("dragend", (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          onCoordinateChange(lat, lng);
          reverseGeocodeFromPin(lat, lng);
        });
        map.addListener("click", (event: google.maps.MapMouseEvent) => {
          if (!event.latLng || !markerRef.current) return;
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          markerRef.current.setPosition({ lat, lng });
          onCoordinateChange(lat, lng);
          reverseGeocodeFromPin(lat, lng);
        });
      } catch {
        if (!cancelled) {
          setMapError("Could not initialize Google Maps.");
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    mapRef.current.setCenter(center);
    markerRef.current.setPosition(center);
  }, [center]);

  const extractCityState = (
    components: google.maps.GeocoderAddressComponent[],
  ): { city?: string; state?: string } => {
    let city: string | undefined;
    let state: string | undefined;
    for (const component of components) {
      const types = component.types;
      if (
        !city &&
        (types.includes("locality") ||
          types.includes("administrative_area_level_2"))
      ) {
        city = component.long_name;
      }
      if (!state && types.includes("administrative_area_level_1")) {
        state = component.long_name;
      }
    }
    return { city, state };
  };

  const reverseGeocodeFromPin = (lat: number, lng: number) => {
    const geocoder = geocoderRef.current;
    if (!geocoder) return;
    setReverseGeocodeLoading(true);
    geocoder.geocode(
      { location: { lat, lng } },
      (results, status) => {
        setReverseGeocodeLoading(false);
        if (status !== "OK" || !results || results.length === 0) return;
        const first = results[0];
        onAddressTextChange(first.formatted_address);
        const loc = extractCityState(first.address_components);
        onAddressSelect({
          displayName: first.formatted_address,
          latitude: lat,
          longitude: lng,
          city: loc.city,
          state: loc.state,
        });
      },
    );
  };

  const requestSuggestions = (input: string) => {
    const autocomplete = autocompleteSuggestionRef.current;
    if (!autocomplete || input.trim().length < 3) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      setSuggestionError(null);
      setShowNoSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    setSuggestionError(null);
    setShowNoSuggestions(false);
    if (!autocompleteSessionTokenRef.current) {
      autocompleteSessionTokenRef.current =
        new google.maps.places.AutocompleteSessionToken();
    }
    autocomplete
      .fetchAutocompleteSuggestions({
        input: input.trim(),
        includedRegionCodes: ["ng"],
        region: "ng",
        language: "en",
        sessionToken: autocompleteSessionTokenRef.current,
      })
      .then((result) => {
        const mapped =
          result.suggestions
            ?.map((item) => item.placePrediction)
            .filter(
              (prediction): prediction is google.maps.places.PlacePrediction =>
                Boolean(prediction),
            )
            .map((prediction) => ({
              placeId: prediction.placeId,
              mainText: prediction.mainText?.text ?? prediction.text.text,
              secondaryText: prediction.secondaryText?.text ?? "",
              displayName: prediction.text.text,
              prediction,
            })) ?? [];
        setSuggestions(mapped);
        setLoadingSuggestions(false);
        setSuggestionError(null);
        setShowNoSuggestions(mapped.length === 0);
      })
      .catch(() => {
        setSuggestions([]);
        setLoadingSuggestions(false);
        setSuggestionError("Could not load suggestions.");
        setShowNoSuggestions(false);
      });
  };

  const onQueryChanged = (value: string) => {
    onAddressTextChange(value);
    setSuggestionError(null);
    setShowNoSuggestions(false);
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      requestSuggestions(value);
    }, SUGGESTION_DEBOUNCE_MS);
  };

  const selectSuggestion = (item: Suggestion) => {
    if (!mapRef.current || !markerRef.current) return;
    const place = item.prediction.toPlace();
    place
      .fetchFields({
        fields: [
          "displayName",
          "formattedAddress",
          "location",
          "addressComponents",
        ],
      })
      .then(() => {
        const location = place.location;
        if (!location) {
          setSuggestionError("Selected place has no coordinates.");
          return;
        }
        const lat = location.lat();
        const lng = location.lng();
        mapRef.current?.panTo({ lat, lng });
        mapRef.current?.setZoom(15);
        markerRef.current?.setPosition({ lat, lng });
        onCoordinateChange(lat, lng);
        const formattedAddress = place.formattedAddress ?? item.displayName;
        onAddressTextChange(formattedAddress);
        const geocoderComponents = (place.addressComponents ?? []).map(
          (component) =>
            ({
              long_name: component.longText,
              short_name: component.shortText,
              types: component.types,
            }) as google.maps.GeocoderAddressComponent,
        );
        const loc = extractCityState(geocoderComponents);
        onAddressSelect({
          displayName:
            place.displayName ?? place.formattedAddress ?? item.displayName,
          latitude: lat,
          longitude: lng,
          city: loc.city,
          state: loc.state,
        });
        autocompleteSessionTokenRef.current =
          new google.maps.places.AutocompleteSessionToken();
        setSuggestions([]);
        setShowNoSuggestions(false);
        setSuggestionError(null);
      })
      .catch(() => {
        setSuggestionError("Could not load place details.");
      });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-foreground">
          Search Farm Location
        </label>
        <p className="text-xs text-muted-foreground">
          Search for your farm address, select a suggestion, or drag the pin on the map to set the exact location.
        </p>
      </div>
      <Input
        value={addressText}
        onChange={(event) => onQueryChanged(event.target.value)}
        placeholder="Search seller/farm location"
      />
      {loadingSuggestions && (
        <p className="text-xs text-muted-foreground">Loading suggestions...</p>
      )}
      {!loadingSuggestions &&
        suggestionError == null &&
        showNoSuggestions &&
        suggestions.length === 0 && (
          <p className="text-xs text-muted-foreground">No suggestions found.</p>
        )}
      {suggestionError && (
        <p className="text-xs text-destructive">{suggestionError}</p>
      )}
      {suggestions.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-card">
          {suggestions.map((item) => (
            <button
              key={item.placeId}
              type="button"
              className="w-full border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-muted/50"
              onClick={() => selectSuggestion(item)}
            >
              <p className="text-sm font-medium text-foreground">
                {item.mainText}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.secondaryText}
              </p>
            </button>
          ))}
        </div>
      )}
      {mapError ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {mapError}
        </div>
      ) : (
        <div
          ref={mapEl}
          className="h-64 overflow-hidden rounded-lg border border-border"
        />
      )}
      {reverseGeocodeLoading && (
        <p className="text-xs text-muted-foreground">
          Updating address from selected pin...
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Select a suggestion, or click/drag pin for manual adjustment.
      </p>
    </div>
  );
}

