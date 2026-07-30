import { requireSupabase, supabase, isSupabaseConfigured } from './supabase';

export type Profile = {
  id: string;
  username: string;
  email: string;
  phone?: string | null;
  wallet_address?: string | null;
  tier?: string;
  kyc_verified?: boolean;
  kyc_status?: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  kyc_details?: Record<string, unknown>;
  referral_code?: string | null;
};

export type Article = {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string | null;
  body: string;
  published: boolean;
  sort_order: number;
};

export const isSupabaseActive = () => isSupabaseConfigured && !!supabase;

export async function registerUserInSupabase(
  email: string,
  password: string,
  profile: {
    username: string;
    phone?: string;
    walletAddress?: string;
    kycVerified?: boolean;
    kycStatus?: Profile['kyc_status'];
    kycDetails?: Record<string, unknown>;
  }
): Promise<Profile> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: profile.username,
        phone: profile.phone || '',
        wallet_address: profile.walletAddress || '',
      },
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Signup failed — no user returned');

  const row: Partial<Profile> = {
    id: data.user.id,
    username: profile.username,
    email,
    phone: profile.phone || null,
    wallet_address: profile.walletAddress || null,
    kyc_verified: !!profile.kycVerified,
    kyc_status: profile.kycStatus || (profile.kycVerified ? 'approved' : 'not_submitted'),
    kyc_details: profile.kycDetails || {},
  };

  // Upsert profile (trigger may already insert a base row)
  const { data: saved, error: upsertErr } = await client
    .from('profiles')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single();

  if (upsertErr) {
    // Tables may not exist yet — return auth metadata profile for prototype
    console.warn('profiles upsert skipped:', upsertErr.message);
    return {
      id: data.user.id,
      username: profile.username,
      email,
      phone: profile.phone,
      wallet_address: profile.walletAddress,
      kyc_verified: !!profile.kycVerified,
      kyc_status: profile.kycStatus || 'not_submitted',
      kyc_details: profile.kycDetails || {},
    };
  }

  await client.from('events').insert({
    user_id: data.user.id,
    event_name: 'user_signup',
    payload: { email, wallet: profile.walletAddress },
  }).then(() => {}).catch(() => {});

  return saved as Profile;
}

export async function loginUserInSupabase(email: string, password: string): Promise<Profile> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('Login failed');

  const { data: profile, error: profileErr } = await client
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileErr || !profile) {
    return {
      id: data.user.id,
      username: (data.user.user_metadata?.username as string) || email.split('@')[0],
      email: data.user.email || email,
      phone: data.user.user_metadata?.phone,
      wallet_address: data.user.user_metadata?.wallet_address,
      kyc_verified: false,
      kyc_status: 'not_submitted',
    };
  }

  await client.from('events').insert({
    user_id: data.user.id,
    event_name: 'user_login',
    payload: { email },
  }).then(() => {}).catch(() => {});

  return profile as Profile;
}

export async function signOutFromSupabase() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function fetchProfile(uid: string): Promise<Profile | null> {
  const client = requireSupabase();
  const { data, error } = await client.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (error) {
    console.warn(error.message);
    return null;
  }
  return data as Profile | null;
}

export async function logTransactionToSupabase(tx: {
  signature: string;
  senderAddress: string;
  recipientAddress: string;
  amount: number;
  currency: string;
  fee: number;
  memo?: string;
  senderId?: string;
}) {
  if (!supabase) return;
  const { error } = await supabase.from('transactions').insert({
    signature: tx.signature,
    sender_id: tx.senderId || null,
    sender_address: tx.senderAddress,
    recipient_address: tx.recipientAddress,
    amount: tx.amount,
    currency: tx.currency,
    fee: tx.fee,
    memo: tx.memo || null,
    status: 'completed',
  });
  if (error) console.warn('tx log:', error.message);
}

export async function fetchArticles(): Promise<Article[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('published', true)
    .order('sort_order', { ascending: true });
  if (error) {
    console.warn('articles:', error.message);
    return [];
  }
  return (data || []) as Article[];
}

export async function fetchArticleBySlug(slug: string): Promise<Article | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (error) return null;
  return data as Article | null;
}

export function onSupabaseAuthChanged(callback: (user: { id: string; email?: string } | null) => void) {
  if (!supabase) {
    callback(null);
    return () => {};
  }
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ? { id: session.user.id, email: session.user.email || undefined } : null);
  });
  supabase.auth.getSession().then(({ data: s }) => {
    const u = s.session?.user;
    callback(u ? { id: u.id, email: u.email || undefined } : null);
  });
  return () => data.subscription.unsubscribe();
}
