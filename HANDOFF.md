# HANDOFF — stanje projekta MeteoMNEv6

Datum: 2026-09-10. Namenjeno sledecem AI agentu (bilo koji model) da nastavi
bez prethodnog chata. Prvo procitaj MASTER_SPECIFICATION.md, DECISIONS.md
(026-036), ARCHITECTURE.md, ZHMS_FORENSIC_EVIDENCE.md (§25), TASKS.md
(faza 15), pa ovaj fajl. Ovaj fajl se obnavlja posle svake vece promene.

## Vlasnik: ko je i kako se radi s njim (obavezno)

- Pocetnik sa jakom intuicijom; tehniku ne zna. Srpski, latinica, prosto i
  opisno, BEZ metafora i BEZ strucnih izraza. Kratke recenice mu nista ne znace.
- Pre svakog posla: reci sta si razumeo + pitaj da li da krenes. Bez rada pre potvrde.
- Posle posla: reci sta si uradio fajl-po-fajl. Pre izmene reci plan.
- Uputstva za interfejse (Cloudflare, GitHub, terminal): korak-po-korak,
  svaki klik, sta pise na dugmetu, sta ocekuje da vidi. Nikad ne pretpostavljaj
  da zna interfejs.
- Nikad mu ne trazi tokene/kljuceve u chat. Nikad tokene u chat ni u fajlove.
- Njegovi motivi (ne zaboraviti): backend uvek svez, kasnjenje max 2-3 min;
  korisnik (1 ili 10 miliona) cita SAMO iz nase baze; max besplatno dok brojke
  ne kazu drugacije; prvo izmeri obrazac pa pravi prozore; nikad nagadjanje.
- Voli da proverava tudje tvrdnje i hvata rupe (recenzent-prompt rupa,
  TASKS trulez, "odakle znas obrazac"). Odgovaraj strogo objektivno, bez ulizivanja.
- Kad trazi proveru tudjeg misljenja: oceni tacno/netacno po tackama, pa predlozi.

## Kako se radi (okruzenje, prava, proces)

- Radna kopija OVDE: `C:\Users\ADMINI~1\AppData\Local\Temp\opencode\MeteoMNEv6`
  (pl taki klon na Windows masini vlasnika). Push ide direktno odavde.
- GitHub token (repo-scoped, 30 dana od 2026-09-08) stoji SAMO u remote URL-u
  tog klona. Revoke + brisanje kad vlasnik kaze. Vazi jos ~28 dana.
- Codespace (`/workspaces/MeteoMNEv6`) se ne koristi za kod. Pre bilo kakvog
  rada tamo obavezan `git pull`. Pazi: lepljenje komandi u editor pravi djubre
  po fajlovima (vidjeno u src/index.ts) + `nul` fajl od `curl -o nul` brisati.
- Cloudflare token ima SAMO vlasnik (D1 upiti, rucni deploy u rezervi).
- Auto CI + auto deploy + auto migracije su zivi (`.github/workflows/`).
  Migracije 0001-0016 bazelajnovane u `d1_migrations`. Nove migracije idu same.
- Provere bez kljuca: Actions API (javno), check-runs annotations (tacna greska
  fajl:linija; log zip trazi admin), zivi javni API endpointi.
- Lokalna provera ovde: `tscheck/` (pravi tsc + workers-types + vitest-stub),
  `sim*.mjs` simulacije pravim podacima, `vitest-shim.mjs` za logiku testova.
  PowerShell zamke: nema `head` (Select-Object), backtick escaping kvari
  heredoc-like zamene (koristi Edit alat), `npm/npx.ps1` blokirani
  (ExecutionPolicy) — node direktno na npm-cli.js ili node_modules bin.
- Svaka izmena: assert + readback (slepe zamene 3x nisu legle).
- Test-laznjaci moraju tacno: kolone po bind poziciji, prepare- vs bind-nivo,
  svez Response po pozivu, red koji select cita. Vecina lazy padova su
  pokvareni laznjaci, ne proizvod.
- Rizicno ide na grane `rev/*` + recenzent (docs/REVIEWER_PROMPT.md); sitno direktno.

## KRITICNO STANJE (2026-09-10): D1 upisi BLOKIRANI

- Free kvota 100k upisa/dan probijena (101k+). Upisi vracaju greske do reseta
  2026-09-10 00:00 UTC. Cit UPC: čitanja rade, aplikacija sluzi zadnje dobro.
- Glavni krivac dokazan tablicom: bulk prepisivao svih 37 stanica+merenja na
  svaki krug (42.5k + 23k redova) jer se jedna promena sirila na sve.
  Popravka deployovana: otisak PO STANICI (samo promenjene se pisu) + indeks
  za numerical_log skeniranje (397k citanja).
- Hiljade redova prvih punjenja su jednokratne (gotove).
- Ako opet probije: strujni prekidac pisce je NAPISAN ali NIJE POSLAT
  (src/lib/breaker.ts + tests/breaker.test.ts, untracked u radnoj kopiji).
  Da se hitno komituje i pushuje ako zatreba.
- Posle reseta pratiti: D1 grafikon (ravno=nisko = dijeta radi) + dnevni mejl.
- CPU limit mejl (1000+ proboja): odgovor je dijeta (grupni upisi, krug 20->10,
  ruta sa kapom) — presuda po sledecem mejlu.

## VAZNO: radi i drugi agent paralelno

- Drugi agent (sa vlasnikom, danju) gura direktno u main: guste straze na
  2 min (hydro/official/sea/numerical), tick otkucaji, merac vazduha (EPA),
  kes-cuvar-decod-036. NE gaziti se: pre pusha uvek `git pull --ff-only`,
  rizicno na rev/* grane.
- Neslaganje za uskladiti: prozori (DEC-030/031) vs uvek-gusto; poslato im
  na recenziju (CHANGES: guard kompletnosti kesa, vazduh ceka odluku vlasnika).
- Zadnji vidjeni head: f294fca (kes cuva zadnje dobro, DEC-036).

## Zivo stanje (provereno)

- App: https://meteomne-v6.n2racun.workers.dev/ — kartice pune (T/vetar/kisa/
  vlaga/pritisak/udar/sunce), tehnicki katalog na dnu, API 0.21s -> 0.067s kes.
- Krug 1 min (bulk otisak-po-stanici -> grafici dogadjaj limit 10 -> straze ->
  numericke ture) + krug 10 min (logeri/pisci). Ivica kes 60s (ne za debug).
- Health: /api/health zelen; greske kruga se pisu u source_status (vidljivo
  na /api/graph-debug bez kljuca).
- Merenja 48h u toku: official_log, hydro_log, sea_snow_log (citanje ~09-10).
- Numericke ture done za oba modela; /api/numerical-status javan.
- Sneg 0 leti (ispravno), Pošćenje crtice = izvor nema podatak (ispravno).

## Otvoreno / sledece

1. D1 reset + presuda dijete (grafikon + mejl).
2. Citanje 48h obrazaca -> prozori za zvanicnu/reke/more.
3. Odluka vlasnika: vazduh (EPA) ulazi ili napolje.
4. Uskladjivanje sa drugim agentom (review CHANGES resen pre sirenja).
5. Prva prava upotreba recenzenta na sledecoj rizicnoj izmeni.
6. Finalni frontend tek kad backend stabilan; TASKS.md sredjen.
7. Token rok ~2026-10-08 — podsetiti na vreme.

## Zamke (ne ponavljati)

- Vremena izvora lokalna Podgorica (+2 leti): DST ofset u parseru.
- Nikad fetch ka meteo.co.me iz request path-a; nikad tokeni u chat.
- Prvo punjenje: samo-nove-tacke + kap 500 + budzet 20s + kursori.
- Subrequest plafon 50 po krugu; CPU dijeta grupnim upisima.
- Prazna baza se sama pokrece (seed pending) — provereno testom.
- Upisivac kesa mora guard kompletnosti (ne prepisuj manje preko veceg).
- Module-level `let` ne vazi preko Worker izolata (otisci moraju u D1).

## Cilj vlasnika (njegovim recima sredjeno)

Vlasnik ciljano uzima podatke sa meteo.co.me: temperaturu, vlaznost, vetar,
pritisak, padavine, udar vetra, insolaciju, zvanicnu i racunarsku prognozu,
temperaturu mora, sneg, reke, plus spisak stanica sa visinama i koordinatama
za kartu. Trazi najpametniji nacin da izvor ne opterecuje previse, sve drzi
u svojoj bazi, i da podaci iz njegove baze ne kasne vise od 2-3 minuta za
najsvezijim na meteo.co.me. Razlog: pravi sopstveni prikaz na frontendu iz
svoje baze, i taj prikaz ne sme da kasni vise od 2-3 minuta.

## Retrospektiva sesije (kako se doslo dovde)

- Pocetak: kontekst izgubljen (700k tokena potroseno, model promenjen,
  greska providera). Vracen preko JSON eksporta razgovora iz repoa.
  Pouka: repo je memorija, ne chat.
- Era nagađanja uzivo: krug "deploy, cekaj 15 minuta, greska" se vrtela danima.
  Prekinuta prelaskom na simulaciju pravim podacima (gladovanje nadjeno za
  par sekundi) + pravi typecheck lokalno + citanje tacnih gresaka iz
  annotations API-ja. Pravilo od tada: prvo dokaz lokalno, pa zivo.
- Vlasnik je korigovao pravac vise puta i svaka korekcija je postala pravilo:
  odgovor na pogresnom jeziku; krpljenje bez citanja greske; lepljenje komandi
  bez objasnjenja; prozori umesto dogadjaja; nagadjanje porekla obrazaca
  (trazio dokaz iz tabele); " Uhvacena rupa u reviewer promptu; TASKS trulez.
- Kljucne prekretnice: vremenska zona (snimci su lokalni); gladovanje u redu
  (sveze pre ponavljanja); prvo punjenje ubija krug (budzet+kap+kursor);
  otisak po stanici umesto celog bulka (kvota); strujni prekidac pisce;
  ivicni kes; auto CI+deploy+migracije; /api/health cuvar.
- Odbacene alternative (sa razlogom, ne napamet): dva Cloudflare naloga
  (siva zona pravila, dupli kvarovi, sporiji frontend); drugi besplatni
  servisi (spavaju, nemaju minutni kron, odrzavanje); placanje 5$ (rezerva,
  odluka tek posle brojki); odvajanje probne stranice u fajl (rizik verzija).
- Saradnja prerasla u: agent radi samostalno ovde (push prava, repo-scoped
  token), vlasnik samo cita sajt i javlja mejlove; gradja se proverava
  javnim endpointima bez kljuca.
