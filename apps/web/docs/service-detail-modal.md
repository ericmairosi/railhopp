# Service Detail Modal - Enhanced Network Rail Integration

## Overview

The `ServiceDetailModal` component provides a comprehensive view of train service information by integrating multiple Network Rail data sources to deliver detailed insights about train services.

## Features

### 1. Journey Information

- **Calling Points**: Complete journey timeline with stations, scheduled/estimated times, platforms, and status
- **Visual Timeline**: Clean interface showing the train's route progression
- **Real-time Updates**: Live status indicators (On Time, Delayed, Cancelled)
- **Platform Information**: Platform assignments for each stop

### 2. Train Formation

- **Coach Layout**: Visual representation of train formation
- **Capacity Information**: Real-time loading percentages for each coach
- **Class Indicators**: First Class and Standard Class coach identification
- **Facilities**: Coach-specific amenities (WiFi, Power, Catering, Quiet Coach)

### 3. Performance Analytics

- **Service Reliability**: Historical performance metrics (92.4% average)
- **Punctuality Tracking**: On-time performance statistics (89.1% average)
- **Average Delay**: Service-specific delay patterns (2.8 min average)
- **Recent History**: 7-day performance overview with visual indicators

### 4. Network Rail Insights

- **Route Information**:
  - Total distance (393 miles for example route)
  - Electrification status
  - Maximum permitted speed (125 mph)
  - Signalling system type (ETCS Level 2)

- **Speed Restrictions (TSR)**:
  - Active temporary speed restrictions affecting the service
  - Location-specific delay impacts
  - Severity levels (HIGH, MEDIUM, LOW)
  - Maintenance reasons and estimated delays

## Data Sources Integration

The modal fetches data from multiple Network Rail APIs:

```typescript
// Multiple API endpoints are called simultaneously
const [
  darwinResponse,           // Darwin service details
  scheduleResponse,         // Network Rail schedule data
  performanceResponse,      // RTPPM performance metrics
  tsrResponse,             // Temporary Speed Restrictions
  tpsResponse              // Train Planning System data
] = await Promise.all([...]);
```

### API Endpoints Used:

1. `/api/darwin/service/${serviceId}` - Core service information
2. `/api/network-rail/schedule?trainUid=${serviceId}` - Detailed schedule data
3. `/api/network-rail/rtppm?service=${serviceId}` - Real-time performance metrics
4. `/api/network-rail/tsr?service=${serviceId}` - Speed restriction impacts
5. `/api/network-rail/tps?service=${serviceId}` - Train planning data

## User Experience Features

### Tabbed Interface

Three distinct views provide organized access to information:

- **Journey**: Complete route and formation details
- **Performance**: Historical and real-time performance metrics
- **Network Rail**: Infrastructure and restriction information

### Progressive Disclosure

Information is revealed progressively to avoid overwhelming users:

- Quick info bar shows essential details immediately
- Detailed data is organized in logical tabs
- Visual indicators provide at-a-glance status understanding

### Error Handling

Graceful fallbacks ensure functionality even when some APIs fail:

- Mock data generation for demonstration purposes
- Individual API failure handling
- User-friendly error messages

## Integration with Parent Component

The modal is integrated into `NetworkRailService` component:

```typescript
// State management
const [selectedService, setSelectedService] = useState<string | null>(null);
const [modalOpen, setModalOpen] = useState(false);

// Service selection handler
onClick={() => {
  setSelectedService(service.serviceId);
  setModalOpen(true);
  onServiceSelect?.(service.serviceId);
}}

// Modal rendering
{selectedService && (
  <ServiceDetailModal
    serviceId={selectedService}
    isOpen={modalOpen}
    onClose={() => {
      setModalOpen(false);
      setSelectedService(null);
    }}
  />
)}
```

## Design Principles

### Accessibility

- High contrast colors for status indicators
- Clear visual hierarchy with proper heading structure
- Keyboard navigation support
- Screen reader friendly content structure

### Responsive Design

- Mobile-first approach with responsive grid layouts
- Adaptive column layouts (2 columns on mobile, 4 on desktop)
- Touch-friendly interaction targets
- Optimized for various screen sizes

### Performance

- Lazy loading of detailed data (only when modal opens)
- Efficient data combination from multiple sources
- Cached performance metrics to reduce API calls
- Optimistic UI updates where appropriate

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live data updates
2. **Predictive Analytics**: ML-based delay prediction and alternative suggestions
3. **Seat Maps**: Integration with seat availability data
4. **Disruption Alerts**: Proactive notifications about service disruptions
5. **Journey Planning**: Direct integration with journey planning tools

This modal represents a comprehensive approach to displaying train service information, bringing together multiple data sources to provide users with the complete picture they need for informed travel decisions.
