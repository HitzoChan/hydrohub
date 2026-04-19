// Initialize Supabase Client
const SUPABASE_URL_VALUE = window.SUPABASE_URL || (typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "");
const SUPABASE_KEY_VALUE = window.SUPABASE_ANON_KEY || window.SUPABASE_KEY || (typeof SUPABASE_KEY !== "undefined" ? SUPABASE_KEY : "");

if (!SUPABASE_URL_VALUE || !SUPABASE_KEY_VALUE) {
	console.error("[Supabase] Missing SUPABASE_URL or SUPABASE_KEY configuration.");
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL_VALUE, SUPABASE_KEY_VALUE);
window.supabaseClient = supabaseClient;
