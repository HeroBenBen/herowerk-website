# Raster-Befund 2026-08-20

Quelle: lokaler Arbeitsstand des Repos
Vorgesehen: 30 Seiten x 8 Breiten = 240 Laeufe.
Gemessen: 240 Dokumente.
Ergebnis: PASS (0 harte Befunde).

> **Nicht alle Regeln stehen scharf.** Dieser Lauf urteilt eingeschraenkt:
> - R2 (r2_kanten_inventar): aktiv true, streng false

## Regel 1: Container-Ueberstand (hart): PASS

## Regel 3: Kind nimmt die Aussenbreite statt der Inhaltsbreite (hart): PASS

## Regel 4: Seitenrand-Treue vollbreiter Container (hart): PASS

## Regel 5: erklaerter Seitenversatz schmalerer Bloecke (hart): PASS

## Regel 6: Fensterkanten-Ueberstand (hart): PASS

## Regel 2: Kanten-Inventar: PASS

## Abdeckung (was die Regeln ueberhaupt angefasst haben)

> Eine Regel, die nichts prueft, meldet PASS und ist gefaehrlicher als eine abgeschaltete. Diese Tabelle weist aus, wie viele Elemente je Regel **befundfaehig** waren, also einen Befund haetten erzeugen koennen. Gezaehlt werden ausdruecklich NICHT die Seitenaufrufe: die erste Fassung von Regel 6 meldete "232 Dokumente geprueft" und konnte auf 26 von 29 Seiten baulich nichts messen.

> Steht in einer Spalte 0, ist die Regel auf dieser Seite wirkungslos. Das ist nicht automatisch ein Fehler: Regel 4 greift nur auf vollbreiten Containern, Regel 5 nur auf schmaleren Bloecken in Blockcontainern, und Regel 6 nur auf Elementen, die die Fensterkante ueberhaupt erreichen koennen. Auf `anfrage.html` klippt `main#main-content.funnel-panel` selbst waagerecht, dort traegt Regel 1 die Pruefung. Wo eine Regel ueber alle Breiten hinweg 0 erreicht, steht der Fall unten ausdruecklich in der Liste, statt in der Gesamtsumme zu verschwinden.

**Befundfaehige Elemente je Breite, alle 30 Seiten zusammen**

> Diese Tabelle steht hier, weil eine Zusammenfassung ueber alle Breiten genau das verdeckt, wofuer das Gate gebaut wurde: der Ursprungsfehler vom 26.07.2026 war ein Telefonfehler. Wo eine Regel auf den Telefonbreiten kaum Elemente erreicht, schuetzt sie dort auch nicht.

| Breite | Regel 1+3 | Regel 4 | Regel 5 | Regel 6 |
|---|---|---|---|---|
| 320 px | 3924 | 69 | 1 | 3508 |
| 360 px | 3926 | 69 | 1 | 3508 |
| 375 px | 3926 | 69 | 1 | 3509 |
| 390 px | 3927 | 69 | 1 | 3509 |
| 414 px | 3927 | 69 | 1 | 3509 |
| 600 px | 4067 | 69 | 3 | 3644 |
| 768 px | 4080 | 69 | 66 | 3651 |
| 960 px | 4113 | 61 | 119 | 3649 |

**Regeln ohne befundfaehiges Element ueber alle Breiten dieser Seite**

| Seite | Regel | Laeufe |
|---|---|---|
| anfrage | Regel 4 | 8 |
| datenschutz | Regel 4 | 8 |
| datenschutz | Regel 5 | 8 |
| impressum | Regel 4 | 8 |
| impressum | Regel 5 | 8 |
| kostenvergleich-waermepumpe | Regel 4 | 8 |

| Seite | Breite | Elemente | davon sichtbar | in Regel 1+3 | in Regel 4 | in Regel 5 | in Regel 6 |
|---|---|---|---|---|---|---|---|
| amortisation-waermepumpe | 320 px | 191 | 102 | 93 | 2 | 0 | 100 |
| anfrage | 320 px | 824 | 100 | 42 | 0 | 1 | 6 |
| barrierefreiheit | 320 px | 195 | 111 | 102 | 1 | 0 | 109 |
| baubarkeitspruefung | 320 px | 199 | 112 | 103 | 2 | 0 | 110 |
| bewerbung | 320 px | 215 | 124 | 94 | 2 | 0 | 101 |
| datenschutz | 320 px | 96 | 94 | 80 | 0 | 0 | 82 |
| dimensionierung | 320 px | 907 | 132 | 77 | 2 | 0 | 52 |
| dimensionierung-verstehen | 320 px | 193 | 109 | 99 | 2 | 0 | 89 |
| foerderung | 320 px | 397 | 293 | 232 | 5 | 0 | 208 |
| foerderung-hannover | 320 px | 219 | 132 | 122 | 2 | 0 | 111 |
| foerderung-jetzt-mitnehmen | 320 px | 297 | 213 | 202 | 1 | 0 | 145 |
| foerdervorschuss | 320 px | 209 | 120 | 107 | 3 | 0 | 118 |
| gasheizung-tauschen-oder-reparieren | 320 px | 198 | 111 | 102 | 2 | 0 | 109 |
| hinweise | 320 px | 184 | 96 | 87 | 3 | 0 | 94 |
| impressum | 320 px | 52 | 50 | 34 | 0 | 0 | 36 |
| index | 320 px | 377 | 274 | 214 | 8 | 0 | 140 |
| karriere | 320 px | 961 | 484 | 424 | 7 | 0 | 431 |
| kontakt | 320 px | 188 | 99 | 88 | 2 | 0 | 91 |
| kostenvergleich-waermepumpe | 320 px | 757 | 58 | 45 | 0 | 0 | 57 |
| preise | 320 px | 276 | 156 | 143 | 6 | 0 | 150 |
| propan-waermepumpe | 320 px | 195 | 111 | 102 | 1 | 0 | 109 |
| prozess | 320 px | 232 | 130 | 116 | 3 | 0 | 97 |
| ratgeber | 320 px | 436 | 340 | 320 | 5 | 0 | 179 |
| rechner | 320 px | 221 | 137 | 125 | 2 | 0 | 80 |
| waermepumpe-altbau | 320 px | 194 | 106 | 97 | 2 | 0 | 104 |
| waermepumpe-hannover | 320 px | 183 | 97 | 88 | 2 | 0 | 95 |
| waermepumpe-laerm | 320 px | 214 | 130 | 121 | 1 | 0 | 128 |
| waermepumpenstrom-hannover | 320 px | 228 | 144 | 127 | 1 | 0 | 142 |
| wertsteigerung-waermepumpe | 320 px | 278 | 194 | 184 | 1 | 0 | 125 |
| wp-kosten-hannover | 320 px | 254 | 169 | 154 | 1 | 0 | 110 |
| amortisation-waermepumpe | 360 px | 191 | 102 | 93 | 2 | 0 | 100 |
| anfrage | 360 px | 824 | 100 | 42 | 0 | 1 | 6 |
| barrierefreiheit | 360 px | 195 | 111 | 102 | 1 | 0 | 109 |
| baubarkeitspruefung | 360 px | 199 | 112 | 103 | 2 | 0 | 110 |
| bewerbung | 360 px | 215 | 124 | 94 | 2 | 0 | 101 |
| datenschutz | 360 px | 96 | 94 | 80 | 0 | 0 | 82 |
| dimensionierung | 360 px | 907 | 132 | 77 | 2 | 0 | 52 |
| dimensionierung-verstehen | 360 px | 193 | 109 | 100 | 2 | 0 | 89 |
| foerderung | 360 px | 397 | 293 | 232 | 5 | 0 | 208 |
| foerderung-hannover | 360 px | 219 | 132 | 122 | 2 | 0 | 111 |
| foerderung-jetzt-mitnehmen | 360 px | 297 | 213 | 202 | 1 | 0 | 145 |
| foerdervorschuss | 360 px | 209 | 120 | 107 | 3 | 0 | 118 |
| gasheizung-tauschen-oder-reparieren | 360 px | 198 | 111 | 102 | 2 | 0 | 109 |
| hinweise | 360 px | 184 | 96 | 87 | 3 | 0 | 94 |
| impressum | 360 px | 52 | 50 | 34 | 0 | 0 | 36 |
| index | 360 px | 377 | 274 | 214 | 8 | 0 | 140 |
| karriere | 360 px | 961 | 484 | 424 | 7 | 0 | 431 |
| kontakt | 360 px | 188 | 99 | 88 | 2 | 0 | 91 |
| kostenvergleich-waermepumpe | 360 px | 757 | 58 | 45 | 0 | 0 | 57 |
| preise | 360 px | 276 | 156 | 143 | 6 | 0 | 150 |
| propan-waermepumpe | 360 px | 195 | 111 | 102 | 1 | 0 | 109 |
| prozess | 360 px | 232 | 130 | 116 | 3 | 0 | 97 |
| ratgeber | 360 px | 436 | 340 | 320 | 5 | 0 | 179 |
| rechner | 360 px | 221 | 137 | 125 | 2 | 0 | 80 |
| waermepumpe-altbau | 360 px | 194 | 106 | 97 | 2 | 0 | 104 |
| waermepumpe-hannover | 360 px | 183 | 97 | 88 | 2 | 0 | 95 |
| waermepumpe-laerm | 360 px | 214 | 130 | 121 | 1 | 0 | 128 |
| waermepumpenstrom-hannover | 360 px | 228 | 144 | 127 | 1 | 0 | 142 |
| wertsteigerung-waermepumpe | 360 px | 278 | 194 | 185 | 1 | 0 | 125 |
| wp-kosten-hannover | 360 px | 254 | 169 | 154 | 1 | 0 | 110 |
| amortisation-waermepumpe | 375 px | 191 | 102 | 93 | 2 | 0 | 100 |
| anfrage | 375 px | 824 | 100 | 42 | 0 | 1 | 6 |
| barrierefreiheit | 375 px | 195 | 111 | 102 | 1 | 0 | 109 |
| baubarkeitspruefung | 375 px | 199 | 112 | 103 | 2 | 0 | 110 |
| bewerbung | 375 px | 215 | 124 | 94 | 2 | 0 | 101 |
| datenschutz | 375 px | 96 | 94 | 80 | 0 | 0 | 82 |
| dimensionierung | 375 px | 907 | 132 | 77 | 2 | 0 | 52 |
| dimensionierung-verstehen | 375 px | 193 | 109 | 100 | 2 | 0 | 89 |
| foerderung | 375 px | 397 | 293 | 232 | 5 | 0 | 208 |
| foerderung-hannover | 375 px | 219 | 132 | 122 | 2 | 0 | 111 |
| foerderung-jetzt-mitnehmen | 375 px | 297 | 213 | 202 | 1 | 0 | 145 |
| foerdervorschuss | 375 px | 209 | 120 | 107 | 3 | 0 | 118 |
| gasheizung-tauschen-oder-reparieren | 375 px | 198 | 111 | 102 | 2 | 0 | 109 |
| hinweise | 375 px | 184 | 96 | 87 | 3 | 0 | 94 |
| impressum | 375 px | 52 | 50 | 34 | 0 | 0 | 36 |
| index | 375 px | 377 | 274 | 214 | 8 | 0 | 140 |
| karriere | 375 px | 961 | 484 | 424 | 7 | 0 | 431 |
| kontakt | 375 px | 188 | 99 | 88 | 2 | 0 | 91 |
| kostenvergleich-waermepumpe | 375 px | 757 | 58 | 45 | 0 | 0 | 57 |
| preise | 375 px | 276 | 156 | 143 | 6 | 0 | 151 |
| propan-waermepumpe | 375 px | 195 | 111 | 102 | 1 | 0 | 109 |
| prozess | 375 px | 232 | 130 | 116 | 3 | 0 | 97 |
| ratgeber | 375 px | 436 | 340 | 320 | 5 | 0 | 179 |
| rechner | 375 px | 221 | 137 | 125 | 2 | 0 | 80 |
| waermepumpe-altbau | 375 px | 194 | 106 | 97 | 2 | 0 | 104 |
| waermepumpe-hannover | 375 px | 183 | 97 | 88 | 2 | 0 | 95 |
| waermepumpe-laerm | 375 px | 214 | 130 | 121 | 1 | 0 | 128 |
| waermepumpenstrom-hannover | 375 px | 228 | 144 | 127 | 1 | 0 | 142 |
| wertsteigerung-waermepumpe | 375 px | 278 | 194 | 185 | 1 | 0 | 125 |
| wp-kosten-hannover | 375 px | 254 | 169 | 154 | 1 | 0 | 110 |
| amortisation-waermepumpe | 390 px | 191 | 102 | 93 | 2 | 0 | 100 |
| anfrage | 390 px | 824 | 100 | 42 | 0 | 1 | 6 |
| barrierefreiheit | 390 px | 195 | 111 | 102 | 1 | 0 | 109 |
| baubarkeitspruefung | 390 px | 199 | 112 | 103 | 2 | 0 | 110 |
| bewerbung | 390 px | 215 | 124 | 94 | 2 | 0 | 101 |
| datenschutz | 390 px | 96 | 94 | 80 | 0 | 0 | 82 |
| dimensionierung | 390 px | 907 | 132 | 77 | 2 | 0 | 52 |
| dimensionierung-verstehen | 390 px | 193 | 109 | 100 | 2 | 0 | 89 |
| foerderung | 390 px | 397 | 293 | 232 | 5 | 0 | 208 |
| foerderung-hannover | 390 px | 219 | 132 | 122 | 2 | 0 | 111 |
| foerderung-jetzt-mitnehmen | 390 px | 297 | 213 | 202 | 1 | 0 | 145 |
| foerdervorschuss | 390 px | 209 | 120 | 107 | 3 | 0 | 118 |
| gasheizung-tauschen-oder-reparieren | 390 px | 198 | 111 | 102 | 2 | 0 | 109 |
| hinweise | 390 px | 184 | 96 | 87 | 3 | 0 | 94 |
| impressum | 390 px | 52 | 50 | 34 | 0 | 0 | 36 |
| index | 390 px | 377 | 274 | 214 | 8 | 0 | 140 |
| karriere | 390 px | 961 | 484 | 424 | 7 | 0 | 431 |
| kontakt | 390 px | 188 | 99 | 88 | 2 | 0 | 91 |
| kostenvergleich-waermepumpe | 390 px | 757 | 58 | 45 | 0 | 0 | 57 |
| preise | 390 px | 276 | 156 | 144 | 6 | 0 | 151 |
| propan-waermepumpe | 390 px | 195 | 111 | 102 | 1 | 0 | 109 |
| prozess | 390 px | 232 | 130 | 116 | 3 | 0 | 97 |
| ratgeber | 390 px | 436 | 340 | 320 | 5 | 0 | 179 |
| rechner | 390 px | 221 | 137 | 125 | 2 | 0 | 80 |
| waermepumpe-altbau | 390 px | 194 | 106 | 97 | 2 | 0 | 104 |
| waermepumpe-hannover | 390 px | 183 | 97 | 88 | 2 | 0 | 95 |
| waermepumpe-laerm | 390 px | 214 | 130 | 121 | 1 | 0 | 128 |
| waermepumpenstrom-hannover | 390 px | 228 | 144 | 127 | 1 | 0 | 142 |
| wertsteigerung-waermepumpe | 390 px | 278 | 194 | 185 | 1 | 0 | 125 |
| wp-kosten-hannover | 390 px | 254 | 169 | 154 | 1 | 0 | 110 |
| amortisation-waermepumpe | 414 px | 191 | 102 | 93 | 2 | 0 | 100 |
| anfrage | 414 px | 824 | 100 | 42 | 0 | 1 | 6 |
| barrierefreiheit | 414 px | 195 | 111 | 102 | 1 | 0 | 109 |
| baubarkeitspruefung | 414 px | 199 | 112 | 103 | 2 | 0 | 110 |
| bewerbung | 414 px | 215 | 124 | 94 | 2 | 0 | 101 |
| datenschutz | 414 px | 96 | 94 | 80 | 0 | 0 | 82 |
| dimensionierung | 414 px | 907 | 132 | 77 | 2 | 0 | 52 |
| dimensionierung-verstehen | 414 px | 193 | 109 | 100 | 2 | 0 | 89 |
| foerderung | 414 px | 397 | 293 | 232 | 5 | 0 | 208 |
| foerderung-hannover | 414 px | 219 | 132 | 122 | 2 | 0 | 111 |
| foerderung-jetzt-mitnehmen | 414 px | 297 | 213 | 202 | 1 | 0 | 145 |
| foerdervorschuss | 414 px | 209 | 120 | 107 | 3 | 0 | 118 |
| gasheizung-tauschen-oder-reparieren | 414 px | 198 | 111 | 102 | 2 | 0 | 109 |
| hinweise | 414 px | 184 | 96 | 87 | 3 | 0 | 94 |
| impressum | 414 px | 52 | 50 | 34 | 0 | 0 | 36 |
| index | 414 px | 377 | 274 | 214 | 8 | 0 | 140 |
| karriere | 414 px | 961 | 484 | 424 | 7 | 0 | 431 |
| kontakt | 414 px | 188 | 99 | 88 | 2 | 0 | 91 |
| kostenvergleich-waermepumpe | 414 px | 757 | 58 | 45 | 0 | 0 | 57 |
| preise | 414 px | 276 | 156 | 144 | 6 | 0 | 151 |
| propan-waermepumpe | 414 px | 195 | 111 | 102 | 1 | 0 | 109 |
| prozess | 414 px | 232 | 130 | 116 | 3 | 0 | 97 |
| ratgeber | 414 px | 436 | 340 | 320 | 5 | 0 | 179 |
| rechner | 414 px | 221 | 137 | 125 | 2 | 0 | 80 |
| waermepumpe-altbau | 414 px | 194 | 106 | 97 | 2 | 0 | 104 |
| waermepumpe-hannover | 414 px | 183 | 97 | 88 | 2 | 0 | 95 |
| waermepumpe-laerm | 414 px | 214 | 130 | 121 | 1 | 0 | 128 |
| waermepumpenstrom-hannover | 414 px | 228 | 144 | 127 | 1 | 0 | 142 |
| wertsteigerung-waermepumpe | 414 px | 278 | 194 | 185 | 1 | 0 | 125 |
| wp-kosten-hannover | 414 px | 254 | 169 | 154 | 1 | 0 | 110 |
| amortisation-waermepumpe | 600 px | 191 | 117 | 98 | 2 | 0 | 105 |
| anfrage | 600 px | 824 | 100 | 42 | 0 | 1 | 6 |
| barrierefreiheit | 600 px | 195 | 126 | 107 | 1 | 0 | 114 |
| baubarkeitspruefung | 600 px | 199 | 127 | 108 | 2 | 0 | 115 |
| bewerbung | 600 px | 215 | 139 | 99 | 2 | 0 | 106 |
| datenschutz | 600 px | 96 | 94 | 80 | 0 | 0 | 82 |
| dimensionierung | 600 px | 907 | 147 | 82 | 2 | 0 | 57 |
| dimensionierung-verstehen | 600 px | 193 | 124 | 105 | 2 | 0 | 94 |
| foerderung | 600 px | 397 | 308 | 238 | 5 | 0 | 213 |
| foerderung-hannover | 600 px | 219 | 147 | 128 | 2 | 0 | 116 |
| foerderung-jetzt-mitnehmen | 600 px | 297 | 228 | 208 | 1 | 0 | 150 |
| foerdervorschuss | 600 px | 209 | 135 | 112 | 3 | 0 | 123 |
| gasheizung-tauschen-oder-reparieren | 600 px | 198 | 126 | 107 | 2 | 0 | 114 |
| hinweise | 600 px | 184 | 111 | 92 | 3 | 0 | 99 |
| impressum | 600 px | 52 | 50 | 34 | 0 | 0 | 36 |
| index | 600 px | 377 | 289 | 220 | 8 | 1 | 145 |
| karriere | 600 px | 961 | 499 | 429 | 7 | 0 | 436 |
| kontakt | 600 px | 188 | 114 | 93 | 2 | 0 | 96 |
| kostenvergleich-waermepumpe | 600 px | 757 | 73 | 50 | 0 | 1 | 62 |
| preise | 600 px | 276 | 171 | 149 | 6 | 0 | 156 |
| propan-waermepumpe | 600 px | 195 | 126 | 107 | 1 | 0 | 114 |
| prozess | 600 px | 232 | 145 | 121 | 3 | 0 | 102 |
| ratgeber | 600 px | 436 | 355 | 325 | 5 | 0 | 184 |
| rechner | 600 px | 221 | 152 | 130 | 2 | 0 | 85 |
| waermepumpe-altbau | 600 px | 194 | 121 | 102 | 2 | 0 | 109 |
| waermepumpe-hannover | 600 px | 183 | 112 | 93 | 2 | 0 | 100 |
| waermepumpe-laerm | 600 px | 214 | 145 | 126 | 1 | 0 | 133 |
| waermepumpenstrom-hannover | 600 px | 228 | 159 | 132 | 1 | 0 | 147 |
| wertsteigerung-waermepumpe | 600 px | 278 | 209 | 190 | 1 | 0 | 130 |
| wp-kosten-hannover | 600 px | 254 | 184 | 160 | 1 | 0 | 115 |
| amortisation-waermepumpe | 768 px | 191 | 117 | 98 | 2 | 1 | 105 |
| anfrage | 768 px | 824 | 100 | 42 | 0 | 1 | 6 |
| barrierefreiheit | 768 px | 195 | 126 | 107 | 1 | 1 | 114 |
| baubarkeitspruefung | 768 px | 199 | 127 | 108 | 2 | 2 | 115 |
| bewerbung | 768 px | 215 | 139 | 99 | 2 | 3 | 106 |
| datenschutz | 768 px | 96 | 94 | 80 | 0 | 0 | 82 |
| dimensionierung | 768 px | 907 | 147 | 82 | 2 | 2 | 57 |
| dimensionierung-verstehen | 768 px | 193 | 124 | 105 | 2 | 3 | 94 |
| foerderung | 768 px | 397 | 308 | 238 | 5 | 2 | 213 |
| foerderung-hannover | 768 px | 219 | 147 | 128 | 2 | 2 | 116 |
| foerderung-jetzt-mitnehmen | 768 px | 297 | 228 | 209 | 1 | 2 | 150 |
| foerdervorschuss | 768 px | 209 | 135 | 112 | 3 | 2 | 123 |
| gasheizung-tauschen-oder-reparieren | 768 px | 198 | 126 | 107 | 2 | 2 | 114 |
| hinweise | 768 px | 184 | 111 | 92 | 3 | 1 | 99 |
| impressum | 768 px | 52 | 50 | 34 | 0 | 0 | 36 |
| index | 768 px | 377 | 289 | 220 | 8 | 8 | 145 |
| karriere | 768 px | 961 | 499 | 429 | 7 | 4 | 436 |
| kontakt | 768 px | 188 | 114 | 93 | 2 | 2 | 96 |
| kostenvergleich-waermepumpe | 768 px | 757 | 82 | 64 | 0 | 1 | 71 |
| preise | 768 px | 276 | 171 | 147 | 6 | 5 | 154 |
| propan-waermepumpe | 768 px | 195 | 126 | 107 | 1 | 2 | 114 |
| prozess | 768 px | 232 | 145 | 121 | 3 | 2 | 102 |
| ratgeber | 768 px | 436 | 355 | 325 | 5 | 3 | 184 |
| rechner | 768 px | 221 | 152 | 130 | 2 | 1 | 85 |
| waermepumpe-altbau | 768 px | 194 | 121 | 102 | 2 | 2 | 109 |
| waermepumpe-hannover | 768 px | 183 | 112 | 93 | 2 | 2 | 100 |
| waermepumpe-laerm | 768 px | 214 | 145 | 126 | 1 | 2 | 133 |
| waermepumpenstrom-hannover | 768 px | 228 | 159 | 132 | 1 | 3 | 147 |
| wertsteigerung-waermepumpe | 768 px | 278 | 209 | 190 | 1 | 2 | 130 |
| wp-kosten-hannover | 768 px | 254 | 184 | 160 | 1 | 3 | 115 |
| amortisation-waermepumpe | 960 px | 191 | 117 | 98 | 1 | 3 | 105 |
| anfrage | 960 px | 824 | 172 | 89 | 0 | 1 | 7 |
| barrierefreiheit | 960 px | 195 | 126 | 107 | 1 | 2 | 114 |
| baubarkeitspruefung | 960 px | 199 | 127 | 108 | 1 | 4 | 115 |
| bewerbung | 960 px | 215 | 139 | 99 | 2 | 2 | 106 |
| datenschutz | 960 px | 96 | 94 | 80 | 0 | 0 | 82 |
| dimensionierung | 960 px | 907 | 147 | 82 | 2 | 3 | 57 |
| dimensionierung-verstehen | 960 px | 193 | 124 | 105 | 2 | 4 | 94 |
| foerderung | 960 px | 397 | 308 | 238 | 5 | 4 | 213 |
| foerderung-hannover | 960 px | 219 | 147 | 128 | 1 | 4 | 116 |
| foerderung-jetzt-mitnehmen | 960 px | 297 | 228 | 209 | 1 | 3 | 150 |
| foerdervorschuss | 960 px | 209 | 135 | 112 | 2 | 4 | 123 |
| gasheizung-tauschen-oder-reparieren | 960 px | 198 | 126 | 107 | 1 | 4 | 114 |
| hinweise | 960 px | 184 | 111 | 92 | 2 | 3 | 99 |
| impressum | 960 px | 52 | 50 | 34 | 0 | 0 | 36 |
| index | 960 px | 377 | 289 | 224 | 8 | 3 | 145 |
| karriere | 960 px | 961 | 499 | 429 | 7 | 30 | 436 |
| kontakt | 960 px | 188 | 114 | 93 | 2 | 1 | 96 |
| kostenvergleich-waermepumpe | 960 px | 757 | 82 | 64 | 0 | 1 | 71 |
| preise | 960 px | 276 | 171 | 147 | 6 | 9 | 154 |
| propan-waermepumpe | 960 px | 195 | 126 | 107 | 1 | 3 | 114 |
| prozess | 960 px | 232 | 123 | 99 | 3 | 3 | 99 |
| ratgeber | 960 px | 436 | 355 | 325 | 5 | 4 | 184 |
| rechner | 960 px | 221 | 152 | 130 | 2 | 2 | 85 |
| waermepumpe-altbau | 960 px | 194 | 121 | 102 | 1 | 4 | 109 |
| waermepumpe-hannover | 960 px | 183 | 112 | 93 | 1 | 4 | 100 |
| waermepumpe-laerm | 960 px | 214 | 145 | 126 | 1 | 3 | 133 |
| waermepumpenstrom-hannover | 960 px | 228 | 159 | 136 | 1 | 4 | 147 |
| wertsteigerung-waermepumpe | 960 px | 278 | 209 | 190 | 1 | 3 | 130 |
| wp-kosten-hannover | 960 px | 254 | 184 | 160 | 1 | 4 | 115 |

## Waagerechte Rollbreite (Kontextzahl, kein Urteil)

> `documentElement.scrollWidth` gegen `clientWidth`. Diese Zahl ist bewusst KEIN Pruefkriterium mehr: `css/site.css` setzt `overflow-x: clip` auf `html` und `body`, damit ist sie auf jeder Seite mit diesem Stylesheet auf `clientWidth` geklemmt. Das Urteil faellt Regel 6 aus den Elementkanten. Steht hier ein Ueberschuss, rollt die Seite zusaetzlich waagerecht.

Kein Ueberschuss auf 240 Dokumenten.

## Kanten-Inventar (Bericht)

> Regel 2 laeuft als Bericht ohne Fehlerabbruch. Grund: Kanten-Erwartung noch nicht mit Benjamin ratifiziert (Uebergabe 26.07., BLOCKED-Kriterium Einheit 2). Bis dahin Bericht ohne Fehlerabbruch.

**amortisation-waermepumpe, 320 px: 7 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 10 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 6 | li, strong, li |
| 136.27 px | 1 | a.mobile-phone-cta |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**anfrage, 320 px: 15 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 6 | div.funnel-layout, main#main-content.funnel-panel, div.funnel-header |
| 20 px | 9 | div.step.active, h2.step-question, p.step-hint |
| 24 px | 6 | div.funnel-header-logo, img.logo-dark, div.progress-bar-top |
| 42 px | 3 | div.answer-card-icon, div.answer-card-icon, div.answer-card-icon |
| 45.39 px | 1 | a |
| 57 px | 3 | svg, svg, svg |
| 61.17 px | 5 | g, path, g |
| 61.47 px | 1 | path |
| 65.8 px | 1 | path |
| 98.84 px | 1 | span#stepCounter.funnel-step-counter |
| 99.16 px | 1 | a |
| 138 px | 9 | div.answer-card-text, div.answer-card-label, div.answer-card-sub |
| 152.77 px | 1 | a |
| 206.47 px | 1 | a.funnel-close-link |
| 214.41 px | 1 | span#progressPercent.progress-percent |

**barrierefreiheit, 320 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 16 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 2 | li, li |
| 136.27 px | 1 | a.mobile-phone-cta |
| 173.72 px | 1 | strong |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**baubarkeitspruefung, 320 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 18 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 136.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**bewerbung, 320 px: 11 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#bewerbung.contact |
| 24 px | 9 | a, img.nav-logo.logo-dark, div.section-inner |
| 39 px | 6 | div.bewerbung-steps, span, span |
| 40 px | 24 | div.form-group, label, select#bwRolle |
| 58 px | 1 | strong |
| 65 px | 1 | label |
| 136.27 px | 1 | a.mobile-phone-cta |
| 163.03 px | 1 | span.form-optional |
| 175.27 px | 1 | span.mobile-phone-label |
| 193.77 px | 1 | span.form-optional |
| 252 px | 1 | div#hamburger.hamburger |

**datenschutz, 320 px: 6 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 24 px | 1 | main#main-content |
| 45 px | 13 | div.topbar, a, button.theme-toggle |
| 49 px | 1 | span.tt-feld |
| 102.28 px | 1 | a |
| 110.22 px | 1 | a |
| 116.88 px | 1 | span.tt-feld |

**dimensionierung, 320 px: 10 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 5 | div.nav-inner, main#main-content, section#wizard.wizard-section |
| 24 px | 15 | a, img.nav-logo.logo-dark, div.section-inner |
| 49 px | 10 | div#wizProgress.wizard-progress, div.wizard-step.active, div.wizard-question |
| 53 px | 2 | h2#abschluss-angebot, p |
| 65.97 px | 1 | a.btn-primary |
| 136.27 px | 1 | a.mobile-phone-cta |
| 166 px | 1 | button#wzPlzNext.wizard-btn-next.is-disabled |
| 175.27 px | 1 | span.mobile-phone-label |
| 176 px | 6 | div.footer-col, h2, a |
| 252 px | 1 | div#hamburger.hamburger |

**dimensionierung-verstehen, 320 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 136.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**foerderung, 320 px: 10 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#foerder.foerder-section |
| 24 px | 7 | a, img.nav-logo.logo-dark, div.section-inner |
| 39 px | 39 | div, div.foerder-inputs-grid, div.fi-group |
| 43 px | 2 | button.active, button.active |
| 60 px | 1 | span |
| 136.27 px | 1 | a.mobile-phone-cta |
| 159.42 px | 1 | button |
| 162 px | 1 | button |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**foerderung-hannover, 320 px: 10 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 20 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 136.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 175.27 px | 1 | span.mobile-phone-label |
| 180.05 px | 3 | th, td, td |
| 244.73 px | 3 | th, td, td |
| 252 px | 1 | div#hamburger.hamburger |

**foerderung-jetzt-mitnehmen, 320 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 17 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 136.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**foerdervorschuss, 320 px: 6 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 10 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 136.27 px | 1 | a.mobile-phone-cta |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**gasheizung-tauschen-oder-reparieren, 320 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 4 | li, li, li |
| 70.95 px | 1 | a |
| 136.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**hinweise, 320 px: 6 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 11 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 136.27 px | 1 | a.mobile-phone-cta |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**impressum, 320 px: 6 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 24 px | 1 | main#main-content |
| 45 px | 18 | div.topbar, a, button.theme-toggle |
| 49 px | 1 | span.tt-feld |
| 102.28 px | 1 | a |
| 110.22 px | 1 | a |
| 116.88 px | 1 | span.tt-feld |

**index, 320 px: 17 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 6 | div.nav-inner, main#main-content, section.hero |
| 24 px | 24 | a, img.nav-logo.logo-dark, div.hero-inner |
| 25 px | 4 | div.hc-row, div.hc-row, div.hc-result |
| 43 px | 5 | div, div.hc-label, div |
| 49 px | 3 | div.hc-fv-badge, div.hc-fv-text, strong |
| 53 px | 2 | a#fvHomeCta.btn-primary.fv-badge-cta, div.fv-badge-note |
| 66 px | 4 | div.usp-text, h2, div.usp-text |
| 91.28 px | 2 | div.usp-item, div.usp-icon |
| 133.28 px | 2 | div.usp-text, h2 |
| 136.27 px | 1 | a.mobile-phone-cta |
| 168 px | 4 | div.usp-item, div.usp-icon, div.usp-item |
| 175.27 px | 1 | span.mobile-phone-label |
| 182.47 px | 1 | div.hc-result-value |
| 200.08 px | 1 | div.hc-value |
| 210 px | 4 | div.usp-text, h2, div.usp-text |
| 210.94 px | 1 | div.hc-value |
| 252 px | 1 | div#hamburger.hamburger |

**karriere, 320 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#hero.section.kar-hero |
| 24 px | 18 | a, img.nav-logo.logo-dark, div.section-inner |
| 51 px | 4 | span.kar-icon, h3, p |
| 62 px | 2 | svg, svg |
| 107.59 px | 1 | strong |
| 136.27 px | 1 | a.mobile-phone-cta |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**kontakt, 320 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#contact.contact |
| 24 px | 14 | a, img.nav-logo.logo-dark, div.section-inner |
| 48 px | 2 | div.contact-image-caption-title, div.contact-image-caption-sub |
| 57 px | 28 | div.form-group, label, input#kontaktName |
| 82 px | 1 | label |
| 88.05 px | 1 | span.form-optional |
| 92.61 px | 1 | span.form-optional |
| 111.34 px | 1 | span.form-optional |
| 118.7 px | 1 | span.form-optional |
| 136.27 px | 1 | a.mobile-phone-cta |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**kostenvergleich-waermepumpe, 320 px: 16 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, header.page-head, div.container |
| 16 px | 20 | div.page-head-inner, h1, span.accent |
| 17 px | 2 | summary, div.inhalt |
| 24 px | 2 | a, img.nav-logo.logo-dark |
| 25 px | 1 | button#wzBack |
| 30 px | 7 | p.wz-intro, p.wz-intro, strong |
| 31 px | 1 | span.wz-stepper-label |
| 31.61 px | 1 | a |
| 93.55 px | 1 | a |
| 123.42 px | 1 | a |
| 136.27 px | 1 | a.mobile-phone-cta |
| 175.27 px | 1 | span.mobile-phone-label |
| 203.42 px | 1 | a |
| 216.5 px | 1 | button#wzNext.wz-next |
| 221 px | 1 | span.punkte |
| 252 px | 1 | div#hamburger.hamburger |

**preise, 320 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#preise-intro.section |
| 24 px | 14 | a, img.nav-logo.logo-dark, div.section-inner |
| 43.44 px | 1 | strong |
| 44 px | 6 | li, strong, li |
| 73.5 px | 1 | div.section-tag |
| 136.27 px | 1 | a.mobile-phone-cta |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**propan-waermepumpe, 320 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 13 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 2 | li, strong |
| 70.95 px | 1 | a |
| 136.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**prozess, 320 px: 11 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#prozess.prozess |
| 24 px | 14 | a, img.nav-logo.logo-dark, div.section-inner |
| 36 px | 19 | h2, p, div#pzSub1.pz-substeps |
| 100.53 px | 2 | button.pz-expand-hint, button.pz-expand-hint |
| 117.53 px | 2 | span.pz-hint-text, span.pz-hint-text |
| 124 px | 3 | div.pz-step-num, div.pz-step-num, div.pz-step-num |
| 126.52 px | 1 | span.pz-time |
| 136.27 px | 1 | a.mobile-phone-cta |
| 136.91 px | 1 | span.pz-time |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**ratgeber, 320 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| -243.92 px | 1 | image |
| 0 px | 3 | div.nav-inner, main#main-content, section#blog.blog-section.ratgeber-hub |
| 24 px | 21 | a, img.nav-logo.logo-dark, div.section-inner |
| 25 px | 4 | div.blog-card-art.guide-visual.guide-visual-altbau, div.blog-card-body, div.blog-card-art.guide-visual.guide-visual-sound |
| 45 px | 12 | div.blog-card-tag, h2, p |
| 55.62 px | 1 | image |
| 101 px | 2 | svg, img.guide-icon-img |
| 114.61 px | 1 | span |
| 116.56 px | 1 | span |
| 136.27 px | 1 | a.mobile-phone-cta |
| 175.27 px | 1 | span.mobile-phone-label |
| 180.14 px | 1 | span |
| 252 px | 1 | div#hamburger.hamburger |

**rechner, 320 px: 14 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| -162.07 px | 1 | image |
| 0 px | 3 | div.nav-inner, main#main-content, section.rechner-hub.section |
| 24 px | 13 | a, img.nav-logo.logo-dark, div.section-inner |
| 25 px | 5 | div.rechner-card-art.blog-card-art.guide-visual, div.rechner-card-body, div.rechner-card-art.blog-card-art.guide-visual |
| 45 px | 12 | div.rechner-card-kicker, h2, p |
| 75 px | 1 | img.guide-icon-img |
| 92 px | 1 | svg |
| 94.7 px | 1 | span |
| 104 px | 1 | span.rechner-wp-unit.rechner-wp-unit-single |
| 114.61 px | 1 | span |
| 136.27 px | 1 | a.mobile-phone-cta |
| 170.17 px | 1 | span |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**waermepumpe-altbau, 320 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 13 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 6 | li, strong, li |
| 70.95 px | 1 | a |
| 136.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**waermepumpe-hannover, 320 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 136.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**waermepumpe-laerm, 320 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 13 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 100.88 px | 1 | strong |
| 136.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**waermepumpenstrom-hannover, 320 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 11 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 136.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**wertsteigerung-waermepumpe, 320 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 11 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 136.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**wp-kosten-hannover, 320 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 11 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 136.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 175.27 px | 1 | span.mobile-phone-label |
| 252 px | 1 | div#hamburger.hamburger |

**amortisation-waermepumpe, 360 px: 7 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 10 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 8 | li, strong, li |
| 156.27 px | 1 | a.mobile-phone-cta |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**anfrage, 360 px: 15 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 6 | div.funnel-layout, main#main-content.funnel-panel, div.funnel-header |
| 20 px | 9 | div.step.active, h2.step-question, p.step-hint |
| 24 px | 6 | div.funnel-header-logo, img.logo-dark, div.progress-bar-top |
| 42 px | 3 | div.answer-card-icon, div.answer-card-icon, div.answer-card-icon |
| 56.8 px | 3 | svg, svg, svg |
| 61 px | 5 | g, path, g |
| 61.3 px | 1 | path |
| 65.39 px | 1 | a |
| 65.67 px | 1 | path |
| 118.84 px | 1 | span#stepCounter.funnel-step-counter |
| 119.16 px | 1 | a |
| 138 px | 9 | div.answer-card-text, div.answer-card-label, div.answer-card-sub |
| 172.77 px | 1 | a |
| 246.47 px | 1 | a.funnel-close-link |
| 254.41 px | 1 | span#progressPercent.progress-percent |

**barrierefreiheit, 360 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 16 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 4 | li, li, li |
| 66.44 px | 1 | strong |
| 156.27 px | 1 | a.mobile-phone-cta |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**baubarkeitspruefung, 360 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 20 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 2 | li, strong |
| 70.95 px | 1 | a |
| 156.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**bewerbung, 360 px: 11 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#bewerbung.contact |
| 24 px | 9 | a, img.nav-logo.logo-dark, div.section-inner |
| 39 px | 6 | div.bewerbung-steps, span, span |
| 40 px | 24 | div.form-group, label, select#bwRolle |
| 58 px | 1 | strong |
| 65 px | 2 | label, a |
| 156.27 px | 1 | a.mobile-phone-cta |
| 163.03 px | 1 | span.form-optional |
| 193.77 px | 1 | span.form-optional |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**datenschutz, 360 px: 5 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 24 px | 1 | main#main-content |
| 45 px | 17 | div.topbar, a, button.theme-toggle |
| 49 px | 1 | span.tt-feld |
| 110.22 px | 1 | a |
| 116.88 px | 1 | span.tt-feld |

**dimensionierung, 360 px: 10 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 5 | div.nav-inner, main#main-content, section#wizard.wizard-section |
| 24 px | 18 | a, img.nav-logo.logo-dark, div.section-inner |
| 49 px | 10 | div#wizProgress.wizard-progress, div.wizard-step.active, div.wizard-question |
| 53 px | 2 | h2#abschluss-angebot, p |
| 85.97 px | 1 | a.btn-primary |
| 156.27 px | 1 | a.mobile-phone-cta |
| 186 px | 1 | button#wzPlzNext.wizard-btn-next.is-disabled |
| 195.27 px | 1 | span.mobile-phone-label |
| 196 px | 9 | div.footer-col, h2, a |
| 292 px | 1 | div#hamburger.hamburger |

**dimensionierung-verstehen, 360 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 195.27 px | 1 | span.mobile-phone-label |
| 212.3 px | 1 | a |
| 292 px | 1 | div#hamburger.hamburger |

**foerderung, 360 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#foerder.foerder-section |
| 24 px | 7 | a, img.nav-logo.logo-dark, div.section-inner |
| 39 px | 39 | div, div.foerder-inputs-grid, div.fi-group |
| 43 px | 2 | button.active, button.active |
| 60 px | 1 | span |
| 156.27 px | 1 | a.mobile-phone-cta |
| 182 px | 2 | button, button |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**foerderung-hannover, 360 px: 10 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 22 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 180.05 px | 4 | th, td, td |
| 195.27 px | 1 | span.mobile-phone-label |
| 244.73 px | 4 | th, td, td |
| 292 px | 1 | div#hamburger.hamburger |

**foerderung-jetzt-mitnehmen, 360 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 18 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**foerdervorschuss, 360 px: 7 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 11 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 156.27 px | 1 | a.mobile-phone-cta |
| 179.41 px | 1 | strong |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**gasheizung-tauschen-oder-reparieren, 360 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 4 | li, li, li |
| 70.95 px | 1 | a |
| 156.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**hinweise, 360 px: 6 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 13 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 156.27 px | 1 | a.mobile-phone-cta |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**impressum, 360 px: 6 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 24 px | 1 | main#main-content |
| 45 px | 18 | div.topbar, a, button.theme-toggle |
| 49 px | 1 | span.tt-feld |
| 102.28 px | 1 | a |
| 110.22 px | 1 | a |
| 116.88 px | 1 | span.tt-feld |

**index, 360 px: 17 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 6 | div.nav-inner, main#main-content, section.hero |
| 24 px | 27 | a, img.nav-logo.logo-dark, div.hero-inner |
| 25 px | 4 | div.hc-row, div.hc-row, div.hc-result |
| 43 px | 5 | div, div.hc-label, div |
| 49 px | 3 | div.hc-fv-badge, div.hc-fv-text, strong |
| 53 px | 2 | a#fvHomeCta.btn-primary.fv-badge-cta, div.fv-badge-note |
| 66 px | 4 | div.usp-text, h2, div.usp-text |
| 111.28 px | 2 | div.usp-item, div.usp-icon |
| 153.28 px | 2 | div.usp-text, h2 |
| 156.27 px | 1 | a.mobile-phone-cta |
| 188 px | 4 | div.usp-item, div.usp-icon, div.usp-item |
| 195.27 px | 1 | span.mobile-phone-label |
| 222.47 px | 1 | div.hc-result-value |
| 230 px | 4 | div.usp-text, h2, div.usp-text |
| 240.08 px | 1 | div.hc-value |
| 250.94 px | 1 | div.hc-value |
| 292 px | 1 | div#hamburger.hamburger |

**karriere, 360 px: 7 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#hero.section.kar-hero |
| 24 px | 19 | a, img.nav-logo.logo-dark, div.section-inner |
| 51 px | 6 | span.kar-icon, h3, p |
| 62 px | 2 | svg, svg |
| 156.27 px | 1 | a.mobile-phone-cta |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**kontakt, 360 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#contact.contact |
| 24 px | 14 | a, img.nav-logo.logo-dark, div.section-inner |
| 48 px | 2 | div.contact-image-caption-title, div.contact-image-caption-sub |
| 57 px | 28 | div.form-group, label, input#kontaktName |
| 82 px | 1 | label |
| 88.05 px | 1 | span.form-optional |
| 92.61 px | 1 | span.form-optional |
| 111.34 px | 1 | span.form-optional |
| 118.7 px | 1 | span.form-optional |
| 156.27 px | 1 | a.mobile-phone-cta |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**kostenvergleich-waermepumpe, 360 px: 16 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, header.page-head, div.container |
| 16 px | 20 | div.page-head-inner, h1, span.accent |
| 17 px | 2 | summary, div.inhalt |
| 24 px | 2 | a, img.nav-logo.logo-dark |
| 25 px | 1 | button#wzBack |
| 30 px | 7 | p.wz-intro, p.wz-intro, strong |
| 31 px | 1 | span.wz-stepper-label |
| 50.73 px | 1 | a |
| 74.75 px | 1 | a |
| 156.27 px | 1 | a.mobile-phone-cta |
| 184.63 px | 1 | a |
| 195.27 px | 1 | span.mobile-phone-label |
| 256.5 px | 1 | button#wzNext.wz-next |
| 260.44 px | 1 | a |
| 261 px | 1 | span.punkte |
| 292 px | 1 | div#hamburger.hamburger |

**preise, 360 px: 10 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#preise-intro.section |
| 24 px | 17 | a, img.nav-logo.logo-dark, div.section-inner |
| 31.08 px | 1 | strong |
| 44 px | 6 | li, strong, li |
| 47 px | 2 | div.pa-cta-icon, svg |
| 89 px | 3 | div, div.pa-cta-text, div.pa-cta-sub |
| 93.5 px | 1 | div.section-tag |
| 156.27 px | 1 | a.mobile-phone-cta |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**propan-waermepumpe, 360 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 6 | li, strong, li |
| 70.95 px | 1 | a |
| 156.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**prozess, 360 px: 11 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#prozess.prozess |
| 24 px | 14 | a, img.nav-logo.logo-dark, div.section-inner |
| 36 px | 19 | h2, p, div#pzSub1.pz-substeps |
| 120.53 px | 2 | button.pz-expand-hint, button.pz-expand-hint |
| 137.53 px | 2 | span.pz-hint-text, span.pz-hint-text |
| 144 px | 3 | div.pz-step-num, div.pz-step-num, div.pz-step-num |
| 146.52 px | 1 | span.pz-time |
| 156.27 px | 1 | a.mobile-phone-cta |
| 156.91 px | 1 | span.pz-time |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**ratgeber, 360 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| -223.92 px | 1 | image |
| 0 px | 3 | div.nav-inner, main#main-content, section#blog.blog-section.ratgeber-hub |
| 24 px | 22 | a, img.nav-logo.logo-dark, div.section-inner |
| 25 px | 5 | div.blog-card-art.guide-visual.guide-visual-altbau, div.blog-card-body, div.blog-card-art.guide-visual.guide-visual-sound |
| 45 px | 12 | div.blog-card-tag, h2, p |
| 75.62 px | 1 | image |
| 114.61 px | 1 | span |
| 116.56 px | 1 | span |
| 121 px | 3 | svg, img.guide-icon-img, svg |
| 156.27 px | 1 | a.mobile-phone-cta |
| 180.14 px | 1 | span |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**rechner, 360 px: 14 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| -142.07 px | 1 | image |
| 0 px | 3 | div.nav-inner, main#main-content, section.rechner-hub.section |
| 24 px | 13 | a, img.nav-logo.logo-dark, div.section-inner |
| 25 px | 6 | div.rechner-card-art.blog-card-art.guide-visual, div.rechner-card-body, div.rechner-card-art.blog-card-art.guide-visual |
| 45 px | 12 | div.rechner-card-kicker, h2, p |
| 94.7 px | 1 | span |
| 95 px | 1 | img.guide-icon-img |
| 112 px | 1 | svg |
| 114.61 px | 1 | span |
| 124 px | 1 | span.rechner-wp-unit.rechner-wp-unit-single |
| 156.27 px | 1 | a.mobile-phone-cta |
| 170.17 px | 1 | span |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**waermepumpe-altbau, 360 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 13 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 6 | li, strong, li |
| 70.95 px | 1 | a |
| 156.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**waermepumpe-hannover, 360 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**waermepumpe-laerm, 360 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**waermepumpenstrom-hannover, 360 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 11 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**wertsteigerung-waermepumpe, 360 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 11 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**wp-kosten-hannover, 360 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 19 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 138.86 px | 2 | th, td |
| 156.27 px | 1 | a.mobile-phone-cta |
| 156.34 px | 1 | span |
| 195.27 px | 1 | span.mobile-phone-label |
| 292 px | 1 | div#hamburger.hamburger |

**amortisation-waermepumpe, 375 px: 7 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 11 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 8 | li, strong, li |
| 163.77 px | 1 | a.mobile-phone-cta |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**anfrage, 375 px: 16 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 6 | div.funnel-layout, main#main-content.funnel-panel, div.funnel-header |
| 20 px | 9 | div.step.active, h2.step-question, p.step-hint |
| 24 px | 6 | div.funnel-header-logo, img.logo-dark, div.progress-bar-top |
| 42 px | 3 | div.answer-card-icon, div.answer-card-icon, div.answer-card-icon |
| 57 px | 3 | svg, svg, svg |
| 61.37 px | 2 | g, path |
| 61.38 px | 3 | g, g, path |
| 61.7 px | 1 | path |
| 66.24 px | 1 | path |
| 72.89 px | 1 | a |
| 126.34 px | 1 | span#stepCounter.funnel-step-counter |
| 126.66 px | 1 | a |
| 140.5 px | 9 | div.answer-card-text, div.answer-card-label, div.answer-card-sub |
| 180.27 px | 1 | a |
| 261.47 px | 1 | a.funnel-close-link |
| 269.41 px | 1 | span#progressPercent.progress-percent |

**barrierefreiheit, 375 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 16 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 5 | li, li, li |
| 66.44 px | 1 | strong |
| 163.77 px | 1 | a.mobile-phone-cta |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**baubarkeitspruefung, 375 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 20 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 4 | li, strong, li |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 163.77 px | 1 | a.mobile-phone-cta |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**bewerbung, 375 px: 11 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#bewerbung.contact |
| 24 px | 9 | a, img.nav-logo.logo-dark, div.section-inner |
| 39 px | 6 | div.bewerbung-steps, span, span |
| 40 px | 25 | div.form-group, label, select#bwRolle |
| 58 px | 1 | strong |
| 65 px | 3 | label, a, label |
| 163.03 px | 1 | span.form-optional |
| 163.77 px | 1 | a.mobile-phone-cta |
| 193.77 px | 1 | span.form-optional |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**datenschutz, 375 px: 5 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 24 px | 1 | main#main-content |
| 45 px | 17 | div.topbar, a, button.theme-toggle |
| 49 px | 1 | span.tt-feld |
| 110.22 px | 1 | a |
| 116.88 px | 1 | span.tt-feld |

**dimensionierung, 375 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 5 | div.nav-inner, main#main-content, section#wizard.wizard-section |
| 24 px | 19 | a, img.nav-logo.logo-dark, div.section-inner |
| 49 px | 10 | div#wizProgress.wizard-progress, div.wizard-step.active, div.wizard-question |
| 53 px | 2 | h2#abschluss-angebot, p |
| 84.22 px | 1 | a |
| 93.47 px | 1 | a.btn-primary |
| 113.69 px | 1 | a |
| 163.77 px | 1 | a.mobile-phone-cta |
| 193.5 px | 1 | button#wzPlzNext.wizard-btn-next.is-disabled |
| 202.77 px | 1 | span.mobile-phone-label |
| 203.5 px | 10 | div.footer-col, h2, a |
| 307 px | 1 | div#hamburger.hamburger |

**dimensionierung-verstehen, 375 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 163.77 px | 1 | a.mobile-phone-cta |
| 202.77 px | 1 | span.mobile-phone-label |
| 212.3 px | 1 | a |
| 307 px | 1 | div#hamburger.hamburger |

**foerderung, 375 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#foerder.foerder-section |
| 24 px | 7 | a, img.nav-logo.logo-dark, div.section-inner |
| 39 px | 39 | div, div.foerder-inputs-grid, div.fi-group |
| 43 px | 2 | button.active, button.active |
| 60 px | 1 | span |
| 163.77 px | 1 | a.mobile-phone-cta |
| 189.5 px | 2 | button, button |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**foerderung-hannover, 375 px: 10 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 22 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 163.77 px | 1 | a.mobile-phone-cta |
| 180.05 px | 4 | th, td, td |
| 202.77 px | 1 | span.mobile-phone-label |
| 244.73 px | 4 | th, td, td |
| 307 px | 1 | div#hamburger.hamburger |

**foerderung-jetzt-mitnehmen, 375 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 18 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 163.77 px | 1 | a.mobile-phone-cta |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**foerdervorschuss, 375 px: 7 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 12 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 163.77 px | 1 | a.mobile-phone-cta |
| 179.41 px | 1 | strong |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**gasheizung-tauschen-oder-reparieren, 375 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 4 | li, li, li |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 163.77 px | 1 | a.mobile-phone-cta |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**hinweise, 375 px: 6 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 13 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 163.77 px | 1 | a.mobile-phone-cta |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**impressum, 375 px: 6 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 24 px | 1 | main#main-content |
| 45 px | 18 | div.topbar, a, button.theme-toggle |
| 49 px | 1 | span.tt-feld |
| 102.28 px | 1 | a |
| 110.22 px | 1 | a |
| 116.88 px | 1 | span.tt-feld |

**index, 375 px: 17 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 6 | div.nav-inner, main#main-content, section.hero |
| 24 px | 27 | a, img.nav-logo.logo-dark, div.hero-inner |
| 25 px | 4 | div.hc-row, div.hc-row, div.hc-result |
| 43 px | 5 | div, div.hc-label, div |
| 49 px | 3 | div.hc-fv-badge, div.hc-fv-text, strong |
| 53 px | 2 | a#fvHomeCta.btn-primary.fv-badge-cta, div.fv-badge-note |
| 66 px | 4 | div.usp-text, h2, div.usp-text |
| 118.78 px | 2 | div.usp-item, div.usp-icon |
| 160.78 px | 2 | div.usp-text, h2 |
| 163.77 px | 1 | a.mobile-phone-cta |
| 195.5 px | 4 | div.usp-item, div.usp-icon, div.usp-item |
| 202.77 px | 1 | span.mobile-phone-label |
| 237.47 px | 1 | div.hc-result-value |
| 237.5 px | 4 | div.usp-text, h2, div.usp-text |
| 255.08 px | 1 | div.hc-value |
| 265.94 px | 1 | div.hc-value |
| 307 px | 1 | div#hamburger.hamburger |

**karriere, 375 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#hero.section.kar-hero |
| 24 px | 18 | a, img.nav-logo.logo-dark, div.section-inner |
| 51 px | 6 | span.kar-icon, h3, p |
| 62 px | 2 | svg, svg |
| 163.77 px | 1 | a.mobile-phone-cta |
| 202.77 px | 1 | span.mobile-phone-label |
| 217.88 px | 1 | strong |
| 307 px | 1 | div#hamburger.hamburger |

**kontakt, 375 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#contact.contact |
| 24 px | 14 | a, img.nav-logo.logo-dark, div.section-inner |
| 48 px | 2 | div.contact-image-caption-title, div.contact-image-caption-sub |
| 57 px | 28 | div.form-group, label, input#kontaktName |
| 82 px | 1 | label |
| 88.05 px | 1 | span.form-optional |
| 92.61 px | 1 | span.form-optional |
| 111.34 px | 1 | span.form-optional |
| 118.7 px | 1 | span.form-optional |
| 163.77 px | 1 | a.mobile-phone-cta |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**kostenvergleich-waermepumpe, 375 px: 16 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, header.page-head, div.container |
| 16 px | 20 | div.page-head-inner, h1, span.accent |
| 17 px | 2 | summary, div.inhalt |
| 24 px | 2 | a, img.nav-logo.logo-dark |
| 25 px | 1 | button#wzBack |
| 30 px | 7 | p.wz-intro, p.wz-intro, strong |
| 31 px | 1 | span.wz-stepper-label |
| 51.13 px | 1 | a |
| 75.13 px | 1 | a |
| 163.77 px | 1 | a.mobile-phone-cta |
| 185 px | 1 | a |
| 202.77 px | 1 | span.mobile-phone-label |
| 260.81 px | 1 | a |
| 271.5 px | 1 | button#wzNext.wz-next |
| 276 px | 1 | span.punkte |
| 307 px | 1 | div#hamburger.hamburger |

**preise, 375 px: 11 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#preise-intro.section |
| 24 px | 17 | a, img.nav-logo.logo-dark, div.section-inner |
| 26.42 px | 1 | strong |
| 44 px | 6 | li, strong, li |
| 46 px | 2 | span.manufacturer-name, span#wolfMinEigen.manufacturer-price |
| 52 px | 2 | div.pa-cta-icon, svg |
| 94 px | 3 | div, div.pa-cta-text, div.pa-cta-sub |
| 101 px | 1 | div.section-tag |
| 163.77 px | 1 | a.mobile-phone-cta |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**propan-waermepumpe, 375 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 6 | li, strong, li |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 163.77 px | 1 | a.mobile-phone-cta |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**prozess, 375 px: 11 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#prozess.prozess |
| 24 px | 14 | a, img.nav-logo.logo-dark, div.section-inner |
| 36 px | 19 | h2, p, div#pzSub1.pz-substeps |
| 128.03 px | 2 | button.pz-expand-hint, button.pz-expand-hint |
| 145.03 px | 2 | span.pz-hint-text, span.pz-hint-text |
| 151.5 px | 3 | div.pz-step-num, div.pz-step-num, div.pz-step-num |
| 154.02 px | 1 | span.pz-time |
| 163.77 px | 1 | a.mobile-phone-cta |
| 164.41 px | 1 | span.pz-time |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**ratgeber, 375 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| -216.42 px | 1 | image |
| 0 px | 3 | div.nav-inner, main#main-content, section#blog.blog-section.ratgeber-hub |
| 24 px | 22 | a, img.nav-logo.logo-dark, div.section-inner |
| 25 px | 5 | div.blog-card-art.guide-visual.guide-visual-altbau, div.blog-card-body, div.blog-card-art.guide-visual.guide-visual-sound |
| 45 px | 12 | div.blog-card-tag, h2, p |
| 83.12 px | 1 | image |
| 114.61 px | 1 | span |
| 116.56 px | 1 | span |
| 128.5 px | 3 | svg, img.guide-icon-img, svg |
| 163.77 px | 1 | a.mobile-phone-cta |
| 180.14 px | 1 | span |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**rechner, 375 px: 14 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| -134.57 px | 1 | image |
| 0 px | 3 | div.nav-inner, main#main-content, section.rechner-hub.section |
| 24 px | 13 | a, img.nav-logo.logo-dark, div.section-inner |
| 25 px | 6 | div.rechner-card-art.blog-card-art.guide-visual, div.rechner-card-body, div.rechner-card-art.blog-card-art.guide-visual |
| 45 px | 13 | div.rechner-card-kicker, h2, p |
| 94.7 px | 1 | span |
| 102.5 px | 1 | img.guide-icon-img |
| 114.61 px | 1 | span |
| 119.5 px | 1 | svg |
| 131.5 px | 1 | span.rechner-wp-unit.rechner-wp-unit-single |
| 163.77 px | 1 | a.mobile-phone-cta |
| 170.17 px | 1 | span |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**waermepumpe-altbau, 375 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 6 | li, strong, li |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 163.77 px | 1 | a.mobile-phone-cta |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**waermepumpe-hannover, 375 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 163.77 px | 1 | a.mobile-phone-cta |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**waermepumpe-laerm, 375 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 163.77 px | 1 | a.mobile-phone-cta |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**waermepumpenstrom-hannover, 375 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 12 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 163.77 px | 1 | a.mobile-phone-cta |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**wertsteigerung-waermepumpe, 375 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 11 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 163.77 px | 1 | a.mobile-phone-cta |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**wp-kosten-hannover, 375 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 23 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 144.42 px | 4 | th, td, td |
| 156.34 px | 1 | span |
| 163.77 px | 1 | a.mobile-phone-cta |
| 202.77 px | 1 | span.mobile-phone-label |
| 307 px | 1 | div#hamburger.hamburger |

**amortisation-waermepumpe, 390 px: 7 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 12 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 8 | li, strong, li |
| 171.27 px | 1 | a.mobile-phone-cta |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**anfrage, 390 px: 16 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 6 | div.funnel-layout, main#main-content.funnel-panel, div.funnel-header |
| 17.55 px | 1 | a |
| 20 px | 9 | div.step.active, h2.step-question, p.step-hint |
| 24 px | 6 | div.funnel-header-logo, img.logo-dark, div.progress-bar-top |
| 42 px | 3 | div.answer-card-icon, div.answer-card-icon, div.answer-card-icon |
| 57.59 px | 3 | svg, svg, svg |
| 62.14 px | 3 | g, path, g |
| 62.15 px | 2 | g, path |
| 62.48 px | 1 | path |
| 67.21 px | 1 | path |
| 124.92 px | 1 | a |
| 133.84 px | 1 | span#stepCounter.funnel-step-counter |
| 143.8 px | 9 | div.answer-card-text, div.answer-card-label, div.answer-card-sub |
| 250.77 px | 1 | a |
| 276.47 px | 1 | a.funnel-close-link |
| 284.41 px | 1 | span#progressPercent.progress-percent |

**barrierefreiheit, 390 px: 7 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 17 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 5 | li, li, li |
| 171.27 px | 1 | a.mobile-phone-cta |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**baubarkeitspruefung, 390 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 20 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 4 | li, strong, li |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 171.27 px | 1 | a.mobile-phone-cta |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**bewerbung, 390 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#bewerbung.contact |
| 24 px | 9 | a, img.nav-logo.logo-dark, div.section-inner |
| 39 px | 6 | div.bewerbung-steps, span, span |
| 40 px | 25 | div.form-group, label, select#bwRolle |
| 58 px | 1 | strong |
| 65 px | 2 | label, label |
| 155.2 px | 1 | a |
| 163.03 px | 1 | span.form-optional |
| 171.27 px | 1 | a.mobile-phone-cta |
| 193.77 px | 1 | span.form-optional |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**datenschutz, 390 px: 5 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 24 px | 1 | main#main-content |
| 45 px | 17 | div.topbar, a, button.theme-toggle |
| 49 px | 1 | span.tt-feld |
| 110.22 px | 1 | a |
| 116.88 px | 1 | span.tt-feld |

**dimensionierung, 390 px: 14 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 5 | div.nav-inner, main#main-content, section#wizard.wizard-section |
| 24 px | 19 | a, img.nav-logo.logo-dark, div.section-inner |
| 49 px | 10 | div#wizProgress.wizard-progress, div.wizard-step.active, div.wizard-question |
| 53 px | 2 | h2#abschluss-angebot, p |
| 53.47 px | 1 | a |
| 100.97 px | 1 | a.btn-primary |
| 104.67 px | 1 | a |
| 117.73 px | 1 | a |
| 171.27 px | 1 | a.mobile-phone-cta |
| 201 px | 1 | button#wzPlzNext.wizard-btn-next.is-disabled |
| 210.27 px | 1 | span.mobile-phone-label |
| 211 px | 9 | div.footer-col, h2, a |
| 271.38 px | 1 | a |
| 322 px | 1 | div#hamburger.hamburger |

**dimensionierung-verstehen, 390 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 171.27 px | 1 | a.mobile-phone-cta |
| 210.27 px | 1 | span.mobile-phone-label |
| 212.3 px | 1 | a |
| 322 px | 1 | div#hamburger.hamburger |

**foerderung, 390 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#foerder.foerder-section |
| 24 px | 7 | a, img.nav-logo.logo-dark, div.section-inner |
| 39 px | 40 | div, div.foerder-inputs-grid, div.fi-group |
| 43 px | 2 | button.active, button.active |
| 60 px | 1 | span |
| 171.27 px | 1 | a.mobile-phone-cta |
| 197 px | 2 | button, button |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**foerderung-hannover, 390 px: 10 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 22 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 171.27 px | 1 | a.mobile-phone-cta |
| 180.05 px | 4 | th, td, td |
| 210.27 px | 1 | span.mobile-phone-label |
| 244.73 px | 4 | th, td, td |
| 322 px | 1 | div#hamburger.hamburger |

**foerderung-jetzt-mitnehmen, 390 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 18 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 171.27 px | 1 | a.mobile-phone-cta |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**foerdervorschuss, 390 px: 7 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 12 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 96.14 px | 1 | strong |
| 171.27 px | 1 | a.mobile-phone-cta |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**gasheizung-tauschen-oder-reparieren, 390 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 4 | li, li, li |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 171.27 px | 1 | a.mobile-phone-cta |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**hinweise, 390 px: 6 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 13 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 171.27 px | 1 | a.mobile-phone-cta |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**impressum, 390 px: 6 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 24 px | 1 | main#main-content |
| 45 px | 19 | div.topbar, a, button.theme-toggle |
| 49 px | 1 | span.tt-feld |
| 102.28 px | 1 | a |
| 110.22 px | 1 | a |
| 116.88 px | 1 | span.tt-feld |

**index, 390 px: 17 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 6 | div.nav-inner, main#main-content, section.hero |
| 24 px | 27 | a, img.nav-logo.logo-dark, div.hero-inner |
| 25 px | 4 | div.hc-row, div.hc-row, div.hc-result |
| 43 px | 5 | div, div.hc-label, div |
| 49 px | 3 | div.hc-fv-badge, div.hc-fv-text, strong |
| 53 px | 2 | a#fvHomeCta.btn-primary.fv-badge-cta, div.fv-badge-note |
| 66 px | 4 | div.usp-text, h2, div.usp-text |
| 126.28 px | 2 | div.usp-item, div.usp-icon |
| 168.28 px | 2 | div.usp-text, h2 |
| 171.27 px | 1 | a.mobile-phone-cta |
| 203 px | 4 | div.usp-item, div.usp-icon, div.usp-item |
| 210.27 px | 1 | span.mobile-phone-label |
| 245 px | 4 | div.usp-text, h2, div.usp-text |
| 252.47 px | 1 | div.hc-result-value |
| 270.08 px | 1 | div.hc-value |
| 280.94 px | 1 | div.hc-value |
| 322 px | 1 | div#hamburger.hamburger |

**karriere, 390 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#hero.section.kar-hero |
| 24 px | 18 | a, img.nav-logo.logo-dark, div.section-inner |
| 51 px | 6 | span.kar-icon, h3, p |
| 52.86 px | 1 | strong |
| 62 px | 2 | svg, svg |
| 171.27 px | 1 | a.mobile-phone-cta |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**kontakt, 390 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#contact.contact |
| 24 px | 14 | a, img.nav-logo.logo-dark, div.section-inner |
| 48 px | 2 | div.contact-image-caption-title, div.contact-image-caption-sub |
| 57 px | 28 | div.form-group, label, input#kontaktName |
| 82 px | 1 | label |
| 88.05 px | 1 | span.form-optional |
| 92.61 px | 1 | span.form-optional |
| 111.34 px | 1 | span.form-optional |
| 118.7 px | 1 | span.form-optional |
| 171.27 px | 1 | a.mobile-phone-cta |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**kostenvergleich-waermepumpe, 390 px: 16 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, header.page-head, div.container |
| 16 px | 20 | div.page-head-inner, h1, span.accent |
| 17 px | 2 | summary, div.inhalt |
| 24 px | 2 | a, img.nav-logo.logo-dark |
| 25 px | 1 | button#wzBack |
| 30 px | 7 | p.wz-intro, p.wz-intro, strong |
| 31 px | 1 | span.wz-stepper-label |
| 58.63 px | 1 | a |
| 82.63 px | 1 | a |
| 171.27 px | 1 | a.mobile-phone-cta |
| 192.5 px | 1 | a |
| 210.27 px | 1 | span.mobile-phone-label |
| 268.31 px | 1 | a |
| 286.5 px | 1 | button#wzNext.wz-next |
| 291 px | 1 | span.punkte |
| 322 px | 1 | div#hamburger.hamburger |

**preise, 390 px: 11 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#preise-intro.section |
| 24 px | 17 | a, img.nav-logo.logo-dark, div.section-inner |
| 33.92 px | 1 | strong |
| 44 px | 6 | li, strong, li |
| 46 px | 2 | span.manufacturer-name, span#wolfMinEigen.manufacturer-price |
| 52 px | 2 | div.pa-cta-icon, svg |
| 94 px | 3 | div, div.pa-cta-text, div.pa-cta-sub |
| 108.5 px | 1 | div.section-tag |
| 171.27 px | 1 | a.mobile-phone-cta |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**propan-waermepumpe, 390 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 6 | li, strong, li |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 171.27 px | 1 | a.mobile-phone-cta |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**prozess, 390 px: 11 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#prozess.prozess |
| 24 px | 14 | a, img.nav-logo.logo-dark, div.section-inner |
| 36 px | 19 | h2, p, div#pzSub1.pz-substeps |
| 135.53 px | 2 | button.pz-expand-hint, button.pz-expand-hint |
| 152.53 px | 2 | span.pz-hint-text, span.pz-hint-text |
| 159 px | 3 | div.pz-step-num, div.pz-step-num, div.pz-step-num |
| 161.52 px | 1 | span.pz-time |
| 171.27 px | 1 | a.mobile-phone-cta |
| 171.91 px | 1 | span.pz-time |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**ratgeber, 390 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| -208.92 px | 1 | image |
| 0 px | 3 | div.nav-inner, main#main-content, section#blog.blog-section.ratgeber-hub |
| 24 px | 22 | a, img.nav-logo.logo-dark, div.section-inner |
| 25 px | 5 | div.blog-card-art.guide-visual.guide-visual-altbau, div.blog-card-body, div.blog-card-art.guide-visual.guide-visual-sound |
| 45 px | 12 | div.blog-card-tag, h2, p |
| 90.62 px | 1 | image |
| 114.61 px | 1 | span |
| 116.56 px | 1 | span |
| 136 px | 3 | svg, img.guide-icon-img, svg |
| 171.27 px | 1 | a.mobile-phone-cta |
| 180.14 px | 1 | span |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**rechner, 390 px: 14 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| -127.07 px | 1 | image |
| 0 px | 3 | div.nav-inner, main#main-content, section.rechner-hub.section |
| 24 px | 13 | a, img.nav-logo.logo-dark, div.section-inner |
| 25 px | 6 | div.rechner-card-art.blog-card-art.guide-visual, div.rechner-card-body, div.rechner-card-art.blog-card-art.guide-visual |
| 45 px | 14 | div.rechner-card-kicker, h2, p |
| 94.7 px | 1 | span |
| 110 px | 1 | img.guide-icon-img |
| 114.61 px | 1 | span |
| 127 px | 1 | svg |
| 139 px | 1 | span.rechner-wp-unit.rechner-wp-unit-single |
| 170.17 px | 1 | span |
| 171.27 px | 1 | a.mobile-phone-cta |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**waermepumpe-altbau, 390 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 15 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 6 | li, strong, li |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 171.27 px | 1 | a.mobile-phone-cta |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**waermepumpe-hannover, 390 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 15 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 171.27 px | 1 | a.mobile-phone-cta |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**waermepumpe-laerm, 390 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 13 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 171.27 px | 1 | a.mobile-phone-cta |
| 209.03 px | 1 | strong |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**waermepumpenstrom-hannover, 390 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 12 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 171.27 px | 1 | a.mobile-phone-cta |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**wertsteigerung-waermepumpe, 390 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 12 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 171.27 px | 1 | a.mobile-phone-cta |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**wp-kosten-hannover, 390 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 27 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 150 px | 6 | th, td, td |
| 156.34 px | 1 | span |
| 171.27 px | 1 | a.mobile-phone-cta |
| 210.27 px | 1 | span.mobile-phone-label |
| 322 px | 1 | div#hamburger.hamburger |

**amortisation-waermepumpe, 414 px: 7 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 13 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 8 | li, strong, li |
| 183.27 px | 1 | a.mobile-phone-cta |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**anfrage, 414 px: 16 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 6 | div.funnel-layout, main#main-content.funnel-panel, div.funnel-header |
| 20 px | 9 | div.step.active, h2.step-question, p.step-hint |
| 24 px | 6 | div.funnel-header-logo, img.logo-dark, div.progress-bar-top |
| 29.55 px | 1 | a |
| 42 px | 3 | div.answer-card-icon, div.answer-card-icon, div.answer-card-icon |
| 58.56 px | 3 | svg, svg, svg |
| 63.39 px | 5 | g, path, g |
| 63.75 px | 1 | path |
| 68.18 px | 1 | path |
| 68.77 px | 1 | path |
| 136.92 px | 1 | a |
| 145.84 px | 1 | span#stepCounter.funnel-step-counter |
| 149.08 px | 9 | div.answer-card-text, div.answer-card-label, div.answer-card-sub |
| 262.77 px | 1 | a |
| 300.47 px | 1 | a.funnel-close-link |
| 308.41 px | 1 | span#progressPercent.progress-percent |

**barrierefreiheit, 414 px: 7 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 17 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 7 | li, li, li |
| 183.27 px | 1 | a.mobile-phone-cta |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**baubarkeitspruefung, 414 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 20 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 8 | li, strong, li |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 183.27 px | 1 | a.mobile-phone-cta |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**bewerbung, 414 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#bewerbung.contact |
| 24 px | 9 | a, img.nav-logo.logo-dark, div.section-inner |
| 39 px | 6 | div.bewerbung-steps, span, span |
| 40 px | 25 | div.form-group, label, select#bwRolle |
| 58 px | 1 | strong |
| 65 px | 2 | label, label |
| 155.2 px | 1 | a |
| 163.03 px | 1 | span.form-optional |
| 183.27 px | 1 | a.mobile-phone-cta |
| 193.77 px | 1 | span.form-optional |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**datenschutz, 414 px: 5 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 24 px | 1 | main#main-content |
| 45 px | 17 | div.topbar, a, button.theme-toggle |
| 49 px | 1 | span.tt-feld |
| 110.22 px | 1 | a |
| 116.88 px | 1 | span.tt-feld |

**dimensionierung, 414 px: 14 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 5 | div.nav-inner, main#main-content, section#wizard.wizard-section |
| 24 px | 19 | a, img.nav-logo.logo-dark, div.section-inner |
| 49 px | 10 | div#wizProgress.wizard-progress, div.wizard-step.active, div.wizard-question |
| 53 px | 2 | h2#abschluss-angebot, p |
| 53.47 px | 1 | a |
| 97 px | 1 | a.btn-primary |
| 104.67 px | 1 | a |
| 117.73 px | 1 | a |
| 183.27 px | 1 | a.mobile-phone-cta |
| 213 px | 1 | button#wzPlzNext.wizard-btn-next.is-disabled |
| 222.27 px | 1 | span.mobile-phone-label |
| 223 px | 9 | div.footer-col, h2, a |
| 315.3 px | 1 | a |
| 346 px | 1 | div#hamburger.hamburger |

**dimensionierung-verstehen, 414 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 183.27 px | 1 | a.mobile-phone-cta |
| 212.3 px | 1 | a |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**foerderung, 414 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#foerder.foerder-section |
| 24 px | 7 | a, img.nav-logo.logo-dark, div.section-inner |
| 39 px | 40 | div, div.foerder-inputs-grid, div.fi-group |
| 43 px | 2 | button.active, button.active |
| 60 px | 1 | span |
| 183.27 px | 1 | a.mobile-phone-cta |
| 209 px | 2 | button, button |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**foerderung-hannover, 414 px: 10 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 22 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 180.05 px | 4 | th, td, td |
| 183.27 px | 1 | a.mobile-phone-cta |
| 222.27 px | 1 | span.mobile-phone-label |
| 244.73 px | 4 | th, td, td |
| 346 px | 1 | div#hamburger.hamburger |

**foerderung-jetzt-mitnehmen, 414 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 20 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 183.27 px | 1 | a.mobile-phone-cta |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**foerdervorschuss, 414 px: 7 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 13 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 89.58 px | 1 | strong |
| 183.27 px | 1 | a.mobile-phone-cta |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**gasheizung-tauschen-oder-reparieren, 414 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 14 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 4 | li, li, li |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 183.27 px | 1 | a.mobile-phone-cta |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**hinweise, 414 px: 6 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 13 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 183.27 px | 1 | a.mobile-phone-cta |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**impressum, 414 px: 6 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 24 px | 1 | main#main-content |
| 45 px | 20 | div.topbar, a, button.theme-toggle |
| 49 px | 1 | span.tt-feld |
| 102.28 px | 1 | a |
| 110.22 px | 1 | a |
| 116.88 px | 1 | span.tt-feld |

**index, 414 px: 17 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 6 | div.nav-inner, main#main-content, section.hero |
| 24 px | 27 | a, img.nav-logo.logo-dark, div.hero-inner |
| 25 px | 4 | div.hc-row, div.hc-row, div.hc-result |
| 43 px | 5 | div, div.hc-label, div |
| 49 px | 3 | div.hc-fv-badge, div.hc-fv-text, strong |
| 53 px | 2 | a#fvHomeCta.btn-primary.fv-badge-cta, div.fv-badge-note |
| 66 px | 4 | div.usp-text, h2, div.usp-text |
| 138.28 px | 2 | div.usp-item, div.usp-icon |
| 180.28 px | 2 | div.usp-text, h2 |
| 183.27 px | 1 | a.mobile-phone-cta |
| 215 px | 4 | div.usp-item, div.usp-icon, div.usp-item |
| 222.27 px | 1 | span.mobile-phone-label |
| 257 px | 4 | div.usp-text, h2, div.usp-text |
| 276.47 px | 1 | div.hc-result-value |
| 294.08 px | 1 | div.hc-value |
| 304.94 px | 1 | div.hc-value |
| 346 px | 1 | div#hamburger.hamburger |

**karriere, 414 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#hero.section.kar-hero |
| 24 px | 18 | a, img.nav-logo.logo-dark, div.section-inner |
| 51 px | 6 | span.kar-icon, h3, p |
| 62 px | 2 | svg, svg |
| 183.27 px | 1 | a.mobile-phone-cta |
| 217.88 px | 1 | strong |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**kontakt, 414 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#contact.contact |
| 24 px | 14 | a, img.nav-logo.logo-dark, div.section-inner |
| 48 px | 2 | div.contact-image-caption-title, div.contact-image-caption-sub |
| 57 px | 28 | div.form-group, label, input#kontaktName |
| 82 px | 1 | label |
| 88.05 px | 1 | span.form-optional |
| 92.61 px | 1 | span.form-optional |
| 111.34 px | 1 | span.form-optional |
| 118.7 px | 1 | span.form-optional |
| 183.27 px | 1 | a.mobile-phone-cta |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**kostenvergleich-waermepumpe, 414 px: 16 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, header.page-head, div.container |
| 16 px | 20 | div.page-head-inner, h1, span.accent |
| 17 px | 2 | summary, div.inhalt |
| 24 px | 2 | a, img.nav-logo.logo-dark |
| 25 px | 1 | button#wzBack |
| 29.27 px | 1 | a |
| 30 px | 7 | p.wz-intro, p.wz-intro, strong |
| 31 px | 1 | span.wz-stepper-label |
| 94.63 px | 1 | a |
| 183.27 px | 1 | a.mobile-phone-cta |
| 204.5 px | 1 | a |
| 222.27 px | 1 | span.mobile-phone-label |
| 280.31 px | 1 | a |
| 310.5 px | 1 | button#wzNext.wz-next |
| 315 px | 1 | span.punkte |
| 346 px | 1 | div#hamburger.hamburger |

**preise, 414 px: 11 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#preise-intro.section |
| 24 px | 18 | a, img.nav-logo.logo-dark, div.section-inner |
| 31.86 px | 1 | strong |
| 44 px | 6 | li, strong, li |
| 46 px | 3 | span.manufacturer-name, span#wolfMinEigen.manufacturer-price, span.manufacturer-name |
| 64 px | 2 | div.pa-cta-icon, svg |
| 106 px | 3 | div, div.pa-cta-text, div.pa-cta-sub |
| 120.5 px | 1 | div.section-tag |
| 183.27 px | 1 | a.mobile-phone-cta |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**propan-waermepumpe, 414 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 15 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 6 | li, strong, li |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 183.27 px | 1 | a.mobile-phone-cta |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**prozess, 414 px: 11 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#prozess.prozess |
| 24 px | 14 | a, img.nav-logo.logo-dark, div.section-inner |
| 36 px | 19 | h2, p, div#pzSub1.pz-substeps |
| 147.53 px | 2 | button.pz-expand-hint, button.pz-expand-hint |
| 164.53 px | 2 | span.pz-hint-text, span.pz-hint-text |
| 171 px | 3 | div.pz-step-num, div.pz-step-num, div.pz-step-num |
| 173.52 px | 1 | span.pz-time |
| 183.27 px | 1 | a.mobile-phone-cta |
| 183.91 px | 1 | span.pz-time |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**ratgeber, 414 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| -196.92 px | 1 | image |
| 0 px | 3 | div.nav-inner, main#main-content, section#blog.blog-section.ratgeber-hub |
| 24 px | 22 | a, img.nav-logo.logo-dark, div.section-inner |
| 25 px | 5 | div.blog-card-art.guide-visual.guide-visual-altbau, div.blog-card-body, div.blog-card-art.guide-visual.guide-visual-sound |
| 45 px | 12 | div.blog-card-tag, h2, p |
| 102.62 px | 1 | image |
| 114.61 px | 1 | span |
| 116.56 px | 1 | span |
| 148 px | 3 | svg, img.guide-icon-img, svg |
| 180.14 px | 1 | span |
| 183.27 px | 1 | a.mobile-phone-cta |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**rechner, 414 px: 14 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| -115.07 px | 1 | image |
| 0 px | 3 | div.nav-inner, main#main-content, section.rechner-hub.section |
| 24 px | 13 | a, img.nav-logo.logo-dark, div.section-inner |
| 25 px | 6 | div.rechner-card-art.blog-card-art.guide-visual, div.rechner-card-body, div.rechner-card-art.blog-card-art.guide-visual |
| 45 px | 15 | div.rechner-card-kicker, h2, p |
| 94.7 px | 1 | span |
| 114.61 px | 1 | span |
| 122 px | 1 | img.guide-icon-img |
| 139 px | 1 | svg |
| 151 px | 1 | span.rechner-wp-unit.rechner-wp-unit-single |
| 170.17 px | 1 | span |
| 183.27 px | 1 | a.mobile-phone-cta |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**waermepumpe-altbau, 414 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 15 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 6 | li, strong, li |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 183.27 px | 1 | a.mobile-phone-cta |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**waermepumpe-hannover, 414 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 16 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 183.27 px | 1 | a.mobile-phone-cta |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**waermepumpe-laerm, 414 px: 10 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 12 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 130.23 px | 1 | strong |
| 156.34 px | 1 | span |
| 183.27 px | 1 | a.mobile-phone-cta |
| 187.05 px | 1 | strong |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**waermepumpenstrom-hannover, 414 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 12 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 177.83 px | 1 | a |
| 183.27 px | 1 | a.mobile-phone-cta |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**wertsteigerung-waermepumpe, 414 px: 8 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 12 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 183.27 px | 1 | a.mobile-phone-cta |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**wp-kosten-hannover, 414 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 27 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 158.91 px | 6 | th, td, td |
| 183.27 px | 1 | a.mobile-phone-cta |
| 222.27 px | 1 | span.mobile-phone-label |
| 346 px | 1 | div#hamburger.hamburger |

**amortisation-waermepumpe, 600 px: 10 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 17 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 8 | li, strong, li |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**anfrage, 600 px: 18 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 6 | div.funnel-layout, main#main-content.funnel-panel, div.funnel-header |
| 20 px | 9 | div.step.active, h2.step-question, p.step-hint |
| 24 px | 6 | div.funnel-header-logo, img.logo-dark, div.progress-bar-top |
| 42 px | 3 | div.answer-card-icon, div.answer-card-icon, div.answer-card-icon |
| 63 px | 3 | svg, svg, svg |
| 68.83 px | 3 | g, path, g |
| 68.84 px | 2 | g, path |
| 69.26 px | 1 | path |
| 74.61 px | 1 | path |
| 75.32 px | 1 | path |
| 96.11 px | 1 | path |
| 122.55 px | 1 | a |
| 170 px | 9 | div.answer-card-text, div.answer-card-label, div.answer-card-sub |
| 229.92 px | 1 | a |
| 238.84 px | 1 | span#stepCounter.funnel-step-counter |
| 355.77 px | 1 | a |
| 486.47 px | 1 | a.funnel-close-link |
| 494.41 px | 1 | span#progressPercent.progress-percent |

**barrierefreiheit, 600 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 15 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 11 | li, li, li |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 290.05 px | 1 | strong |
| 323.97 px | 1 | span.tt-feld |
| 363.95 px | 1 | strong |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**baubarkeitspruefung, 600 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 22 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 8 | li, strong, li |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**bewerbung, 600 px: 21 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#bewerbung.contact |
| 24 px | 16 | a, img.nav-logo.logo-dark, div.section-inner |
| 45 px | 5 | div.bewerbung-steps, span, span |
| 46 px | 20 | div.form-group, label, select#bwRolle |
| 64 px | 1 | strong |
| 71 px | 3 | label, a, label |
| 169.03 px | 1 | span.form-optional |
| 199.77 px | 1 | span.form-optional |
| 214.81 px | 1 | span |
| 237.59 px | 1 | span.form-optional |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 292.27 px | 1 | a |
| 308 px | 6 | div.form-group, label, input#bwNachname |
| 316 px | 4 | div.footer-col, h2, a |
| 323.97 px | 1 | span.tt-feld |
| 389.2 px | 1 | a |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 476.13 px | 1 | a |
| 532 px | 1 | div#hamburger.hamburger |

**datenschutz, 600 px: 7 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 24 px | 1 | main#main-content |
| 45 px | 19 | div.topbar, a, h1 |
| 110.22 px | 1 | a |
| 316.44 px | 1 | a |
| 391.03 px | 1 | button.theme-toggle |
| 395.03 px | 1 | span.tt-feld |
| 462.91 px | 1 | span.tt-feld |

**dimensionierung, 600 px: 33 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 5 | div.nav-inner, main#main-content, section#wizard.wizard-section |
| 24 px | 20 | a, img.nav-logo.logo-dark, div.section-inner |
| 49 px | 11 | div#wizProgress.wizard-progress, div.wizard-progress-bar.active, div.wizard-step.active |
| 53 px | 2 | h2#abschluss-angebot, p |
| 82.72 px | 1 | div.wizard-progress-bar |
| 116.45 px | 1 | div.wizard-progress-bar |
| 117.73 px | 1 | a |
| 135.97 px | 1 | div.footer-tagline |
| 150.19 px | 1 | div.wizard-progress-bar |
| 177.95 px | 1 | a |
| 183.92 px | 1 | div.wizard-progress-bar |
| 190 px | 1 | a.btn-primary |
| 207.42 px | 1 | a |
| 217.66 px | 1 | div.wizard-progress-bar |
| 251.39 px | 1 | div.wizard-progress-bar |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 285.13 px | 1 | div.wizard-progress-bar |
| 306 px | 1 | button#wzPlzNext.wizard-btn-next.is-disabled |
| 316 px | 10 | div.footer-col, h2, a |
| 318.86 px | 1 | div.wizard-progress-bar |
| 323.97 px | 1 | span.tt-feld |
| 352.59 px | 1 | div.wizard-progress-bar |
| 386.33 px | 1 | div.wizard-progress-bar |
| 389.2 px | 1 | a |
| 420.06 px | 1 | div.wizard-progress-bar |
| 424.06 px | 1 | a.mobile-phone-cta |
| 453.8 px | 1 | div.wizard-progress-bar |
| 463.06 px | 1 | span.mobile-phone-label |
| 476.13 px | 1 | a |
| 487.53 px | 1 | div.wizard-progress-bar |
| 521.27 px | 1 | div.wizard-progress-bar |
| 532 px | 1 | div#hamburger.hamburger |

**dimensionierung-verstehen, 600 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 26 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 206.08 px | 3 | th, td, td |
| 212.3 px | 1 | a |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**foerderung, 600 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#foerder.foerder-section |
| 24 px | 7 | a, img.nav-logo.logo-dark, div.section-inner |
| 45 px | 40 | div, div.foerder-inputs-grid, div.fi-group |
| 49 px | 2 | button.active, button.active |
| 66 px | 1 | span |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 302 px | 2 | button, button |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**foerderung-hannover, 600 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 26 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 180.05 px | 4 | th, td, td |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 260.64 px | 4 | th, td, td |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**foerderung-jetzt-mitnehmen, 600 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 30 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 180.05 px | 3 | th, td, td |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 257.03 px | 3 | th, td, td |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**foerdervorschuss, 600 px: 11 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 17 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 297.55 px | 1 | strong |
| 309.52 px | 1 | strong |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**gasheizung-tauschen-oder-reparieren, 600 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 16 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 4 | li, li, li |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**hinweise, 600 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 17 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**impressum, 600 px: 7 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 24 px | 1 | main#main-content |
| 45 px | 21 | div.topbar, a, h1 |
| 102.28 px | 1 | a |
| 110.22 px | 1 | a |
| 391.03 px | 1 | button.theme-toggle |
| 395.03 px | 1 | span.tt-feld |
| 462.91 px | 1 | span.tt-feld |

**index, 600 px: 23 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 6 | div.nav-inner, main#main-content, section.hero |
| 24 px | 28 | a, img.nav-logo.logo-dark, div.hero-inner |
| 25 px | 4 | div.hc-row, div.hc-row, div.hc-result |
| 43 px | 5 | div, div.hc-label, div |
| 49 px | 3 | div.hc-fv-badge, div.hc-fv-text, strong |
| 53 px | 2 | a#fvHomeCta.btn-primary.fv-badge-cta, div.fv-badge-note |
| 66 px | 4 | div.usp-text, h2, div.usp-text |
| 120.89 px | 1 | a.fv-disclaimer-link |
| 231.28 px | 2 | div.usp-item, div.usp-icon |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 273.28 px | 2 | div.usp-text, h2 |
| 306 px | 1 | a.btn-ghost |
| 308 px | 4 | div.usp-item, div.usp-icon, div.usp-item |
| 323.97 px | 1 | span.tt-feld |
| 350 px | 4 | div.usp-text, h2, div.usp-text |
| 424.06 px | 1 | a.mobile-phone-cta |
| 424.98 px | 1 | a.fv-disclaimer-link |
| 462.47 px | 1 | div.hc-result-value |
| 463.06 px | 1 | span.mobile-phone-label |
| 480.08 px | 1 | div.hc-value |
| 490.94 px | 1 | div.hc-value |
| 532 px | 1 | div#hamburger.hamburger |

**karriere, 600 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#hero.section.kar-hero |
| 24 px | 18 | a, img.nav-logo.logo-dark, div.section-inner |
| 51 px | 9 | span.kar-icon, h3, p |
| 62 px | 3 | svg, svg, svg |
| 107.59 px | 1 | strong |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 308.63 px | 1 | a.kar-btn-ghost |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**kontakt, 600 px: 15 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#contact.contact |
| 24 px | 14 | a, img.nav-logo.logo-dark, div.section-inner |
| 48 px | 2 | div.contact-image-caption-title, div.contact-image-caption-sub |
| 57 px | 28 | div.form-group, label, input#kontaktName |
| 85.77 px | 1 | label |
| 88.05 px | 1 | span.form-optional |
| 92.61 px | 1 | span.form-optional |
| 111.34 px | 1 | span.form-optional |
| 118.7 px | 1 | span.form-optional |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**kostenvergleich-waermepumpe, 600 px: 20 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, header.page-head, div.container |
| 16 px | 19 | div.page-head-inner, h1, p.mobile-head-note |
| 17 px | 2 | summary, div.inhalt |
| 24 px | 2 | a, img.nav-logo.logo-dark |
| 25 px | 1 | button#wzBack |
| 30 px | 7 | p.wz-intro, p.wz-intro, strong |
| 31 px | 1 | span.wz-stepper-label |
| 74 px | 1 | a |
| 183.88 px | 1 | a |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 259.69 px | 1 | a |
| 294.48 px | 1 | span.accent |
| 323.97 px | 1 | span.tt-feld |
| 351.5 px | 1 | a |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 496.5 px | 1 | button#wzNext.wz-next |
| 501 px | 1 | span.punkte |
| 532 px | 1 | div#hamburger.hamburger |

**preise, 600 px: 16 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#preise-intro.section |
| 24 px | 26 | a, img.nav-logo.logo-dark, div.section-inner |
| 44 px | 6 | li, strong, li |
| 46 px | 4 | span.manufacturer-name, span#wolfMinEigen.manufacturer-price, span.manufacturer-name |
| 155.09 px | 1 | strong |
| 157 px | 2 | div.pa-cta-icon, svg |
| 167.45 px | 1 | em |
| 199 px | 3 | div, div.pa-cta-text, div.pa-cta-sub |
| 213.5 px | 1 | div.section-tag |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 311.06 px | 1 | a |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**propan-waermepumpe, 600 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 16 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 6 | li, strong, li |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 177.77 px | 1 | a |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**prozess, 600 px: 22 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#prozess.prozess |
| 24 px | 13 | a, img.nav-logo.logo-dark, div.section-inner |
| 36 px | 17 | h2, p, div#pzSub1.pz-substeps |
| 94.53 px | 2 | button.pz-expand-hint, button.pz-expand-hint |
| 111.53 px | 2 | span.pz-hint-text, span.pz-hint-text |
| 118 px | 2 | div.pz-step-num, div.pz-step-num |
| 119.27 px | 1 | span.pz-time |
| 130.91 px | 1 | span.pz-time |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 316 px | 2 | div.pz-step.is-open, div.pz-step.is-open |
| 323.97 px | 1 | span.tt-feld |
| 328 px | 18 | h2, p, div#pzSub2.pz-substeps |
| 386.53 px | 2 | button.pz-expand-hint, button.pz-expand-hint |
| 403.53 px | 2 | span.pz-hint-text, span.pz-hint-text |
| 410 px | 2 | div.pz-step-num, div.pz-step-num |
| 412.52 px | 1 | span.pz-time |
| 418.48 px | 1 | span.pz-time |
| 424.06 px | 1 | a.mobile-phone-cta |
| 462.13 px | 1 | a |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**ratgeber, 600 px: 18 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| -151.85 px | 1 | image |
| 0 px | 3 | div.nav-inner, main#main-content, section#blog.blog-section.ratgeber-hub |
| 24 px | 20 | a, img.nav-logo.logo-dark, div.section-inner |
| 25 px | 6 | div.blog-card-art.guide-visual.guide-visual-altbau, div.blog-card-body, div.blog-card-art.guide-visual.guide-visual-sound |
| 45 px | 15 | div.blog-card-tag, h2, p |
| 114.61 px | 1 | span |
| 116.56 px | 1 | span |
| 177.48 px | 1 | a |
| 180.14 px | 1 | span |
| 183.23 px | 1 | image |
| 234 px | 3 | svg, img.guide-icon-img, svg |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 288.39 px | 1 | a |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**rechner, 600 px: 16 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| -102.58 px | 1 | image |
| 0 px | 3 | div.nav-inner, main#main-content, section.rechner-hub.section |
| 24 px | 13 | a, img.nav-logo.logo-dark, div.section-inner |
| 25 px | 6 | div.rechner-card-art.blog-card-art.guide-visual, div.rechner-card-body, div.rechner-card-art.blog-card-art.guide-visual |
| 45 px | 15 | div.rechner-card-kicker, h2, p |
| 94.7 px | 1 | span |
| 114.61 px | 1 | span |
| 170.17 px | 1 | span |
| 215 px | 2 | svg, img.guide-icon-img |
| 235 px | 1 | span.rechner-wp-unit.rechner-wp-unit-single |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**waermepumpe-altbau, 600 px: 14 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 18 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 6 | li, strong, li |
| 45 px | 4 | h2#begriffe-titel, dl, dt |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 282.36 px | 1 | a |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**waermepumpe-hannover, 600 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 19 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 45 px | 5 | h2#begriffe-titel, dl, dt |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 282.36 px | 1 | a.btn-primary |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**waermepumpe-laerm, 600 px: 15 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 16 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 51.41 px | 1 | strong |
| 70.95 px | 1 | a |
| 91.11 px | 1 | strong |
| 130.23 px | 1 | strong |
| 156.34 px | 1 | span |
| 234.47 px | 1 | strong |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**waermepumpenstrom-hannover, 600 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 15 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 255 px | 1 | a |
| 256.09 px | 1 | span.tt-feld |
| 323.97 px | 1 | span.tt-feld |
| 368.39 px | 1 | a |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**wertsteigerung-waermepumpe, 600 px: 11 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 15 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**wp-kosten-hannover, 600 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 30 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 82.3 px | 1 | a |
| 156.34 px | 1 | span |
| 228 px | 6 | th, td, td |
| 252.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 256.09 px | 1 | span.tt-feld |
| 323.97 px | 1 | span.tt-feld |
| 424.06 px | 1 | a.mobile-phone-cta |
| 463.06 px | 1 | span.mobile-phone-label |
| 532 px | 1 | div#hamburger.hamburger |

**amortisation-waermepumpe, 768 px: 10 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 19 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 8 | li, strong, li |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**anfrage, 768 px: 18 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 6 | div.funnel-layout, main#main-content.funnel-panel, div.funnel-header |
| 20 px | 9 | div.step.active, h2.step-question, p.step-hint |
| 24 px | 6 | div.funnel-header-logo, img.logo-dark, div.progress-bar-top |
| 42 px | 3 | div.answer-card-icon, div.answer-card-icon, div.answer-card-icon |
| 63 px | 3 | svg, svg, svg |
| 68.83 px | 3 | g, path, g |
| 68.84 px | 2 | g, path |
| 69.26 px | 1 | path |
| 74.61 px | 1 | path |
| 75.32 px | 1 | path |
| 96.11 px | 1 | path |
| 170 px | 9 | div.answer-card-text, div.answer-card-label, div.answer-card-sub |
| 206.55 px | 1 | a |
| 313.92 px | 1 | a |
| 322.84 px | 1 | span#stepCounter.funnel-step-counter |
| 439.77 px | 1 | a |
| 654.47 px | 1 | a.funnel-close-link |
| 662.41 px | 1 | span#progressPercent.progress-percent |

**barrierefreiheit, 768 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 15 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 15 | li, li, li |
| 290.05 px | 1 | strong |
| 363.95 px | 1 | strong |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**baubarkeitspruefung, 768 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 25 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 8 | li, strong, li |
| 45 px | 5 | h2#begriffe-titel, dl, dt |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**bewerbung, 768 px: 25 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#bewerbung.contact |
| 24 px | 16 | a, img.nav-logo.logo-dark, div.section-inner |
| 44 px | 3 | div.bewerbung-layout, div#bewerbungCard.foerder-grid, p.bewerbung-fallback |
| 65 px | 4 | div.bewerbung-steps, span, div#bewerbungRoleHint.bewerbung-intro-card |
| 66 px | 20 | div.form-group, label, select#bwRolle |
| 84 px | 1 | strong |
| 91 px | 1 | label |
| 92.97 px | 1 | label |
| 182.42 px | 1 | span.form-optional |
| 189.03 px | 1 | span.form-optional |
| 219.77 px | 1 | span.form-optional |
| 234.81 px | 1 | span |
| 312.27 px | 1 | a |
| 373 px | 6 | div.form-group, label, input#bwNachname |
| 400 px | 6 | div.footer-col, h2, a |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 426.19 px | 1 | span |
| 444.28 px | 1 | a |
| 491.97 px | 1 | span.tt-feld |
| 560.13 px | 1 | a |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 652.42 px | 1 | a |
| 700 px | 1 | div#hamburger.hamburger |

**datenschutz, 768 px: 10 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 24 px | 1 | main#main-content |
| 57 px | 20 | div.topbar, a, h1 |
| 122.22 px | 1 | a |
| 138.2 px | 1 | a |
| 328.44 px | 1 | a |
| 361.33 px | 1 | code |
| 547.03 px | 1 | button.theme-toggle |
| 551.03 px | 1 | span.tt-feld |
| 618.91 px | 1 | span.tt-feld |
| 630.13 px | 1 | code |

**dimensionierung, 768 px: 39 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 5 | div.nav-inner, main#main-content, section#wizard.wizard-section |
| 24 px | 19 | a, img.nav-logo.logo-dark, div.section-inner |
| 49 px | 11 | div#wizProgress.wizard-progress, div.wizard-progress-bar.active, div.wizard-step.active |
| 53 px | 1 | h2#abschluss-angebot |
| 74 px | 1 | p |
| 93.92 px | 1 | div.wizard-progress-bar |
| 117.73 px | 1 | a |
| 138.86 px | 1 | div.wizard-progress-bar |
| 177.95 px | 1 | a |
| 183.78 px | 1 | div.wizard-progress-bar |
| 207.42 px | 1 | a |
| 218.8 px | 2 | div.footer-legal, a |
| 219.97 px | 1 | div.footer-tagline |
| 228.72 px | 1 | div.wizard-progress-bar |
| 258.63 px | 1 | a |
| 273.64 px | 1 | div.wizard-progress-bar |
| 274 px | 1 | a.btn-primary |
| 301.47 px | 1 | a |
| 318.58 px | 1 | div.wizard-progress-bar |
| 363.5 px | 1 | div.wizard-progress-bar |
| 390 px | 1 | button#wzPlzNext.wizard-btn-next.is-disabled |
| 392.7 px | 1 | a |
| 400 px | 10 | div.footer-col, h2, a |
| 408.44 px | 1 | div.wizard-progress-bar |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 453.38 px | 1 | div.wizard-progress-bar |
| 464.45 px | 1 | a |
| 491.97 px | 1 | span.tt-feld |
| 498.31 px | 1 | div.wizard-progress-bar |
| 543.25 px | 1 | div.wizard-progress-bar |
| 560.13 px | 1 | a |
| 588.19 px | 1 | div.wizard-progress-bar |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 633.13 px | 1 | div.wizard-progress-bar |
| 652.42 px | 1 | a |
| 678.06 px | 1 | div.wizard-progress-bar |
| 700 px | 1 | div#hamburger.hamburger |

**dimensionierung-verstehen, 768 px: 14 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 32 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 212.3 px | 1 | a |
| 242.09 px | 5 | th, td, td |
| 290.28 px | 1 | a.btn-primary |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**foerderung, 768 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#foerder.foerder-section |
| 24 px | 7 | a, img.nav-logo.logo-dark, div.section-inner |
| 45 px | 39 | div, div.foerder-inputs-grid, div.fi-group |
| 49 px | 2 | button.active, button.active |
| 65 px | 1 | span |
| 66 px | 1 | span |
| 386 px | 2 | button, button |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**foerderung-hannover, 768 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 31 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 180.05 px | 4 | th, td, td |
| 278.55 px | 4 | th, td, td |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**foerderung-jetzt-mitnehmen, 768 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 33 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 180.05 px | 4 | th, td, td |
| 270.86 px | 4 | th, td, td |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**foerdervorschuss, 768 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 22 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**gasheizung-tauschen-oder-reparieren, 768 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 18 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 4 | li, li, li |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**hinweise, 768 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 18 | div.section-inner, div.section-tag, h1.section-title |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**impressum, 768 px: 7 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 24 px | 1 | main#main-content |
| 57 px | 23 | div.topbar, a, h1 |
| 114.28 px | 1 | a |
| 122.22 px | 1 | a |
| 547.03 px | 1 | button.theme-toggle |
| 551.03 px | 1 | span.tt-feld |
| 618.91 px | 1 | span.tt-feld |

**index, 768 px: 28 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 6 | div.nav-inner, main#main-content, section.hero |
| 24 px | 24 | a, img.nav-logo.logo-dark, div.hero-inner |
| 25 px | 4 | div.hc-row, div.hc-row, div.hc-result |
| 43 px | 5 | div, div.hc-label, div |
| 49 px | 3 | div.hc-fv-badge, div.hc-fv-text, strong |
| 53 px | 2 | a#fvHomeCta.btn-primary.fv-badge-cta, div.fv-badge-note |
| 87.25 px | 2 | div.usp-item, div.usp-icon |
| 120.89 px | 1 | a.fv-disclaimer-link |
| 139.25 px | 2 | div.usp-text, h2 |
| 223.66 px | 2 | div.usp-item, div.usp-icon |
| 259.83 px | 2 | div.usp-item, div.usp-icon |
| 275.66 px | 2 | div.usp-text, h2 |
| 311.83 px | 2 | div.usp-text, h2 |
| 388.97 px | 2 | div.usp-item, div.usp-icon |
| 390 px | 1 | a.btn-ghost |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 424.98 px | 1 | a.fv-disclaimer-link |
| 440.97 px | 2 | div.usp-text, h2 |
| 468.44 px | 2 | div.usp-item, div.usp-icon |
| 491.97 px | 1 | span.tt-feld |
| 520.44 px | 2 | div.usp-text, h2 |
| 592.06 px | 1 | a.mobile-phone-cta |
| 630.47 px | 1 | div.hc-result-value |
| 631.06 px | 1 | span.mobile-phone-label |
| 648.08 px | 1 | div.hc-value |
| 658.94 px | 1 | div.hc-value |
| 700 px | 1 | div#hamburger.hamburger |

**karriere, 768 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 5 | div.nav-inner, main#main-content, section#hero.section.kar-hero |
| 24 px | 18 | a, img.nav-logo.logo-dark, div.section-inner |
| 51 px | 9 | span.kar-icon, h3, p |
| 62 px | 3 | svg, svg, svg |
| 217.88 px | 1 | strong |
| 392.63 px | 1 | a.kar-btn-ghost |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**kontakt, 768 px: 15 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#contact.contact |
| 24 px | 14 | a, img.nav-logo.logo-dark, div.section-inner |
| 48 px | 2 | div.contact-image-caption-title, div.contact-image-caption-sub |
| 57 px | 28 | div.form-group, label, input#kontaktName |
| 87 px | 1 | label |
| 88.05 px | 1 | span.form-optional |
| 92.61 px | 1 | span.form-optional |
| 111.34 px | 1 | span.form-optional |
| 118.7 px | 1 | span.form-optional |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**kostenvergleich-waermepumpe, 768 px: 30 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, header.page-head, div.container |
| 24 px | 14 | a, img.nav-logo.logo-dark, div.page-head-inner |
| 37 px | 1 | span.wz-dot |
| 57 px | 19 | h2#rechner-einleitung, details.rechner-intro-details.klapp, div.inhalt |
| 69 px | 1 | span |
| 92.16 px | 1 | a |
| 169.09 px | 1 | button.wz-step |
| 182.09 px | 1 | span.wz-dot |
| 202.03 px | 1 | a |
| 214.09 px | 1 | span |
| 277.84 px | 1 | a |
| 314.19 px | 1 | button.wz-step |
| 327.19 px | 1 | span.wz-dot |
| 359.19 px | 1 | span |
| 369.66 px | 1 | a |
| 380.45 px | 1 | span.accent |
| 390 px | 1 | button.wz-choice.wahlkarte |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 459.28 px | 1 | button.wz-step |
| 472.28 px | 1 | span.wz-dot |
| 491.97 px | 1 | span.tt-feld |
| 504.28 px | 1 | span |
| 592.06 px | 1 | a.mobile-phone-cta |
| 606.91 px | 1 | button.wz-step |
| 619.91 px | 1 | span.wz-dot |
| 631.06 px | 1 | span.mobile-phone-label |
| 632.5 px | 1 | button#wzNext.wz-next |
| 651.91 px | 1 | span |
| 700 px | 1 | div#hamburger.hamburger |

**preise, 768 px: 20 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#preise-intro.section |
| 24 px | 18 | a, img.nav-logo.logo-dark, div.section-inner |
| 34 px | 11 | div#preis-bedingungen.preisanker-disclaimer, p, strong |
| 44 px | 6 | li, strong, li |
| 46 px | 2 | span.manufacturer-name, span#wolfMinEigen.manufacturer-price |
| 52 px | 4 | li, li, li |
| 241 px | 2 | div.pa-cta-icon, svg |
| 251.45 px | 1 | em |
| 283 px | 3 | div, div.pa-cta-text, div.pa-cta-sub |
| 297.5 px | 1 | div.section-tag |
| 334.58 px | 1 | strong |
| 391 px | 1 | button#manufacturerVaillant.manufacturer-tab |
| 395.06 px | 1 | a |
| 413 px | 2 | span.manufacturer-name, span#vaillantMinEigen.manufacturer-price |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**propan-waermepumpe, 768 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 17 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 6 | li, strong, li |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 248.44 px | 1 | a |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**prozess, 768 px: 22 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#prozess.prozess |
| 24 px | 13 | a, img.nav-logo.logo-dark, div.section-inner |
| 36 px | 17 | h2, p, div#pzSub1.pz-substeps |
| 136.53 px | 2 | button.pz-expand-hint, button.pz-expand-hint |
| 153.53 px | 2 | span.pz-hint-text, span.pz-hint-text |
| 160 px | 2 | div.pz-step-num, div.pz-step-num |
| 161.27 px | 1 | span.pz-time |
| 172.91 px | 1 | span.pz-time |
| 400 px | 2 | div.pz-step.is-open, div.pz-step.is-open |
| 412 px | 18 | h2, p, div#pzSub2.pz-substeps |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 512.53 px | 2 | button.pz-expand-hint, button.pz-expand-hint |
| 529.53 px | 2 | span.pz-hint-text, span.pz-hint-text |
| 536 px | 2 | div.pz-step-num, div.pz-step-num |
| 538.52 px | 1 | span.pz-time |
| 544.48 px | 1 | span.pz-time |
| 546.13 px | 1 | a |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**ratgeber, 768 px: 19 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| -67.85 px | 1 | image |
| 0 px | 3 | div.nav-inner, main#main-content, section#blog.blog-section.ratgeber-hub |
| 24 px | 20 | a, img.nav-logo.logo-dark, div.section-inner |
| 25 px | 6 | div.blog-card-art.guide-visual.guide-visual-altbau, div.blog-card-body, div.blog-card-art.guide-visual.guide-visual-sound |
| 45 px | 18 | div.blog-card-tag, h2, p |
| 114.61 px | 1 | span |
| 116.56 px | 1 | span |
| 120.59 px | 1 | span |
| 177.48 px | 1 | a |
| 180.14 px | 1 | span |
| 267.23 px | 1 | image |
| 288.39 px | 1 | a |
| 318 px | 3 | svg, img.guide-icon-img, svg |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**rechner, 768 px: 18 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| -18.58 px | 1 | image |
| 0 px | 3 | div.nav-inner, main#main-content, section.rechner-hub.section |
| 24 px | 13 | a, img.nav-logo.logo-dark, div.section-inner |
| 25 px | 6 | div.rechner-card-art.blog-card-art.guide-visual, div.rechner-card-body, div.rechner-card-art.blog-card-art.guide-visual |
| 45 px | 18 | div.rechner-card-kicker, h2, p |
| 94.7 px | 1 | span |
| 95.98 px | 1 | span |
| 114.61 px | 1 | span |
| 162.14 px | 1 | span |
| 170.17 px | 1 | span |
| 299 px | 2 | svg, img.guide-icon-img |
| 319 px | 1 | span.rechner-wp-unit.rechner-wp-unit-single |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**waermepumpe-altbau, 768 px: 14 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 19 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 6 | li, strong, li |
| 45 px | 8 | h2#begriffe-titel, dl, dt |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 282.36 px | 1 | a |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**waermepumpe-hannover, 768 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 19 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 45 px | 8 | h2#begriffe-titel, dl, dt |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 282.36 px | 1 | a.btn-primary |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**waermepumpe-laerm, 768 px: 16 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 18 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 42 px | 4 | li, strong, li |
| 69.56 px | 1 | strong |
| 70.95 px | 1 | a |
| 91.11 px | 1 | strong |
| 156.34 px | 1 | span |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 458.34 px | 1 | strong |
| 473.28 px | 1 | strong |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**waermepumpenstrom-hannover, 768 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 16 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 488.39 px | 1 | a |
| 491.97 px | 1 | span.tt-feld |
| 534.03 px | 1 | a |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**wertsteigerung-waermepumpe, 768 px: 11 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 17 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 156.34 px | 1 | span |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**wp-kosten-hannover, 768 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 20 px | 31 | div.section-inner, div.section-tag, div.brotkrume |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 70.95 px | 1 | a |
| 82.3 px | 1 | a |
| 156.34 px | 1 | span |
| 290.41 px | 6 | th, td, td |
| 420.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 424.09 px | 1 | span.tt-feld |
| 491.97 px | 1 | span.tt-feld |
| 592.06 px | 1 | a.mobile-phone-cta |
| 631.06 px | 1 | span.mobile-phone-label |
| 700 px | 1 | div#hamburger.hamburger |

**amortisation-waermepumpe, 960 px: 10 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 100 px | 18 | div.section-inner, div.section-tag, h1.section-title |
| 122 px | 8 | li, strong, li |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**anfrage, 960 px: 25 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.funnel-layout, aside.trust-panel, nav.legal-footer |
| 36 px | 23 | div.trust-logo, a, img.logo-dark |
| 40 px | 1 | span.tt-feld |
| 76 px | 8 | div.trust-usp-text, strong, div.trust-usp-text |
| 95.88 px | 1 | em |
| 102.09 px | 1 | span.partner-badge.pb-vaillant |
| 107.88 px | 1 | span.tt-feld |
| 119.09 px | 1 | a |
| 186.48 px | 1 | span#partnerKfw.partner-badge |
| 302.55 px | 1 | a |
| 360 px | 4 | main#main-content.funnel-panel, div.funnel-header, div.progress-bar-wrap |
| 408 px | 14 | span#stepCounter.funnel-step-counter, div.progress-bar-top, span.progress-label |
| 409.92 px | 1 | a |
| 430 px | 3 | div.answer-card-icon, div.answer-card-icon, div.answer-card-icon |
| 451 px | 3 | svg, svg, svg |
| 456.83 px | 3 | g, path, g |
| 456.84 px | 2 | g, path |
| 457.26 px | 1 | path |
| 462.61 px | 1 | path |
| 463.32 px | 1 | path |
| 484.11 px | 1 | path |
| 535.77 px | 1 | a |
| 558 px | 9 | div.answer-card-text, div.answer-card-label, div.answer-card-sub |
| 822.47 px | 1 | a.funnel-close-link |
| 830.41 px | 1 | span#progressPercent.progress-percent |

**barrierefreiheit, 960 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 100 px | 15 | div.section-inner, div.section-tag, h1.section-title |
| 122 px | 13 | li, li, li |
| 386.94 px | 1 | strong |
| 465.45 px | 1 | strong |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**baubarkeitspruefung, 960 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 100 px | 25 | div.section-inner, div.section-tag, div.brotkrume |
| 122 px | 8 | li, strong, li |
| 125 px | 1 | h2#begriffe-titel |
| 150.95 px | 1 | a |
| 236.34 px | 1 | span |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**bewerbung, 960 px: 28 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#bewerbung.contact |
| 24 px | 12 | a, img.nav-logo.logo-dark, div.section-inner |
| 140 px | 3 | div.bewerbung-layout, div#bewerbungCard.foerder-grid, p.bewerbung-fallback |
| 181 px | 5 | div.bewerbung-steps, span, span |
| 182 px | 20 | div.form-group, label, select#bwRolle |
| 200 px | 1 | strong |
| 207 px | 1 | label |
| 208.92 px | 1 | label |
| 262 px | 5 | div.footer-col, h2, a |
| 298.38 px | 1 | span.form-optional |
| 305.03 px | 1 | span.form-optional |
| 335.77 px | 1 | span.form-optional |
| 350.81 px | 1 | span |
| 354.3 px | 1 | a |
| 408.27 px | 1 | a |
| 488 px | 6 | div.form-group, label, input#bwNachname |
| 500 px | 4 | div.footer-col, h2, a |
| 551.2 px | 1 | a |
| 560.28 px | 1 | a |
| 593.73 px | 1 | a |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 653.95 px | 1 | a |
| 683.97 px | 1 | span.tt-feld |
| 738 px | 5 | div.footer-col, h2, p |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**datenschutz, 960 px: 10 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 50 px | 1 | main#main-content |
| 83 px | 20 | div.topbar, a, h1 |
| 148.22 px | 1 | a |
| 354.44 px | 1 | a |
| 387.33 px | 1 | code |
| 568.91 px | 1 | a |
| 656.13 px | 1 | code |
| 713.03 px | 1 | button.theme-toggle |
| 717.03 px | 1 | span.tt-feld |
| 784.91 px | 1 | span.tt-feld |

**dimensionierung, 960 px: 39 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 5 | div.nav-inner, main#main-content, section#wizard.wizard-section |
| 24 px | 16 | a, img.nav-logo.logo-dark, div.section-inner |
| 53 px | 1 | h2#abschluss-angebot |
| 100 px | 1 | div#wizCard.wizard-container |
| 141 px | 11 | div#wizProgress.wizard-progress, div.wizard-progress-bar.active, div.wizard-step.active |
| 170 px | 1 | p |
| 186.45 px | 1 | div.wizard-progress-bar |
| 231.92 px | 1 | div.wizard-progress-bar |
| 262 px | 5 | div.footer-col, h2, a |
| 277.38 px | 1 | div.wizard-progress-bar |
| 322.84 px | 1 | div.wizard-progress-bar |
| 354.3 px | 1 | a |
| 368.31 px | 1 | div.wizard-progress-bar |
| 370 px | 1 | a.btn-primary |
| 413.78 px | 1 | div.wizard-progress-bar |
| 459.25 px | 1 | div.wizard-progress-bar |
| 486 px | 1 | button#wzPlzNext.wizard-btn-next.is-disabled |
| 500 px | 4 | div.footer-col, h2, a |
| 504.72 px | 1 | div.wizard-progress-bar |
| 550.19 px | 1 | div.wizard-progress-bar |
| 551.2 px | 1 | a |
| 593.61 px | 2 | div.footer-legal, a |
| 593.73 px | 1 | a |
| 595.66 px | 1 | div.wizard-progress-bar |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 641.13 px | 1 | div.wizard-progress-bar |
| 653.95 px | 1 | a |
| 680.28 px | 1 | a |
| 683.97 px | 1 | span.tt-feld |
| 686.59 px | 1 | div.wizard-progress-bar |
| 732.06 px | 1 | div.wizard-progress-bar |
| 738 px | 6 | div.footer-col, h2, p |
| 775.52 px | 1 | a |
| 777.53 px | 1 | div.wizard-progress-bar |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 851.27 px | 1 | a |
| 892 px | 1 | div#hamburger.hamburger |

**dimensionierung-verstehen, 960 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 100 px | 30 | div.section-inner, div.section-tag, div.brotkrume |
| 150.95 px | 1 | a |
| 236.34 px | 1 | span |
| 304.31 px | 1 | a |
| 328.94 px | 5 | th, td, td |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**foerderung, 960 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, section#foerder.foerder-section |
| 24 px | 7 | a, img.nav-logo.logo-dark, div.section-inner |
| 65 px | 39 | div, div.foerder-inputs-grid, div.fi-group |
| 69 px | 2 | button.active, button.active |
| 85 px | 1 | span |
| 86 px | 1 | span |
| 482 px | 2 | button, button |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**foerderung-hannover, 960 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 100 px | 30 | div.section-inner, div.section-tag, div.brotkrume |
| 150.95 px | 1 | a |
| 236.34 px | 1 | span |
| 260.05 px | 4 | th, td, td |
| 361.95 px | 4 | th, td, td |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**foerderung-jetzt-mitnehmen, 960 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 100 px | 32 | div.section-inner, div.section-tag, div.brotkrume |
| 150.95 px | 1 | a |
| 236.34 px | 1 | span |
| 260.05 px | 4 | th, td, td |
| 353.5 px | 4 | th, td, td |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**foerdervorschuss, 960 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 100 px | 20 | div.section-inner, div.section-tag, h1.section-title |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**gasheizung-tauschen-oder-reparieren, 960 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 100 px | 18 | div.section-inner, div.section-tag, div.brotkrume |
| 122 px | 4 | li, li, li |
| 150.95 px | 1 | a |
| 236.34 px | 1 | span |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**hinweise, 960 px: 9 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 100 px | 17 | div.section-inner, div.section-tag, h1.section-title |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**impressum, 960 px: 11 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 50 px | 2 | main#main-content, nav.legal-footer |
| 83 px | 23 | div.topbar, a, h1 |
| 140.28 px | 1 | a |
| 148.22 px | 1 | a |
| 270.41 px | 1 | a |
| 369.63 px | 1 | a |
| 479.11 px | 1 | a |
| 604.8 px | 1 | a |
| 713.03 px | 1 | button.theme-toggle |
| 717.03 px | 1 | span.tt-feld |
| 784.91 px | 1 | span.tt-feld |

**index, 960 px: 28 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 6 | div.nav-inner, main#main-content, section.hero |
| 24 px | 24 | a, img.nav-logo.logo-dark, div.hero-inner |
| 25 px | 4 | div.hc-row, div.hc-row, div.hc-result |
| 49 px | 8 | div, div.hc-label, div |
| 76 px | 2 | div.usp-text, h2 |
| 120.89 px | 1 | a.fv-disclaimer-link |
| 189.03 px | 2 | div.usp-item, div.usp-icon |
| 241.03 px | 2 | div.usp-text, h2 |
| 258 px | 1 | a.btn-ghost |
| 360 px | 1 | aside.fv-badge-box |
| 389 px | 1 | a#fvHomeCta.btn-primary.fv-badge-cta |
| 390.09 px | 2 | div.usp-item, div.usp-icon |
| 409.02 px | 1 | div.hc-result-value |
| 424.98 px | 1 | a.fv-disclaimer-link |
| 425.41 px | 1 | div.hc-value |
| 438.67 px | 1 | div.hc-value |
| 442.09 px | 2 | div.usp-text, h2 |
| 486 px | 1 | a.btn-ghost |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 622.86 px | 2 | div.usp-item, div.usp-icon |
| 674.86 px | 2 | div.usp-text, h2 |
| 683.97 px | 1 | span.tt-feld |
| 780.63 px | 2 | div.usp-item, div.usp-icon |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 832.63 px | 2 | div.usp-text, h2 |
| 892 px | 1 | div#hamburger.hamburger |

**karriere, 960 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#hero.section.kar-hero |
| 24 px | 18 | a, img.nav-logo.logo-dark, div.section-inner |
| 51 px | 9 | span.kar-icon, h3, p |
| 62 px | 3 | svg, svg, svg |
| 107.59 px | 1 | strong |
| 260.48 px | 1 | a.kar-btn-ghost |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**kontakt, 960 px: 29 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#contact.contact |
| 24 px | 21 | a, img.nav-logo.logo-dark, div.section-inner |
| 48 px | 2 | div.contact-image-caption-title, div.contact-image-caption-sub |
| 262 px | 5 | div.footer-col, h2, a |
| 354.3 px | 1 | a |
| 460.36 px | 2 | div, form#kontaktForm.contact-form |
| 493.36 px | 22 | div.form-group, label, input#kontaktName |
| 500 px | 4 | div.footer-col, h2, a |
| 519.42 px | 1 | label |
| 528.97 px | 1 | span.form-optional |
| 547.7 px | 1 | span.form-optional |
| 551.2 px | 1 | a |
| 593.61 px | 2 | div.footer-legal, a |
| 593.73 px | 1 | a |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 639.23 px | 3 | div.form-group, label, input#kontaktOrt |
| 653.95 px | 1 | a |
| 670.28 px | 1 | span.form-optional |
| 680.28 px | 1 | a |
| 683.97 px | 1 | span.tt-feld |
| 738 px | 6 | div.footer-col, h2, p |
| 775.52 px | 1 | a |
| 784.06 px | 1 | a.mobile-phone-cta |
| 804.08 px | 3 | div.form-group, label, input#kontaktHausnr |
| 810.08 px | 1 | span.form-optional |
| 823.06 px | 1 | span.mobile-phone-label |
| 851.27 px | 1 | a |
| 892 px | 1 | div#hamburger.hamburger |

**kostenvergleich-waermepumpe, 960 px: 30 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, header.page-head, div.container |
| 24 px | 14 | a, img.nav-logo.logo-dark, div.page-head-inner |
| 37 px | 1 | span.wz-dot |
| 57 px | 19 | h2#rechner-einleitung, details.rechner-intro-details.klapp, div.inhalt |
| 69 px | 1 | span |
| 87.47 px | 1 | a |
| 197.34 px | 1 | a |
| 208 px | 1 | button.wz-step |
| 221 px | 1 | span.wz-dot |
| 253 px | 1 | span |
| 273.16 px | 1 | a |
| 364.97 px | 1 | a |
| 392 px | 1 | button.wz-step |
| 405 px | 1 | span.wz-dot |
| 437 px | 1 | span |
| 469.56 px | 1 | span.accent |
| 486 px | 1 | button.wz-choice.wahlkarte |
| 576 px | 1 | button.wz-step |
| 589 px | 1 | span.wz-dot |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 621 px | 1 | span |
| 683.97 px | 1 | span.tt-feld |
| 760 px | 1 | button.wz-step |
| 773 px | 1 | span.wz-dot |
| 784.06 px | 1 | a.mobile-phone-cta |
| 805 px | 1 | span |
| 823.06 px | 1 | span.mobile-phone-label |
| 824.5 px | 1 | button#wzNext.wz-next |
| 892 px | 1 | div#hamburger.hamburger |

**preise, 960 px: 19 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#preise-intro.section |
| 24 px | 19 | a, img.nav-logo.logo-dark, div.section-inner |
| 44 px | 6 | li, strong, li |
| 46 px | 2 | span.manufacturer-name, span#wolfMinEigen.manufacturer-price |
| 130 px | 12 | div#preis-bedingungen.preisanker-disclaimer, p, strong |
| 148 px | 4 | li, li, li |
| 347.45 px | 1 | em |
| 487 px | 1 | button#manufacturerVaillant.manufacturer-tab |
| 491.06 px | 1 | a |
| 509 px | 2 | span.manufacturer-name, span#vaillantMinEigen.manufacturer-price |
| 594 px | 1 | a.pa-header-cta |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 622 px | 2 | div.pa-cta-icon, svg |
| 664 px | 3 | div, div.pa-cta-text, div.pa-cta-sub |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**propan-waermepumpe, 960 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 100 px | 17 | div.section-inner, div.section-tag, div.brotkrume |
| 122 px | 6 | li, strong, li |
| 150.95 px | 1 | a |
| 236.34 px | 1 | span |
| 328.44 px | 1 | a |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**prozess, 960 px: 34 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 4 | div.nav-inner, main#main-content, section#prozess.prozess |
| 24 px | 11 | a, img.nav-logo.logo-dark, div.section-inner |
| 36 px | 8 | h2, p, div#pzSub1.pz-substeps |
| 53 px | 1 | h2#abschluss-angebot |
| 78.53 px | 1 | button.pz-expand-hint |
| 80 px | 3 | figure.pz-figure, picture, img |
| 95.53 px | 1 | span.pz-hint-text |
| 102 px | 1 | div.pz-step-num |
| 114.91 px | 1 | span.pz-time |
| 170 px | 1 | p |
| 252 px | 1 | div.pz-step |
| 264 px | 2 | h2, p |
| 267.91 px | 1 | button.pz-expand-hint |
| 284.91 px | 1 | span.pz-hint-text |
| 330 px | 1 | div.pz-step-num |
| 332.52 px | 1 | span.pz-time |
| 480 px | 1 | div.pz-step |
| 492 px | 2 | h2, p |
| 495.91 px | 1 | button.pz-expand-hint |
| 512.91 px | 1 | span.pz-hint-text |
| 558 px | 1 | div.pz-step-num |
| 559.27 px | 1 | span.pz-time |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 708 px | 1 | div.pz-step |
| 720 px | 2 | h2, p |
| 723.91 px | 1 | button.pz-expand-hint |
| 740.91 px | 1 | span.pz-hint-text |
| 784.06 px | 1 | a.mobile-phone-cta |
| 786 px | 1 | div.pz-step-num |
| 794.48 px | 1 | span.pz-time |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**ratgeber, 960 px: 22 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| -325.96 px | 1 | image |
| 0 px | 3 | div.nav-inner, main#main-content, section#blog.blog-section.ratgeber-hub |
| 24 px | 22 | a, img.nav-logo.logo-dark, div.section-inner |
| 25 px | 5 | div.blog-card-art.guide-visual.guide-visual-altbau, div.blog-card-art.guide-visual.guide-visual-sound, div.blog-card-art.guide-visual.guide-visual-r290 |
| 49.73 px | 2 | image, image |
| 106.66 px | 5 | svg, img.guide-icon-img, svg |
| 177.48 px | 1 | a |
| 288.39 px | 1 | a |
| 336.31 px | 5 | div.blog-card-body, div.blog-card-body, div.blog-card-body |
| 356.31 px | 27 | div.blog-card-tag, h2, p |
| 409.94 px | 1 | span |
| 425.92 px | 1 | span |
| 427.88 px | 1 | span |
| 431.91 px | 1 | span |
| 468.81 px | 1 | span |
| 491.45 px | 1 | span |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**rechner, 960 px: 28 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| -284.53 px | 1 | image |
| -221.93 px | 1 | image |
| 0 px | 3 | div.nav-inner, main#main-content, section.rechner-hub.section |
| 24 px | 15 | a, img.nav-logo.logo-dark, div.section-inner |
| 25 px | 4 | div.rechner-card-art.blog-card-art.guide-visual, div.rechner-card-art.blog-card-art.guide-visual, div.rechner-card-art.blog-card-art.guide-visual |
| 49 px | 3 | h2, div.rechner-roadmap-grid, article.rechner-roadmap-card |
| 50 px | 1 | div.rechner-roadmap-art.blog-card-art.guide-visual |
| 95.66 px | 2 | svg, img.guide-icon-img |
| 106.66 px | 1 | img.guide-icon-img |
| 108.23 px | 1 | svg |
| 115.66 px | 1 | span.rechner-wp-unit.rechner-wp-unit-single |
| 258.48 px | 1 | div.rechner-roadmap-body |
| 276.48 px | 2 | h3, p |
| 336.31 px | 4 | div.rechner-card-body, div.rechner-card-body, div.rechner-card-body |
| 356.31 px | 24 | div.rechner-card-kicker, h2, p |
| 406.02 px | 1 | span |
| 407.3 px | 1 | span |
| 425.92 px | 1 | span |
| 457.27 px | 1 | span |
| 473.45 px | 1 | span |
| 481.48 px | 1 | span |
| 538.98 px | 1 | span |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**waermepumpe-altbau, 960 px: 14 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 100 px | 18 | div.section-inner, div.section-tag, div.brotkrume |
| 122 px | 6 | li, strong, li |
| 125 px | 8 | h2#begriffe-titel, dl, dt |
| 150.95 px | 1 | a |
| 236.34 px | 1 | span |
| 362.36 px | 1 | a |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**waermepumpe-hannover, 960 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 100 px | 19 | div.section-inner, div.section-tag, div.brotkrume |
| 125 px | 6 | h2#begriffe-titel, dl, dt |
| 150.95 px | 1 | a |
| 236.34 px | 1 | span |
| 362.36 px | 1 | a.btn-primary |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**waermepumpe-laerm, 960 px: 16 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 100 px | 17 | div.section-inner, div.section-tag, div.brotkrume |
| 122 px | 1 | li |
| 150.95 px | 1 | a |
| 175.55 px | 1 | strong |
| 236.34 px | 1 | span |
| 251.56 px | 1 | strong |
| 565.75 px | 1 | strong |
| 581.61 px | 1 | strong |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**waermepumpenstrom-hannover, 960 px: 12 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 100 px | 17 | div.section-inner, div.section-tag, div.brotkrume |
| 150.95 px | 1 | a |
| 236.34 px | 1 | span |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 640.39 px | 1 | a |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**wertsteigerung-waermepumpe, 960 px: 11 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 100 px | 15 | div.section-inner, div.section-tag, div.brotkrume |
| 150.95 px | 1 | a |
| 236.34 px | 1 | span |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |

**wp-kosten-hannover, 960 px: 13 verschiedene linke Kanten**

| Kante | Bloecke | Beispiele |
|---|---|---|
| 0 px | 3 | div.nav-inner, main#main-content, article.section |
| 24 px | 3 | a, img.nav-logo.logo-dark, a.mob-bar-cta |
| 100 px | 30 | div.section-inner, div.section-tag, div.brotkrume |
| 150.95 px | 1 | a |
| 222.11 px | 1 | a |
| 236.34 px | 1 | span |
| 382.3 px | 6 | th, td, td |
| 612.09 px | 1 | button.theme-toggle.nav-theme-standalone |
| 616.09 px | 1 | span.tt-feld |
| 683.97 px | 1 | span.tt-feld |
| 784.06 px | 1 | a.mobile-phone-cta |
| 823.06 px | 1 | span.mobile-phone-label |
| 892 px | 1 | div#hamburger.hamburger |
