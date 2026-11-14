# Brand Story Builder: einfacher Erstellungs- und Designerprozess

Stand: 14. November 2026. Entwurf zur abschließenden Abstimmung; noch keine Produktänderung.

## Ziel und gewählter Ansatz

Der bestehende Brand Story Builder wird in Bedienung und Gestaltung an den vorhandenen Store Builder angeglichen. Mitarbeiter legen Markenprojekte an, entwickeln das Konzept separat in Claude, übernehmen es als JSON und bearbeiten es direkt in einer Vorschau. Designer erhalten ihre eigene Arbeitsansicht. Kunden erhalten Vorschau und die zum Nachbauen nötigen Angaben.

Im Gespräch wurden zwei Ansätze betrachtet: separates Claude mit JSON-Übergabe oder eine direkte KI-Integration im Builder. Der Nutzer hat den separaten Claude-Prozess gewählt. Die zusätzliche KI-Integration entfällt. Die bestehende React/Vite-Anwendung, Turso-Speicherung, Blob-Bildablage und Cockpit-Menüanbindung werden weiterverwendet.

## Verbindliche Grundlagen

- Eine Story besitzt genau eine geordnete Kartenliste. Desktop und Mobil verwenden identische Karten, Bilddateien, Texte, Überschriften und Ziele.
- Es gibt zwei Hintergrunddateien: Desktop und Mobil. Beide Hintergründe stehen fest, nur die Karten bewegen sich.
- Desktop zeigt mehrere Karten; Mobil zeigt genau eine vollständige Karte gleichzeitig. Das komplette Vierergrid zählt als eine Karte. Nachbarkarten dürfen in der Mobilansicht nicht zusätzlich sichtbar sein.
- Höchstens 19 Karten insgesamt, beliebig gemischt aus Brand Media Assets und ASIN-Grids. Ein Grid zählt einmal, nicht viermal. Kein fester Mindestumfang für eine finale Story; leere Entwürfe sind erlaubt und werden als unvollständig angezeigt.
- Briefings und Inhalte können aus JSON entstehen und anschließend durch Mitarbeiter manuell bearbeitet werden. Das gilt ausdrücklich auch für Motiv und Inhalt der Hintergründe.
- Der Designer entscheidet über die konkrete gestalterische Umsetzung. Das Tool liefert Inhalte, Motivwünsche, Verlinkungen, Dateiformate und wenige relevante Funktionsregeln, keine umfangreiche allgemeine Designvorschrift.

## 1. Projektübersicht

Einstieg unter `/brand-stories` zeigt eine Übersicht großer Projektkacheln nach dem Muster von `StoreOverview`, keine Projektauswahl per Dropdown unter einer Überschrift.

Jede Kachel zeigt eine Miniatur der Story (auch ohne fertige Bilddateien sinnvoll), Markenname, Gesamtzahl der Karten, Aufteilung Bildkarten/ASIN-Grids, Marktplatz und letzten Bearbeitungsstand. Desktop-/Mobilhintergrundstatus ist erkennbar. Klick öffnet das Projekt. Oben stehen „Brand Stories“ und „Neue Brand Story“. Ein geöffnetes Projekt bietet „Alle Brand Stories“ zur Rückkehr.

Technische Entscheidung des Entwurfs: Die Projektliste liefert kleine Vorschau-Metadaten und Zählwerte mit, nicht das vollständige JSON jeder Story. Lade-, Fehler- und Leerzustände orientieren sich an der bestehenden Store-Übersicht.

## 2. Neue Story und Claude-Popup

„Neue Brand Story“ öffnet einen Dialog statt eines Browser-Prompts. Der Dialog führt durch Markenbasis und Konzeptimport. Er kann geschlossen und später erneut geöffnet werden; bereits eingegebene Inhalte bleiben im Entwurf erhalten.

Die Markenbasis erfasst:

- Markenname, Marktplatz und Sprache;
- relevante Markeninformationen, Zielgruppe, zentrale Aussage und belegbare Marken-/Produktvorteile;
- vorhandene Menschen-, Orts-, Produkt- und Logoaufnahmen bzw. Hinweise auf das verfügbare Material;
- Produkte/ASINs mit verständlichen Bezeichnungen, die gezeigt werden sollen;
- vorhandene Brand-Store- und Unterseiten-URLs mit Bezeichnung bzw. Zweck;
- optional gewünschte Kartenanzahl und eigene inhaltliche Hinweise.

Nicht jedes Feld muss zwingend befüllt sein. Fehlende Fakten dürfen nicht erfunden werden. Claude soll gezielt danach fragen, soweit sie für das Konzept notwendig sind. Der Ablauf muss ausdrücklich auch Marken mit einem einzigen Produkt unterstützen.

Der Dialog erklärt knapp: Angaben und Anleitung nach Claude übernehmen, Konzept im Gespräch abstimmen, anschließend das fertige JSON zurückkopieren oder als Datei importieren. „Anleitung kopieren“ bündelt Markenbasis, bekannte Produkte/Ziele, Formatregeln und das verbindliche JSON-Schema. Änderungen an einem bestehenden Projekt können denselben Dialog erneut verwenden.

Import zeigt Fehler verständlich an und verändert den Entwurf erst nach erfolgreicher Validierung. Für ein bestehendes Projekt werden die geplanten Strukturänderungen vor Übernahme angezeigt. Ein vorhandener Entwurf lässt sich vorher als JSON sichern. Vorhandene IDs, Bildzuordnungen und Dateipfade bleiben bei einem passenden Update erhalten; keine Zuordnung nur nach veränderlicher Kartenposition. Bei einer fremden Marke wird ein neues Projekt angelegt bzw. ein expliziter Projektwechsel verlangt, statt die vorhandene Story still zu überschreiben.

## 3. Arbeitsfläche

Nach Anlage oder Import landet der Mitarbeiter direkt in der Vorschau, nicht in einer Reihe separater Tabs für Editor, Anweisungen, Beispiele, Claude und JSON.

- Oben: Rückkehr zur Übersicht, Marke, Speichern, Desktop/Mobil, Designer-Link und Kundenansicht. „Konzept mit Claude“ öffnet bei Bedarf den Dialog erneut.
- Links: Hintergrundbereich und sortierbare Kartenfolge, mit Typ und verständlichem Namen. Kartenanzahl als `n / 19`.
- Mitte: große interaktive Story-Vorschau. Ein Umschalter verändert nur die Darstellung und den verwendeten Hintergrund.
- Rechts: Inhalte, konkretes Briefing und Bildzuordnungen des ausgewählten Elements.

Die neue Oberfläche verwendet dieselbe visuelle Sprache und möglichst vorhandene Darstellungsbausteine des Store Builders. Die aktuelle eigene grüne Gestaltung wird nicht fortgeführt. Fachlich getrennte Story-Daten bleiben getrennt von Store-Daten.

Ein Plus an einer Einfügeposition öffnet eine verständliche Typauswahl mit zwei kleinen Schemabildern: Brand Media Asset (ein Bild) oder ASIN-Grid (vier Bildplätze, Überschrift und Shop-Link). Beim Limit 19 kann keine weitere Karte hinzugefügt werden; Einfügen und Import werden ebenso serverseitig geprüft. Karten lassen sich neu anordnen, ohne ihre Dateizuordnung zu ändern.

Die Vorschau funktioniert vor dem Design-Upload: Bildkarten zeigen ihre geplanten Texte/Motivbeschreibungen als als Entwurf erkennbare Inhaltsplatzhalter; Grids zeigen vier Plätze, bekannte Produktbilder, Überschrift und Link. Hintergrundplatzhalter zeigen die jeweilige Motivbeschreibung. Diese Platzhalter sind keine fertig gestalteten Amazon-Bilder und ersetzen keinen Designer-Upload. Kunden dürfen keinen internen Briefingtext im Platzhalter erhalten.

## 4. Editierbare Inhalte und Hintergründe

Hintergrundauswahl zeigt die beiden Formate mit eigener Bildablage und eigener Beschreibung dessen, was im Hintergrund zu sehen sein soll. Ein gemeinsamer konzeptioneller Ausgangspunkt ist möglich; Desktopmotiv und mobile Adaption sind getrennt manuell editierbar. Genauer Wortlaut im Bild wird getrennt vom Motivbriefing erfasst.

Eine Bildkarte zeigt Inhalt/exakten Bildtext, konkretes Motivbriefing, Dateiname und Bild-Upload. Die Karte hat ein gemeinsames Bild für Desktop und Mobil.

Ein ASIN-Grid zeigt eine editierbare Überschrift, das konkrete Inhalts-/Motivbriefing, einen editierbaren Shop-/Unterseiten-Link im Footer sowie vier einzelne Bildplätze in der Reihenfolge oben links, oben rechts, unten links, unten rechts. Jeder Platz besitzt eigene ASIN, aufgelöstes Produktziel, optional eigenes URL-Ziel und Bildzuordnung. Derselbe ASIN-Wert darf mehrfach vorkommen. Produktdatenfehler dürfen die übrige Storybearbeitung nicht blockieren. Technische Zielvalidierung und die vorhandene Marketplace-Unterstützung bleiben wirksam.

Der Nutzer kann Brand-Store-Unterseiten bereits in der Markenbasis benennen; Claude wählt daraus passende Grid-Footerziele. Das Tool erfindet keine Store-URLs oder ASINs. Beim Import sind Überschrift und Ziele vorbelegt, danach editierbar. Die technische Amazon-konforme Benennung/Zeichenbegrenzung der vorhandenen Gridfelder bleibt sichtbar überprüfbar; keine neuen Amazon-Modultypen werden hinzugefügt.

## 5. Designeransicht und Referenzen

„Designer-Link“ erzeugt die eigene tokenbasierte Designeransicht nach dem bestehenden Freigabemodell. Sie enthält Story-Vorschau, Kartenfolge, konkrete Anweisungen pro Karte und pro Hintergrund, exakten Bildtext, Dateipfade, Formate und Uploadmöglichkeiten. Keine internen Markenquellen oder Mitarbeiteranweisungen werden offengelegt. Linkerstellung versendet keine Einladung.

| Dateityp | Produktionsformat |
|---|---|
| Desktop-Hintergrund | 3660 × 1563 px |
| Mobilhintergrund | 1389 × 1875 px |
| Brand Media Asset | 814 × 1019 px |
| Jedes einzelne Gridbild | 1328 × 1456 px |

JPG/PNG, bestehende 2-MB-Hinweise. Formate werden direkt am jeweiligen Element angezeigt. Auflösung, Seitenverhältnis und Dateigröße werden beim Upload geprüft; Entwurfsbilder können weiterhin mit Warnungen verwendet werden.

Eine kurze aufklappbare Erklärung vermittelt nur das Funktionsprinzip:

1. Hintergründe bleiben fest; dieselbe Kartenfolge läuft darüber, mobil einzeln.
2. Motive links können nach dem ersten Weiterklicken von Karten überlagert werden. Die Position ist durch alle Zustände zu prüfen.
3. Hintergrundlogos/Slogans rechts müssen gezielt unter Karten liegen, wenn sie erst später erscheinen sollen. Kein beliebiges sichtbares „Restlogo“ zwischen Karten. Eine Offenlegung am Ende wird anhand der tatsächlichen Kartenanzahl geprüft; sie ist nicht für jede Story automatisch gegeben.
4. Eine Bildkarte in Hintergrundfarbe mit Logo/Hashtag ist trotzdem eine mitscrollende Karte.
5. Vier Gridbilder können ein Gesamtmotiv bilden; sichtbare Zwischenräume müssen berücksichtigt werden und alle vier Plätze dürfen dieselbe ASIN verlinken.

„Beispiele ansehen“ öffnet echte interaktive Stories, die aus der Website-Referenzquelle übernommen werden, keine Screenshots. Vorschau, Designeransicht, Kundenansicht und Beispiele verwenden eine gemeinsame Karussellkomponente. Die Referenzdarstellung wird anhand des Website-Codes und der Einzelassets aufgebaut. Die bestehenden sechs Websitebeispiele sind MyPuzzle, PROCREA, Eglianos, OmniRelexx, Bachgold, Sanquell. Fehlende mobile Referenzhintergründe werden als fehlend kenntlich gemacht, nicht als angeblich vorhandene Originaldateien erfunden. Beispiele dürfen keine frei erfundenen ASIN-Ziele erhalten.

## 6. Bildlieferung und Kundenansicht

Der bestehende Ordnerimport wird in den neuen Ablauf integriert: `Hintergrund`, `Brand Media Assets`, `ASIN Grids`; die Dateien unter `Preview Neu` dienen nur dem Vergleich. Die stabile Dateizuordnung bleibt auch nach Umsortieren bestehen. Einzeluploads und das Ersetzen einzelner Bilder bleiben möglich. Doppelte/mehrdeutige/unpassende Dateien werden verständlich gemeldet.

Designer-Uploads aktualisieren den Arbeitsstand und die Designeransicht. Die separate Kundenfreigabe bleibt bis zur erneuten bewussten Veröffentlichung unverändert.

Kunden erhalten die klickbare Desktop-/Mobilvorschau. Eine übersichtliche „Angaben für Seller Central“-Ansicht zeigt Kartenreihenfolge, Typen, exakte Gridüberschriften, vier ASINs/Produktziele pro Grid, Shop-/Unterseiten-Link und Bilddateinamen/zugängliche Bilddateien. Konkrete Briefings, interne Markeninformationen und Claude-Anweisungen bleiben intern. Seller-Central-Nachbau erfolgt manuell durch den Kunden; keine automatische Kontoverbindung oder Veröffentlichung auf Amazon.

## Datenmodell und Weiterverwendung

Das JSON ist die gemeinsame Quelle für Eingabe, Vorschau, Briefing und Nachbauangaben. Es enthält genau eine `cards`-Liste; separate Desktop-/Mobilkarten sind unzulässig. Neue strukturierte Markenbasis und getrennte Hintergrundbriefings werden rückwärtskompatibel eingeführt. Bestehende Story-IDs, Tokens, Uploads, Revisionsprüfung und freigegebene Snapshots bleiben erhalten. Die bestehenden `brandFacts`, `instructions` und `background.brief` bleiben lesbar bzw. werden verlustfrei in die neue Darstellung übernommen. Bestandsdaten ohne neue Felder öffnen sich weiterhin.

Die Kundenprojektion muss neue interne Felder ausdrücklich ausschließen. Listenabfragen dürfen keine Tokens oder internen Briefings mitliefern. Datei-/URL-Verarbeitung verwendet die bestehenden Schutz- und Validierungsregeln.

## Claude-Inhalt und portierbarer Skill

Ein eigener portierbarer Claude-Skill dokumentiert den Markeninput, Rückfragen, Konzeptentwicklung, Kartenbegründung, Hintergrundinhalte und das validierbare JSON-Ausgabeformat. Die Anleitung im Popup wird aus derselben versionierten Grundlage erzeugt, damit Skill und Import nicht auseinanderlaufen. Der Skill wird als installierbares Paket bereitgestellt; keine automatische Installation in ein fremdes Claude-Konto.

Claude entwickelt einen kurzen Markeneinstieg und passende Inhalte aus den gelieferten Fakten. Authentische Menschen/Orte und nachvollziehbare Markenversprechen dienen als inhaltliche Leitlinien. Cross-Selling wird anhand des tatsächlichen Sortiments begründet. Keine starre Drei-Karten-Vorgabe; maximal 19. Keine erfundenen Wirkungszahlen, Gründer, Zertifikate, Produktmerkmale oder URLs. Designerbriefings auf Englisch, sichtbarer Bildtext in der Marktplatzsprache gemäß bisheriger Vereinbarung.

## Abnahme

- Projektkacheln statt Dropdown; Markenanlage und JSON-Import im Dialog; keine bisherigen Haupttabs.
- Leerer Entwurf und importierte Story besitzen sofort eine bedienbare Vorschau mit Desktop/Mobil-Umschalter.
- Dieselben Bildobjekte, ASINs, Texte und Reihenfolge erscheinen auf beiden Geräten; mobil exakt eine Karte, auch bei einem Grid.
- Gemischte 19 Karten sind zulässig, 20 nicht; gilt für UI, Import und API.
- Hintergrundbeschreibungen, Bildtexte, Gridüberschriften, alle vier ASINs und Footerlinks sind aus JSON vorbelegt und manuell änderbar.
- Karte auswählen/umsortieren erhält Bilder und Pfade. Bestandsstories und Links funktionieren weiter.
- Eigene Designeransicht zeigt konkrete Briefings, passende Formate, Grundprinzip und interaktive Referenzen.
- Kundenvorschau und Nachbauangaben enthalten keine internen Inhalte. Designeränderungen erscheinen erst nach erneuter Kundenfreigabe beim Kunden.
- Die mitgelieferte OmniRelexx-ZIP prüft Logokarte, zusammenhängende Gridmotive, Hintergrundüberdeckung und Schlusslogo gegen alle vier gelieferten Previewbilder. Die korrekte Reihenfolge wird aus diesen Previewbildern rekonstruiert, nicht nur aus alphabetischer Dateisortierung.
- Bestehende Tests werden um relevante Regressionsfälle ergänzt; Produktionsbuild und Browserablauf werden geprüft.

## Bewusst außerhalb des Umfangs

Direkte KI-Anbindung im Builder, separate mobile Kartenvarianten, automatische Bildgestaltung, allgemeine starre Layoutvorschriften für Designer, zusätzliche Amazon-Kartentypen und automatische Änderungen in Seller Central.

## Entscheidungen für die Umsetzung

Der Builder entscheidet über die genaue Komponentenaufteilung, rückwärtskompatible Feldnamen, responsive Anordnung der Panels, Performanz der Projektminiaturen und die Verpackung des Claude-Skills. Diese Entscheidungen dürfen die oben beschriebene Bedienung oder die gemeinsamen Karten nicht verändern. Standardentscheidung: Die Übersicht öffnet sich beim Einstieg, ein wiederherstellbarer Entwurf kann bewusst fortgesetzt werden; kein stilles Überspringen der Projektübersicht.
