# HANDOFF — stanje projekta MeteoMNEv6

Datum: 2026-09-10, dopuna 2026-09-22. Namenjeno sledecem AI agentu (bilo koji model) da nastavi
bez prethodnog chata. Prvo procitaj MASTER_SPECIFICATION.md, DECISIONS.md
(026-044), ARCHITECTURE.md, ZHMS_FORENSIC_EVIDENCE.md (§25), TASKS.md
(faza 15), pa ovaj fajl. Ovaj fajl se obnavlja posle svake vece promene.

## Dopuna 2026-09-20 (novi agent, drugi agent ne radi)

- Drugi paralelni agent ne radi od 16.09. Ostao samo ovaj agent sa vlasnikom.
  Odeljak "VAZNO: radi i drugi agent paralelno" ispod vise ne vazi.
- Radna kopija je sad `C:\Users\ADMINI~1\AppData\Local\Temp\opencode\fresh-MeteoMNEv6`
  (stara pokidana preimenovana u `MeteoMNEv6-pokvareno`, .git bez HEAD/config).
  Public klon + push pravo radi (provereno fetch+push). Cloudflare citanje radi
  preko masinskih promenljivih (posle restarta opencode), deploy ide sam preko
  GitHub Secrets (provereno zeleno).
- Agentmemory citanje od 19.09 ponovo radi (recall/smart_search vracaju).
  Upozorenje od 11.09 (commit 2092f7c) vise ne vazi, repo ostaje glavna memorija.
- Pokusaj treceg agenta od 16.09 (gasenje numerickog meraca u radnoj kopiji,
  neposlato) je odbacen. Vracen fajl na 11.09. Nastavlja se od HANDOFF 10.09.
- Uradjeno 20.09, sve CI+Deploy zeleno, zdravlje zeleno: 66d022b numericki
  merac samo na promenu (~288/dan na ~50/dan); 2a97fea+19dd01f cuvanje razume
  hidro oblik i preskace tacku bez koordinata (Bojana desni-rukavac 10BODR10,
  potvrdjeno prazno na izvoru); 22503e0+d318ed6 dijeta kruga 10->5 po minutu,
  ture 3->2 grada (sveze prvo, kasnjenje 2-3 min ostaje).
- Obrazac izmeren iz pune baze (07-20.09, vise od 48h): zvanicna 345 zapisa,
  samo danju 05-19; reke 193 zapisa, promene skoro svaki put; more 145 zapisa,
  na dan-dva; racunarska 4715 zapisa od 04.09, novo svaki dan a3km ~08:50 i
   e3km ~11:30; vazduh 36 zapisa samo 09.09 (merac nije vezan u krug + strana
   je kasnije proverena: var points postoji, podaci svezi). Odluka vlasnika
   21.09: vazduh ULAZI posle merenja (DEC-042, TASK-162).
- Otvoreno tad: gasenje slusaca (kes ostaje), nocni redji ritam, presuda mejlova,
  pa frontend tek kad stabilno. (Uradjeno 21.09, vidi dopunu ispod.)

## Dopuna 2026-09-21 nocu (zastita + vidljivost + stednja + vazduh + sken)

- Glavna grana zasticena: direktno slanje blokirano, ide preko pomocne grane
  + vlasnik spoji na dugme. Prvo spajanje (PR #1, snop upisa) proslo uz
  jednom bypass jer je ostala i kvacica za odobrenje; vlasnik je sklanja.
- Vidljivost: uspeh reka i mora sad brise staru gresku (06fad7e, 190b7b6).
  Greske 21:20 bile stare poruke, spor krug 22:31/23:51 prosao dobro.
- Stednja: heartbeat belezski jednom dnevno u ponoc (54249e3); zvanicna nocu
  18-02 UTC na pola sata, danju 2 min (a3d638d + testovi).
- Vazduh vezan u spori krug na 10 min (fcb41eb): od 01:01 stize 11 novih
  zapisa, ukupno 47. Sad javlja 9 stanica (bilo 10). Ritam lici na sat vremena.
- Veliki sken popravljen (600cf3b): spisak stanica citao celu tabelu grafova
  147k redova po otvaranju (skokovi 567k/572k). Sad po stanici preko indeksa.
  Tvrdnja Cloudflare pomocnika da je kriv upit od 116 redova je pogresna
  (izmereno: stanice 79, merenja 37, grafovi 147316).
- Snop upisa spozen (d0f664e preko PR #1): stanice+merenja u serijama po 50.
- Brojke Cloudflare 14-21.09: upisi 53-84%/dan (najgori 20.09), citanje skok
  13-15% (sken iznad, popravljen), CPU prosek 18ms prema limitu 10ms, puca
  svaki dan. Dva obrasca: brzo pucanje 06:00/13:00 UTC (izvor nedostupan,
  mali CPU) i sporo uvece (parsiranje+upisi). Gubitka podataka nema
  (zadnje dobro + nastavak od sacuvanog mesta).
- Otvoreno tad: danasnji procenat upisa uvece, jutarnje ture ~08:50/11:30 i
  dnevno kasnjenje ispod 3 min, ritam vazduha + papir za prednji deo.

## Dopuna 2026-09-22 (kes zvanicne + cuvar oblika + prag neba)

- Zvanicna iz baze (DEC-043, PR #4+#5): official_cache + 10-min pisac + kes
  na promenu + ruta iz baze. Prvo CI pao na laznoj bazi (samo test), popravljeno.
- Cuvar oblika seme za AWS i reke (DEC-044, TASK-121 GOTOV, PR #8+#9+#10):
  3 ista nova oblika = novo normalno. CI padao na laznim bazama, popravljeno.
- Prag neba po terminima (dan 180/noc 720) + vazduh null umesto 0 (PR #7).
- D1 93% mejl 22.09 u 01:02 (reset 00:00 UTC). Stara pokvareno fascikla nestala
  sa diska, sa njom i nen poslati prekidac (breaker.ts) - pisati novi ako zatreba.
- Otvoreno: procenat upisa posle reseta, jutarnje ture, ritam vazduha, TASK-140/141.

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

- Radna kopija OVDE: `C:\Users\ADMINI~1\AppData\Local\Temp\opencode\fresh-MeteoMNEv6`
  (svez klon na Windows masini vlasnika, 20-21.09, head d0f664e). Na pomocnu granu
  rev/* pa vlasnik spoji; direktno blokirano zastitom.
- GitHub token (repo-scoped) stoji SAMO u remote URL-u tog klona + trajno u
  masinskim promenljivama za Cloudflare (nikad u chat). Revoke + brisanje kad vlasnik kaze.
- Codespace (`/workspaces/MeteoMNEv6`) se ne koristi za kod. Pre bilo kakvog
  rada tamo obavezan `git pull`. Pazi: lepljenje komandi u editor pravi djubre
  po fajlovima (vidjeno u src/index.ts) + `nul` fajl od `curl -o nul` brisati.
- Cloudflare pristup ima agent lokalno (citanje pune baze provereno 20.09),
  deploy ide sam preko GitHub Secrets (CLOUDFLARE_API_TOKEN + ACCOUNT_ID).
  Rucni deploy/migracije u rezervi zna samo vlasnik.
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

## VAZNO: drugi agent ne radi (od 16.09) — NE VAZI stari paralelni rad

- Drugi agent je stao 16.09 (nedovrsen pokusaj gasenja numerickog meraca,
  odbacen). Ostao samo ovaj agent sa vlasnikom. Nema uskladjivanja, nema
  cuvanja rev/* grane za drugog. Stari tekst o paralelnom guranju u main
  ostaje ispod samo kao istorija.
- (Istorija 10.09: drugi agent danju gurao direktno u main: guste straze,
  tick otkucaji, EPA merac. Zadnji vidjeni head tad: f294fca, DEC-036.)

## Zivo stanje (provereno 20.09)

- App: https://meteomne-v6.n2racun.workers.dev/ — kartice pune (T/vetar/kisa/
  vlaga/pritisak/udar/sunce), tehnicki katalog na dnu, API 0.21s -> 0.067s kes.
- Krug 1 min (bulk otisak-po-stanici -> grafici dogadjaj limit 5 -> straze ->
  numericke ture 2 grada) + krug 10 min (merac samo na promenu + pisci).
  Ivica kes 60s (ne za debug).
- Health: /api/health zelen 20.09 (bulk/grafici 0-8 min, reke ~11-19 min,
  zvanicna/more provereno ~11-19 min); greske kruga u source_status
  (vidljivo na /api/graph-debug bez kljuca).
- Merenja gotova: official 345 zapisa, hydro 193, more 145, numericka 4715
  (obrasci izmereni 07-20.09, DEC-037..039). Slusaci cekaju gasenje, kes ostaje.
- Numericke ture done za oba modela; /api/numerical-status javan.
- Sneg 0 (ispravno), Pošćenje crtice = izvor nema podatak (ispravno).
- Vazduh: 36 zapisa samo 09.09, merac nije vezan + strana bez var points.
  Odluka vlasnika 21.09: vazduh ULAZI posle merenja (DEC-042, TASK-162).

## Otvoreno / sledece (21.09)

1. Danasnji procenat upisa uvece + sutrasnji CPU mejl (presuda dijete).
2. Jutarnje ture ~08:50/11:30 i dnevno kasnjenje ispod 3 min.
3. Ritam vazduha kroz par dana (meri od 21.09), vazduh ULAZI (DEC-042).
4. Proces provere je sad zastita + vlasnik spoji (drugog modela nema).
5. Finalni frontend tek kad backend stabilan.
6. Token rok ~2026-10-08 — podsetiti na vreme.

## Zamke (ne ponavljati)

- Vremena izvora lokalna Podgorica (+2 leti): DST ofset u parseru.
- Nikad fetch ka meteo.co.me iz request path-a; nikad tokeni u chat.
- Prvo punjenje: samo-nove-tacke + kap 500 + budzet 20s + kursori.
- Subrequest plafon 50 po krugu; CPU dijeta grupnim upisima.
- Prazna baza se sama pokrece (seed pending) — provereno testom.
- Upisivac kesa mora guard kompletnosti (ne prepisuj manje preko veceg).
- Module-level `let` ne vazi preko Worker izolata (otisci moraju u D1).
- Prazno nije nula i tacka bez koordinata se ne crta: Bojana desni-rukavac
  (10BODR10) nema koordinate na izvoru (potvrdjeno 20.09 drugim modelom);
  preskoci upis u tabelu stanica, voda ide kroz kes. Vazi i za svaku sledecu.
- Cuvanje mora da razume oba oblika zapisa (AWS stationId/latitude/longitude,
  hidro id/lat/lon) i da prazno pretvori u nista; red bez imena se preskoci.
- Test mora da se menja zajedno sa budzetom (limit 10->5 srusio CI 20.09).
- Krug je pretezak cim minutni uspeh stari a pocetak svez + subrequest greska:
  smanji grafici/ture, sveze prvo, merac kasnjenja dokazuje (granica 3 min).
- Agentmemory citanje od 19.09 ponovo radi; upozorenje od 11.09 ne vazi.
  (Ostaje: repo je glavna memorija.)
- Stara pokidana kopija je u `MeteoMNEv6-pokvareno` (git bez HEAD/config);
  radna je `fresh-MeteoMNEv6`. Slaba masina: novi browser se ne otvara
  (Min je glavni); dozvole idu preko masinskih promenljivih + Secrets, nikad chat.

## Cilj vlasnika (njegovim recima sredjeno)

Vlasnik ciljano uzima podatke sa meteo.co.me: temperaturu, vlaznost, vetar,
pritisak, padavine, udar vetra, insolaciju, zvanicnu i racunarsku prognozu,
temperaturu mora, sneg, reke, plus spisak stanica sa visinama i koordinatama
za kartu. Trazi najpametniji nacin da izvor ne opterecuje previse, sve drzi
u svojoj bazi, i da podaci iz njegove baze ne kasne vise od 2-3 minuta za
najsvezijim na meteo.co.me. Razlog: pravi sopstveni prikaz na frontendu iz
svoje baze, i taj prikaz ne sme da kasni vise od 2-3 minuta.

## Retrospektiva sesije (kako se doslo dovde — sa pogresnim putevima)

- Pocetak: kontekst izgubljen (700k tokena potroseno, model promenjen,
  greska providera). Vracen preko JSON eksporta razgovora iz repoa
  (11 MB, 999 poruka). Pouka: repo je memorija, ne chat (DEC-017 vazi).
- Era nagadjanja uzivo: krug "deploy, cekaj 15 minuta, greska" se vrteo danima.
  Prekinut prelaskom na: simulaciju pravim snimcima, pravi tsc lokalno
  (tscheck/), citanje tacnih gresaka iz check-runs annotations API-ja
  (log zip trazi admin). Pravilo od tada: prvo dokaz lokalno, pa zivo.
- Pogresan put 1 (prozori): fiksni polling 8-12 min za grafike. Greska: prozor
  sam garantuje lag (sim: 10-14 min). Zamena: okidac je pomeren snimak
  (DEC-027). Dokaz: sim max ~3 min + Podgorica sva polja sveza uzivo.
- Pogresan put 2 (vremenska zona): snimci citani kao UTC. Greska: sistemska
  2h greska, stanice nikad zrele (samo Kovren sa starim snimkom prolazio).
  Dokaz: fetchedAt 19:55 UTC vs snimak 21:40 — iz buducnosti je nemoguce,
  dakle lokalno. Zamena: DST ofset u parseru + letnji/zimski test.
- Pogresan put 3 (red po starosti): retry stanice bez novih podataka jele
  slotove (BIST20/BOAN30), Podgorica gladovala. Zamena: sveze pre ponavljanja
  + parkiranje (miss cap) + budjenje novim snimkom.
- Pogresan put 4 (prvo punjenje): cela istorija odjednom red-po-red ubijala
  krug timeout-om; Podgorica nikad nije dobila ni red (dokazano: c=1 samo
  Kovren). Zamena: samo-nove-tacke + kap 500 + budzet 20s + kursori + budzet
  i usred stanice.
- Pogresan put 5 (otisak celog bulka): jedna promena sirila upis na svih 37
  (dashboard dokaz: 42.5k + 23k redova, kvota probijena). Zamena: otisak po
  stanici (a1c0b3e).
- CPU mejl (1000+ proboja): odgovor dijeta — grupni upisi (db.batch sa
  fallbackom), krug 20->10 (sim rep ~5 min), ruta sa kapom. Presuda po mejlu.
- Kvota D1 probijena (101k, blokada do 2026-09-10 00:00 UTC): lekcije su
  tacke iznad; strujni prekidac pisce napisan ceka sledeci proboj.
- Vlasnik je korigovao pravac i svaka korekcija je postala pravilo: odgovor
  na pogresnom jeziku; krpljenje bez citanja greske; lepljenje komandi bez
  objasnjenja i bez opisa uradjenog; nagadjanje porekla obrazaca (trazio dokaz
  iz numerical_log tabele — e3km ~09:30 potvrdjen 5. dan); uhvacena rupa u
  reviewer promptu (nedostajala provera uskladjenosti); TASKS trulez.
- Odbacene alternative (sa razlogom, ne napamet): dva Cloudflare naloga
  (siva zona pravila, dupli kvarovi, sporiji frontend); drugi besplatni
  servisi (spavaju, nemaju minutni kron, odrzavanje); placanje 5$ (rezerva,
  odluka tek posle brojki); odvajanje probne stranice u fajl (rizik verzija).
- Saradnja prerasla u: agent radi samostalno ovde (push prava, repo-scoped
  token 30 dana), vlasnik samo cita sajt i javlja mejlove; gradja se proverava
  javnim endpointima bez kljuca; rucni deploy/migracije zamenjeni auto
  workflowom (d1_migrations bazelajn 16).
- Puna prica po tackama: commit poruke u git logu, REVIEW-027..033,
  ZHMS odeljak 25, DEC-026..036, testovi kao izvrsna specifikacija ponasanja.
