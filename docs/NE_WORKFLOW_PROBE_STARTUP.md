# NE Workflow-Robustness-Rerun: Startup

Diese Datei ist der Kickoff-Kontext für einen frischen Cowork-Chat, der den Workflow-Robustness-Rerun auf dem Natural-Elements-Store durchführt. Sie präzisiert den weiter unten stehenden Cowork-Prompt um methodische und organisatorische Punkte, die sich in der Session, in der der Gold-Standard gebaut wurde, nicht sauber umsetzen lassen.

## 1. Phasenweise Pflichtlektüre

Der Prompt listet mehrere Dokumente als Pflichtlektüre. Zwei davon enthalten das Gold-Ergebnis und würden die Unabhängigkeit des Rerun zerstören, wenn sie vor Schritt 5 gelesen werden:

* `docs/NE_V2_RERUN_REPORT.md` enthält Gold-Modulzahlen pro Seite und die Trial-Prüfpunkte.
* `docs/NE_BRAND_IDENTITY_PASS.md` enthält die Gold-Brand-Identity.

### Phase 1, vor Schritt 1 bis 4, nur diese Dateien lesen

* `CLAUDE.md`
* `docs/BLUEPRINT_EXTRACTION_PROMPT.md`
* `scripts/extract-page-dom.js`
* `scripts/build-blueprint-grammar.mjs`

### Phase 2, erst vor Schritt 5 und 6 (Diff-Analyse), zusätzlich lesen

* `docs/NE_V2_RERUN_REPORT.md`
* `docs/NE_BRAND_IDENTITY_PASS.md`
* `data/store-knowledge/natural-elements_analysis.json`

### Gold-Schutz

Die Gold-Datei `data/store-knowledge/natural-elements_analysis.json` ist ebenfalls erst in Phase 2 zu öffnen. In Phase 1 nur als Kopie sichern:

```bash
mkdir -p data/store-knowledge/rerun
cp data/store-knowledge/natural-elements_analysis.json data/store-knowledge/rerun/natural-elements_gold.json
```

Bewusst mit `cp` statt mit dem Read-Tool, damit die Gold-Bytes auf der Platte gesichert sind, ohne dass ihr Inhalt in den Kontext fällt.

### Umgang mit Unklarheiten

Falls während Phase 1 Fragen zum Schema auftreten: strikt nach `docs/BLUEPRINT_EXTRACTION_PROMPT.md` arbeiten und Offenheiten als `openQuestions` im Rerun-Output dokumentieren. Nicht in die Gold-Docs schauen.

## 2. URL-Liste der 10 Zielseiten

Die Seiten-IDs werden im Gold-Analysis-JSON gepflegt und stehen damit erst in Phase 2 zur Verfügung. Für Phase 1 direkt diese URL-Liste nutzen:

| Seite                          | URL                                                                   |
|--------------------------------|------------------------------------------------------------------------|
| Startseite                     | https://www.amazon.de/stores/page/3955CCD4-902C-4679-9265-DEC4FCBAA8C8 |
| Immunsystem                    | https://www.amazon.de/stores/page/1B2D6D85-21E1-4BBE-AD98-EBDE6CFEA02F |
| Vitamine                       | https://www.amazon.de/stores/page/5DF9227A-372F-4144-8FE4-73B4797BAABD |
| SoProtein Vegan                | https://www.amazon.de/stores/page/0C5288E7-93DF-4272-890E-78EFF3DD0813 |
| Über uns                       | https://www.amazon.de/stores/page/C199E0D4-B434-4DFA-8DF0-2D5601387A8B |
| Alle Produkte                  | https://www.amazon.de/stores/page/56C2E5EE-81A5-4F07-8BB3-38927E13937B |
| unsere Neuheiten               | https://www.amazon.de/stores/page/E3653495-9130-48DC-BFA4-F38BD9C7AEF1 |
| Produktselektor                | https://www.amazon.de/stores/page/A03B844E-0DA2-4FFC-8205-DC6DFDB0D59E |
| Geschenk-Sets                  | https://www.amazon.de/stores/page/1A5ECF37-615B-4FBB-8620-C629481CB321 |
| Unsere Bestseller Empfehlungen | https://www.amazon.de/stores/page/B77CB4EF-4CCF-4FB0-9251-53DF11DCCE12 |

Damit arbeitet der Probe-Run bis Schritt 4 ohne jede Gold-Berührung. Erst wenn der Rerun steht, wird gegen den Gold-Standard verglichen.

## 3. Branch-Strategie

Dieser Run wird NICHT von `main` abgezweigt. Basis ist `claude/recover-chat-context-tjPth`, damit der neue Brand-Identity-Pass aus Commit `5847f09` mit drin ist. Der eigentliche Arbeitsbranch heisst:

```
claude/ne-workflow-probe-<suffix>
```

`<suffix>` wird vom Cowork-Agent gewählt (kurz, eindeutig, lowercase). Der Gold-Standard liegt auf dem Basisbranch unter `data/store-knowledge/natural-elements_analysis.json`.

## 4. Commit-Strategie

Am Ende des Rerun wird genau ein Commit erzeugt. In diesen Commit gehören:

* Diese Startup-Datei: `docs/NE_WORKFLOW_PROBE_STARTUP.md`
* Der neue Rerun-Report: `docs/NE_V2_RERUN_REPORT.md` (Fassung mit Diff-Analyse)
* Alle Rerun-Artefakte unter `data/store-knowledge/rerun/`, inklusive `natural-elements_gold.json` und der in Phase 1 neu erzeugten Blueprint- und DOM-JSONs.

Alles in einem einzigen Commit, damit der Rerun als atomare Einheit reviewbar ist.

---

## 5. Cowork-Prompt: natural elements Workflow-Robustness-Rerun

<!--
  TODO: vollständigen Cowork-Prompt hier einfügen, 1:1 wie im Chat vorliegend.
  Der Prompt ersetzt diesen TODO-Block. Bitte inhaltlich nicht redaktionell verändern.
  Die oben stehenden Abschnitte 1 bis 4 haben Vorrang vor evtl. gegenläufigen
  Detailangaben im Prompt, insbesondere bei Phasen-Lesen, Branch-Basis und Commit-Umfang.
-->
