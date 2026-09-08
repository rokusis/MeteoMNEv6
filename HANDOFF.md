# HANDOFF — stanje projekta MeteoMNEv6

Datum: 2026-09-08. Namenjeno sledecem AI agentu (bilo koji model) da nastavi
bez prethodnog chata. Prvo procitaj MASTER_SPECIFICATION.md, DECISIONS.md
(026-035), ARCHITECTURE.md, ZHMS_FORENSIC_EVIDENCE.md (§25), pa ovaj fajl.

## Ko je vlasnik i kako se radi s njim

- Vlasnik je pocetnik, intuicija mu je jaka, tehniku ne zna. Pisi srpski,
  latinica, prosto i opisno, bez metafora i bez strucnih izraza.
- Pre svakog posla: reci sta si razumeo + pitaj da li da krenes. Bez rada pre potvrde.
- Posle posla: reci sta si uradio fajl-po-fajl. Kratke recenice mu nista ne znace.
- Nikad mu ne trazi da lepi tokene ili kljuceve u chat.

## Kako ovaj agent radi (okruzenje, prava)

- Radna kopija: `C:\Users\ADMINI~1\AppData\Local\Temp\opencode\MeteoMNEv6`
  (pl taki klon na Windows masini vlasnika). Push ide direktno odavde.
- Prava: repo-scoped GitHub token stoji SAMO u remote URL-u tog klona
  (vlasnik ga je uneo u svom terminalu, vazi 30 dana od 2026-09-08).
  Nikad ga ne citaj naglas niti lepi u chat. Opovrgni ga brisanjem iz
  remote URL-a + revoke na GitHubu kad vlasnik kaze.
- Codespace vlasnika (`/workspaces/MeteoMNEv6`) se vise ne koristi za kod
  (zna da zaostane; `git pull` pre bilo kakvog rada tamo). Sav kod ide iz
  radne kopije ovde.
- Cloudflare token ima SAMO vlasnik. D1 upite i rucni deploy radi on.
  Auto-deploy (`.github/workflows/deploy.yml`) sam testira, pusta uzivo i
  primenjuje migracije. Migracije 0001-0016 su bazelajnovane u tabeli
  `d1_migrations` (16 redova) pa auto-migrate radi za 0017+.
- Provere bez kljuca: GitHub Actions API (javno), CI check-runs annotations
  (tacna greska fajl:linija), zivi javni API endpointi aplikacije.
- Logove workflow runova mogu citati samo admini (403) — oslanjaj se na
  annotations API i na zive endpointe.
- Lokalna provera ovde: `tscheck/` (pravi tsc + workers-types + vitest-stub),
  `sim*.mjs` simulacije, `vitest-shim.mjs` + `check*.mjs` za logiku testova.
  PowerShell: pazi na backtick escaping i `head` (ne postoji) — koristi
  Select-Object. `npm`/`npx` su blokirani (ExecutionPolicy) — zovi node
  direktno na `node_modules/.bin` ili `npm-cli.js`.

## Zivo stanje (2026-09-08 uvece)

- Aplikacija: https://meteomne-v6.n2racun.workers.dev/
- Krug 1 min: bulk (samo na promenu otiska) -> grafici (dogadjaj, limit 10)
  -> nebo-straza u prozorima -> numericke ture. Krug 10 min: logeri/pisci.
- Dokazano uzivo: bulk ~2 min; H/P/GR ~3 min (Podgorica puna);
  nebo termin 17 svez iz baze; numericke ture cursor 25/25 done sa danasnjim
  datumom; hidro 42/37; more 3 mesta, sneg 0; API 0.21s -> 0.067s iz kesa;
  health endpoint zelen.
- Merenja u toku (48h, citanje ~2026-09-10): official_log, hydro_log,
  sea_snow_log. numerical_log tece i dalje kao mreza.
- CPU limit mejl (1000+ proboja/24h) stigao 2026-09-08: odgovor je dijeta
  (grupni upisi, krug 20->10) — deployovano; presuda po sutrasnjem mejlu.
- Numerical dokaz sutra posle 10h: e3km prozor 09:00-10:30, proveri
  /api/numerical-status (cursor 25/25 done + svez last_modified).

## Otvoreno / sledece

1. Sutra: CPU mejl (dijeta uspesna?), numerical jutarnji dokaz.
2. Prekosutra: citanje 48h obrazaca (zvanicna/reke/more) -> prozori.
3. /api/health postoji; prosirenje po potrebi.
4. TASKS.md je zastareo (kaze kreni od TASK-001) — veci posao za drugi dan.
5. Finalni frontend (FRONTEND_DESIGN_SPEC.md) tek kad backend stabilan.
6. Reviewer flow (docs/REVIEWER_PROMPT.md, grane rev/*) ceka prvu rizicnu izmenu.
7. Token isti ce za ~30 dana — podseti vlasnika na vreme.

## Zamke koje su nas kostale (ne ponavljati)

- Vremena izvora su lokalna Podgorica (+2 leti): parsirati sa DST ofsetom.
- Test-laznjaci moraju tacno: mapiranje kolona po bind poziciji,
  prepare-nivo vs bind-nivo, svez Response po pozivu, red koji select cita.
- Slepe zamene bez assert+readback tri puta nisu legle (ukljucujuci 90s kapiju).
- Prvo punjenje istorije ubija krug: samo-nove-tacke + kap 500 + budzet 20s.
- Slepe ulice: rucni `git pull` u Codespace posle nasih push-eva obavezan
  pre bilo kakvog rada tamo; `nul` fajl od curl -o nul brisati; LF/CRLF
  upozorenja su bezopasna.
- Nikad fetch ka meteo.co.me iz request path-a (stampedo); nikad tokeni u chat.
