"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import api from "@/lib/api";

const DriverMap = dynamic(() => import("./DriverMap"), {
  ssr: false,
});

export default function MapPage() {
  const [drivers, setDrivers] = useState([]);

  async function fetchDrivers() {
    try {
      const response = await api.get("/drivers/live");
      setDrivers(response.data);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    fetchDrivers();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Live Driver Map</h1>

      <DriverMap drivers={drivers} />
    </div>
  );
}
