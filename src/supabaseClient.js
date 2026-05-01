import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabaseConfig.js";

let supabaseUrl = SUPABASE_URL;
let supabaseAnonKey = SUPABASE_ANON_KEY;

export let supabase = null;

function hasSupabaseKeys() {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("https://") &&
    supabaseAnonKey.length > 20 &&
    window.supabase?.createClient
  );
}

async function loadRuntimeConfig() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) return;
  if (!location.hostname.endsWith(".vercel.app") && location.protocol !== "https:") return;

  try {
    const response = await fetch("/api/supabase-config");
    if (!response.ok) return;
    const config = await response.json();
    supabaseUrl = config.supabaseUrl || supabaseUrl;
    supabaseAnonKey = config.supabaseAnonKey || supabaseAnonKey;
  } catch (error) {
    console.warn("Supabase runtime config could not be loaded", error);
  }
}

export async function initSupabaseClient() {
  await loadRuntimeConfig();
  supabase = hasSupabaseKeys()
    ? window.supabase.createClient(supabaseUrl, supabaseAnonKey)
    : null;
  return Boolean(supabase);
}

export function supabaseConfigured() {
  return Boolean(supabase);
}

export async function loadSupabaseProfile(user) {
  if (!supabase || !user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, app_user_id, full_name, email, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("This login is not linked to a league player yet. Add a profile row in Supabase first.");
  }
  return { ...data, email: data.email || user.email };
}

export async function getActiveSupabaseProfile() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user ? loadSupabaseProfile(data.session.user) : null;
}

export async function signInWithSupabase(email, password) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return loadSupabaseProfile(data.user);
}

export async function signOutOfSupabase() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
