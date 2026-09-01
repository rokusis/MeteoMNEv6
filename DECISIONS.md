# DECISIONS
## Montenegro Weather App — durable project decisions

Rule: this file records WHY the project chose a direction. New AIs must read it before proposing a contradictory architecture.

Status: ACTIVE

---

# DEC-001 — Backend-first before final frontend design

Decision:
Stabilize the backend/data layer before producing the final frontend design specification.

Why:
The UI depends on real source contracts, freshness semantics, normalized data, and API behavior. Designing the final frontend too early risks building UI around assumptions.

Consequence:
Create `FRONTEND_DESIGN_SPEC.md` later.

---

# DEC-002 — Source-specific ZHMS adapters

Decision:
Treat ZHMS as a collection of source/product layers, not a single API.

Why:
Forensic analysis found separate AWS, hydrology, SYNOP, daily, sea/snow, official forecast, and numerical/static forecast sources.

Consequence:
Each source gets its own adapter and validation path.

---

# DEC-003 — SYNOP is not the universal source

Decision:
Never model the whole portal as a SYNOP feed.

Why:
Current domestic measurements and graphs are primarily represented by AWS/internal monitoring and other products. SYNOP is a separate international/regional layer.

Consequence:
SYNOP can only be used for a specific purpose when its role is evidenced.

---

# DEC-004 — No production TLS bypass

Decision:
TLS verification remains enabled.

Why:
One sandbox showed a local CA trust issue; that did not prove the public site certificate was invalid. Disabling TLS would hide the real problem and weaken security.

Consequence:
Fix CA trust/configuration rather than using `verify=false` or `-k`.

---

# DEC-005 — HTTP 200 is not data validity

Decision:
Validate payload content, not just HTTP status.

Why:
Research showed some bad/unsupported requests returning 200 with `no data`, empty structures, or generic pages.

Consequence:
The adapter must recognize expected source content and schema before accepting it.

---

# DEC-006 — Previous-known-good state

Decision:
Invalid new source data must not overwrite the last valid state.

Why:
Public endpoints can fail, return malformed content, or change schema.

Consequence:
Each important source needs valid-state retention and degradation status.

---

# DEC-007 — Current min/max is derived from fresh observations

Decision:
Calculate current extremes from already collected normalized observations.

Why:
The feature is a current comparison, not a daily aggregate, and the original product requirement explicitly includes temperature, wind, and precipitation extremes.

Eligibility:
measurement timestamp must be within 2h of the common reference timestamp.

Consequence:
No extra upstream scrape is triggered solely for extremes.

---

# DEC-008 — Daily Tn/Tx is not current extremes

Decision:
Do not use daily `Tn`/`Tx` as the implementation of `Aktuelni min/max`.

Why:
Daily aggregates are a different source/product and represent daily minima/maxima.

Consequence:
Current extremes are computed from current eligible station observations.

---

# DEC-009 — No single universal refresh interval

Decision:
Use source-specific and observation-aware scheduling.

Why:
Observed AWS, hydrology, sea/snow, forecast, and SYNOP behaviors differ. Multiple AWS observations did not show a single universal cadence.

Consequence:
The scheduler must remain flexible and should evolve as additional measurements of source behavior are collected.

---

# DEC-010 — Cloud-first development

Decision:
Prefer browser/cloud development because the owner’s main Windows laptop is weak.

Why:
The machine has only about 4 GB RAM and limited free disk, making heavy local stacks undesirable.

Consequence:
GitHub/Codespaces/cloud tools are preferred when they remain free and adequate.

---

# DEC-011 — Free-first infrastructure

Decision:
The initial architecture must favor strictly free services.

Why:
Cost is a hard project constraint.

Consequence:
No paid service becomes a core dependency without explicit owner approval and a demonstrated need.

---

# DEC-012 — Cloudflare-oriented initial backend

Decision:
Use Cloudflare Workers + Cron + D1 as the initial production backend direction, with R2 optional.

Why:
It keeps the architecture relatively simple, serverless, and compatible with the cloud-first constraint.

Consequence:
Supabase is not required in V1.

---

# DEC-013 — Frontend does not scrape ZHMS

Decision:
Frontend communicates with the application API, not directly with ZHMS source pages.

Why:
Direct frontend scraping would duplicate parsing logic, expose source dependence, make freshness harder to control, and reduce reliability.

Consequence:
All ZHMS integration lives in backend adapters.

---

# DEC-014 — Normalize before business logic

Decision:
Keep ZHMS-specific arrays/variables inside adapters and normalize them before business logic.

Why:
The application should not be coupled to source-specific array positions everywhere.

Consequence:
Business functions such as current extremes operate on normalized observations.

---

# DEC-015 — Unknown semantics remain unresolved

Decision:
Do not invent semantics for partially understood fields.

Why:
The forensic work found unresolved fields in SYNOP, daily data, and some source metadata.

Consequence:
Use `UNRESOLVED` / `HYPOTHESIS` status until stronger evidence is obtained.

---

# DEC-016 — User-Agent / pacing is implementation detail

Decision:
Use a meaningful consistent User-Agent and controlled request pacing, not random UA rotation as a core mechanism.

Why:
The project needs responsible source access and low request volume, not deceptive traffic simulation.

Consequence:
Request policy belongs to the source HTTP client/adapter layer.

---

# DEC-017 — Repository is shared AI memory

Decision:
The repository documentation is the durable memory across AI providers and chats.

Why:
The owner may switch AI models/providers during development.

Consequence:
No AI should depend on hidden previous-chat context. Durable project facts must be written to repo documents.

---

# DEC-018 — AI role split

Decision:
Use three AI roles plus owner:

`AI Architect/Mentor -> Coding Agent -> AI Reviewer -> Owner`

Why:
Separating planning, implementation, and review reduces scope drift and makes it easier to use different AI models for different jobs.

Consequence:
Coding agents should receive narrow tasks, not the entire project as one instruction.

---

# DEC-019 — Owner is beginner; AI carries technical burden

Decision:
All AI instructions and explanations must account for the owner’s beginner level.

Why:
The project is intended to let the owner direct the product without requiring them to become a professional developer first.

Consequence:
Break work into small steps and explain technical outcomes clearly.

---

# DEC-020 — No giant rewrite for small tasks

Decision:
Coding agents must make minimal scoped changes.

Why:
Large refactors increase regression risk and make review harder.

Consequence:
Any broad refactor requires explicit architectural justification and documentation.

---

# DEC-021 — Python is research/utility, not the production ingestion architecture

Decision:
Python may be used for research, forensic scripts, data analysis, or utilities, but the production backend direction is TypeScript/Cloudflare Workers.

Why:
The target deployment architecture is serverless/cloud-first and should keep runtime concerns consistent.

Consequence:
The old Python scraper is not the final implementation blueprint.

---

# DEC-022 — Forecast static resources may use conditional caching

Decision:
Use Last-Modified/ETag behavior where confirmed and useful for static forecast resources.

Why:
Research found cache metadata on static forecast HTML/SVG resources.

Consequence:
Re-test exact conditional request semantics during implementation. Do not assume all dynamic endpoints behave the same way.

---

# DEC-023 — HEAD is not a required source capability

Decision:
Do not make HEAD part of the required fetch strategy.

Why:
HEAD frequently returned 403 in research while GET worked.

Consequence:
Use GET and, where useful, conditional GET semantics.

---

# DEC-024 — Owner should not act as a courier between AIs

Decision:
Documentation, not owner memory, transfers context.

Why:
The project may be continued by another model/provider.

Consequence:
The owner supplies artifacts and task status, while AI agents read the repo and continue from durable state.
