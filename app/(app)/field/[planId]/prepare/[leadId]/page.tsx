// Server wrapper for static export — client logic in ./page-client.tsx
export function generateStaticParams() { return []; }
export const dynamicParams = true;

export { default } from './page-client';
