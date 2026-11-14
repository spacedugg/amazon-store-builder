# Futum interactive reference

Source: user-provided `Neu.zip`, the 24 JPEG files under `Neu/`, and the existing overview `public/brand-story-examples/futum.jpg`. Apple metadata files were excluded. The original overview was visually compared with all source images and the contact sheet; it contains four successive desktop carousel states, not four separate story rows.

The seventh entry in `public/brand-story-examples/stories.json` reconstructs the single eleven-card story. All images are the original JPEG bytes, copied under stable web-safe filenames into `public/brand-story-examples/futum-assets/`. No screenshot crops, generated images, resizing, or recompression were used. There are 24 images totalling 12,883,578 bytes (12.29 MiB); every individual file is under 2 MB.

## Background and card order

| Position | Source | Destination asset | Content / preview evidence |
| --- | --- | --- | --- |
| Background | Desktop Hintergund.jpg | desktop-background.jpg | Turquoise gradient, left headline and top-right Futum logo, matching all four states |
| 1 | Card - 1.jpg | card-01.jpg | Deutsche Qualitätsmarke; Hamburg map, first visible card in state 1 |
| 2 | Card - 2.jpg | card-02.jpg | Rundum gut aufgestellt; product assortment, state 1 |
| 3 | Card - 3.jpg | card-03.jpg | Insektensprays im Überblick; enters at right in state 1 and starts state 2 |
| 4 | Card - 4_01.jpg through _04.jpg | card-04-01.jpg through -04.jpg | Blue spray grid, state 2 |
| 5 | Card - 5.jpg | card-05.jpg | Unsere Monitoringfallen; storage-room scene, state 2 |
| 6 | Card - 6_01.jpg through _04.jpg | card-06-01.jpg through -04.jpg | Purple trap grid, begins at right in state 2 |
| 7 | Card - 7.jpg | card-07.jpg | Für Haus, Garten und Garage; house scene, starts state 3 |
| 8 | Card - 8_01.jpg through _04.jpg | card-08-01.jpg through -04.jpg | Orange garden grid, state 3 |
| 9 | Card - 9.jpg | card-09.jpg | Produkte rund ums Tier; animals scene, state 3 |
| 10 | Card - 10_01.jpg through _04.jpg | card-10-01.jpg through -04.jpg | Yellow animal grid, begins at right in state 3 |
| 11 | Card - 11.jpg | card-11.jpg | Die Marke Futum; sofa scene, final card shown in state 4 |

The desktop background is 3660 × 1563 px. Each of the seven media cards is 814 × 1019 px. Each of the sixteen grid quadrant images is 1328 × 1456 px. The schema stores the actual dimensions and byte count for every image.

## Grid quadrant mapping

The suffixes map to row-major positions: `_01` top left, `_02` top right, `_03` bottom left, `_04` bottom right. The original preview directly verifies the spray and garden grids, plus the visible left column of the trap and animal grids. The other quadrants are taken from their matching numbered source files, preserving their authored order.

| Grid | Top left / 01 | Top right / 02 | Bottom left / 03 | Bottom right / 04 |
| --- | --- | --- | --- | --- |
| 4 | Holzwurm Spray | Insekten Pumpspray | Mücken Pumpspray | Universal Insekten Spray |
| 6 | Kakerlaken Falle | Bettwanzen Falle | Motten Falle | Silberfisch Falle |
| 8 | Marder Abwehrkugeln | Maulwurfs-Kugeln | Wühlmaus Granulat | Solar Maulwurf Vertreiber |
| 10 | Futum Spot On, cat package | Floh- & Zeckenschutz Halsband, dog package | Futum Spot On, dog package | Futum Spot On für Vögel, bird package |

Grid 10 retains the cat above the dog spot-on package in its visible left column, as in the preview. Full-resolution inspection of source `Card - 10_04.jpg` confirms the fourth package says “Für Vögel” and depicts birds. It must not be described as a rodent product.

## Data limits and serving

No mobile background was supplied, so `background.mobile` is `null`. The same ordered eleven cards support desktop and mobile through the existing reference viewer. Card headlines remain empty because the copy is already in the original imagery. No destination URLs or ASINs were provided; all `shopUrl`, slot `url`, and slot `asin` fields remain empty.

Image URLs use the production origin `https://brand-store-preview.temoa.de/brand-story-examples/futum-assets/` to remain valid schema-1 HTTPS image references. The reference viewer resolves these own-origin public assets locally so development, preview deployments, and production all use their corresponding packaged files. The separate overview image remains available as an overview.

## Verification

`tests/brandStoryPrompt.test.mjs` checks seven references and validates every story. The Futum case checks the complete card-type sequence, all file keys and asset filenames in row-major order, all supplied dimensions, the absent mobile background, empty product/link identifiers, 24 unique JPEG assets, and byte counts against the actual files. Source-vs-destination SHA-256 comparison verifies all 24 assets are byte-for-byte unchanged.
