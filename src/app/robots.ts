import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/api/', '/auth/', '/search', '/radar', '/sign-in', '/sign-up'] }],
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
