"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Driver = {
  id: string;
  name: string;
  phone: string;
  vehicleName: string;
  vehicleNumber: string;
  status: string;
  latitude: number;
  longitude: number;
};

interface Props {
  drivers: Driver[];
}

export default function DriverMap({ drivers }: Props) {
  return (
    <MapContainer
      center={[51.5074, -0.1278]}
      zoom={12}
      style={{
        height: "700px",
        width: "100%",
      }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {drivers
        .filter((driver) => driver.latitude && driver.longitude)
        .map((driver) => (
          <Marker
            key={driver.id}
            position={[driver.latitude, driver.longitude]}
          >
            <Popup>
              <strong>{driver.name}</strong>
              <br />
              {driver.vehicleName}
              <br />
              {driver.vehicleNumber}
              <br />
              Status: {driver.status}
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
