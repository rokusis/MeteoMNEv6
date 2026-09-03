# TASKS
## Montenegro Weather App — task backlog and execution order

Status values:
- `TODO`
- `IN PROGRESS`
- `BLOCKED`
- `DONE`
- `REVIEW`

Rule: coding agents should work on one concrete task at a time unless the Architect explicitly groups tightly coupled subtasks.

---

# PHASE 0 — PROJECT FOUNDATION

## TASK-001 — Repository skeleton
Status: DONE

Goal:
Create the basic repository layout, package metadata, TypeScript configuration, worker entry point, test setup, and documentation files.

Acceptance:
- project installs;
- tests run;
- worker builds;
- required docs exist.

---

## TASK-002 — Cloud-first development setup
Status: TODO

Goal:
Create a browser/cloud-friendly development setup suitable for the owner’s weak Windows 10 laptop.

Acceptance:
- documented setup;
- minimal local requirements;
- reproducible dev environment.

---

## TASK-003 — CI baseline
Status: DONE

Goal:
Set up GitHub Actions for install, typecheck, lint where adopted, and tests.

Acceptance:
- CI runs on pull requests;
- failures are visible;
- no secrets exposed.

---

# PHASE 1 — SOURCE ADAPTER FOUNDATION

## TASK-010 — Source adapter interface
Status: TODO

Goal:
Define the common internal interface for fetch/parse/validate/normalize/status behavior.

Acceptance:
- type-safe interface;
- example adapter fixture;
- clear error states.

---

## TASK-011 — HTTP client wrapper
Status: DONE

Goal:
Create shared HTTP behavior for ZHMS requests.

Must include:
- TLS verification;
- consistent User-Agent;
- timeout handling;
- logging-safe error handling;
- controlled request behavior.

Must NOT include:
- TLS bypass;
- random UA rotation as architecture.

---

## TASK-012 — Response classification
Status: DONE

Goal:
Distinguish:
- expected data;
- `no data`;
- generic HTML/shell;
- empty structured content;
- invalid schema.

Acceptance:
HTTP 200 alone never marks a response valid.

---

# PHASE 2 — AWS CURRENT

## TASK-020 — AWS station metadata parser
Status: DONE

Source:
`/Meteorologija/aws_m.php`

Parse:
`var stanice`

Acceptance:
- normalized station metadata;
- station status flag preserved;
- coordinates/elevation/name/type preserved;
- parser fixture tests.

---

## TASK-021 — AWS current observation parser
Status: DONE

Source:
`/Meteorologija/aws_m.php`

Parse:
`var posljednje`

Acceptance:
- station id;
- type;
- name;
- measurement timestamp;
- temperature;
- precipitation;
- wind speed;
- wind direction code;
- gust;
- empty values handled as missing.

---

## TASK-022 — AWS wind direction normalization
Status: DONE

Goal:
Convert AWS direction code 0–32 into application-friendly representation.

Acceptance:
- code preserved;
- degrees derived with the portal mapping where valid;
- edge cases tested.

---

## TASK-023 — AWS normalized observation model
Status: DONE

Goal:
Map source-specific AWS fields into shared `NormalizedStation` / `NormalizedObservation` models.

Acceptance:
- raw source details stay adapter-local;
- no fabricated fields.

---

## TASK-024 — AWS persistence
Status: DONE

Goal:
Persist stations and current observations in D1.

Acceptance:
- upsert behavior;
- measurement time preserved;
- missing fields preserved as missing;
- no duplicate runaway rows.

---

## TASK-025 — Previous-known-good for AWS
Status: DONE

Goal:
Prevent invalid AWS refreshes from destroying valid state.

Acceptance:
- invalid response rejected;
- old valid state remains available;
- failure recorded.

---

## TASK-026 — AWS freshness status
Status: DONE

Goal:
Expose observation age and source sync status.

Acceptance:
- measuredAt;
- fetchedAt;
- last successful sync;
- stale/degraded determination.

---

# PHASE 3 — CURRENT API

## TASK-030 — Stations API
Status: DONE

Endpoint target:
`GET /api/stations`

Acceptance:
- normalized list;
- coordinates;
- status;
- freshness summary.

---

## TASK-031 — Station detail API
Status: TODO

Endpoint target:
`GET /api/stations/:id`

Acceptance:
- station metadata;
- latest observation;
- status/freshness.

---

## TASK-032 — Station observations API
Status: TODO

Endpoint target:
`GET /api/stations/:id/observations`

Acceptance:
- structured current observation;
- normalized parameter naming.

---

# PHASE 4 — CURRENT EXTREMES

## TASK-040 — Common current reference time
Status: DONE

Goal:
Determine the newest relevant measurement timestamp from the current normalized station observations.

Acceptance:
- deterministic;
- timezone-aware;
- does not use fetch time as measurement time.

---

## TASK-041 — 1-hour eligibility filter
Status: DONE

Goal:
Include observations where age <= 1h relative to common reference time.

Acceptance:
- exact 1h boundary included;
- older values excluded;
- missing timestamps excluded.

---

## TASK-042 — Current extremes calculation
Status: DONE

Goal:
Calculate:
- hottest;
- coldest;
- strongest wind;
- weakest wind;
- highest precipitation;
- lowest precipitation.

Acceptance:
- ties preserved;
- no extra ZHMS calls;
- no daily Tn/Tx usage.

---

## TASK-043 — Extremes API
Status: DONE

Endpoint target:
`GET /api/stations/extremes`

Acceptance:
- results;
- reference time;
- eligibility metadata;
- unavailable state when no candidates.

---

# PHASE 5 — AWS TIME SERIES

## TASK-050 — AWS graph fetcher
Status: DONE

Source:
`/Meteorologija/aws-graph.php?v={tip}&s={ID}`

Acceptance:
- correct query construction;
- invalid station handling;
- no-data handling.

---

## TASK-051 — DataAll parser
Status: DONE

Parse:
- G1 RR/T/H;
- G2 BRV/PRV/MUV;
- G3 GR/P.

Acceptance:
- fixtures;
- parameter mapping tests;
- unknown values preserved safely.

---

## TASK-052 — Time-series persistence
Status: DONE

Goal:
Persist normalized time-series data efficiently in D1.

---

## TASK-053 — Time-series API
Status: DONE

Endpoint target:
`GET /api/stations/:id/timeseries`

Acceptance:
- parameter selection;
- range selection;
- normalized timestamp/value output.

---

# PHASE 6 — HYDROLOGY

## TASK-060 — Hydrology metadata adapter
Status: TODO

Source:
`/Hidrologija/aws_h.php`

Parse `staniceH`.

---

## TASK-061 — Hydrology observation adapter
Status: TODO

Parse hydrology `posljednje`.

Acceptance:
- water level;
- water temperature;
- timestamps;
- station identity.

---

## TASK-062 — Hydrology persistence/API
Status: TODO

Create normalized storage and API only after source contract is validated.

---

# PHASE 7 — SEA / SNOW

## TASK-070 — Sea adapter
Status: DONE

Source:
`/Meteorologija/TTRR/sneg-talasi.php`

---

## TASK-071 — Snow adapter
Status: DONE

Source:
`/Meteorologija/TTRR/sneg-talasi.php`

---

# PHASE 8 — SYNOP

## TASK-080 — SYNOP Montenegro adapter
Status: TODO

Source:
`/synopT.php`

Important:
This adapter is independent. Do not replace AWS with SYNOP globally.

---

## TASK-081 — SYNOP regional adapter
Status: TODO

Source:
`/synopT2.php`

Only implement fields whose semantics are sufficiently proven.

---

# PHASE 9 — DAILY DATA

## TASK-090 — Daily aggregate adapter
Status: TODO

Source:
`/Meteorologija/depese_dnevne.php`

Do not assign a definitive application meaning to unresolved `USN` until proven.

---

# PHASE 10 — OFFICIAL FORECAST

## TASK-100 — Official forecast parser
Status: TODO

Source:
`/page.php?id=31`

---

# PHASE 11 — NUMERICAL FORECAST

## TASK-110 — Numerical forecast resource discovery
Status: TODO

Map actual city/model/location resource patterns before coding a generalized parser.

---

## TASK-111 — Numerical forecast parser
Status: TODO

Parse the 5-day static HTML products after the source contract is confirmed.

---

## TASK-112 — Conditional request support
Status: TODO

Use Last-Modified/ETag where reliable.

Do not depend on HEAD.

---

# PHASE 12 — MONITORING

## TASK-120 — Source sync status
Status: TODO

Track:
- fetch success;
- parse success;
- validation success;
- last success;
- last source measurement;
- failure message/category.

---

## TASK-121 — Schema change detection
Status: TODO

Detect meaningful changes in source structure.

Do not allow a silent schema change to corrupt normalized data.

---

# PHASE 13 — TESTING / HARDENING

## TASK-130 — Forensic fixtures
Status: TODO

Capture safe representative source responses for repeatable tests.

---

## TASK-131 — Negative-source fixtures
Status: TODO

Test:
- `no data`;
- empty arrays;
- generic HTML;
- malformed fields;
- timestamp failures;
- missing values.

---

## TASK-132 — Full backend integration test
Status: TODO

Validate the end-to-end path:

`source -> adapter -> normalization -> D1 -> derived data -> API`

---

## TASK-133 — Reviewer hardening pass
Status: TODO

AI Reviewer checks:
- architecture drift;
- security;
- stale/fresh logic;
- regressions;
- unnecessary source load;
- missing tests.

---

# PHASE 14 — FRONTEND CONTRACT

## TASK-140 — Freeze backend API contracts
Status: TODO

Only after backend behavior stabilizes.

---

## TASK-141 — Write FRONTEND_DESIGN_SPEC.md
Status: TODO

Use the original screenshots/functional concepts plus finalized backend contracts.

This is intentionally later than the backend foundation.

---

# CURRENT NEXT TASK

Unless a new blocking discovery changes the order, start with:

`TASK-001 — Repository skeleton`

The Architect may split TASK-001 into even smaller owner-facing steps.
