"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { getAvailableVehiclesAction } from "@/app/admin/actions/fleet";
import type { AvailableVehicle } from "@/lib/admin/fleet";

export function VehicleSelect({
  categorySlug,
  startAt,
  endAt,
  defaultVehicleId = "",
  excludeBookingId = "",
}: {
  categorySlug: string;
  startAt: string;
  endAt: string;
  defaultVehicleId?: string;
  excludeBookingId?: string;
}) {
  const [vehicles, setVehicles] = useState<AvailableVehicle[]>([]);
  const [selected, setSelected] = useState(defaultVehicleId);
  const [message, setMessage] = useState("");
  const [resolvedKey, setResolvedKey] = useState("");
  const validRange = Boolean(categorySlug && startAt && endAt && endAt > startAt);
  const requestKey = `${categorySlug}|${startAt}|${endAt}|${excludeBookingId}`;
  const loading = validRange && resolvedKey !== requestKey;

  useEffect(() => {
    let active = true;
    if (!validRange) return () => { active = false; };
    getAvailableVehiclesAction({ categorySlug, startAt, endAt, excludeBookingId }).then((result) => {
      if (!active) return;
      setVehicles(result.vehicles);
      setMessage(result.message);
      setSelected((current) => current && result.vehicles.some((vehicle) => vehicle.id === current) ? current : "");
      setResolvedKey(requestKey);
    });
    return () => { active = false; };
  }, [categorySlug, startAt, endAt, excludeBookingId, requestKey, validRange]);

  return <div className="admin-field admin-field-full">
    <label htmlFor={`vehicle-${excludeBookingId || "new"}`}>Physical vehicle <span className="admin-optional">Optional</span></label>
    <div className="admin-select-loading">
      <select
        id={`vehicle-${excludeBookingId || "new"}`}
        name="vehicleId"
        value={validRange ? selected : ""}
        onChange={(event) => setSelected(event.target.value)}
        disabled={loading || !validRange}
      >
        <option value="">Leave unassigned</option>
        {vehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>
          {vehicle.display_name || vehicle.model || vehicle.registration_number} · {vehicle.registration_number}
        </option>)}
      </select>
      {loading ? <LoaderCircle className="animate-spin" size={16} aria-label="Checking availability" /> : null}
    </div>
    <small className={(message && !vehicles.length) || !validRange ? "admin-field-warning" : "admin-field-help"}>{!validRange ? "Choose valid pickup and return times to see available cars." : message || `${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"} free for this exact time window.`}</small>
  </div>;
}
