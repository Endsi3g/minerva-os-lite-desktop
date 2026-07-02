import type { Metadata } from 'next';
import { NotificationsRoot } from './_components/notifications-root';

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'Centre de notifications',
};

export default function NotificationsPage() {
  return <NotificationsRoot />;
}
