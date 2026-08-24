import { SITE_URL } from '@/lib/site';

export default function robots() {
  return {
    rules: [{
      userAgent: '*',
      allow: ['/', '/discover', '/recipes/'],
      disallow: ['/api/', '/app', '/account', '/settings/', '/plan/', '/planner', '/library/', '/pantry', '/grocery', '/spending', '/login'],
    }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

