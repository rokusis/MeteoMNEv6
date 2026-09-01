# ZHMS FORENSIC EVIDENCE
## Public `meteo.co.me` source inventory and observed behavior

Status: RESEARCH EVIDENCE
Purpose: preserve what was actually observed during source investigation so future AIs do not have to rediscover it or turn hypotheses into facts.

Important rule: evidence is not the same as architecture. The architecture document decides how to use the evidence.

---

# 1. GLOBAL FINDINGS

The public ZHMS portal is primarily a classic Apache/PHP/server-rendered site with inline JavaScript and multiple data/product endpoints.

No single modern public JSON/REST API was found that provides all major meteorological data used by the portal.

The public portal is better understood as a collection of separate source/product layers.

Core layers identified:
- AWS current data
- AWS graph/time-series data
- hydrology
- SYNOP
- daily aggregate data
- sea/snow products
- official forecast
- numerical/static forecast products
- static visual products

The most important architectural consequence is:

`SYNOP is NOT the universal feed.`

---

# 2. SOURCE INVENTORY

| ID | Path | Main role | Known output/variables |
|---|---|---|---|
| S01 | `/Meteorologija/aws_m.php` | Current AWS | `var posljednje`, `var stanice` |
| S03 | `/Meteorologija/aws-graph.php?v={tip}&s={ID}` | AWS time series | `var DataAll` |
| S04 | `/Hidrologija/aws_h.php` | Hydrology current + metadata | `var staniceH`, hydrology `var posljednje` |
| S05 | `/Hidrologija/aws-graph-h.php` | Hydrology time series | observed `Data_m` in prior inspection |
| S06 | `/Meteorologija/depese_dnevne.php` | Daily aggregates | `var DataDepeseDnevne` |
| S07 | `/synopT.php` | Montenegro SYNOP | `var sinop` |
| S08 | `/synopT2.php` | regional/Europe SYNOP | `var sinopEU` |
| S09 | `/Meteorologija/TTRR/sneg-talasi.php` | Snow + sea | `snowH2`, `snowT2`, `seaH`, `seaT` |
| S10 | `/page.php?id=31` | Official forecast page | server-rendered forecast content |
| S11 | `/` | Homepage products | inline JS, forecast/alert/sea visuals |
| S12 | homepage sea area | sea display | redundant public display of sea values |
| — | `/Meteorologija/Pr/Gradovi/5danaE/{CITY}-E1.html` ... | Numerical/static forecast | HTML tables, model metadata |

---

# 3. S01/S02 — AWS CURRENT SOURCE

Endpoint:

`/Meteorologija/aws_m.php`

Observed public variables:
- `var posljednje`
- `var stanice`

`var stanice` is station metadata.

A typical station row is approximately:

```text
[stationId, WMO, lat, lon, elevation, name, type, statusFlag]
```

Observed example:
- station ID: `02PDGR10`
- WMO: `13463`
- Podgorica
- latitude approx. `42.43648`
- longitude approx. `19.27199`
- elevation approx. `49`

The station count observed in different research snapshots was not identical, so station count must be treated as dynamic.

The field at index 7 behaves as a status/display flag. Source code inspected during research showed active rows receiving normal marker/dropdown behavior and non-active rows receiving a `notActive` state and “NIJE U FUNKCIJI” type display behavior.

Do not overstate this field as proven physical sensor health.

---

# 4. AWS CURRENT `posljednje`

Observed grouping examples:
- `glavna`
- `klimatoloska`
- `padavinska`

Typical row:

```text
[stationId, type, name, timestamp, T, RR, windSpeed, windDirectionCode, gust]
```

Known semantics:
- `T` = temperature, °C
- `RR` = precipitation, mm
- wind speed = m/s
- gust = m/s
- wind direction = integer code 0–32
- timestamp appears as local-format string such as `31.08.2026 19:40`

Empty string values occur and must not automatically become numeric zero.

Pressure is NOT present in the current row structure observed here.

---

# 5. AWS WIND DIRECTION

AWS wind direction uses a code 0–32.

The portal maps the code using approximately:

`degrees = code * 11.25`

The site also uses compass labels for display.

Do not confuse this with SYNOP `Wdir`, which is expressed differently.

---

# 6. AWS GRAPH — S03

Path:

`/Meteorologija/aws-graph.php?v={tip}&s={ID}`

Expected main variable:

`var DataAll`

Time-series values are represented as timestamp/value pairs.

Known group mappings:

## G1
- `RR`
- `T`
- `H`

Known meaning:
- precipitation;
- temperature;
- humidity.

## G2
- `BRV`
- `PRV`
- `MUV`

Known meaning:
- `BRV` — average/mean wind speed;
- `PRV` — wind direction;
- `MUV` — maximum gust.

`PRV` was confirmed as wind direction through the graph label “Smjer vjetra” and compass mapping.

## G3
- `GR`
- `P`

Known meaning:
- `GR` — portal labels this as `Insolacija (W/m2)`;
- `P` — pressure.

Do not generalize `GR` beyond what the source label proves.

Pressure therefore comes from the time-series graph structure rather than the current `posljednje` row observed in AWS current source.

---

# 7. HYDROLOGY — S04

Endpoint:

`/Hidrologija/aws_h.php`

This endpoint exists publicly.

An earlier contradictory conclusion was caused by testing an incorrect path and must be considered superseded.

Observed variables:
- `var staniceH`
- hydrology `var posljednje`

`staniceH` is grouped by watershed, observed groups including:
- `jadranski`
- `crnomorski`

A typical station metadata row is approximately:

```text
[id, WMO-or-placeholder, lat, lon, elevation, name, stationType, river, flag]
```

Current hydrology values observed in `posljednje` include:
- type;
- name;
- timestamp;
- water level;
- water temperature.

One inspected snapshot contained mostly hourly timestamps, but a universal hydrology cadence was NOT proved.

---

# 8. HYDROLOGY GRAPH — S05

Endpoint:

`/Hidrologija/aws-graph-h.php`

Used for hydrology time series.

Prior inspection observed a `Data_m` style time-series variable.

Exact long-term schema should still be validated by the implementation adapter before being considered locked.

---

# 9. DAILY DATA — S06

Endpoint:

`/Meteorologija/depese_dnevne.php`

Variable:

`var DataDepeseDnevne`

Observed fields:
- `naziv`
- `sifra`
- `datum`
- `RR`
- `Tn`
- `Tx`
- `USN`

Observed data covered multiple recent dates.

`Tn` and `Tx` are daily aggregate temperature values.

They are NOT current min/max values for the application’s `Aktuelni min/max` function.

`USN` meaning was not sufficiently proven and must remain unresolved until stronger evidence is obtained.

---

# 10. SEA / SNOW — S09

Endpoint:

`/Meteorologija/TTRR/sneg-talasi.php`

Observed variables:
- `snowH2`
- `snowT2`
- `seaH`
- `seaT`

Observed facts:
- snow content includes a time around 8h;
- snow table explicitly labels `Visina snijega u 8h (cm)`;
- sea data can have a separate time, and an observed case used approximately 14h;
- therefore sea must NOT be assumed to be available only at 8h;
- homepage sea display can duplicate equivalent sea values from another presentation layer.

Dedicated source should normally be preferred when it provides the same underlying data more directly.

---

# 11. SYNOP — S07/S08

Montenegro source:

`/synopT.php`

Variable:

`sinop`

Regional source:

`/synopT2.php`

Variable:

`sinopEU`

Observed SYNOP fields/examples include:
- `sifra`
- `naziv`
- `sat`
- `T`
- `TTR`
- `P`
- `P0`
- `Ws`
- `Wdir`
- `RH`
- `OBL`
- `ww`
- other source-specific fields.

Some individual SYNOP fields were not fully decoded.

Examples of unresolved or partially resolved fields from research:
- `indRR`
- `indPO`
- `VBNobl`
- `ww`
- `Wpast`
- `G2.talasi`
- `G2.SPM`

These must not be assigned invented semantics.

Most importantly:

SYNOP is a separate layer. It is not the source from which the whole portal is populated.

---

# 12. OFFICIAL FORECAST — S10

Endpoint:

`/page.php?id=31`

Contains official forecast information, including text and seafarer-related content.

The page is part of the CMS/server-rendered site and should not be mistaken for a modern JSON API.

---

# 13. NUMERICAL FORECAST / STATIC FORECAST PRODUCTS

Observed paths follow forms such as:

`/Meteorologija/Pr/Gradovi/5danaE/{CITY}-E1.html`

through later days such as E2, E3, E4, E5.

Observed table concepts:
- day/date;
- Tmin;
- Tmax;
- 00, 03, 06, 09, 12, 15, 18, 21 UTC;
- precipitation;
- humidity;
- weather symbol;
- wind symbol;
- model;
- coordinates;
- elevation;
- model height.

Static forecast resources were observed with HTTP cache metadata such as `Last-Modified` and `ETag`.

One research report indicated `If-Modified-Since` could produce 304 behavior while `If-None-Match` behavior appeared less consistent. This is implementation evidence to re-test, not a universal promise for every file.

---

# 14. STATIC VISUAL PRODUCTS

Observed examples include:
- `cgprognoza-A.svg`
- `cgprognoza-B.svg`
- `jjadran.svg`

These can be large SVG products and are not necessarily convenient as a stable machine-readable source.

Some weather/wind symbol semantics are represented through static SVG/filename structures.

Where a source is visual-only, the backend should not invent a parallel data schema without evidence.

---

# 15. HOMEPAGE / CMS BEHAVIOR

Homepage and CMS pages were observed with cache-control directives such as:
- `no-store`
- `no-cache`
- `must-revalidate`
- `Pragma: no-cache`
- old `Expires` value

A PHP session cookie was observed on CMS pages.

Session dependence for the key AWS/hydrology data endpoints was not proven.

---

# 16. HTTP METHOD OBSERVATIONS

GET requests to key endpoints generally returned 200 during low-volume testing.

HEAD requests frequently returned 403.

Therefore HEAD must not be required for source validation.

Use GET-based validation and, where supported, conditional GET behavior for static/cacheable resources.

---

# 17. HTTP 200 VS DATA VALIDITY

A number of invalid/unsupported requests returned HTTP 200 with content such as:
- `no data`;
- empty `DataAll`;
- generic shells/pages.

Therefore:

`HTTP status == transport result, not semantic validity.`

Adapter parsers must validate the expected variable/structure.

---

# 18. TRUE 404

Nonexistent paths can return actual 404 responses.

This does not remove the requirement for application-level validation because many malformed or unsupported requests still return 200.

---

# 19. TLS EVIDENCE

The public site certificate was valid for `www.meteo.co.me` and browsers could access the site.

One curl/sandbox environment reported a local issuer trust error (`ssl_verify_result 20`).

This was treated as a local trust-chain/runtime issue, not proof that the public server certificate was invalid.

Production must keep TLS verification enabled.

---

# 20. ROBOTS / SITEMAP

During research:
- `robots.txt` returned 200 with no effective `Disallow` rules observed;
- sitemap request returned 404.

These observations are technical, not a legal authorization.

Do not infer legal permission solely from robots.txt behavior.

---

# 21. REFRESH / LONGITUDINAL OBSERVATIONS

Multiple AWS snapshots over a longer observation window showed some stations moving in approximately 10-minute patterns, while other stations showed slower/hourly timestamps.

Another shorter observation window showed no changes.

Conclusion:

The refresh/publication cadence is NOT uniform enough to justify a single hard-coded global interval.

One observed transition suggested that public content for some AWS observations could appear around 10 minutes after an earlier measurement transition in that particular window, but publication delay was not directly measurable in a general way.

Hydrology showed many hourly timestamps in one snapshot, with other times present.

Sea/snow had their own reporting terms.

Forecast resources had a separate generation/update lifecycle.

SYNOP has its own reporting conventions and must not be used to infer AWS cadence.

---

# 22. WHAT REMAINS UNRESOLVED

At the time of this evidence package, keep these unresolved unless further tests prove them:
- exact universal AWS publication latency;
- exact universal station update cadence;
- exact hydrology cadence across all stations;
- all meanings of unknown SYNOP fields;
- definitive meaning of `USN` in daily data;
- full timezone semantics for every endpoint/source;
- complete semantics of all status flags;
- every detail of static SVG weather/wind symbol meaning.

Do not silently turn hypotheses into contracts.

---

# 23. IMPLEMENTATION SAFETY RULE

For every source adapter, preserve the following chain:

`fetch -> recognize -> parse -> validate -> normalize -> persist`

Failure at any stage must be observable.

If parsing/validation fails:
- do not publish new invalid data;
- keep previous-known-good when possible;
- mark source degraded;
- capture enough evidence for debugging.

---

# 24. EVIDENCE CONFIDENCE LANGUAGE

Use:

`CONFIRMED` — directly observed/verified in source behavior.

`SUPPORTED` — strongly supported by multiple observations, but not complete proof of every edge case.

`HYPOTHESIS` — plausible interpretation needing more validation.

`UNRESOLVED` — no safe semantic assignment yet.

This language should be used in future forensic updates.
