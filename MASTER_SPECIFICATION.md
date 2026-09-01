# MASTER SPECIFICATION
# Montenegro Weather App
## Project Source of Truth + AI Development Operating Manual

Status: ACTIVE
Version: 1.0
Scope: Product requirements, owner context, development workflow, global constraints, backend-first direction.

---

## 0. PURPOSE

This document is the primary onboarding document for any new AI assistant, architect, coding agent, reviewer, or developer entering the project without access to the previous chat history.

It must explain not only what the application should become, but also how the project must be developed with the owner.

The project must never depend on one AI conversation as its memory. The repository is the shared memory.

This document must be read before implementation.

Supporting documents:
- `ZHMS_FORENSIC_EVIDENCE.md` — detailed evidence about public ZHMS sources and HTTP/data behavior.
- `ARCHITECTURE.md` — current technical architecture and implementation boundaries.
- `TASKS.md` — atomic development tasks and status.
- `DECISIONS.md` — durable decisions and reasons.
- `REVIEW.md` — technical review results, when available.

---

# 1. OWNER / USER CONTEXT

The project owner is the product owner and final decision-maker. The owner has strong intuition about the product and its desired functionality, but is an absolute beginner in practical software development.

Therefore, every AI helping on the project must act as BOTH:

1. technical executor / technical problem solver;
2. technical mentor for a beginner.

The owner should not have to remember project history or manually transfer large amounts of context between AIs.

The owner should not be treated like a professional backend/frontend engineer.

The AI must explain technical work in clear language and in small steps, while doing the technically difficult work itself whenever possible.

Preferred interaction pattern:

`Goal -> Small Task -> Explain -> Implement -> Test -> Verify -> Next Task`

Avoid dumping twenty unrelated steps on the owner at once.

The owner should understand:
- what is being built;
- why it is being built;
- what changed;
- how to verify it;
- what decision, if any, needs owner approval.

The owner should NOT be a messenger between AIs.

---

# 2. OWNER DEVELOPMENT CONDITIONS

Primary development machine:
- Windows 10 laptop
- Intel i3 class CPU
- 4 GB RAM
- approximately 5 GB free disk space

This machine is weak for heavy local development.

Therefore the preferred development strategy is cloud-first / browser-first.

Possible development tools:
- GitHub
- GitHub Codespaces or another free cloud development environment when its free allowance is sufficient
- browser-based terminals/editors where practical
- GitHub Actions

Secondary device:
- Android Samsung Galaxy A54
- Termux available/possible
- Python available/possible
- Node.js available/possible

The phone is a supporting device, not the main production development environment.

---

# 3. COST CONSTRAINT

At the beginning of the project, recommend only adequate services that can be used strictly for free.

Do not build the architecture around paid services when a free and adequate option exists.

For every external service, the AI should consider:
- actual free availability;
- relevant free limits;
- whether the project can remain functional within those limits;
- vendor lock-in risk;
- whether the service is actually necessary.

Do not introduce a service merely because it is popular.

---

# 4. PRODUCT GOAL

Build a modern Montenegro weather application that provides useful public meteorological information published by the Hydrometeorological Service of Montenegro (ZHMS) through the public `meteo.co.me` portal.

The application should be:
- mobile-first;
- responsive on desktop and mobile web;
- PWA-ready;
- later packageable for Android and iOS, preferably with Capacitor after the web/backend foundation is stable.

The app should not simply copy the ZHMS website. It should expose useful information in a cleaner application-oriented data model.

---

# 5. CORE PRODUCT NAVIGATION

Main areas:

1. `Odabrana stanica`
2. `Sve stanice`
3. `Prognoza`

The final visual design will be specified later in a separate frontend specification.

The current master defines the functional data requirements, not final pixel-level UI.

---

# 6. SELECTED STATION FUNCTIONAL REQUIREMENTS

The application must be able to show for the selected station:
- current temperature prominently;
- weather icon / weather state;
- humidity;
- wind;
- pressure;
- precipitation;
- gust;
- insolation;
- measurement time / freshness context;
- time-series charts.

Target chart groups:
1. temperature + humidity;
2. precipitation;
3. wind;
4. pressure;
5. insolation.

---

# 7. ALL STATIONS FUNCTIONAL REQUIREMENTS

The app must support:
- station list;
- current observation data;
- search/filtering;
- station detail;
- map location;
- current temperature on the map;
- station status/freshness information;
- selecting a station as the selected station;
- sea temperature data;
- snow data.

A station detail must expose the same essential observation/time-series information needed by the selected-station view.

---

# 8. CURRENT MIN/MAX FUNCTIONAL REQUIREMENTS

The `Aktuelni min/max` feature is a derived feature, not a copy of ZHMS daily Tn/Tx.

It must include:

Temperature:
- current hottest eligible station;
- current coldest eligible station.

Wind:
- current strongest eligible wind;
- current weakest eligible wind.

Precipitation:
- current highest eligible precipitation;
- current lowest eligible precipitation.

Eligibility rule:
- determine one common current reference timestamp from the newest relevant station measurement time;
- include a station only if its observation timestamp is within 2 hours of that reference;
- exactly 2 hours is included;
- invalid/missing observations are excluded;
- ineligible/inactive source records are excluded;
- ties must be supported;
- no eligible candidates must produce an explicit unavailable/no-candidates state.

Do NOT issue extra ZHMS requests only to calculate extremes. Reuse already fetched and validated current observations.

Do NOT confuse this with daily Tmin/Tx from the daily aggregate source.

---

# 9. FORECAST REQUIREMENTS

## 9.1 Official forecast

Support:
- official text forecast;
- multiple forecast days;
- seafarer information where published;
- related public visual products where appropriate.

## 9.2 Numerical forecast

Support:
- model selection where source provides it;
- location/station selection;
- multiple forecast days;
- hourly data;
- temperature;
- humidity;
- precipitation;
- weather symbol;
- wind information;
- model metadata;
- source timestamps/metadata where available.

---

# 10. CRITICAL SOURCE PRINCIPLE

The ZHMS portal is NOT one universal weather API.

It is a set of different public data/product sources.

The backend must therefore use source-specific adapters.

Examples include:
- AWS current observations;
- AWS time series;
- hydrology;
- SYNOP;
- daily data;
- sea/snow;
- official forecast;
- numerical forecast/static forecast products.

---

# 11. CRITICAL SYNOP RULE

The entire portal must NEVER be modeled as “one big SYNOP feed”.

Public views of current domestic measurements, graphs, and many operational tables are primarily backed by AWS/internal monitoring and other products.

SYNOP is a separate international/regional layer.

Therefore:
- SYNOP gets its own source adapter;
- SYNOP may be primary, secondary, or cross-check for a particular parameter only when evidence supports that role;
- SYNOP must never automatically replace AWS for all data.

---

# 12. DATA FRESHNESS GOAL

The target is that the app should normally lag the newest publicly available ZHMS data by roughly no more than several minutes, with an aspirational target around 3 minutes.

This is a public-source freshness goal, not a claim that every source changes every 3 minutes.

The scheduler must be source-specific and observation-aware.

Do not hard-code one universal refresh interval for every source.

---

# 13. TIME SEMANTICS

Always distinguish:
- measurement time;
- publication time, if observable;
- backend fetch time;
- storage time.

Fetch time must never silently replace source measurement time.

Freshness calculations should be based on source observation/measurement timestamps where available.

---

# 14. BACKEND-FIRST DEVELOPMENT

The immediate development focus is the backend/data layer.

The final frontend visual specification will be produced later.

Do not spend early project effort on pixel-perfect frontend design before:
- source ingestion;
- normalization;
- persistence;
- freshness;
- validation;
- API contracts;
- monitoring;
- tests
are stable enough.

---

# 15. TARGET PRODUCTION ARCHITECTURE

Preferred initial architecture:

- Cloudflare Workers — backend/API and ingestion execution
- Cloudflare Cron — scheduled ingestion
- Cloudflare D1 — structured application data
- optional Cloudflare R2 — raw snapshots/debugging when justified
- React + Vite — frontend
- GitHub — source control/shared memory
- GitHub Actions — CI/test automation
- PWA-first — initial delivery
- Capacitor later — Android/iOS packaging

No Supabase is required for V1 unless later evidence shows a real need.

---

# 16. RAW VS NORMALIZED DATA

Keep a strict separation:

`Raw ZHMS source -> Parse -> Validate -> Normalize -> Persist -> Derive -> API`

The frontend must consume normalized application models, not raw ZHMS structures.

Raw snapshots may be retained when useful for:
- debugging;
- schema change detection;
- forensic reproduction;
- audit/troubleshooting.

---

# 17. VALIDATION RULES

HTTP status is not sufficient.

`200 OK` does not guarantee valid data.

Examples of failure responses seen during forensic work included:
- `no data`;
- empty `DataAll`;
- generic page/shell content.

Every adapter must validate expected content and schema.

Missing data is NOT zero.

Stale data is NOT live data.

Invalid new data must NOT overwrite previous known-good data.

---

# 18. PREVIOUS-KNOWN-GOOD

For important sources, keep the latest valid state.

On invalid/failing refresh:
- reject invalid payload;
- keep previous valid state;
- mark source degraded/stale/error as appropriate;
- record the failure;
- preserve `last_successful_sync` information.

---

# 19. TLS

Production HTTPS verification must remain enabled.

Do not use `verify=false`, `-k`, or an equivalent permanent TLS bypass.

One research environment showed a local CA trust problem while the public site certificate was valid for `www.meteo.co.me`.

If a runtime cannot validate the chain, fix trust configuration or explicitly provide a correct CA bundle when justified.

---

# 20. HTTP REQUEST BEHAVIOR

Known research observations:
- GET generally works on key endpoints;
- HEAD often returns 403 and therefore must not be a core dependency;
- key dynamic data endpoints generally lacked Last-Modified/ETag in testing;
- some static forecast resources do provide cache metadata;
- low-volume testing did not establish a global rate limit.

Do not perform aggressive probing in production.

---

# 21. USER-AGENT / REQUEST PACING

This is implementation detail, not product functionality.

Preferred behavior:
- use a consistent, meaningful User-Agent where appropriate;
- keep request pacing controlled;
- prefer bulk/minimal source requests;
- reuse cached/validated data;
- avoid unnecessary repeated calls.

Do not design the system around deceptive random User-Agent rotation or fake “human simulation”.

The goal is responsible, low-load access to the public source.

---

# 22. AI DEVELOPMENT WORKFLOW — CRITICAL

The project is designed to work with multiple AIs and potentially different models/providers.

The project must remain transferable between AI chats.

Workflow:

`OWNER -> AI ARCHITECT / TECHNICAL MENTOR -> CODING AGENT -> AI REVIEWER -> OWNER`

## 22.1 AI Architect / Technical Mentor

Responsibilities:
- read the project documentation;
- understand owner context;
- understand source evidence;
- break large goals into small tasks;
- explain tasks to the owner in beginner-friendly language;
- propose technical choices;
- guard architecture and scope;
- update durable project documentation when decisions change.

## 22.2 Coding Agent

Reads at minimum:
- `MASTER_SPECIFICATION.md`;
- `ARCHITECTURE.md`;
- `TASKS.md`;
- `DECISIONS.md`;
- relevant portions of `ZHMS_FORENSIC_EVIDENCE.md`.

Implements ONE concrete task at a time.

It must not reinterpret the entire project from scratch for each task.

## 22.3 AI Reviewer

Checks:
- functional correctness;
- tests;
- security;
- architecture;
- regressions;
- source behavior assumptions;
- stale/fresh logic;
- whether the coding agent implemented something not requested.

## 22.4 Owner

The owner:
- prioritizes;
- approves important decisions;
- accepts/rejects outcomes;
- decides when a task is product-complete.

The owner is NOT the project’s human message bus.

---

# 23. SHARED MEMORY DOCUMENTS

The repository should contain at least:

```text
MASTER_SPECIFICATION.md
ZHMS_FORENSIC_EVIDENCE.md
ARCHITECTURE.md
TASKS.md
DECISIONS.md
REVIEW.md
```

Optional as complexity grows:

```text
SOURCE_CONTRACTS.md
TEST_STRATEGY.md
RUNBOOK.md
```

---

# 24. DOCUMENTATION LAYERS

Three concepts must never be mixed:

## Requirement
What the product must do.

## Evidence
What the source/system has actually been shown to do.

## Decision
How the project has chosen to implement something.

Example:

Requirement: current station observations.

Evidence: `aws_m.php` exposes current AWS data through `var posljednje` and station metadata through `var stanice`.

Decision: create a dedicated AWS adapter and normalize it into the application’s station/observation model.

---

# 25. TASK DECOMPOSITION PRINCIPLE

Never assign the whole application as one coding task.

Prefer atomic tasks such as:
- project skeleton;
- AWS fetch adapter;
- AWS parser;
- AWS validator;
- normalized station model;
- persistence;
- freshness logic;
- current station API;
- current extremes;
- time-series ingestion;
- hydrology adapter;
- forecast adapter;
- monitoring;
- tests.

Each task must have clear acceptance criteria.

---

# 26. DEFINITION OF DONE

A task is done only when:
- the requirement is tracked in `TASKS.md`;
- the required implementation exists;
- tests cover the expected behavior;
- relevant edge cases are considered;
- architecture remains coherent;
- documentation is updated;
- decisions are recorded when applicable;
- the reviewer has no critical unresolved issue;
- the owner can understand what was delivered.

---

# 27. PROHIBITIONS

The project must NOT:
- copy the old Python scraper and treat it as the final architecture;
- treat SYNOP as the universal source;
- disable TLS verification;
- trust HTTP 200 without payload validation;
- treat missing values as zeros;
- treat stale observations as current;
- confuse daily Tn/Tx with current extremes;
- make extra ZHMS requests solely to calculate current extremes;
- let invalid payloads overwrite previous known-good data;
- introduce paid infrastructure as a dependency when a free adequate option exists;
- directly scrape ZHMS from the production frontend;
- introduce unnecessary microservices;
- invent meanings for unresolved fields;
- rewrite large parts of the codebase for a small task without justification;
- change architectural decisions silently.

---

# 28. CURRENT BACKEND PRIORITY ORDER

1. repository/project skeleton
2. environment and CI
3. source adapter infrastructure
4. AWS current source
5. AWS normalization
6. persistence
7. freshness
8. selected/current station API
9. all stations API
10. current min/max
11. AWS time series
12. hydrology
13. sea/snow
14. SYNOP
15. daily data
16. official forecast
17. numerical forecast
18. monitoring/observability
19. automated tests and hardening
20. frontend integration

---

# 29. FUTURE FRONTEND SPECIFICATION

Create later:

`FRONTEND_DESIGN_SPEC.md`

That document will consume the stable backend/API model plus the original functional ideas and screenshot references.

It should define:
- layout;
- components;
- responsive behavior;
- mobile UX;
- desktop UX;
- charts;
- maps;
- forecast presentation;
- states;
- loading/error/stale behavior;
- typography and visual hierarchy.

---

# 30. FINAL OPERATING RULE

A new AI entering the project must behave as if this document is the project’s institutional memory.

It must not require the owner to reconstruct the history of previous chats.

Before implementation, it must read this document and the relevant supporting documents.

When evidence is missing, mark it as unresolved instead of silently inventing an answer.

When a new technical decision is made, record it in `DECISIONS.md`.

When the architecture changes, update `ARCHITECTURE.md`.

When work is planned or completed, update `TASKS.md`.

The owner is the product owner and decision-maker; the AI is responsible for carrying as much of the technical burden as safely and practically possible.
