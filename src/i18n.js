// ─── INTERNATIONALIZATION (UI + Briefing language) ───
// Image texts (textOverlay, ctaText) are NOT affected by UI language.
// Only UI labels, module names, and designer instructions change.

export var UI_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'ky', name: 'Kyrgyz', native: 'Кыргызча' },
  { code: 'bg', name: 'Bulgarian', native: 'Български' },
  { code: 'es', name: 'Spanish', native: 'Español' },
];

var translations = {
  // ─── APP SHELL ───
  'app.title': {
    en: 'Store Builder', de: 'Store Builder', uk: 'Store Builder', ru: 'Store Builder',
    id: 'Store Builder', ky: 'Store Builder', bg: 'Store Builder', es: 'Store Builder',
  },
  'app.generate': {
    en: 'Generate', de: 'Generieren', uk: 'Згенерувати', ru: 'Сгенерировать',
    id: 'Hasilkan', ky: 'Түзүү', bg: 'Генерирай', es: 'Generar',
  },
  'app.save': {
    en: 'Save', de: 'Speichern', uk: 'Зберегти', ru: 'Сохранить',
    id: 'Simpan', ky: 'Сактоо', bg: 'Запази', es: 'Guardar',
  },
  'app.exportDocx': {
    en: 'Export DOCX', de: 'DOCX exportieren', uk: 'Експорт DOCX', ru: 'Экспорт DOCX',
    id: 'Ekspor DOCX', ky: 'DOCX экспорт', bg: 'Експорт DOCX', es: 'Exportar DOCX',
  },
  'app.products': {
    en: 'products', de: 'Produkte', uk: 'продуктів', ru: 'продуктов',
    id: 'produk', ky: 'продукт', bg: 'продукта', es: 'productos',
  },
  'app.pages': {
    en: 'pages', de: 'Seiten', uk: 'сторінок', ru: 'страниц',
    id: 'halaman', ky: 'барак', bg: 'страници', es: 'páginas',
  },
  'app.desktopView': {
    en: 'Desktop view', de: 'Desktop Ansicht', uk: 'Десктоп', ru: 'Десктоп',
    id: 'Tampilan desktop', ky: 'Десктоп', bg: 'Десктоп изглед', es: 'Vista escritorio',
  },
  'app.mobileView': {
    en: 'Mobile view', de: 'Mobil Ansicht', uk: 'Мобільний', ru: 'Мобильный',
    id: 'Tampilan mobile', ky: 'Мобилдик', bg: 'Мобилен изглед', es: 'Vista móvil',
  },
  'app.storeSaved': {
    en: 'Store saved!', de: 'Store gespeichert!', uk: 'Store збережено!', ru: 'Store сохранён!',
    id: 'Store tersimpan!', ky: 'Store сакталды!', bg: 'Store запазен!', es: 'Store guardado!',
  },

  // ─── PAGE LIST ───
  'pages.title': {
    en: 'Pages', de: 'Seiten', uk: 'Сторінки', ru: 'Страницы',
    id: 'Halaman', ky: 'Барактар', bg: 'Страници', es: 'Páginas',
  },
  'pages.addPage': {
    en: 'Add page', de: 'Seite hinzufügen', uk: 'Додати сторінку', ru: 'Добавить страницу',
    id: 'Tambah halaman', ky: 'Барак кошуу', bg: 'Добави страница', es: 'Añadir página',
  },
  'pages.generateFirst': {
    en: 'Generate a store first', de: 'Zuerst einen Store generieren', uk: 'Спочатку згенеруйте store', ru: 'Сначала сгенерируйте store',
    id: 'Buat store terlebih dahulu', ky: 'Алгач store түзүңүз', bg: 'Първо генерирайте store', es: 'Genera un store primero',
  },
  'pages.savedStores': {
    en: 'Saved Stores', de: 'Gespeicherte Stores', uk: 'Збережені Stores', ru: 'Сохранённые Stores',
    id: 'Store Tersimpan', ky: 'Сакталган Stores', bg: 'Запазени Stores', es: 'Stores Guardados',
  },
  'pages.rename': {
    en: 'Rename', de: 'Umbenennen', uk: 'Перейменувати', ru: 'Переименовать',
    id: 'Ganti nama', ky: 'Атын өзгөртүү', bg: 'Преименувай', es: 'Renombrar',
  },
  'pages.delete': {
    en: 'Delete', de: 'Löschen', uk: 'Видалити', ru: 'Удалить',
    id: 'Hapus', ky: 'Жок кылуу', bg: 'Изтрий', es: 'Eliminar',
  },
  'pages.moveUp': {
    en: 'Move up', de: 'Nach oben', uk: 'Вгору', ru: 'Вверх',
    id: 'Pindah ke atas', ky: 'Жогору', bg: 'Нагоре', es: 'Mover arriba',
  },
  'pages.moveDown': {
    en: 'Move down', de: 'Nach unten', uk: 'Вниз', ru: 'Вниз',
    id: 'Pindah ke bawah', ky: 'Ылдый', bg: 'Надолу', es: 'Mover abajo',
  },

  // ─── CANVAS ───
  'canvas.empty': {
    en: 'Click Generate to upload ASINs and build your store',
    de: 'Klicke auf Generieren, um ASINs hochzuladen und deinen Store zu erstellen',
    uk: 'Натисніть Згенерувати, щоб завантажити ASINs та створити store',
    ru: 'Нажмите Сгенерировать, чтобы загрузить ASINs и создать store',
    id: 'Klik Hasilkan untuk mengunggah ASIN dan membangun store Anda',
    ky: 'ASINs жүктөө жана store түзүү үчүн Түзүү баскычын басыңыз',
    bg: 'Натиснете Генерирай, за да качите ASINs и изградите store',
    es: 'Haz clic en Generar para subir ASINs y construir tu store',
  },
  'canvas.addSection': {
    en: 'Add Section', de: 'Sektion hinzufügen', uk: 'Додати секцію', ru: 'Добавить секцию',
    id: 'Tambah Seksi', ky: 'Секция кошуу', bg: 'Добави секция', es: 'Añadir Sección',
  },
  'canvas.section': {
    en: 'Section', de: 'Sektion', uk: 'Секція', ru: 'Секция',
    id: 'Seksi', ky: 'Секция', bg: 'Секция', es: 'Sección',
  },
  'canvas.headerBanner': {
    en: 'Header Banner', de: 'Header Banner', uk: 'Банер заголовка', ru: 'Баннер шапки',
    id: 'Banner Header', ky: 'Баннер', bg: 'Заглавен банер', es: 'Banner de encabezado',
  },
  'canvas.uploadHeaderDesktop': {
    en: 'Upload Header Banner (3000 x 600)', de: 'Header Banner hochladen (3000 x 600)',
    uk: 'Завантажити банер (3000 x 600)', ru: 'Загрузить баннер (3000 x 600)',
    id: 'Unggah Banner Header (3000 x 600)', ky: 'Баннер жүктөө (3000 x 600)',
    bg: 'Качи банер (3000 x 600)', es: 'Subir Banner (3000 x 600)',
  },
  'canvas.uploadHeaderMobile': {
    en: 'Upload Header Banner (1242 x 450)', de: 'Header Banner hochladen (1242 x 450)',
    uk: 'Завантажити банер (1242 x 450)', ru: 'Загрузить баннер (1242 x 450)',
    id: 'Unggah Banner Header (1242 x 450)', ky: 'Баннер жүктөө (1242 x 450)',
    bg: 'Качи банер (1242 x 450)', es: 'Subir Banner (1242 x 450)',
  },

  // ─── PROPERTIES PANEL ───
  'props.title': {
    en: 'Properties', de: 'Eigenschaften', uk: 'Властивості', ru: 'Свойства',
    id: 'Properti', ky: 'Касиеттер', bg: 'Свойства', es: 'Propiedades',
  },
  'props.clickTile': {
    en: 'Click a tile to edit', de: 'Klicke auf eine Kachel zum Bearbeiten',
    uk: 'Натисніть на плитку для редагування', ru: 'Нажмите на плитку для редактирования',
    id: 'Klik tile untuk mengedit', ky: 'Түзөтүү үчүн плитканы басыңыз',
    bg: 'Кликнете върху плочка за редактиране', es: 'Haz clic en un tile para editar',
  },
  'props.tileType': {
    en: 'Tile Type', de: 'Kachel Typ', uk: 'Тип плитки', ru: 'Тип плитки',
    id: 'Jenis Tile', ky: 'Плитка түрү', bg: 'Тип на плочка', es: 'Tipo de Tile',
  },
  'props.designerBrief': {
    en: 'Designer Brief (EN)', de: 'Designer Briefing (EN)', uk: 'Бриф дизайнера (EN)', ru: 'Бриф дизайнера (EN)',
    id: 'Brief Desainer (EN)', ky: 'Дизайнер брифи (EN)', bg: 'Бриф за дизайнер (EN)', es: 'Brief del diseñador (EN)',
  },
  'props.textOverlay': {
    en: 'Text Overlay', de: 'Texteinblendung', uk: 'Текст на зображенні', ru: 'Текст на изображении',
    id: 'Teks Overlay', ky: 'Текст оверлей', bg: 'Текст върху изображение', es: 'Texto superpuesto',
  },
  'props.ctaText': {
    en: 'CTA Text', de: 'CTA Text', uk: 'CTA текст', ru: 'CTA текст',
    id: 'Teks CTA', ky: 'CTA тексти', bg: 'CTA текст', es: 'Texto CTA',
  },
  'props.desktopDimensions': {
    en: 'Desktop Dimensions (px)', de: 'Desktop Maße (px)', uk: 'Десктоп розміри (px)', ru: 'Размеры десктоп (px)',
    id: 'Dimensi Desktop (px)', ky: 'Десктоп өлчөмдөрү (px)', bg: 'Десктоп размери (px)', es: 'Dimensiones escritorio (px)',
  },
  'props.mobileDimensions': {
    en: 'Mobile Dimensions (px)', de: 'Mobil Maße (px)', uk: 'Мобільні розміри (px)', ru: 'Размеры мобил. (px)',
    id: 'Dimensi Mobile (px)', ky: 'Мобилдик өлчөмдөр (px)', bg: 'Мобилни размери (px)', es: 'Dimensiones móvil (px)',
  },
  'props.linkAsin': {
    en: 'Link ASIN (clickable)', de: 'Link ASIN (klickbar)', uk: 'Посилання ASIN', ru: 'Ссылка ASIN',
    id: 'Link ASIN (klik)', ky: 'Шилтеме ASIN', bg: 'Линк ASIN', es: 'Enlace ASIN',
  },
  'props.desktopImage': {
    en: 'Desktop Image', de: 'Desktop Bild', uk: 'Десктоп зображення', ru: 'Десктоп изображение',
    id: 'Gambar Desktop', ky: 'Десктоп сүрөт', bg: 'Десктоп изображение', es: 'Imagen escritorio',
  },
  'props.mobileImage': {
    en: 'Mobile Image', de: 'Mobil Bild', uk: 'Мобільне зображення', ru: 'Мобильное изображение',
    id: 'Gambar Mobile', ky: 'Мобилдик сүрөт', bg: 'Мобилно изображение', es: 'Imagen móvil',
  },
  'props.asins': {
    en: 'ASINs (one per line)', de: 'ASINs (eine pro Zeile)', uk: 'ASINs (по одному на рядок)', ru: 'ASINs (по одному на строку)',
    id: 'ASIN (satu per baris)', ky: 'ASINs (бир катарга бирден)', bg: 'ASINs (по един на ред)', es: 'ASINs (uno por línea)',
  },
  'props.textContent': {
    en: 'Text Content', de: 'Textinhalt', uk: 'Текстовий вміст', ru: 'Текстовое содержание',
    id: 'Konten Teks', ky: 'Текст мазмуну', bg: 'Текстово съдържание', es: 'Contenido de texto',
  },
  'props.videoBrief': {
    en: 'Video Brief (EN)', de: 'Video Briefing (EN)', uk: 'Бриф відео (EN)', ru: 'Бриф видео (EN)',
    id: 'Brief Video (EN)', ky: 'Видео брифи (EN)', bg: 'Бриф за видео (EN)', es: 'Brief del video (EN)',
  },
  'props.videoThumbnail': {
    en: 'Video Thumbnail', de: 'Video Vorschaubild', uk: 'Мініатюра відео', ru: 'Превью видео',
    id: 'Thumbnail Video', ky: 'Видео миниатюра', bg: 'Миниатюра на видео', es: 'Miniatura del video',
  },
  'props.tileColor': {
    en: 'Tile Background Color', de: 'Kachel Hintergrundfarbe', uk: 'Колір фону плитки', ru: 'Цвет фона плитки',
    id: 'Warna Latar Tile', ky: 'Плитка фон түсү', bg: 'Фонов цвят на плочка', es: 'Color de fondo del tile',
  },
  'props.tileColorHint': {
    en: 'Preview color for the designer (not an Amazon feature)',
    de: 'Vorschaufarbe für den Designer (keine Amazon Funktion)',
    uk: 'Колір попереднього перегляду для дизайнера (не функція Amazon)',
    ru: 'Цвет предпросмотра для дизайнера (не функция Amazon)',
    id: 'Warna pratinjau untuk desainer (bukan fitur Amazon)',
    ky: 'Дизайнер үчүн алдын ала көрүү түсү (Amazon функциясы эмес)',
    bg: 'Цвят за визуализация за дизайнера (не е функция на Amazon)',
    es: 'Color de vista previa para el diseñador (no es una función de Amazon)',
  },
  'props.remove': {
    en: 'Remove', de: 'Entfernen', uk: 'Видалити', ru: 'Удалить',
    id: 'Hapus', ky: 'Жок кылуу', bg: 'Премахни', es: 'Eliminar',
  },
  'props.clearColor': {
    en: 'Clear color', de: 'Farbe entfernen', uk: 'Прибрати колір', ru: 'Убрать цвет',
    id: 'Hapus warna', ky: 'Түстү тазалоо', bg: 'Изчисти цвят', es: 'Quitar color',
  },

  // ─── GENERATE MODAL ───
  'gen.title': {
    en: 'Generate Brand Store', de: 'Brand Store generieren', uk: 'Згенерувати Brand Store', ru: 'Сгенерировать Brand Store',
    id: 'Hasilkan Brand Store', ky: 'Brand Store түзүү', bg: 'Генерирай Brand Store', es: 'Generar Brand Store',
  },
  'gen.uploadAsins': {
    en: 'Upload ASIN List', de: 'ASIN Liste hochladen', uk: 'Завантажити список ASIN', ru: 'Загрузить список ASIN',
    id: 'Unggah Daftar ASIN', ky: 'ASIN тизмесин жүктөө', bg: 'Качи ASIN списък', es: 'Subir lista ASIN',
  },
  'gen.asinsLoaded': {
    en: 'ASINs loaded', de: 'ASINs geladen', uk: 'ASIN завантажено', ru: 'ASIN загружено',
    id: 'ASIN dimuat', ky: 'ASIN жүктөлдү', bg: 'ASIN заредени', es: 'ASINs cargados',
  },
  'gen.uploadCsv': {
    en: 'Upload CSV / TXT', de: 'CSV / TXT hochladen', uk: 'Завантажити CSV / TXT', ru: 'Загрузить CSV / TXT',
    id: 'Unggah CSV / TXT', ky: 'CSV / TXT жүктөө', bg: 'Качи CSV / TXT', es: 'Subir CSV / TXT',
  },
  'gen.paste': {
    en: 'Paste', de: 'Einfügen', uk: 'Вставити', ru: 'Вставить',
    id: 'Tempel', ky: 'Коюу', bg: 'Постави', es: 'Pegar',
  },
  'gen.cancel': {
    en: 'Cancel', de: 'Abbrechen', uk: 'Скасувати', ru: 'Отмена',
    id: 'Batal', ky: 'Жокко чыгаруу', bg: 'Отказ', es: 'Cancelar',
  },
  'gen.parseAsins': {
    en: 'Parse ASINs', de: 'ASINs einlesen', uk: 'Розпізнати ASINs', ru: 'Распознать ASINs',
    id: 'Parsing ASIN', ky: 'ASINs окуу', bg: 'Разпознай ASINs', es: 'Analizar ASINs',
  },
  'gen.asinHint': {
    en: 'One ASIN per line (B0XXXXXXXXXX). Supports CSV, TXT, TSV.',
    de: 'Eine ASIN pro Zeile (B0XXXXXXXXXX). Unterstützt CSV, TXT, TSV.',
    uk: 'Один ASIN на рядок (B0XXXXXXXXXX). Підтримує CSV, TXT, TSV.',
    ru: 'Один ASIN на строку (B0XXXXXXXXXX). Поддерживает CSV, TXT, TSV.',
    id: 'Satu ASIN per baris (B0XXXXXXXXXX). Mendukung CSV, TXT, TSV.',
    ky: 'Бир ASIN бир катарга (B0XXXXXXXXXX). CSV, TXT, TSV колдойт.',
    bg: 'Един ASIN на ред (B0XXXXXXXXXX). Поддържа CSV, TXT, TSV.',
    es: 'Un ASIN por línea (B0XXXXXXXXXX). Soporta CSV, TXT, TSV.',
  },
  'gen.brandName': {
    en: 'Brand Name', de: 'Markenname', uk: 'Назва бренду', ru: 'Название бренда',
    id: 'Nama Merek', ky: 'Бренд аты', bg: 'Име на бранд', es: 'Nombre de marca',
  },
  'gen.marketplace': {
    en: 'Marketplace', de: 'Marktplatz', uk: 'Маркетплейс', ru: 'Маркетплейс',
    id: 'Marketplace', ky: 'Маркетплейс', bg: 'Маркетплейс', es: 'Marketplace',
  },
  'gen.category': {
    en: 'Product Category / Niche', de: 'Produktkategorie / Nische', uk: 'Категорія продукту / Ніша', ru: 'Категория товара / Ниша',
    id: 'Kategori Produk / Niche', ky: 'Продукт категориясы / Ниша', bg: 'Продуктова категория / Ниша', es: 'Categoría / Nicho',
  },
  'gen.categoryHint': {
    en: 'Influences the tone and visual style of the generated store',
    de: 'Beeinflusst den Ton und visuellen Stil des generierten Stores',
    uk: 'Впливає на тон та візуальний стиль згенерованого store',
    ru: 'Влияет на тон и визуальный стиль сгенерированного store',
    id: 'Mempengaruhi nada dan gaya visual store yang dihasilkan',
    ky: 'Түзүлгөн store тонусуна жана визуалдык стилине таасир этет',
    bg: 'Влияе на тона и визуалния стил на генерирания store',
    es: 'Influye en el tono y estilo visual del store generado',
  },
  'gen.complexity': {
    en: 'Store Complexity', de: 'Store Komplexität', uk: 'Складність Store', ru: 'Сложность Store',
    id: 'Kompleksitas Store', ky: 'Store татаалдыгы', bg: 'Сложност на Store', es: 'Complejidad del Store',
  },
  'gen.complexityBasic': {
    en: 'Basic', de: 'Basic', uk: 'Базовий', ru: 'Базовый',
    id: 'Dasar', ky: 'Базалык', bg: 'Базов', es: 'Básico',
  },
  'gen.complexityStandard': {
    en: 'Standard', de: 'Standard', uk: 'Стандарт', ru: 'Стандарт',
    id: 'Standar', ky: 'Стандарт', bg: 'Стандарт', es: 'Estándar',
  },
  'gen.complexityPremium': {
    en: 'Premium', de: 'Premium', uk: 'Преміум', ru: 'Премиум',
    id: 'Premium', ky: 'Премиум', bg: 'Премиум', es: 'Premium',
  },
  'gen.complexityBasicDesc': {
    en: 'Clean structure, product categories only. Minimal sections per page.',
    de: 'Klare Struktur, nur Produktkategorien. Minimale Sektionen pro Seite.',
    uk: 'Чиста структура, тільки категорії продуктів. Мінімум секцій.',
    ru: 'Чистая структура, только категории товаров. Минимум секций.',
    id: 'Struktur bersih, hanya kategori produk. Seksi minimal per halaman.',
    ky: 'Таза структура, продукт категориялары гана. Минималдуу секциялар.',
    bg: 'Чиста структура, само продуктови категории. Минимум секции.',
    es: 'Estructura limpia, solo categorías. Secciones mínimas por página.',
  },
  'gen.complexityStandardDesc': {
    en: 'Categories plus extra pages (Bestsellers, About Us). Balanced sections with lifestyle imagery and videos.',
    de: 'Kategorien plus Zusatzseiten (Bestseller, Über uns). Ausgewogene Sektionen mit Lifestyle Bildern und Videos.',
    uk: 'Категорії та додаткові сторінки (Бестселери, Про нас). Збалансовані секції.',
    ru: 'Категории и дополнительные страницы (Бестселлеры, О нас). Сбалансированные секции.',
    id: 'Kategori ditambah halaman ekstra (Bestseller, Tentang Kami). Seksi seimbang.',
    ky: 'Категориялар жана кошумча барактар (Бестселлерлер, Биз жөнүндө). Тең салмактуу секциялар.',
    bg: 'Категории и допълнителни страници (Бестселъри, За нас). Балансирани секции.',
    es: 'Categorías y páginas extra (Bestsellers, Sobre nosotros). Secciones equilibradas.',
  },
  'gen.complexityPremiumDesc': {
    en: 'Full experience: extra pages, videos, trust elements, follow CTA, detailed product showcases, brand storytelling.',
    de: 'Volles Erlebnis: Zusatzseiten, Videos, Trust Elemente, Follow CTA, detaillierte Produktpräsentationen, Brand Storytelling.',
    uk: 'Повний досвід: додаткові сторінки, відео, елементи довіри, детальні презентації продуктів.',
    ru: 'Полный опыт: дополнительные страницы, видео, элементы доверия, детальные презентации.',
    id: 'Pengalaman penuh: halaman ekstra, video, elemen kepercayaan, showcase produk detail.',
    ky: 'Толук тажрыйба: кошумча барактар, видеолор, ишеним элементтери, деталдуу презентациялар.',
    bg: 'Пълно изживяване: допълнителни страници, видеа, елементи на доверие, детайлни презентации.',
    es: 'Experiencia completa: páginas extra, videos, elementos de confianza, presentaciones detalladas.',
  },
  'gen.instructions': {
    en: 'Instructions (optional)', de: 'Anweisungen (optional)', uk: 'Інструкції (необов\'язково)', ru: 'Инструкции (необязательно)',
    id: 'Instruksi (opsional)', ky: 'Нускамалар (милдеттүү эмес)', bg: 'Инструкции (по избор)', es: 'Instrucciones (opcional)',
  },
  'gen.instructionsPlaceholder': {
    en: 'Special requirements, brand style, focus areas...',
    de: 'Besondere Anforderungen, Markenstil, Schwerpunkte...',
    uk: 'Особливі вимоги, стиль бренду, фокус...',
    ru: 'Особые требования, стиль бренда, фокус...',
    id: 'Persyaratan khusus, gaya merek, area fokus...',
    ky: 'Өзгөчө талаптар, бренд стили, фокус...',
    bg: 'Специални изисквания, стил на бранда, фокус...',
    es: 'Requisitos especiales, estilo de marca, áreas de enfoque...',
  },
  'gen.scrapeGenerate': {
    en: 'Scrape & Generate', de: 'Scrapen & Generieren', uk: 'Зібрати та згенерувати', ru: 'Собрать и сгенерировать',
    id: 'Scrape & Hasilkan', ky: 'Чогултуу жана түзүү', bg: 'Извлечи и генерирай', es: 'Scrapear y Generar',
  },
  'gen.briefingLanguage': {
    en: 'Briefing Language', de: 'Briefing Sprache', uk: 'Мова брифінгу', ru: 'Язык брифинга',
    id: 'Bahasa Briefing', ky: 'Брифинг тили', bg: 'Език на брифинга', es: 'Idioma del briefing',
  },
  'gen.briefingLanguageHint': {
    en: 'Language for module names and designer instructions (image texts stay in store language)',
    de: 'Sprache für Modulnamen und Designeranweisungen (Bildtexte bleiben in der Store Sprache)',
    uk: 'Мова для назв модулів та інструкцій дизайнера (тексти на зображеннях залишаються мовою store)',
    ru: 'Язык для названий модулей и инструкций дизайнера (тексты на изображениях остаются на языке store)',
    id: 'Bahasa untuk nama modul dan instruksi desainer (teks gambar tetap dalam bahasa store)',
    ky: 'Модуль аттары жана дизайнер нускамалары үчүн тил (сүрөт тексттери store тилинде калат)',
    bg: 'Език за имена на модули и инструкции за дизайнер (текстовете на изображения остават на езика на store)',
    es: 'Idioma para nombres de módulos e instrucciones del diseñador (textos de imagen en idioma del store)',
  },

  // ─── AI CHAT ───
  'chat.placeholder': {
    en: 'Refine your store... (e.g. "Add a bestseller section")',
    de: 'Store verfeinern... (z.B. "Bestseller Sektion hinzufügen")',
    uk: 'Вдосконалити store... (напр. "Додати секцію бестселерів")',
    ru: 'Улучшить store... (напр. "Добавить секцию бестселлеров")',
    id: 'Perbaiki store... (mis. "Tambah seksi bestseller")',
    ky: 'Store жакшыртуу... (мис. "Бестселлер секция кошуу")',
    bg: 'Подобри store... (напр. "Добави секция бестселъри")',
    es: 'Mejorar store... (ej. "Añadir sección de bestsellers")',
  },
  'chat.send': {
    en: 'Send', de: 'Senden', uk: 'Надіслати', ru: 'Отправить',
    id: 'Kirim', ky: 'Жөнөтүү', bg: 'Изпрати', es: 'Enviar',
  },

  // ─── PRICE CALCULATOR ───
  'price.title': {
    en: 'Price Estimate', de: 'Preisschätzung', uk: 'Оцінка вартості', ru: 'Оценка стоимости',
    id: 'Estimasi Harga', ky: 'Баа болжолу', bg: 'Ценова оценка', es: 'Estimación de precio',
  },
  'price.enterPassword': {
    en: 'Enter access password', de: 'Zugangspasswort eingeben', uk: 'Введіть пароль доступу', ru: 'Введите пароль доступа',
    id: 'Masukkan kata sandi akses', ky: 'Кирүү сырсөзүн киргизиңиз', bg: 'Въведете парола за достъп', es: 'Introduzca la contraseña',
  },
  'price.unlock': {
    en: 'Unlock', de: 'Freischalten', uk: 'Розблокувати', ru: 'Разблокировать',
    id: 'Buka', ky: 'Ачуу', bg: 'Отключи', es: 'Desbloquear',
  },
  'price.wrongPassword': {
    en: 'Incorrect password', de: 'Falsches Passwort', uk: 'Невірний пароль', ru: 'Неверный пароль',
    id: 'Kata sandi salah', ky: 'Туура эмес сырсөз', bg: 'Грешна парола', es: 'Contraseña incorrecta',
  },
  'price.totalImages': {
    en: 'Total images to create', de: 'Bilder insgesamt zu erstellen', uk: 'Всього зображень для створення', ru: 'Всего изображений для создания',
    id: 'Total gambar yang akan dibuat', ky: 'Түзүлө турган сүрөттөр', bg: 'Общо изображения за създаване', es: 'Total de imágenes a crear',
  },
  'price.totalVideos': {
    en: 'Total videos', de: 'Videos insgesamt', uk: 'Всього відео', ru: 'Всего видео',
    id: 'Total video', ky: 'Видеолор жалпы', bg: 'Общо видеа', es: 'Total de videos',
  },
  'price.estimatedTotal': {
    en: 'Estimated total', de: 'Geschätzter Gesamtpreis', uk: 'Орієнтовна вартість', ru: 'Ориентировочная стоимость',
    id: 'Estimasi total', ky: 'Болжолдуу жалпы', bg: 'Приблизителна обща цена', es: 'Total estimado',
  },
  'price.close': {
    en: 'Close', de: 'Schließen', uk: 'Закрити', ru: 'Закрыть',
    id: 'Tutup', ky: 'Жабуу', bg: 'Затвори', es: 'Cerrar',
  },

  // ─── ASIN PANEL ───
  'asins.title': {
    en: 'ASIN Overview', de: 'ASIN Übersicht', uk: 'Огляд ASIN', ru: 'Обзор ASIN',
    id: 'Ikhtisar ASIN', ky: 'ASIN сереп', bg: 'ASIN преглед', es: 'Resumen ASIN',
  },

  // ─── PROGRESS ───
  'progress.title': {
    en: 'Generating Store...', de: 'Store wird generiert...', uk: 'Генерація Store...', ru: 'Генерация Store...',
    id: 'Menghasilkan Store...', ky: 'Store түзүлүүдө...', bg: 'Генериране на Store...', es: 'Generando Store...',
  },
  'progress.done': {
    en: 'Complete!', de: 'Fertig!', uk: 'Готово!', ru: 'Готово!',
    id: 'Selesai!', ky: 'Даяр!', bg: 'Готово!', es: 'Completado!',
  },
};

export function t(key, lang) {
  var entry = translations[key];
  if (!entry) return key;
  return entry[lang || 'en'] || entry['en'] || key;
}
