import { NextResponse } from 'next/server'

export async function GET() {
  const robotsTxt = `User-agent: *
Allow: /

# High-value pages for crawling
Allow: /stations/
Allow: /routes/
Allow: /journey-planner
Allow: /disruptions

# API endpoints - allow selective crawling
Allow: /api/stations
Disallow: /api/auth/
Disallow: /api/internal/

# Sitemaps
Sitemap: ${process.env.NEXT_PUBLIC_APP_URL}/sitemap.xml
Sitemap: ${process.env.NEXT_PUBLIC_APP_URL}/stations-sitemap.xml
Sitemap: ${process.env.NEXT_PUBLIC_APP_URL}/routes-sitemap.xml

# Crawl-delay for respectful crawling
Crawl-delay: 1`

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    },
  })
}
