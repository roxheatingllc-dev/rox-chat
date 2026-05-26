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
3. **Phone Lookup** → Finds their HCP account (auto-detects PCC membership from tags)
4. **System Age** → Routes to correct tech
5. **Calendar** → Real-time available slots (filtered by weather + same-day eligibility)
6. **Describe Issue** → Text input
7. **Confirm** → Job created in HCP ✓

### New Customer:
3. **System Age** → Routes to correct tech
4. **Calendar** → Real-time available slots (filtered by weather + same-day eligibility)
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
<script src="https://rox-chat-production.up.railway.app/widget/booking-widget.js?v=10"></script>
```

**Cache busting:** Bump the `?v=N` query param after every change to `booking-widget.js`. Current version is `?v=10` (see `Architecture/Current Widget Versions and Cache-Bust Numbers.md` for the live tracking). Without the bump, WordPress and SiteGround caches will keep serving the old widget JS to visitors.

## Tech Routing Rules

Tech routing runs in two layers, in order. The first match wins.

### Layer 1 — Tag-based overrides (v2.6.0)

If the customer has equipment tags on their HCP profile, the override fires before age-based routing:

| Customer tag condition | Override → | Notes |
|---|---|---|
| AC or Furnace tag with year-age ≥ 10 | `sales tech` | Opportunity-call routing — Raphael gets the visit so he can scope a replacement |
| Heat Pump tag (and no 10+yr opportunity tag above) | `heat pump` | Heat-pump-specialist tech gets the visit |
| Estimates (any tag) | Override does NOT fire | Estimates always go to `sales` (Chris) via Layer 2 |

The override is implemented in `services/heat-pump-router.js` and is shared between booking, chat (`engine-api.js` v3.12.0), and voice (`conversation-manager.js` v2.16.0). Same logic, same priorities, same edge cases — single source of truth.

### Layer 2 — Age-based routing (fallthrough when no override fires)

| Service Type | System Age | Tech Tag |
|-------------|-----------|----------|
| Maintenance | 0-2 / 3-10 / Not Sure | `maintenance tech` |
| Maintenance | 10+        | `sales tech` |
| Estimate    | Any        | `sales` |
| Repair      | 0-2        | `service tech 3-10` |
| Repair      | 3-10       | `service tech 3-10` |
| Repair      | 10+        | `sales tech` |

The 0-2yr and 3-10yr repair buckets both route to `service tech 3-10` (the catchall non-warranty tag). Voice splits 0-2yr further — Rox-installed → warranty handoff; non-Rox 1-2yr → blocked 3-week window — but booking doesn't ask the Rox-installed question, so the bucket collapses here.

**Fix history:** Pre-v2.21.10, the 0-2yr repair bucket returned the string `'service tech'` (no such tag in `config/tech-tags.js`). `availability.findAvailableSlots()` silently fell back to ALL bookable employees when no tech matched the tag, masking the bug for an unknown duration. Fixed 2026-05-26 across booking (v2.21.10) and chat (v3.13.2). Voice was always correct via config-driven tag lookup.

### Layer 3 — Fallback chain (when the primary tag has no slots)

After Layer 1+2 picks a tag, `/booking/availability` tries the primary tag first. If the primary tag returns slots, those are shown. If the primary tag returns no slots for some or all days, the chain below fills the gaps with fallback techs:

| Primary tag | Fallback chain |
|---|---|
| `sales` | → `sales tech` |
| `sales tech` | → `sales` → `service tech 3-10` |
| (all other tags) | (no fallback configured) |

**Date-level merge rule (v1.6.0):** When fallbacks merge, the base tech owns ANY day it has slots on. Fallbacks only fill days where the base tech has zero slots. This prevents mixed time-window confusion within a single day (e.g. sales tech 9-11 + service tech 8-10 showing as four options on the same Tuesday).

Sundays are always skipped. Saturdays get a parallel call to the `saturday tech` tag for repair-only service types (maintenance, estimates, and sales don't have Saturday coverage).

## Eligibility Filtering (v2.4.0+)

After tech routing produces a candidate list of days, two filters run before the calendar is shown:

1. **Same-day maintenance** — always blocked (regardless of weather, age, or PCC status). Maintenance same-day creates dispatch chaos and tech load problems.
2. **Cold-weather AC maintenance** — blocked for 10+ year systems when the forecasted Denver daily high is below 75°F. Refrigerant readings on old systems aren't accurate in cold weather. Implemented in shared `services/weather-eligibility.js` (also powers chat v3.9.0, voice v2.7.0, and club booking v1.0.10).

If the eligibility engine errors out, the filter fails open — all candidate days pass through unfiltered. Better to over-offer than block a real customer because of a forecast service hiccup.

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

All the layers above (tag overrides, age-based routing, fallback chains, eligibility filters) are designed to be tenant-driven in DispatchHQ. The current hardcoded values flow through `config/tech-tags.js`, `services/heat-pump-router.js`, and `services/weather-eligibility.js` — each of which becomes a per-tenant config table in the SaaS port.
