// Structured data helpers for SEO and LLM optimization

interface Station {
  code: string
  name: string
  latitude: number
  longitude: number
  operator: string
}

interface Service {
  serviceId: string
  operator: string
  origin: Station
  destination: Station
  scheduledDeparture: Date
  scheduledArrival: Date
  platform?: string
  status: string
}

export function generateStationStructuredData(station: Station) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TrainStation',
    name: station.name,
    identifier: station.code,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/stations/${station.code}`,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'GB',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: station.latitude,
      longitude: station.longitude,
    },
    operator: {
      '@type': 'Organization',
      name: station.operator,
    },
    serviceType: 'Railway Station',
    amenityFeature: [
      {
        '@type': 'LocationFeatureSpecification',
        name: 'Real-time Departures',
        value: true,
      },
      {
        '@type': 'LocationFeatureSpecification',
        name: 'Live Arrivals',
        value: true,
      },
    ],
  }
}

export function generateServiceStructuredData(service: Service) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TrainTrip',
    identifier: service.serviceId,
    provider: {
      '@type': 'Organization',
      name: service.operator,
    },
    departureStation: {
      '@type': 'TrainStation',
      name: service.origin.name,
      identifier: service.origin.code,
    },
    arrivalStation: {
      '@type': 'TrainStation',
      name: service.destination.name,
      identifier: service.destination.code,
    },
    departureTime: service.scheduledDeparture.toISOString(),
    arrivalTime: service.scheduledArrival.toISOString(),
    departurePlatform: service.platform,
    trainNumber: service.serviceId,
  }
}

export function generateOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Railhopp',
    url: process.env.NEXT_PUBLIC_APP_URL,
    logo: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`,
    description: 'Real-time UK train information and journey planning platform',
    sameAs: [
      'https://twitter.com/railhopp',
      'https://github.com/railhopp',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: 'en-GB',
    },
    areaServed: {
      '@type': 'Country',
      name: 'United Kingdom',
    },
    serviceType: 'Railway Information Service',
  }
}

export function generateWebApplicationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Railhopp',
    url: process.env.NEXT_PUBLIC_APP_URL,
    description: 'Real-time UK train times, live departures, arrivals and journey planning',
    applicationCategory: 'TravelApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'GBP',
    },
    featureList: [
      'Real-time train departures and arrivals',
      'Live delay information',
      'Journey planning',
      'Service disruption alerts',
      'Platform information',
      'Train formation details',
    ],
    screenshot: `${process.env.NEXT_PUBLIC_APP_URL}/screenshot.jpg`,
  }
}

export function generateBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
