# ARCHITECTURE
## Montenegro Weather App — backend-first technical architecture

Status: INITIAL TARGET ARCHITECTURE

This document is the current implementation architecture. It must evolve through recorded decisions in `DECISIONS.md`.

---

# 1. HIGH-LEVEL SYSTEM

```text
                    ZHMS PUBLIC SOURCES
                           |
       +-------------------+--------------------+
       |         |         |        |           |
      AWS    Hydrology   SYNOP   Daily      Forecast/
       |         |         |        |        Sea/Snow
       +-------------------+--------------------+
                           |
                    SOURCE ADAPTERS
                           |
                 FETCH -> PARSE -> VALIDATE
                           |
                      NORMALIZATION
                           |
                      PERSISTENCE
                           |
              DERIVED DATA / FRESHNESS
                           |
                         API
                           |
                     WEB FRONTEND
                           |
                 PWA / later Capacitor
```

The frontend never directly scrapes ZHMS production sources.

---

# 2. INITIAL TECHNOLOGY DIRECTION

Preferred stack:

Backend/runtime:
- Cloudflare Workers

Scheduling:
- Cloudflare Cron

Database:
- Cloudflare D1

Optional raw/debug storage:
- Cloudflare R2

Frontend:
- React + Vite

Source control/shared memory:
- GitHub

CI:
- GitHub Actions

Development:
- cloud-first/browser-first where practical

Packaging later:
- PWA first
- Capacitor later for Android/iOS

---

# 3. WHY THIS SHAPE

The owner has a weak Windows development machine, so cloud-first is preferred.

The project does not need a microservice architecture.

The ingestion workload is periodic and source-specific, making scheduled Worker execution appropriate for the initial design.

D1 is sufficient for structured station/observation/forecast data at the expected scale.

R2 is optional because raw snapshots are useful for debugging, but raw storage is not required for every request.

---

# 4. REPOSITORY SHARED MEMORY

Required repository documentation:

```text
MASTER_SPECIFICATION.md
ZHMS_FORENSIC_EVIDENCE.md
ARCHITECTURE.md
TASKS.md
DECISIONS.md
REVIEW.md
```

Optional:

```text
SOURCE_CONTRACTS.md
TEST_STRATEGY.md
RUNBOOK.md
```

The repo is the persistent project memory across AI providers/chats.

---

# 5. SOURCE ADAPTER LAYER

Recommended shape:

```text
src/
  sources/
    zhms-aws/
    zhms-hydrology/
    zhms-synop/
    zhms-daily/
    zhms-sea-snow/
    zhms-official-forecast/
    zhms-numerical-forecast/
```

Each source adapter should expose a consistent internal contract, conceptually:

```text
fetch()
parse()
validate()
normalize()
getSourceStatus()
```

The exact TypeScript interfaces may evolve during implementation.

---

# 6. COMMON DATA PIPELINE

Every source should fit the following flow:

```text
Source URL
  -> HTTP fetch
  -> content recognition
  -> parser
  -> schema/content validation
  -> normalization
  -> persistence
  -> freshness/status update
  -> derived calculations
  -> API
```

Do not collapse parsing and business logic into one opaque function.

---

# 7. RAW DATA BOUNDARY

Raw source representation should remain an adapter concern.

Internal business logic should consume normalized types.

Example conceptual model:

```ts
interface NormalizedStation {
  stationId: string;
  wmoId?: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  stationType?: string;
  sourceStatus?: number | boolean | string;
}

interface NormalizedObservation {
  stationId: string;
  measuredAt: string;
  fetchedAt: string;
  temperatureC?: number;
  precipitationMm?: number;
  windSpeedMs?: number;
  windDirectionCode?: number;
  windDirectionDeg?: number;
  gustMs?: number;
  humidityPct?: number;
  pressureHpa?: number;
  insolationWm2?: number;
}
```

The exact production schema must be tested and adjusted to real source behavior.

Never fabricate fields when the source does not provide them.

---

# 8. FETCH LAYER RULES

Use GET.

Do not depend on HEAD because forensic testing showed frequent 403 behavior.

Keep TLS verification enabled.

Use a clear, consistent User-Agent where appropriate.

Control request pacing.

Prefer one bulk source request over dozens of station-by-station requests when the public source already provides bulk data.

Avoid duplicate requests across features.

---

# 9. VALIDATION LAYER

Validation should cover:
- expected content shape;
- expected variable names;
- required station identifiers;
- timestamp syntax;
- numeric parseability;
- reasonable numeric ranges;
- missing/empty values;
- schema changes;
- unexpected response type.

A successful HTTP status is not sufficient.

---

# 10. PREVIOUS-KNOWN-GOOD

Important source state should support:

```text
last_valid_payload
last_successful_sync
last_error
source_status
```

When a new payload fails validation:

```text
reject new payload
keep last valid state
record error
mark source degraded/stale
```

Do not destroy useful data because a single fetch was malformed.

---

# 11. FRESHNESS MODEL

Store at least:
- source measurement timestamp;
- backend fetched timestamp;
- last successful synchronization time.

Where publication time cannot be observed, do not invent it.

Freshness should be computed from measurement timestamp where appropriate, but API responses should expose enough metadata for the frontend to tell users whether data is current or stale.

---

# 12. CURRENT EXTREMES ARCHITECTURE

Current extremes are a derived read-model/business function.

Pipeline:

```text
Current normalized observations
             |
      determine reference
             |
      apply <= 2h eligibility
             |
   exclude invalid/ineligible
             |
         aggregate
             |
        current extremes
```

Do not initiate new upstream requests solely for this calculation.

Potential API:

`GET /api/stations/extremes`

Alternative naming such as `/api/temperature-extremes` is acceptable only if it remains consistent with the broader requirement that wind and precipitation extremes are also included.

---

# 13. DATABASE DIRECTION

D1 should store normalized structured data.

Likely logical tables/entities:

```text
stations
station_observations
station_timeseries
hydrology_stations
hydrology_observations
sea_observations
snow_observations
forecasts
source_sync_status
current_extremes_cache (optional derived cache)
```

Exact schema is to be designed task-by-task after the real source contracts are implemented.

Do not create twenty tables merely because the source has twenty arrays.

Normalize for application behavior, not raw-source imitation.

---

# 14. TIME-SERIES STORAGE

AWS graphs expose timestamp/value series grouped by parameter.

A normalized design should make parameter/time lookup efficient.

Possible representation:

```text
station_timeseries(
  station_id,
  measured_at,
  parameter,
  value
)
```

Whether a wide or long schema is ultimately chosen should be decided during implementation based on query patterns and D1 simplicity.

---

# 15. API LAYER

Potential API surface:

```text
GET /api/stations
GET /api/stations/:id
GET /api/stations/:id/observations
GET /api/stations/:id/timeseries
GET /api/stations/extremes
GET /api/sea
GET /api/snow
GET /api/forecast/official
GET /api/forecast/numerical
GET /api/status
```

The final API contract should be documented once implemented.

The frontend consumes these normalized endpoints.

---

# 16. SCHEDULER

There is no universal refresh schedule.

Initial architecture should allow source-specific schedules, for example conceptually:

```text
AWS current       -> frequent polling
AWS graph         -> aligned to actual need/source cadence
Hydrology         -> source-aware schedule
Sea/Snow          -> term/source-aware schedule
SYNOP             -> independent schedule
Forecast          -> metadata/cache-aware schedule
```

Exact cron design should be derived from additional controlled observation and cost/load considerations.

---

# 17. ADAPTIVE SCHEDULING PRINCIPLE

The scheduler should eventually incorporate observed source behavior.

Do not assume:

`all data changes every N minutes`.

Instead:
- poll high-value current source appropriately;
- detect whether new observations are appearing;
- avoid unnecessary repeated heavy downloads;
- use conditional GET where supported for static resources.

---

# 18. FORECAST CACHING

Static numerical forecast HTML resources expose Last-Modified/ETag-type cache metadata in observed tests.

Use conditional retrieval where it is reliable and useful.

Do not depend on HEAD.

Re-test actual 304 semantics during implementation for each relevant resource family.

---

# 19. ERROR HANDLING

Errors must have at least three conceptual classes:

1. transport error
2. parse/validation error
3. stale/degraded source state

Examples:
- timeout;
- TLS failure;
- 404/403;
- 200 + unexpected content;
- 200 + empty payload;
- schema mismatch.

They should not all look like “no data”.

---

# 20. OBSERVABILITY

Record enough information to answer:
- when was the source last fetched?
- did fetch succeed?
- did parse succeed?
- did validation succeed?
- when was the last valid observation time?
- how many stations were accepted?
- how many were stale?
- was schema changed?

A source status endpoint should eventually expose operational health without exposing internal secrets.

---

# 21. TESTING STRATEGY

Tests should exist at several levels:

### Unit tests
- parsers;
- field mapping;
- timestamp parsing;
- wind code conversion;
- freshness;
- current extremes.

### Contract/fixture tests
- known captured ZHMS responses;
- schema changes;
- empty responses;
- `no data` responses.

### Integration tests
- source adapter -> normalization -> storage.

### API tests
- endpoint shape;
- unavailable states;
- stale metadata;
- current extremes.

---

# 22. SECURITY

Minimum rules:
- no TLS bypass;
- no secrets committed to Git;
- use environment bindings/secrets appropriately;
- validate source content;
- sanitize any source-derived strings before frontend rendering;
- do not trust upstream HTML as safe arbitrary application content;
- keep admin/debug routes protected or absent.

---

# 23. FRONTEND BOUNDARY

Frontend should never become the ZHMS scraper.

Good:

`Frontend -> App API -> Normalized DB/cache`

Bad:

`Frontend -> meteo.co.me -> scrape/parse in browser`

The backend is responsible for stable source integration.

---

# 24. FUTURE MOBILE PACKAGING

PWA is the first target.

Once web behavior is stable:

`React/Vite web app -> Capacitor -> Android/iOS`

Native packaging must not force a second backend architecture.

---

# 25. ARCHITECTURE CHANGE RULE

Any significant change must be:
1. proposed;
2. explained to owner in beginner-friendly terms;
3. recorded in `DECISIONS.md`;
4. reflected here;
5. reflected in tasks if implementation work changes.

No silent architecture drift.
