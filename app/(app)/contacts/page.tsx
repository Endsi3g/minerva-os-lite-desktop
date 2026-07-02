import type { Metadata } from 'next';
import { ContactsRoot } from './_components/contacts-root';

export const metadata: Metadata = {
  title: 'Contacts',
  description: 'Annuaire des contacts',
};

export default function ContactsPage() {
  return <ContactsRoot />;
}
