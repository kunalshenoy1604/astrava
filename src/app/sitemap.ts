import type { MetadataRoute } from 'next'
import { getAllSlugs, getFeed, settle } from '@/lib/data/queries'
import { TOPICS } from '@/lib/demo/topics'
import { absoluteUrl } from '@/lib/config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, feed] = await Promise.all([settle(getAllSlugs()), settle(getFeed({ limit: 5000 }))])
  const demo = new Set(feed.ok ? feed.value.filter((s) => s.isDemo).map((s) => s.slug) : [])
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'hourly', priority: 1 },
    { url: absoluteUrl('/signals'), changeFrequency: 'hourly', priority: 0.9 },
    { url: absoluteUrl('/topics'), changeFrequency: 'daily', priority: 0.7 },
    { url: absoluteUrl('/methodology'), changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/about'), changeFrequency: 'monthly', priority: 0.4 },
  ]
  const topics: MetadataRoute.Sitemap = TOPICS.map((t) => ({ url: absoluteUrl(`/topics/${t.slug}`), changeFrequency: 'daily', priority: 0.8 }))
  // Demo signals are fictional and marked noindex, so they are left out of the sitemap.
  const signals: MetadataRoute.Sitemap = (slugs.ok ? slugs.value : [])
    .filter((s) => !demo.has(s.slug))
    .map((s) => ({ url: absoluteUrl(`/signals/${s.slug}`), lastModified: s.updatedAt, changeFrequency: 'daily', priority: 0.7 }))
  return [...staticPages, ...topics, ...signals]
}
