import { redirect } from 'next/navigation';

export default function CockpitPage() {
  redirect('/today?tab=pilotage');
}
