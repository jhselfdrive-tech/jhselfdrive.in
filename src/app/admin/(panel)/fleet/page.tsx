import Link from "next/link";
import { AlertTriangle, CarFront, Filter, Gauge, Plus, ShieldCheck } from "lucide-react";
import { VehicleForm } from "@/components/admin/VehicleForm";
import { site } from "@/content/site";
import { listVehicles } from "@/lib/admin/fleet";

export const dynamic = "force-dynamic";

export default async function FleetPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const status = typeof raw.status === "string" ? raw.status : "all";
  const category = typeof raw.category === "string" ? raw.category : "all";
  const vehicles = await listVehicles({ status, category });

  return <>
    <div className="admin-page-head">
      <div><span className="admin-overline">Physical fleet</span><h1>Every car, accounted for.</h1><p>Availability, compliance and current rental status in one place.</p></div>
      <div className="admin-head-actions"><a className="admin-primary-button" href="#add-vehicle"><Plus size={15} /> Add vehicle</a></div>
    </div>
    <form className="admin-filters">
      <div className="admin-filter"><label htmlFor="fleet-status">Status</label><select id="fleet-status" name="status" defaultValue={status}><option value="all">All statuses</option><option value="active">Active</option><option value="maintenance">Maintenance</option><option value="retired">Retired</option><option value="sold">Sold</option></select></div>
      <div className="admin-filter"><label htmlFor="fleet-category">Category</label><select id="fleet-category" name="category" defaultValue={category}><option value="all">All categories</option>{site.fleet.map((car) => <option value={car.slug} key={car.slug}>{car.name}</option>)}</select></div>
      <button className="admin-primary-button" type="submit"><Filter size={14} /> Apply filters</button>
    </form>
    <div className="admin-fleet-grid">
      {vehicles.map((vehicle) => {
        const current = vehicle.currentBooking;
        const customer = current && (Array.isArray(current.customer) ? current.customer[0] : current.customer);
        return <Link className="admin-vehicle-card" href={`/admin/fleet/${vehicle.id}`} key={vehicle.id}>
          <div className="admin-vehicle-card-top"><span className="admin-vehicle-icon"><CarFront size={21} /></span><span className={`admin-fleet-status admin-fleet-${vehicle.status}`}>{vehicle.status}</span></div>
          <h2>{vehicle.display_name || vehicle.model || vehicle.registration_number}</h2>
          <strong className="admin-registration">{vehicle.registration_number}</strong>
          <span className="admin-vehicle-category">{site.fleet.find((car) => car.slug === vehicle.category_slug)?.name || vehicle.category_slug}</span>
          <div className="admin-vehicle-meta"><span><Gauge size={14} /> {vehicle.odometer_km?.toLocaleString("en-IN") || "—"} km</span><span><ShieldCheck size={14} /> {vehicle.documentAlerts.length ? `${vehicle.documentAlerts.length} warning${vehicle.documentAlerts.length === 1 ? "" : "s"}` : "Documents clear"}</span></div>
          {current ? <div className="admin-current-rental"><span>Currently out</span><strong>{customer?.full_name || customer?.phone || "Customer"}</strong><small>Returns {new Date(current.end_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</small></div> : <div className="admin-current-rental admin-current-free"><span>Current status</span><strong>{vehicle.status === "active" ? "Available now" : vehicle.status}</strong></div>}
          {vehicle.documentAlerts.some((alert) => alert.days_remaining < 0) ? <span className="admin-card-warning"><AlertTriangle size={13} /> Expired document</span> : null}
        </Link>;
      })}
      {!vehicles.length ? <div className="admin-empty admin-card">No vehicles match this view.</div> : null}
    </div>
    <section id="add-vehicle" className="admin-fleet-form-section"><VehicleForm /></section>
  </>;
}
