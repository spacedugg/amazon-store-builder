# Homepage capture refresh

The catalogue currently has **no actual full-page homepage screenshots**. Archived logos/motifs and module analyses are not substitutes. Capture is blocked in the current agent session: the extension browser is unavailable and Amazon rejected the cloud browser's client. No reconstructed, partial, or error-page screenshots should be published as homepage captures.

Once an authorized browser can open Amazon, open each catalogue's actual homepage, load its complete lazy content, confirm no verification/error/sign-in screen is shown, and take a full-page desktop PNG. Record its exact page URL and original capture timestamp. Verify the homepage visually; do not infer it from a store brand name or a product link. The unresolved product entry must be assigned a real store before a homepage can be captured.

Import a batch using:

```sh
node scripts/import-store-homepage-screenshots.mjs capture-manifest.json
```

The manifest is an array of `{sourceUrl, file, capturedAt, fullPage:true}` records. `file` is relative to the manifest, and `capturedAt` is the actual ISO capture time, not the import time. The importer validates the batch, reads PNG dimensions, copies versioned files to `public/store-homepage-screenshots/`, and updates the matching catalogue records. Review the captures and commit the images and catalogue together.

No monthly job is installed: the user requested an initial one-time capture first. The importer can later be reused for a refresh without changing the gallery.
