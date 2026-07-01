import dynamic from 'next/dynamic';

const BookingClient = dynamic(() => import('./booking-client'));

export function generateStaticParams() { return []; }

export default function Page() { return <BookingClient />; }
