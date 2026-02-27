# ROX Booking Widget - Self-Service Scheduling

Online booking wizard that lets customers schedule appointments through your website.
Uses real-time HousecallPro availability to show only open slots.

## Architecture

```
[Customer's Browser]
        │
        ▼
[Booking Widget JS]  ← Embedded on your website
        │
        ▼
[rox-chat server]    ← /api/booking/* routes (proxy)
        │
        ▼
[rox-ai-answering]   ← /api/engine/booking/* (HCP integration)
        │
        ▼
[HousecallPro API]   ← Real availability + job creation
```

## Customer Flow

### All Customers:
1. **Service Type** → Repair / Estimate / Maintenance
2. **New or Existing** → Two paths diverge

### Existing Customer:
3. **Phone Lookup** → Finds their HCP account
4. **System Age** → Routes to correct tech
5. **Calendar** → Real-time available slots
6. **Describe Issue** → Text input
7. **Confirm** → Job created in HCP ✓

### New Customer:
3. **System Age** → Routes to correct tech
4. **Calendar** → Real-time available slots
5. **Describe Issue** → Text input
6. **Address** → Street, city, zip
7. **Contact Info** → Name, phone, email
8. **Confirm** → Customer + job created in HCP ✓

## Embed on Your Website

```html
<div id="rox-booking"></div>

<script>
  window.ROX_BOOKING_CONFIG = {
    serverUrl: "https://rox-chat-production.up.railway.app",
    theme: "rox-default",
    containerId: "rox-booking",
    companyName: "ROX Heating & Air",
    companyPhone: "(720) 468-0689"
  };
</script>
<script src="https://rox-chat-production.up.railway.app/widget/booking-widget.js"></script>
```

## Tech Routing Rules

| Service Type | System Age | Tech Tag |
|-------------|-----------|----------|
| Maintenance | Any       | maintenance tech |
| Estimate    | Any       | sales tech |
| Repair      | 10+       | sales tech |
| Repair      | 0-10      | service tech |

## Multi-Tenant SaaS

Pass `tenantId` in the config for multi-tenant deployment:
```javascript
window.ROX_BOOKING_CONFIG = {
  serverUrl: "https://your-saas.com",
  tenantId: "acme-plumbing",
  theme: "acme-theme",
  companyName: "ACME Plumbing",
  companyPhone: "(555) 123-4567"
};
```
