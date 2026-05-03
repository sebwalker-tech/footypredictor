# Supabase Setup

This app now supports Supabase email/password login when Supabase is configured. If it is not configured, the existing local demo login continues to work.

## 1. Create the Supabase project

1. Create a project at Supabase.
2. In `Authentication > Providers`, keep Email enabled.
3. For a private league, turn off public sign-ups in Supabase settings if you do not want users creating their own accounts.

## 2. Run the schema

Open Supabase SQL Editor and run:

```sql
-- paste the contents of supabase/schema.sql
```

## 3. Create the six auth users

Create each user in `Authentication > Users`.

Then add one row per user to `public.profiles`. The important field is `app_user_id`: it maps a Supabase login to the existing app player record.

Example:

```sql
insert into public.profiles (id, app_user_id, full_name, email, is_admin)
values
  ('AUTH_USER_UUID_HERE', 'u_admin', 'Seb Walker', 'seb@example.com', true);
```

Use the existing app player id for `app_user_id`. This keeps imported historical predictions connected to the right player.

## 4. Add your public Supabase keys

If you are deploying on Vercel, add these environment variables to the project:

```txt
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR-PUBLISHABLE-OR-ANON-KEY
```

The app loads these through `/api/supabase-config` at runtime.

For local file testing, you can alternatively copy your project URL and publishable/anon key into:

```js
// src/supabaseConfig.js
export const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR-PUBLISHABLE-OR-ANON-KEY";
```

The anon key is designed to be public in browser apps. Do not put the Supabase service-role key in the app.

## Current scope

This setup adds real user login, admin mapping, and shared playoff draft picks. The existing weekly prediction/data logic is otherwise unchanged. The next Supabase step is to move weekly predictions into database tables so all users share live prediction data across devices.
