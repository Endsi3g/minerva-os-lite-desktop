/*
 * Services & Tarifs page
 *
 * Supabase SQL to run manually before using this page:
 *
 *   CREATE TABLE IF NOT EXISTS services (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id uuid REFERENCES auth.users(id),
 *     workspace_id text,
 *     name text NOT NULL,
 *     price numeric,
 *     type text DEFAULT 'digital',
 *     description text,
 *     created_at timestamptz DEFAULT now(),
 *     updated_at timestamptz DEFAULT now()
 *   );
 *   ALTER TABLE services ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "Users manage own services" ON services
 *     FOR ALL TO authenticated USING (auth.uid() = user_id);
 */

import ServicesRoot from './_components/services-root';

export const metadata = { title: 'Services & Tarifs' };

export default function ServicesPage() {
  return <ServicesRoot />;
}
