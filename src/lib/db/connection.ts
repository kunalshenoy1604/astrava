/**
 * Direct Postgres connection candidates for a Supabase project. Used by the
 * build-time migration and by the few privileged server actions (approving a
 * reviewer) when no service-role key is configured. Never imported by client code.
 */
export const POOLER_REGIONS = [
  'ap-south-1', 'ap-southeast-1', 'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-central-1', 'eu-west-1', 'eu-west-2',
  'eu-west-3', 'eu-north-1', 'eu-central-2', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ca-central-1', 'sa-east-1',
]

export function candidateUrls(env: Record<string, string | undefined> = process.env): string[] {
  const explicit = [env.POSTGRES_URL_NON_POOLING, env.POSTGRES_URL, env.DATABASE_URL].filter((v): v is string => Boolean(v))
  const password = env.SUPABASE_DB_PASSWORD
  const api = env.NEXT_PUBLIC_SUPABASE_URL
  if (!password || !api) return explicit
  const ref = new URL(api).hostname.split('.')[0]!
  const pw = encodeURIComponent(password)
  const regions = env.SUPABASE_REGION ? [env.SUPABASE_REGION] : POOLER_REGIONS
  const prefixes = env.SUPABASE_POOLER_PREFIX ? [env.SUPABASE_POOLER_PREFIX] : ['aws-0', 'aws-1']
  return [
    ...explicit,
    // Session pooler: IPv4-reachable from serverless/build machines.
    ...prefixes.flatMap((p) => regions.map((r) => `postgresql://postgres.${ref}:${pw}@${p}-${r}.pooler.supabase.com:5432/postgres`)),
    // Direct host (IPv6 only on newer projects).
    `postgresql://postgres:${pw}@db.${ref}.supabase.co:5432/postgres`,
  ]
}

export function describeUrl(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return 'invalid url'
  }
}
