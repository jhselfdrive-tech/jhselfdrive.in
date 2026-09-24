"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { site } from "@/content/site";
import { adminBookingInput } from "@/lib/bookings/admin-form";
import { istTimestamp } from "@/lib/validation";
import { formatInr } from "@/lib/messages/format";

type Vehicle = { id: string; registrationNumber: string; displayName: string | null; model: string | null };
type Customer = { id: string; fullName: string | null; phone: string };
type Quote = { days: number; dayRate: number; amountTotal: number; deposit: number };
type Result<T> = { key: string; data?: T; error?: string };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/ops/${path}`, { ...options, credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status}). Please try again.`);
  if (!data) throw new Error("The server returned an empty response. Please try again.");
  return data as T;
}

export function BookingForm({ customerId, initialWindow }: { customerId?: string; initialWindow: { startAt: string; endAt: string } }) {
  const router = useRouter();
  const prefix = useId();
  const field = (name: string) => `${prefix}-${name}`;
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [createdId, setCreatedId] = useState("");
  const [customerMode, setCustomerMode] = useState("new");
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [customers, setCustomers] = useState<Result<Customer[]>>({ key: "" });
  const [category, setCategory] = useState("");
  const [startAt, setStartAt] = useState(initialWindow.startAt);
  const [endAt, setEndAt] = useState(initialWindow.endAt);
  const [vehicleId, setVehicleId] = useState("");
  const [retry, setRetry] = useState(0);
  const [availability, setAvailability] = useState<Result<Vehicle[]>>({ key: "" });
  const [pricing, setPricing] = useState<Result<Quote>>({ key: "" });
  const [overrideAmount, setOverrideAmount] = useState(false);
  const [overrideDeposit, setOverrideDeposit] = useState(false);
  const [amount, setAmount] = useState("");
  const [deposit, setDeposit] = useState("");
  const validRange = Boolean(startAt && endAt && endAt > startAt);
  const rangeKey = JSON.stringify([startAt, endAt, category, retry]);
  const vehicles = availability.key === rangeKey ? availability.data : undefined;
  const selectedVehicle = vehicles?.some(v => v.id === vehicleId) ? vehicleId : "";
  const quoteKey = JSON.stringify([rangeKey, selectedVehicle]);
  const quote = selectedVehicle && pricing.key === quoteKey ? pricing.data : undefined;
  const availabilityError = availability.key === rangeKey ? availability.error : undefined;
  const quoteError = pricing.key === quoteKey ? pricing.error : undefined;
  const customerKey = JSON.stringify([search, retry]);
  const matches = customers.key === customerKey ? customers.data : undefined;
  const existingCustomer = matches?.some(c => c.id === selectedCustomer) ? selectedCustomer : "";
  const loadingVehicles = validRange && availability.key !== rangeKey;
  const loadingQuote = Boolean(selectedVehicle && pricing.key !== quoteKey);

  useEffect(() => {
    if (!validRange) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ startAt: istTimestamp(startAt), endAt: istTimestamp(endAt), ...(category ? { categorySlug: category } : {}) });
    request<{ vehicles: Vehicle[] }>(`vehicles/available?${query}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setAvailability({ key: rangeKey, data: data.vehicles }); })
      .catch(error => { if (!controller.signal.aborted) setAvailability({ key: rangeKey, error: error.message }); });
    return () => controller.abort();
  }, [startAt, endAt, category, rangeKey, validRange]);

  useEffect(() => {
    if (!selectedVehicle || !validRange) return;
    const controller = new AbortController();
    request<Quote>("quote", { method: "POST", signal: controller.signal, body: JSON.stringify({ vehicleId: selectedVehicle, startAt: istTimestamp(startAt), endAt: istTimestamp(endAt) }) })
      .then(data => { if (!controller.signal.aborted) setPricing({ key: quoteKey, data }); })
      .catch(error => { if (!controller.signal.aborted) setPricing({ key: quoteKey, error: error.message }); });
    return () => controller.abort();
  }, [selectedVehicle, startAt, endAt, quoteKey, validRange]);

  useEffect(() => {
    if (customerId || customerMode !== "existing") return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      request<{ customers: Customer[] }>(`customers?${new URLSearchParams({ search })}`, { signal: controller.signal })
        .then(data => { if (!controller.signal.aborted) setCustomers({ key: customerKey, data: data.customers }); })
        .catch(error => { if (!controller.signal.aborted) setCustomers({ key: customerKey, error: error.message }); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [customerId, customerMode, search, customerKey]);

  function resetOverrides() { setOverrideAmount(false); setOverrideDeposit(false); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || createdId || !quote || !validRange || !selectedVehicle) return;
    if (!customerId && customerMode === "existing" && !existingCustomer) return;
    const body = adminBookingInput(new FormData(event.currentTarget));
    submitting.current = true; setBusy(true); setMessage("");
    try {
      const result = await request<{ bookingId: string }>("bookings", { method: "POST", body: JSON.stringify(body) });
      setCreatedId(result.bookingId);
      router.push(`/admin/bookings/${result.bookingId}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the booking.");
      setRetry(value => value + 1);
    } finally { submitting.current = false; setBusy(false); }
  }

  return <form className="admin-form-card" onSubmit={save}>
    <h2>Record a booking</h2>
    <p>Pickup and return times are in India Standard Time (IST). Rental days use 24-hour periods.</p>
    <fieldset className="admin-booking-fields" disabled={busy || Boolean(createdId)}>
      {customerId ? <input type="hidden" name="customerId" value={customerId} /> : <>
        <h3 className="admin-modal-section">Customer</h3>
        <div className="admin-form-grid">
          <div className="admin-field admin-field-full"><label htmlFor={field("mode")}>Customer type</label><select id={field("mode")} value={customerMode} onChange={event => setCustomerMode(event.target.value)}><option value="new">New customer</option><option value="existing">Existing customer</option></select></div>
          {customerMode === "new" ? <>
            <div className="admin-field"><label htmlFor={field("name")}>Full name</label><input id={field("name")} name="fullName" autoComplete="name" minLength={2} maxLength={120} required /></div>
            <div className="admin-field"><label htmlFor={field("phone")}>Mobile / WhatsApp number</label><input id={field("phone")} name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder="+91 98765 43210" aria-describedby={field("phone-help")} required /><small id={field("phone-help")}>Indian mobiles: 10 digits. International numbers: include the country code, e.g. +971 50 180 1938.</small></div>
            <div className="admin-field admin-field-full"><label htmlFor={field("city")}>City</label><input id={field("city")} name="city" autoComplete="address-level2" maxLength={100} defaultValue="Ramanathapuram" /></div>
          </> : <>
            <div className="admin-field admin-field-full"><label htmlFor={field("search")}>Find customer by name or phone</label><input id={field("search")} type="search" maxLength={100} value={search} onChange={event => { setSearch(event.target.value); setSelectedCustomer(""); }} placeholder="Search customers" /></div>
            <div className="admin-field admin-field-full"><label htmlFor={field("customer")}>Customer</label><select id={field("customer")} name="customerId" required value={existingCustomer} disabled={!matches} onChange={event => setSelectedCustomer(event.target.value)}><option value="">{!matches ? "Loading customers…" : "Choose a customer"}</option>{matches?.map(customer => <option key={customer.id} value={customer.id}>{customer.fullName || "Unnamed customer"} · {customer.phone}</option>)}</select>
              {customers.key === customerKey && customers.error ? <p className="admin-form-error" role="alert">{customers.error} <button type="button" className="admin-secondary-button" onClick={() => setRetry(value => value + 1)}>Retry</button></p> : matches?.length === 0 ? <small>No matching customers. Change the search or choose New customer.</small> : null}
            </div>
          </>}
        </div>
      </>}
      <h3 className="admin-modal-section">Trip and vehicle</h3>
      <div className="admin-form-grid">
        <div className="admin-field"><label htmlFor={field("start")}>Pickup date &amp; time (IST)</label><input id={field("start")} type="datetime-local" name="startAt" value={startAt} onChange={event => { setStartAt(event.target.value); resetOverrides(); }} required /></div>
        <div className="admin-field"><label htmlFor={field("end")}>Return date &amp; time (IST)</label><input id={field("end")} type="datetime-local" name="endAt" value={endAt} min={startAt} onChange={event => { setEndAt(event.target.value); resetOverrides(); }} required /></div>
        {!validRange ? <p className="admin-form-error admin-field-full" role="alert">Return must be after pickup.</p> : null}
        <div className="admin-field"><label htmlFor={field("category")}>Vehicle category</label><select id={field("category")} value={category} onChange={event => { setCategory(event.target.value); setVehicleId(""); resetOverrides(); }}><option value="">All categories</option>{site.fleet.map(car => <option value={car.slug} key={car.slug}>{car.name}</option>)}</select></div>
        <div className="admin-field"><label htmlFor={field("vehicle")}>Available vehicle</label><select id={field("vehicle")} name="vehicleId" value={selectedVehicle} onChange={event => { setVehicleId(event.target.value); resetOverrides(); }} disabled={!validRange || loadingVehicles || !vehicles?.length} required><option value="">{loadingVehicles ? "Checking availability…" : "Choose an available vehicle"}</option>{vehicles?.map(vehicle => <option value={vehicle.id} key={vehicle.id}>{vehicle.displayName || vehicle.model || vehicle.registrationNumber} · {vehicle.registrationNumber}</option>)}</select>{validRange && vehicles?.length === 0 ? <small>No vehicles available for this time window.</small> : null}</div>
      </div>
      {availabilityError || (selectedVehicle && quoteError) ? <p className="admin-form-error" role="alert">{availabilityError || quoteError} <button type="button" className="admin-secondary-button" onClick={() => setRetry(value => value + 1)}>Retry</button></p> : null}
      <h3 className="admin-modal-section">Price</h3>
      <div aria-live="polite">
        {loadingQuote ? <p><LoaderCircle size={15} className="animate-spin" /> Updating quote…</p> : quote ? <p className="admin-booking-quote"><strong>{quote.days} rental day{quote.days === 1 ? "" : "s"} × {formatInr(quote.dayRate)} = {formatInr(quote.amountTotal)}</strong><span>Refundable deposit: {formatInr(quote.deposit)}</span></p> : <p>Choose an available vehicle to see its price.</p>}
      </div>
      {quote ? <div className="admin-form-grid">
        <div className="admin-field admin-field-checkbox"><label><input type="checkbox" name="overrideAmount" checked={overrideAmount} onChange={event => { setOverrideAmount(event.target.checked); setAmount(String(quote.amountTotal)); }} /> Override rental total</label>{overrideAmount ? <><label htmlFor={field("amount")}>Rental total (₹)</label><input id={field("amount")} name="amountTotal" type="number" min="0" max="10000000" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} required /></> : null}</div>
        <div className="admin-field admin-field-checkbox"><label><input type="checkbox" name="overrideDeposit" checked={overrideDeposit} onChange={event => { setOverrideDeposit(event.target.checked); setDeposit(String(quote.deposit)); }} /> Override deposit</label>{overrideDeposit ? <><label htmlFor={field("deposit")}>Deposit (₹)</label><input id={field("deposit")} name="deposit" type="number" min="0" max="10000000" step="0.01" value={deposit} onChange={event => setDeposit(event.target.value)} required /></> : null}</div>
      </div> : null}
      <h3 className="admin-modal-section">Booking details</h3>
      <div className="admin-form-grid">
        <div className="admin-field admin-field-full"><label htmlFor={field("status")}>Status</label><select id={field("status")} name="status" defaultValue="approved"><option value="approved">Approved</option><option value="confirmed">Confirmed</option><option value="ongoing">On trip</option><option value="completed">Completed</option></select></div>
        <div className="admin-field admin-field-full"><label htmlFor={field("notes")}>Notes</label><textarea id={field("notes")} name="notes" maxLength={4000} placeholder="Pickup details or special requests…" /></div>
      </div>
      {message ? <p className="admin-form-error" role="alert">{message}</p> : null}
      <div className="admin-form-actions"><button className="admin-primary-button" disabled={busy || !quote || !validRange || (!customerId && customerMode === "existing" && !existingCustomer)} type="submit">{busy ? <><LoaderCircle size={15} className="animate-spin" /> Saving…</> : <>Create booking <ArrowRight size={15} /></>}</button></div>
    </fieldset>
    {createdId ? <p className="admin-form-success" role="status">Booking created. <Link href={`/admin/bookings/${createdId}`}>Open booking</Link></p> : null}
  </form>;
}
