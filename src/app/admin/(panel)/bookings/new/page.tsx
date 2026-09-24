import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BookingForm } from '@/components/admin/BookingForm';
import { initialBookingWindow } from '@/lib/bookings/admin-form';
import { verifyAdmin } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export default async function NewBookingPage() {
  await verifyAdmin();
  return <>
    <div className="admin-page-head">
      <div><span className="admin-overline">Rental records</span><h1>New booking</h1><p>Record a walk-in or phone booking for a new or existing customer.</p></div>
      <Link className="admin-secondary-button" href="/admin/bookings"><ArrowLeft size={14} /> Back to bookings</Link>
    </div>
    <BookingForm initialWindow={initialBookingWindow()} />
  </>;
}
