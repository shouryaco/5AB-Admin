"use client";

import { Loader2, MapPin, Route, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type ViaStop = {
  id: string;
  address: string;
};

type Coordinate = {
  latitude: number;
  longitude: number;
};

type SelectedCoordinate = Coordinate & {
  address: string;
};

type PhotonFeature = {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    name?: string;
    housenumber?: string;
    street?: string;
    locality?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

type Suggestion = Coordinate & {
  id: string;
  label: string;
};

type OsrmResponse = {
  code?: string;
  routes?: Array<{
    distance: number;
    duration: number;
  }>;
};

type BookingRoutePlannerProps = {
  pickupAddress: string;
  dropoffAddress: string;
  vias: ViaStop[];
  routeDistanceMeters: string;
  routeDurationSeconds: string;
  onPickupAddressChange: (value: string) => void;
  onDropoffAddressChange: (value: string) => void;
  onViaAddressChange: (id: string, value: string) => void;
  onRemoveVia: (id: string) => void;
  onRouteCalculated: (result: {
    distanceMeters: number;
    durationSeconds: number;
  }) => void;
};

const LONDON_BIAS = {
  latitude: 51.5074,
  longitude: -0.1278,
};

export default function BookingRoutePlanner({
  pickupAddress,
  dropoffAddress,
  vias,
  routeDistanceMeters,
  routeDurationSeconds,
  onPickupAddressChange,
  onDropoffAddressChange,
  onViaAddressChange,
  onRemoveVia,
  onRouteCalculated,
}: BookingRoutePlannerProps) {
  const [pickupCoordinate, setPickupCoordinate] =
    useState<SelectedCoordinate | null>(null);
  const [dropoffCoordinate, setDropoffCoordinate] =
    useState<SelectedCoordinate | null>(null);
  const [viaCoordinates, setViaCoordinates] = useState<
    Record<string, SelectedCoordinate>
  >({});

  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  useEffect(() => {
    setViaCoordinates((current) => {
      const next: Record<string, SelectedCoordinate> = {};

      for (const via of vias) {
        if (current[via.id]) {
          next[via.id] = current[via.id];
        }
      }

      return next;
    });
  }, [vias]);

  const routeReady =
    pickupAddress.trim().length > 0 && dropoffAddress.trim().length > 0;

  const distanceLabel = useMemo(() => {
    const meters = Number(routeDistanceMeters);

    if (!Number.isFinite(meters) || meters <= 0) {
      return "—";
    }

    const miles = meters / 1609.344;
    const km = meters / 1000;

    return `${miles.toFixed(1)} miles (${km.toFixed(1)} km)`;
  }, [routeDistanceMeters]);

  const durationLabel = useMemo(() => {
    const seconds = Number(routeDurationSeconds);

    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "—";
    }

    const totalMinutes = Math.max(1, Math.round(seconds / 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
  }, [routeDurationSeconds]);

  async function calculateRoute() {
    setRouteError("");

    if (!pickupAddress.trim() || !dropoffAddress.trim()) {
      setRouteError("Enter both a pick-up and drop-off address first.");
      return;
    }

    try {
      setRouteLoading(true);

      const pickup = await resolveCoordinate(pickupAddress, pickupCoordinate);

      const resolvedVias: Coordinate[] = [];

      for (const via of vias) {
        if (!via.address.trim()) {
          continue;
        }

        const selected = viaCoordinates[via.id] || null;
        const coordinate = await resolveCoordinate(via.address, selected);

        resolvedVias.push(coordinate);
      }

      const dropoff = await resolveCoordinate(
        dropoffAddress,
        dropoffCoordinate,
      );

      const points = [pickup, ...resolvedVias, dropoff];

      const coordinates = points
        .map((point) => `${point.longitude},${point.latitude}`)
        .join(";");

      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false&steps=false&alternatives=false`,
      );

      if (!response.ok) {
        throw new Error("Routing service returned an error.");
      }

      const data = (await response.json()) as OsrmResponse;
      const route = data.routes?.[0];

      if (data.code !== "Ok" || !route) {
        throw new Error(
          "No drivable route could be found for these addresses.",
        );
      }

      onRouteCalculated({
        distanceMeters: Math.round(route.distance),
        durationSeconds: Math.round(route.duration),
      });
    } catch (error) {
      console.error("Unable to calculate route:", error);

      setRouteError(
        error instanceof Error
          ? error.message
          : "Unable to calculate the route right now.",
      );
    } finally {
      setRouteLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
      <div className="space-y-4">
        <AddressAutocomplete
          label="Pick-Up"
          required
          value={pickupAddress}
          placeholder="Start typing a pickup address..."
          pinClassName="text-emerald-600"
          onChange={(value) => {
            setPickupCoordinate(null);
            setRouteError("");
            onPickupAddressChange(value);
          }}
          onSelect={(suggestion) => {
            setPickupCoordinate({
              address: suggestion.label,
              latitude: suggestion.latitude,
              longitude: suggestion.longitude,
            });
            setRouteError("");
            onPickupAddressChange(suggestion.label);
          }}
        />

        {vias.map((via, index) => (
          <div
            key={via.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">
                Via {index + 1}
              </label>

              <button
                type="button"
                onClick={() => {
                  setViaCoordinates((current) => {
                    const next = { ...current };
                    delete next[via.id];
                    return next;
                  });
                  setRouteError("");
                  onRemoveVia(via.id);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50"
              >
                <Trash2 size={13} />
                Remove
              </button>
            </div>

            <AddressAutocomplete
              label=""
              value={via.address}
              placeholder={`Start typing via stop ${index + 1}...`}
              pinClassName="text-amber-500"
              onChange={(value) => {
                setViaCoordinates((current) => {
                  const next = { ...current };
                  delete next[via.id];
                  return next;
                });
                setRouteError("");
                onViaAddressChange(via.id, value);
              }}
              onSelect={(suggestion) => {
                setViaCoordinates((current) => ({
                  ...current,
                  [via.id]: {
                    address: suggestion.label,
                    latitude: suggestion.latitude,
                    longitude: suggestion.longitude,
                  },
                }));
                setRouteError("");
                onViaAddressChange(via.id, suggestion.label);
              }}
            />
          </div>
        ))}

        <AddressAutocomplete
          label="Drop Off"
          required
          value={dropoffAddress}
          placeholder="Start typing a drop-off address..."
          pinClassName="text-red-500"
          onChange={(value) => {
            setDropoffCoordinate(null);
            setRouteError("");
            onDropoffAddressChange(value);
          }}
          onSelect={(suggestion) => {
            setDropoffCoordinate({
              address: suggestion.label,
              latitude: suggestion.latitude,
              longitude: suggestion.longitude,
            });
            setRouteError("");
            onDropoffAddressChange(suggestion.label);
          }}
        />
      </div>

      <div className="mt-5 border-t border-slate-200 pt-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <RouteMetric label="Route Distance" value={distanceLabel} />
            <RouteMetric label="Route Duration" value={durationLabel} />
          </div>

          <button
            type="button"
            onClick={calculateRoute}
            disabled={!routeReady || routeLoading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {routeLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Route size={16} />
            )}
            {routeLoading ? "Calculating..." : "Calculate Route"}
          </button>
        </div>

        {routeError && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {routeError}
          </div>
        )}

        <p className="mt-3 text-[11px] leading-5 text-slate-400">
          Demo route search uses OpenStreetMap data via Photon and road routing
          via OSRM. © OpenStreetMap contributors. We will move this behind the
          5AB backend / production provider before launch.
        </p>
      </div>
    </div>
  );
}

function AddressAutocomplete({
  label,
  required = false,
  value,
  placeholder,
  pinClassName,
  onChange,
  onSelect,
}: {
  label: string;
  required?: boolean;
  value: string;
  placeholder: string;
  pinClassName: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: Suggestion) => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const requestIdRef = useRef(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const trimmed = value.trim();

    if (trimmed.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          q: trimmed,
          limit: "6",
          lang: "en",
          countrycode: "GB",
          lat: String(LONDON_BIAS.latitude),
          lon: String(LONDON_BIAS.longitude),
          zoom: "10",
        });

        const response = await fetch(
          `https://photon.komoot.io/api/?${params.toString()}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Address search failed.");
        }

        const data = (await response.json()) as PhotonResponse;

        if (requestId !== requestIdRef.current) {
          return;
        }

        const next = (data.features || [])
          .map(featureToSuggestion)
          .filter((item): item is Suggestion => Boolean(item));

        setSuggestions(next);
        setActiveIndex(-1);
        setOpen(true);
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          return;
        }

        console.error("Address autocomplete failed:", error);

        if (requestId === requestIdRef.current) {
          setSuggestions([]);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        wrapperRef.current &&
        event.target instanceof Node &&
        !wrapperRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  function selectSuggestion(suggestion: Suggestion) {
    setOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
    onSelect(suggestion);
  }

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        {/*
          booking-input uses a padding shorthand in the parent booking pages.
          Inline left/right padding here intentionally overrides that shorthand so
          the route icons always have their own space and never overlap the text.
        */}
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 z-10 flex w-12 items-center justify-center ${pinClassName}`}
          aria-hidden="true"
        >
          <MapPin size={18} strokeWidth={2} />
        </div>

        <input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length) {
              setOpen(true);
            }
          }}
          onKeyDown={(event) => {
            if (!open || !suggestions.length) {
              return;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((current) =>
                Math.min(current + 1, suggestions.length - 1),
              );
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, 0));
            }

            if (event.key === "Enter" && activeIndex >= 0) {
              event.preventDefault();
              selectSuggestion(suggestions[activeIndex]);
            }

            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          autoComplete="off"
          className="booking-input"
          style={{ paddingLeft: "3rem", paddingRight: "3rem" }}
          placeholder={placeholder}
        />

        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-12 items-center justify-center text-slate-400"
          aria-hidden="true"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} strokeWidth={2} />
          )}
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(suggestion)}
              className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-0 ${
                index === activeIndex ? "bg-slate-100" : "hover:bg-slate-50"
              }`}
            >
              <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
              <span className="text-sm leading-5 text-slate-700">
                {suggestion.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RouteMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

async function resolveCoordinate(
  address: string,
  selected: SelectedCoordinate | null,
): Promise<Coordinate> {
  if (selected && selected.address === address.trim()) {
    return {
      latitude: selected.latitude,
      longitude: selected.longitude,
    };
  }

  const params = new URLSearchParams({
    q: address.trim(),
    limit: "1",
    lang: "en",
    countrycode: "GB",
    lat: String(LONDON_BIAS.latitude),
    lon: String(LONDON_BIAS.longitude),
    zoom: "10",
  });

  const response = await fetch(
    `https://photon.komoot.io/api/?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Unable to locate: ${address}`);
  }

  const data = (await response.json()) as PhotonResponse;
  const suggestion = data.features?.map(featureToSuggestion).find(Boolean);

  if (!suggestion) {
    throw new Error(`No location found for: ${address}`);
  }

  return {
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
  };
}

function featureToSuggestion(feature: PhotonFeature): Suggestion | null {
  const coordinates = feature.geometry?.coordinates;

  if (!coordinates || coordinates.length < 2) {
    return null;
  }

  const [longitude, latitude] = coordinates;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const properties = feature.properties || {};

  const streetLine = [properties.housenumber, properties.street]
    .filter(Boolean)
    .join(" ")
    .trim();

  const parts = [
    properties.name,
    streetLine,
    properties.locality,
    properties.district,
    properties.city,
    properties.county,
    properties.state,
    properties.postcode,
    properties.country,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  const uniqueParts = parts.filter(
    (part, index) =>
      parts.findIndex((item) => item.toLowerCase() === part.toLowerCase()) ===
      index,
  );

  const label = uniqueParts.join(", ");

  if (!label) {
    return null;
  }

  return {
    id: `${longitude}-${latitude}-${label}`,
    label,
    latitude,
    longitude,
  };
}
