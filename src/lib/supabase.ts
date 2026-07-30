import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';

const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env');
  }
  return supabase;
}

export async function checkSupabaseConnection(): Promise<{
  ok: boolean;
  auth: boolean;
  tables: Record<string, boolean | string>;
  message: string;
}> {
  if (!supabase) {
    return { ok: false, auth: false, tables: {}, message: 'Missing env credentials' };
  }

  let auth = false;
  try {
    const { error } = await supabase.auth.getSession();
    auth = !error;
  } catch {
    auth = false;
  }

  const tableNames = ['profiles', 'transactions', 'notifications', 'contacts', 'articles', 'kyc_submissions', 'events'];
  const tables: Record<string, boolean | string> = {};

  for (const name of tableNames) {
    try {
      const { error } = await supabase.from(name).select('*', { count: 'exact', head: true });
      if (!error) tables[name] = true;
      else if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) tables[name] = false;
      else tables[name] = error.message;
    } catch (e: any) {
      tables[name] = e?.message || 'error';
    }
  }

  const ready = Object.values(tables).every((v) => v === true);
  return {
    ok: auth && ready,
    auth,
    tables,
    message: ready
      ? 'Supabase connected — schema ready'
      : auth
        ? 'Auth OK — run supabase/schema.sql in the SQL Editor to create tables'
        : 'Could not reach Supabase Auth',
  };
}
