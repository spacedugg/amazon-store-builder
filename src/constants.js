export const LAYOUTS = [
  { id: '1', name: 'Full Width', cols: '1fr', cells: 1 },
  { id: '1-1', name: '2 Equal', cols: '1fr 1fr', cells: 2 },
  { id: '1-1-1', name: '3 Equal', cols: '1fr 1fr 1fr', cells: 3 },
  { id: '1-1-1-1', name: '4 Equal', cols: 'repeat(4,1fr)', cells: 4 },
  { id: '2-1', name: 'Large + Small', cols: '2fr 1fr', cells: 2 },
  { id: '1-2', name: 'Small + Large', cols: '1fr 2fr', cells: 2 },
  { id: '2-1-1', name: 'Large + 2 Small', cols: '2fr 1fr 1fr', cells: 3 },
];

export const TILE_TYPES = ['image', 'product_grid', 'video', 'text', 'shoppable_image'];

export const LANGS = { de: 'German', com: 'English', 'co.uk': 'English', fr: 'French' };

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

export const emptyTile = () => ({
  type: 'image', brief: '', textOverlay: '', ctaText: '',
  dimensions: { w: 3000, h: 1200 }, asins: [],
});
