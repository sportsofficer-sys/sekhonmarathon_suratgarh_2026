import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
// Only publishable keys belong here. Never use the service-role key in a browser.
export const supabase = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
export type EventConfig = { id:string; registration_open:boolean; payment_configured:boolean; payment_qr_url:string|null; payee_name:string|null; upi_id:string|null; contact_phone:string|null; contact_email:string|null; registration_deadline:string; };
