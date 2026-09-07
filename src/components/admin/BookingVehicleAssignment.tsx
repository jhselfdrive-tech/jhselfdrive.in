"use client";

import { useActionState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { assignVehicleAction, type FleetActionState } from "@/app/admin/actions/fleet";
import { VehicleSelect } from "./VehicleSelect";

function toLocalInput(iso: string) {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  return formatter.format(new Date(iso)).replace(" ", "T");
}

export function BookingVehicleAssignment({
  bookingId,
  categorySlug,
  startAt,
  endAt,
  vehicleId,
}: {
  bookingId: string;
  categorySlug: string;
  startAt: string;
  endAt: string;
  vehicleId?: string | null;
}) {
  const [state, action, pending] = useActionState(assignVehicleAction, {} as FleetActionState);
  return <form action={action} className="admin-assignment-form">
    <input type="hidden" name="bookingId" value={bookingId} />
    <VehicleSelect
      categorySlug={categorySlug}
      startAt={toLocalInput(startAt)}
      endAt={toLocalInput(endAt)}
      defaultVehicleId={vehicleId || ""}
      excludeBookingId={bookingId}
    />
    <button className="admin-primary-button" type="submit" disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin" size={14} /> : <Check size={14} />} Save assignment
    </button>
    {state.message ? <small className={state.success ? "admin-field-success" : "admin-field-warning"}>{state.message}</small> : null}
  </form>;
}
