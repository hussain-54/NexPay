# NexPay × Supabase

## Connect

Credentials live in `.env` (gitignored):

```
VITE_SUPABASE_URL=https://crnjmgcdecfwbirvkoka.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`NEXT_PUBLIC_*` aliases are also supported via Vite `envPrefix`.

## Create tables (required once)

1. Open [SQL Editor](https://supabase.com/dashboard/project/crnjmgcdecfwbirvkoka/sql/new)
2. Paste contents of `supabase/schema.sql`
3. Run

This creates:

| Table | Purpose |
|-------|---------|
| `profiles` | Users / KYC status |
| `kyc_submissions` | ID verification archive |
| `transactions` | Remittance logs |
| `notifications` | In-app alerts |
| `contacts` | Saved recipients |
| `events` | Telemetry |
| `articles` | Help Center content (seeded) |

## Working prototype

- **Auth** → Supabase Auth (signup/login in Onboarding)
- **Help Center** → reads `articles`
- **Send Money** → logs to `transactions`
- **Settings → Database Lab** (`/database`) → live connection + article browser

Auth works immediately. Table features activate after you run `schema.sql`.
