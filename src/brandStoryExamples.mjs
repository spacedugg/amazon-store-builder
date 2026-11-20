import { validateStory, customerStory } from './brandStoryModel.mjs';

// Reference examples contain only public artwork and optional destination links.
export function exampleData(story) {
  validateStory(story);
  if (!story.background.desktop) throw Error('Desktop-Hintergrund fehlt.');
  if (!story.cards.length) throw Error('Mindestens eine Karte ist erforderlich.');
  story.cards.forEach((card, index) => {
    if (card.type === 'media' && !card.image) throw Error(`Karte ${index + 1}: Bild fehlt.`);
    if (card.type === 'grid') {
      if (!card.headline?.trim()) throw Error(`Karte ${index + 1}: Grid-Überschrift fehlt.`);
      if (card.slots.some(slot => !slot.image)) throw Error(`Karte ${index + 1}: Alle vier Grid-Bilder hochladen.`);
    }
  });
  const clean = { schemaVersion: 1, ...customerStory(story) };
  const asset = value => value ? Object.fromEntries(['url', 'width', 'height', 'size', 'name'].filter(key => value[key] !== undefined).map(key => [key, value[key]])) : null;
  clean.background.desktop = asset(clean.background.desktop);
  clean.background.mobile = asset(clean.background.mobile);
  clean.cards.forEach(card => {
    card.image = asset(card.image);
    card.slots.forEach(slot => { slot.image = asset(slot.image); slot.productImage = asset(slot.productImage); });
  });
  clean.brandName = clean.brandName.trim();
  validateStory(clean);
  return clean;
}
