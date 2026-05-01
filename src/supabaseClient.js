import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabaseConfig.js";

export function supabaseConfigured() {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.startsWith("https://") &&
    SUPABASE_ANON_KEY.length > 20 &&
    window.supabase?.createClient
  );
}

export const supabase = supabaseConfigured()
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

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
