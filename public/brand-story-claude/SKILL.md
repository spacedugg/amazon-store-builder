---
name: temoa-brand-story
description: Entwickle Amazon Brand Stories aus Markeninformationen, Produkten und vorhandenen Materialien für den temoa Brand Story Builder. Nutze diesen Skill für Story-Konzepte, konkrete Hintergrund- und Kartenbriefings sowie den zugehörigen JSON-Import.
---

# temoa Brand Story

Entwickle eine Amazon Brand Story für das temoa Brand Story Builder Tool.

1. MARKENBASIS
Prüfe Markeninformationen, Zielgruppe, zentrale Aussage, belegbare Vorteile, verfügbare Fotos/Logos sowie gewünschte Produkte und Unterseiten. Stelle gezielte Rückfragen, wenn wichtige Fakten oder Ziele fehlen. Ein einzelnes Produkt ist zulässig. Keine Fakten oder ASINs erfinden.

2. KONZEPT
Schlage eine nachvollziehbare Kartenfolge vor. Begründe kurz Inhalt, Motiv und Reihenfolge jeder Karte. Lege dar, was auf dem Desktop-Hintergrund zu sehen ist und wie es für den Mobilhintergrund adaptiert wird. Nutze einen kurzen, konkreten Markeneinstieg, authentische Menschen/Orte, soweit als Material belegt, und passende Produktverbindungen. Keine starre Drei-Karten-Regel. Kläre das Konzept im Gespräch, bevor du finales JSON erzeugst.

3. JSON
Gib nach inhaltlicher Bestätigung ausschließlich ein vollständiges JSON gemäß dem beigefügten Schema aus. Erhalte bei Änderungen bestehende IDs, fileKey-Werte, Dateipfade und Bildobjekte. Erzeuge neue eindeutige IDs und unbenutzte card-NN-Dateischlüssel nur für neue Karten. Nutze title für einen kurzen internen Kartennamen, brief für konkrete englische Inhalts-/Motivvorgaben und copy für den exakten sichtbaren Bildtext.
Nutze background.desktopBrief / desktopCopy und mobileBrief / mobileCopy für die zwei Hintergründe. Verwende nur eine cards-Liste. Unfertige Bilder sind null, keine Beispiel-URLs einsetzen.
Brand Media Assets erhalten stabile assetFile-Pfade nach „Brand Media Assets/media asset image N.jpg“. Grids erhalten für ihre vier slots stabile Pfade „ASIN Grids/ASIN image Na.jpg“ bis „Nd.jpg“, in der Reihenfolge oben links, oben rechts, unten links, unten rechts. Zähle Bildkarten und Grid-Dateisätze unabhängig; IDs und Pfade bleiben beim Umsortieren gleich. Hintergründe: „Hintergrund/Hintergrund_Desktop.jpg“ und „Hintergrund/Hintergrund_Mobile.jpg“. „Preview Neu“ enthält nur Vergleichsbilder und ist keine Bildquelle für Karten.
Setze headline und shopUrl für jedes Grid aus dem abgestimmten Konzept. Jeder der vier Plätze besitzt asin und optional url; eine URL ersetzt das ASIN-Ziel. Wenn Ziele fehlen, lasse sie leer und benenne die offene Frage vor der finalen Ausgabe.

Eine Brand Story hat einen festen Desktop-Hintergrund (3660 × 1563 px) und einen festen Mobilhintergrund (1389 × 1875 px). Sie verwendet eine gemeinsame Kartenliste für beide Ansichten. Mobil ist eine vollständige Karte sichtbar; ein komplettes Vierergrid ist eine Karte.
Maximal 19 Karten insgesamt, beliebig gemischt: Brand Media Asset (814 × 1019 px) oder ASIN-Grid mit vier eigenen Bildern (je 1328 × 1456 px), einer Überschrift (maximal 30 Zeichen) und einem Shop-/Unterseiten-Link. JPG/PNG, maximal 2 MB pro Datei. Es gibt keine getrennten mobilen Kartenbilder.
Der Hintergrund bleibt fest, die Karten bewegen sich. Plane links liegende Motive und rechts liegende Logos/Slogans so, dass ihre Überdeckung in jedem Karussellzustand sinnvoll ist. Eine Logokarte in Hintergrundfarbe scrollt mit; ein Hintergrundlogo bleibt stehen. Ein spätes Freilegen hängt von der tatsächlichen Kartenfolge ab. Vier Gridbilder dürfen zusammen ein Motiv ergeben und dieselbe ASIN verwenden; berücksichtige die Zwischenräume.
Formuliere konkrete Inhalte und Motivwünsche, keine allgemeinen Stilvorschriften. Der Designer entscheidet über die Gestaltung. Beschreibe Desktopmotiv und mobile Adaption getrennt. Alle nötigen Markenbotschaften müssen auch aus den gemeinsamen Karten verständlich sein.
Bildtexte gehören in die gestalteten Dateien. Die Gridüberschrift und der Link „Shop besuchen“ sind separate Felder. Nutze ausschließlich gelieferte ASINs und vorhandene Store-/Unterseiten-URLs; erfinde keine Ziele. Englische Motivbriefings, sichtbare Texte in der gewählten Marktplatzsprache. Keine unbelegten Claims, erfundenen Gründer, Zertifikate oder Wirkungszahlen. Versand und Lieferzeit sind keine Markenbotschaft.

## JSON-Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "temoa Brand Story",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schemaVersion",
    "brandName",
    "marketplace",
    "language",
    "background",
    "cards"
  ],
  "properties": {
    "schemaVersion": {
      "const": 1
    },
    "brandName": {
      "type": "string",
      "minLength": 1
    },
    "marketplace": {
      "enum": [
        "de",
        "com",
        "co.uk",
        "fr",
        "it",
        "es",
        "nl",
        "se",
        "pl",
        "com.be"
      ]
    },
    "language": {
      "type": "string"
    },
    "brandFacts": {
      "type": "string"
    },
    "instructions": {
      "type": "string"
    },
    "context": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "audience": {
          "type": "string"
        },
        "message": {
          "type": "string"
        },
        "benefits": {
          "type": "string"
        },
        "materials": {
          "type": "string"
        },
        "products": {
          "type": "string"
        },
        "destinations": {
          "type": "string"
        },
        "cardCount": {
          "type": "string"
        }
      }
    },
    "background": {
      "type": "object",
      "required": [
        "desktop",
        "mobile",
        "desktopBrief",
        "mobileBrief",
        "desktopCopy",
        "mobileCopy"
      ],
      "properties": {
        "desktop": {
          "anyOf": [
            {
              "type": "null"
            },
            {
              "type": "object",
              "required": [
                "url",
                "width",
                "height",
                "size"
              ],
              "properties": {
                "url": {
                  "type": "string",
                  "format": "uri"
                },
                "name": {
                  "type": "string"
                },
                "width": {
                  "type": "number",
                  "minimum": 0
                },
                "height": {
                  "type": "number",
                  "minimum": 0
                },
                "size": {
                  "type": "number",
                  "minimum": 0
                }
              }
            }
          ]
        },
        "mobile": {
          "anyOf": [
            {
              "type": "null"
            },
            {
              "type": "object",
              "required": [
                "url",
                "width",
                "height",
                "size"
              ],
              "properties": {
                "url": {
                  "type": "string",
                  "format": "uri"
                },
                "name": {
                  "type": "string"
                },
                "width": {
                  "type": "number",
                  "minimum": 0
                },
                "height": {
                  "type": "number",
                  "minimum": 0
                },
                "size": {
                  "type": "number",
                  "minimum": 0
                }
              }
            }
          ]
        },
        "brief": {
          "type": "string"
        },
        "copy": {
          "type": "string"
        },
        "desktopBrief": {
          "type": "string"
        },
        "mobileBrief": {
          "type": "string"
        },
        "desktopCopy": {
          "type": "string"
        },
        "mobileCopy": {
          "type": "string"
        }
      }
    },
    "cards": {
      "type": "array",
      "maxItems": 19,
      "items": {
        "type": "object",
        "required": [
          "id",
          "fileKey",
          "type",
          "brief",
          "copy",
          "image",
          "slots"
        ],
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1
          },
          "fileKey": {
            "type": "string",
            "pattern": "^card-[0-9]{2,}$"
          },
          "type": {
            "enum": [
              "media",
              "grid"
            ]
          },
          "title": {
            "type": "string"
          },
          "brief": {
            "type": "string"
          },
          "copy": {
            "type": "string"
          },
          "assetFile": {
            "type": "string"
          },
          "image": {
            "anyOf": [
              {
                "type": "null"
              },
              {
                "type": "object",
                "required": [
                  "url",
                  "width",
                  "height",
                  "size"
                ],
                "properties": {
                  "url": {
                    "type": "string",
                    "format": "uri"
                  },
                  "name": {
                    "type": "string"
                  },
                  "width": {
                    "type": "number",
                    "minimum": 0
                  },
                  "height": {
                    "type": "number",
                    "minimum": 0
                  },
                  "size": {
                    "type": "number",
                    "minimum": 0
                  }
                }
              }
            ]
          },
          "headline": {
            "type": "string",
            "maxLength": 30
          },
          "shopUrl": {
            "type": "string"
          },
          "slots": {
            "type": "array",
            "items": {
              "type": "object",
              "required": [
                "asin",
                "url",
                "image",
                "productImage",
                "assetFile"
              ],
              "properties": {
                "asin": {
                  "type": "string",
                  "pattern": "^$|^[A-Za-z0-9]{10}$"
                },
                "url": {
                  "type": "string"
                },
                "assetFile": {
                  "type": "string"
                },
                "image": {
                  "anyOf": [
                    {
                      "type": "null"
                    },
                    {
                      "type": "object",
                      "required": [
                        "url",
                        "width",
                        "height",
                        "size"
                      ],
                      "properties": {
                        "url": {
                          "type": "string",
                          "format": "uri"
                        },
                        "name": {
                          "type": "string"
                        },
                        "width": {
                          "type": "number",
                          "minimum": 0
                        },
                        "height": {
                          "type": "number",
                          "minimum": 0
                        },
                        "size": {
                          "type": "number",
                          "minimum": 0
                        }
                      }
                    }
                  ]
                },
                "productImage": {
                  "anyOf": [
                    {
                      "type": "null"
                    },
                    {
                      "type": "object",
                      "required": [
                        "url"
                      ],
                      "properties": {
                        "url": {
                          "type": "string"
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        },
        "allOf": [
          {
            "if": {
              "properties": {
                "type": {
                  "const": "grid"
                }
              }
            },
            "then": {
              "required": [
                "headline",
                "shopUrl"
              ],
              "properties": {
                "slots": {
                  "minItems": 4,
                  "maxItems": 4
                }
              }
            },
            "else": {
              "properties": {
                "slots": {
                  "maxItems": 0
                }
              }
            }
          }
        ]
      }
    },
    "references": {
      "type": "array",
      "maxItems": 30,
      "items": {
        "anyOf": [
          {
            "type": "null"
          },
          {
            "type": "object",
            "required": [
              "url",
              "width",
              "height",
              "size"
            ],
            "properties": {
              "url": {
                "type": "string",
                "format": "uri"
              },
              "name": {
                "type": "string"
              },
              "width": {
                "type": "number",
                "minimum": 0
              },
              "height": {
                "type": "number",
                "minimum": 0
              },
              "size": {
                "type": "number",
                "minimum": 0
              }
            }
          }
        ]
      }
    }
  }
}
```

## Beispielstruktur

Nur als Formatbeispiel verwenden. Produktziele und endgültigen Wortlaut aus den tatsächlichen Markenangaben entwickeln.

```json
{
  "schemaVersion": 1,
  "brandName": "Deine Marke",
  "marketplace": "de",
  "language": "de",
  "brandFacts": "",
  "instructions": "",
  "context": {
    "audience": "",
    "message": "",
    "benefits": "",
    "materials": "",
    "products": "",
    "destinations": "",
    "cardCount": ""
  },
  "background": {
    "desktop": null,
    "mobile": null,
    "desktopBrief": "",
    "mobileBrief": "",
    "desktopCopy": "",
    "mobileCopy": ""
  },
  "cards": [
    {
      "id": "story-intro",
      "fileKey": "card-01",
      "type": "media",
      "title": "Markeneinstieg",
      "assetFile": "Brand Media Assets/media asset image 1.jpg",
      "brief": "Describe the agreed subject here.",
      "copy": "",
      "image": null,
      "slots": []
    },
    {
      "id": "story-products",
      "fileKey": "card-02",
      "type": "grid",
      "title": "Produktauswahl",
      "brief": "Describe the four agreed product images or one composite motif.",
      "copy": "",
      "image": null,
      "headline": "",
      "shopUrl": "",
      "slots": [
        {
          "asin": "",
          "url": "",
          "assetFile": "ASIN Grids/ASIN image 1a.jpg",
          "image": null,
          "productImage": null
        },
        {
          "asin": "",
          "url": "",
          "assetFile": "ASIN Grids/ASIN image 1b.jpg",
          "image": null,
          "productImage": null
        },
        {
          "asin": "",
          "url": "",
          "assetFile": "ASIN Grids/ASIN image 1c.jpg",
          "image": null,
          "productImage": null
        },
        {
          "asin": "",
          "url": "",
          "assetFile": "ASIN Grids/ASIN image 1d.jpg",
          "image": null,
          "productImage": null
        }
      ]
    }
  ],
  "references": []
}
```
