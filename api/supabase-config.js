export default function handler(request, response) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    response.status(404).json({ configured: false });
    return;
  }

  response.status(200).json({
    configured: true,
    supabaseUrl,
    supabaseAnonKey
  });
}
