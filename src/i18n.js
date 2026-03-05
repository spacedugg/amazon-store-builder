// ─── INTERNATIONALIZATION (UI + Briefing language) ───
// Image texts (textOverlay, ctaText) are NOT affected by language.
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
    en: 'Desktop view', de: 'Desktop-Ansicht', uk: 'Десктоп', ru: 'Десктоп',
    id: 'Tampilan desktop', ky: 'Десктоп', bg: 'Десктоп изглед', es: 'Vista escritorio',
  },
  'app.mobileView': {
    en: 'Mobile view', de: 'Mobile Ansicht', uk: 'Мобільний', ru: 'Мобильный',
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
    id: 'Store Tersimpan', ky: 'Сакталган Stores', bg: 'Запазени Stores', es: 'Stores guardados',
  },
  'pages.importStore': {
    en: 'Import Store', de: 'Store importieren', uk: 'Імпортувати Store', ru: 'Импортировать Store',
    id: 'Impor Store', ky: 'Store импорттоо', bg: 'Импортирай Store', es: 'Importar Store',
  },
  'pages.importPlaceholder': {
    en: 'Paste share link...', de: 'Share-Link einfügen...', uk: 'Вставте посилання...', ru: 'Вставьте ссылку...',
    id: 'Tempel tautan...', ky: 'Шилтемени чаптаңыз...', bg: 'Поставете линк...', es: 'Pegar enlace...',
  },
  'pages.importBtn': {
    en: 'Import', de: 'Importieren', uk: 'Імпортувати', ru: 'Импортировать',
    id: 'Impor', ky: 'Импорттоо', bg: 'Импортирай', es: 'Importar',
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
  'pages.addSubPage': {
    en: 'Add sub-page', de: 'Unterseite hinzufuegen', uk: 'Додати підсторінку', ru: 'Добавить подстраницу',
    id: 'Tambah sub-halaman', ky: 'Суб-барак кошуу', bg: 'Добави подстраница', es: 'Anadir subpagina',
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
    id: 'Tambah Seksi', ky: 'Секция кошуу', bg: 'Добави секция', es: 'Añadir sección',
  },
  'canvas.section': {
    en: 'Section', de: 'Sektion', uk: 'Секція', ru: 'Секция',
    id: 'Seksi', ky: 'Секция', bg: 'Секция', es: 'Sección',
  },
  'canvas.headerBanner': {
    en: 'Header Banner', de: 'Header-Banner', uk: 'Банер заголовка', ru: 'Баннер шапки',
    id: 'Banner Header', ky: 'Баннер', bg: 'Заглавен банер', es: 'Banner de encabezado',
  },
  'canvas.clickToUpload': {
    en: 'Click to upload', de: 'Zum Hochladen klicken', uk: 'Натисніть для завантаження', ru: 'Нажмите для загрузки',
    id: 'Klik untuk mengunggah', ky: 'Жүктөө үчүн басыңыз', bg: 'Кликнете за качване', es: 'Haz clic para subir',
  },
  'canvas.continueSession': {
    en: 'Continue last session', de: 'Letzte Sitzung fortsetzen', uk: 'Продовжити останню сесію', ru: 'Продолжить последнюю сессию',
    id: 'Lanjutkan sesi terakhir', ky: 'Акыркы сессияны улантуу', bg: 'Продължи последната сесия', es: 'Continuar última sesión',
  },

  // ─── SECTION VIEW ───
  'section.moveUp': {
    en: 'Move up', de: 'Nach oben', uk: 'Вгору', ru: 'Вверх',
    id: 'Pindah ke atas', ky: 'Жогору', bg: 'Нагоре', es: 'Mover arriba',
  },
  'section.moveDown': {
    en: 'Move down', de: 'Nach unten', uk: 'Вниз', ru: 'Вниз',
    id: 'Pindah ke bawah', ky: 'Ылдый', bg: 'Надолу', es: 'Mover abajo',
  },
  'section.delete': {
    en: 'Delete section', de: 'Sektion löschen', uk: 'Видалити секцію', ru: 'Удалить секцию',
    id: 'Hapus seksi', ky: 'Секцияны жок кылуу', bg: 'Изтрий секция', es: 'Eliminar sección',
  },

  // ─── PROPERTIES PANEL ───
  'props.title': {
    en: 'Properties', de: 'Eigenschaften', uk: 'Властивості', ru: 'Свойства',
    id: 'Properti', ky: 'Касиеттер', bg: 'Свойства', es: 'Propiedades',
  },
  'props.clickTile': {
    en: 'Click a tile to edit', de: 'Kachel zum Bearbeiten anklicken', uk: 'Натисніть на плитку для редагування', ru: 'Нажмите на плитку для редактирования',
    id: 'Klik tile untuk mengedit', ky: 'Түзөтүү үчүн плитканы басыңыз', bg: 'Кликнете върху плочка за редактиране', es: 'Haz clic en un tile para editar',
  },
  'props.tileType': {
    en: 'Tile Type', de: 'Kacheltyp', uk: 'Тип плитки', ru: 'Тип плитки',
    id: 'Jenis Tile', ky: 'Плитка түрү', bg: 'Тип на плочка', es: 'Tipo de tile',
  },
  'props.imageCategory': {
    en: 'Image Category', de: 'Bildkategorie', uk: 'Категорія зображення', ru: 'Категория изображения',
    id: 'Kategori Gambar', ky: 'Сүрөт категориясы', bg: 'Категория изображение', es: 'Categoría de imagen',
  },
  'props.imageCategoryNone': {
    en: '— Not set —', de: '— Nicht gesetzt —', uk: '— Не встановлено —', ru: '— Не задано —',
    id: '— Belum diatur —', ky: '— Белгиленбеген —', bg: '— Не е зададено —', es: '— No definido —',
  },
  'props.designerBrief': {
    en: 'Designer Brief', de: 'Designer-Briefing', uk: 'Бриф дизайнера', ru: 'Бриф дизайнера',
    id: 'Brief Desainer', ky: 'Дизайнер брифи', bg: 'Бриф за дизайнер', es: 'Brief del diseñador',
  },
  'props.designerBriefPlaceholder': {
    en: 'Describe what the image should show...', de: 'Beschreibe, was das Bild zeigen soll...', uk: 'Опишіть, що повинно показувати зображення...', ru: 'Опишите, что должно показывать изображение...',
    id: 'Jelaskan apa yang harus ditampilkan gambar...', ky: 'Сүрөт эмнени көрсөтүшү керек...', bg: 'Опишете какво трябва да показва изображението...', es: 'Describe lo que debe mostrar la imagen...',
  },
  'props.textOverlay': {
    en: 'Text Overlay', de: 'Texteinblendung', uk: 'Текст на зображенні', ru: 'Текст на изображении',
    id: 'Teks Overlay', ky: 'Текст оверлей', bg: 'Текст върху изображение', es: 'Texto superpuesto',
  },
  'props.textOverlayPlaceholder': {
    en: 'Text designed into the image', de: 'Text, der ins Bild eingebaut wird', uk: 'Текст, вбудований у зображення', ru: 'Текст, встроенный в изображение',
    id: 'Teks yang didesain ke dalam gambar', ky: 'Сүрөткө киргизилген текст', bg: 'Текст, вграден в изображението', es: 'Texto diseñado en la imagen',
  },
  'props.ctaText': {
    en: 'CTA Text', de: 'CTA-Text', uk: 'CTA текст', ru: 'CTA текст',
    id: 'Teks CTA', ky: 'CTA тексти', bg: 'CTA текст', es: 'Texto CTA',
  },
  'props.desktopDimensions': {
    en: 'Desktop Dimensions (px)', de: 'Desktop-Masse (px)', uk: 'Розміри для десктопу (px)', ru: 'Размеры для десктопа (px)',
    id: 'Dimensi Desktop (px)', ky: 'Десктоп өлчөмдөрү (px)', bg: 'Десктоп размери (px)', es: 'Dimensiones escritorio (px)',
  },
  'props.mobileDimensions': {
    en: 'Mobile Dimensions (px)', de: 'Mobile Masse (px)', uk: 'Мобільні розміри (px)', ru: 'Размеры для мобильного (px)',
    id: 'Dimensi Mobile (px)', ky: 'Мобилдик өлчөмдөр (px)', bg: 'Мобилни размери (px)', es: 'Dimensiones móvil (px)',
  },
  'props.linkAsin': {
    en: 'Link ASIN (clickable)', de: 'Link-ASIN (klickbar)', uk: 'Посилання ASIN (клікабельне)', ru: 'Ссылка ASIN (кликабельная)',
    id: 'Link ASIN (dapat diklik)', ky: 'Шилтеме ASIN (басылуучу)', bg: 'Линк ASIN (кликаем)', es: 'Enlace ASIN (clicable)',
  },
  'props.desktopImage': {
    en: 'Desktop Image', de: 'Desktop-Bild', uk: 'Зображення для десктопу', ru: 'Изображение для десктопа',
    id: 'Gambar Desktop', ky: 'Десктоп сүрөт', bg: 'Десктоп изображение', es: 'Imagen escritorio',
  },
  'props.mobileImage': {
    en: 'Mobile Image', de: 'Mobile Bild', uk: 'Мобільне зображення', ru: 'Мобильное изображение',
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
  'props.nativeTextPlaceholder': {
    en: 'Native text content...', de: 'Nativer Textinhalt...', uk: 'Нативний текстовий вміст...', ru: 'Нативное текстовое содержание...',
    id: 'Konten teks native...', ky: 'Натив текст мазмуну...', bg: 'Нативно текстово съдържание...', es: 'Contenido de texto nativo...',
  },
  'props.nativeTextHint': {
    en: 'Only for section headings or legal text.', de: 'Nur für Sektionsüberschriften oder rechtliche Texte.', uk: 'Тільки для заголовків секцій або юридичного тексту.', ru: 'Только для заголовков секций или юридического текста.',
    id: 'Hanya untuk judul seksi atau teks hukum.', ky: 'Секция аталыштары же юридикалык текст үчүн гана.', bg: 'Само за заглавия на секции или правен текст.', es: 'Solo para encabezados de sección o texto legal.',
  },
  'props.videoBrief': {
    en: 'Video Brief', de: 'Video-Briefing', uk: 'Бриф відео', ru: 'Бриф видео',
    id: 'Brief Video', ky: 'Видео брифи', bg: 'Бриф за видео', es: 'Brief del video',
  },
  'props.videoBriefPlaceholder': {
    en: 'Describe the video content...', de: 'Beschreibe den Videoinhalt...', uk: 'Опишіть зміст відео...', ru: 'Опишите содержание видео...',
    id: 'Jelaskan konten video...', ky: 'Видео мазмунун сүрөттөңүз...', bg: 'Опишете съдържанието на видеото...', es: 'Describe el contenido del video...',
  },
  'props.videoThumbnail': {
    en: 'Video Thumbnail', de: 'Video-Vorschaubild', uk: 'Мініатюра відео', ru: 'Превью видео',
    id: 'Thumbnail Video', ky: 'Видео миниатюра', bg: 'Миниатюра на видео', es: 'Miniatura del video',
  },
  'props.tileColor': {
    en: 'Tile Background Color', de: 'Kachel-Hintergrundfarbe', uk: 'Колір фону плитки', ru: 'Цвет фона плитки',
    id: 'Warna Latar Tile', ky: 'Плитка фон түсү', bg: 'Фонов цвят на плочка', es: 'Color de fondo del tile',
  },
  'props.tileColorHint': {
    en: 'Preview color for the designer (not an Amazon feature)',
    de: 'Vorschaufarbe für den Designer (keine Amazon-Funktion)',
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
    en: 'Clear', de: 'Entfernen', uk: 'Прибрати', ru: 'Убрать',
    id: 'Hapus', ky: 'Тазалоо', bg: 'Изчисти', es: 'Quitar',
  },
  'props.bestSellersHint': {
    en: 'Amazon auto-selects best sellers. ASINs are optional filter.', de: 'Amazon wählt Bestseller automatisch aus. ASINs sind optionaler Filter.', uk: 'Amazon автоматично обирає бестселери. ASINs - необов\'язковий фільтр.', ru: 'Amazon автоматически выбирает бестселлеры. ASINs - необязательный фильтр.',
    id: 'Amazon otomatis memilih best seller. ASIN adalah filter opsional.', ky: 'Amazon бестселлерлерди автоматтык тандайт. ASINs - кошумча фильтр.', bg: 'Amazon автоматично избира бестселъри. ASINs са незадължителен филтър.', es: 'Amazon selecciona bestsellers automáticamente. ASINs son filtro opcional.',
  },
  'props.recommendedHint': {
    en: 'Amazon algorithm picks products. ASINs are optional.', de: 'Amazon-Algorithmus wählt Produkte. ASINs sind optional.', uk: 'Алгоритм Amazon обирає продукти. ASINs необов\'язкові.', ru: 'Алгоритм Amazon выбирает продукты. ASINs необязательны.',
    id: 'Algoritma Amazon memilih produk. ASIN opsional.', ky: 'Amazon алгоритми продукттарды тандайт. ASINs милдеттүү эмес.', bg: 'Алгоритъмът на Amazon избира продукти. ASINs не са задължителни.', es: 'El algoritmo de Amazon elige productos. ASINs son opcionales.',
  },
  'props.dealsHint': {
    en: 'Shows products with active deals from your catalog.', de: 'Zeigt Produkte mit aktiven Angeboten aus deinem Katalog.', uk: 'Показує продукти з активними акціями з вашого каталогу.', ru: 'Показывает продукты с активными акциями из вашего каталога.',
    id: 'Menampilkan produk dengan penawaran aktif dari katalog Anda.', ky: 'Каталогуңуздагы активдүү акциялары бар продукттарды көрсөтөт.', bg: 'Показва продукти с активни оферти от каталога ви.', es: 'Muestra productos con ofertas activas de tu catálogo.',
  },

  // ─── GENERATE MODAL ───
  'gen.title': {
    en: 'Generate Brand Store', de: 'Brand Store generieren', uk: 'Згенерувати Brand Store', ru: 'Сгенерировать Brand Store',
    id: 'Hasilkan Brand Store', ky: 'Brand Store түзүү', bg: 'Генерирай Brand Store', es: 'Generar Brand Store',
  },
  'gen.uploadAsins': {
    en: 'Upload ASIN List', de: 'ASIN-Liste hochladen', uk: 'Завантажити список ASIN', ru: 'Загрузить список ASIN',
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
  'gen.brandNamePlaceholder': {
    en: 'e.g. Futum, Kaercher, Nespresso', de: 'z.B. Futum, Kaercher, Nespresso', uk: 'напр. Futum, Kaercher, Nespresso', ru: 'напр. Futum, Kaercher, Nespresso',
    id: 'mis. Futum, Kaercher, Nespresso', ky: 'мис. Futum, Kaercher, Nespresso', bg: 'напр. Futum, Kaercher, Nespresso', es: 'ej. Futum, Kaercher, Nespresso',
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
    en: 'Store Complexity', de: 'Store-Komplexität', uk: 'Складність Store', ru: 'Сложность Store',
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
    de: 'Kategorien plus Zusatzseiten (Bestseller, Über uns). Ausgewogene Sektionen mit Lifestyle-Bildern und Videos.',
    uk: 'Категорії та додаткові сторінки (Бестселери, Про нас). Збалансовані секції.',
    ru: 'Категории и дополнительные страницы (Бестселлеры, О нас). Сбалансированные секции.',
    id: 'Kategori ditambah halaman ekstra (Bestseller, Tentang Kami). Seksi seimbang.',
    ky: 'Категориялар жана кошумча барактар (Бестселлерлер, Биз жөнүндө). Тең салмактуу секциялар.',
    bg: 'Категории и допълнителни страници (Бестселъри, За нас). Балансирани секции.',
    es: 'Categorías y páginas extra (Bestsellers, Sobre nosotros). Secciones equilibradas.',
  },
  'gen.complexityPremiumDesc': {
    en: 'Full experience: extra pages, videos, trust elements, follow CTA, detailed product showcases, brand storytelling.',
    de: 'Volles Erlebnis: Zusatzseiten, Videos, Trust-Elemente, Follow-CTA, detaillierte Produktpräsentationen, Brand Storytelling.',
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
    en: 'Briefing Language', de: 'Briefing-Sprache', uk: 'Мова брифінгу', ru: 'Язык брифинга',
    id: 'Bahasa Briefing', ky: 'Брифинг тили', bg: 'Език на брифинга', es: 'Idioma del briefing',
  },
  'gen.briefingLanguageHint': {
    en: 'Language for designer instructions in the export (image texts stay in store language)',
    de: 'Sprache für Designeranweisungen im Export (Bildtexte bleiben in der Store-Sprache)',
    uk: 'Мова для інструкцій дизайнера в експорті (тексти на зображеннях залишаються мовою store)',
    ru: 'Язык для инструкций дизайнера в экспорте (тексты на изображениях остаются на языке store)',
    id: 'Bahasa untuk instruksi desainer di ekspor (teks gambar tetap dalam bahasa store)',
    ky: 'Экспорттогу дизайнер нускамалары үчүн тил (сүрөт тексттери store тилинде калат)',
    bg: 'Език за инструкции за дизайнер в експорта (текстовете на изображения остават на езика на store)',
    es: 'Idioma para instrucciones del diseñador en la exportación (textos de imagen en idioma del store)',
  },
  'gen.more': {
    en: 'more', de: 'weitere', uk: 'ще', ru: 'ещё',
    id: 'lagi', ky: 'дагы', bg: 'още', es: 'más',
  },
  'gen.asinList': {
    en: 'ASIN List', de: 'ASIN-Liste', uk: 'Список ASIN', ru: 'Список ASIN',
    id: 'Daftar ASIN', ky: 'ASIN тизмеси', bg: 'ASIN списък', es: 'Lista ASIN',
  },
  'gen.brandUrl': {
    en: 'Brand / Seller URL', de: 'Marken- / Seller-URL', uk: 'URL бренду / продавця', ru: 'URL бренда / продавца',
    id: 'URL Merek / Penjual', ky: 'Бренд / Сатуучу URL', bg: 'URL на бранд / продавач', es: 'URL Marca / Vendedor',
  },
  'gen.brandUrlPlaceholder': {
    en: 'https://www.amazon.de/s?me=SELLER_ID...', de: 'https://www.amazon.de/s?me=SELLER_ID...', uk: 'https://www.amazon.de/s?me=SELLER_ID...', ru: 'https://www.amazon.de/s?me=SELLER_ID...',
    id: 'https://www.amazon.de/s?me=SELLER_ID...', ky: 'https://www.amazon.de/s?me=SELLER_ID...', bg: 'https://www.amazon.de/s?me=SELLER_ID...', es: 'https://www.amazon.de/s?me=SELLER_ID...',
  },
  'gen.brandUrlHint': {
    en: 'Paste the Amazon seller/brand page URL to auto-discover all products',
    de: 'Amazon Seller-/Markenseite-URL einfügen, um alle Produkte automatisch zu finden',
    uk: 'Вставте URL сторінки продавця/бренду Amazon для автоматичного пошуку всіх продуктів',
    ru: 'Вставьте URL страницы продавца/бренда Amazon для автоматического поиска всех продуктов',
    id: 'Tempel URL halaman penjual/merek Amazon untuk menemukan semua produk secara otomatis',
    ky: 'Бардык продукттарды автоматтык табуу үчүн Amazon сатуучу/бренд барагынын URL\'ин коюңуз',
    bg: 'Поставете URL на страницата на продавач/бранд в Amazon за автоматично откриване на всички продукти',
    es: 'Pega la URL de la página del vendedor/marca de Amazon para descubrir todos los productos automáticamente',
  },
  'gen.discoverProducts': {
    en: 'Discover Products', de: 'Produkte finden', uk: 'Знайти продукти', ru: 'Найти продукты',
    id: 'Temukan Produk', ky: 'Продукттарды табуу', bg: 'Открий продукти', es: 'Descubrir productos',
  },
  'gen.discovering': {
    en: 'Discovering...', de: 'Suche läuft...', uk: 'Пошук...', ru: 'Поиск...',
    id: 'Mencari...', ky: 'Издөөдө...', bg: 'Търсене...', es: 'Buscando...',
  },
  'gen.brandDiscoverEmpty': {
    en: 'No products found at this URL', de: 'Keine Produkte unter dieser URL gefunden', uk: 'Продукти не знайдено за цим URL', ru: 'Продукты не найдены по этому URL',
    id: 'Tidak ada produk ditemukan di URL ini', ky: 'Бул URL\'де продукт табылган жок', bg: 'Не са намерени продукти на този URL', es: 'No se encontraron productos en esta URL',
  },
  'gen.websiteLabel': {
    en: 'Brand Website (optional)', de: 'Marken-Website (optional)', uk: 'Вебсайт бренду (необов.)', ru: 'Сайт бренда (необяз.)',
    id: 'Situs Web Merek (opsional)', ky: 'Бренд веб-сайты (милдеттүү эмес)', bg: 'Уебсайт на бранда (незадължително)', es: 'Sitio web de la marca (opcional)',
  },
  'gen.websitePlaceholder': {
    en: 'https://www.brand-shop.de', de: 'https://www.marken-shop.de', uk: 'https://www.brand-shop.de', ru: 'https://www.brand-shop.de',
    id: 'https://www.brand-shop.de', ky: 'https://www.brand-shop.de', bg: 'https://www.brand-shop.de', es: 'https://www.tienda-marca.es',
  },
  'gen.websiteHint': {
    en: 'Enter the brand\'s own online store / website. AI will extract brand info, USPs, and style to enrich the store design.',
    de: 'Gib die eigene Website / den Onlineshop der Marke ein. KI extrahiert Markeninfos, USPs und Stil für ein besseres Store-Design.',
    uk: 'Введіть власний сайт / інтернет-магазин бренду. ШІ витягне інформацію про бренд, USP та стиль для покращення дизайну.',
    ru: 'Введите собственный сайт / интернет-магазин бренда. ИИ извлечет информацию о бренде, USP и стиль для улучшения дизайна.',
    id: 'Masukkan situs web / toko online merek. AI akan mengekstrak info merek, USP, dan gaya untuk memperkaya desain toko.',
    ky: 'Бренддин өзүнүн веб-сайтын / онлайн дүкөнүн киргизиңиз. AI бренд маалыматын, USP жана стилди чыгарып алат.',
    bg: 'Въведете собствения уебсайт / онлайн магазин на бранда. AI ще извлече информация за бранда, USP и стил за обогатяване на дизайна.',
    es: 'Ingresa el sitio web / tienda online propia de la marca. La IA extraerá información de marca, USPs y estilo para enriquecer el diseño.',
  },
  'gen.websiteScan': {
    en: 'Scan', de: 'Scannen', uk: 'Сканувати', ru: 'Сканировать',
    id: 'Pindai', ky: 'Сканерлөө', bg: 'Сканирай', es: 'Escanear',
  },
  'gen.websiteScanning': {
    en: 'Scanning...', de: 'Scannen...', uk: 'Сканування...', ru: 'Сканирование...',
    id: 'Memindai...', ky: 'Сканерлөөдө...', bg: 'Сканиране...', es: 'Escaneando...',
  },
  'gen.websiteScanned': {
    en: 'Scanned', de: 'Gescannt', uk: 'Сканировано', ru: 'Сканировано',
    id: 'Dipindai', ky: 'Сканерленди', bg: 'Сканирано', es: 'Escaneado',
  },

  // ─── AI CHAT ───
  'chat.placeholder': {
    en: 'Refine your store... (e.g. "Add a bestseller section")',
    de: 'Store verfeinern... (z.B. "Bestseller-Sektion hinzufügen")',
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
  'chat.processing': {
    en: 'Processing...', de: 'Verarbeitung...', uk: 'Обробка...', ru: 'Обработка...',
    id: 'Memproses...', ky: 'Иштетилүүдө...', bg: 'Обработка...', es: 'Procesando...',
  },

  // ─── TILE VIEW ───
  'tile.more': {
    en: 'more', de: 'weitere', uk: 'ще', ru: 'ещё',
    id: 'lagi', ky: 'дагы', bg: 'още', es: 'más',
  },
  'tile.video': {
    en: 'Video', de: 'Video', uk: 'Відео', ru: 'Видео',
    id: 'Video', ky: 'Видео', bg: 'Видео', es: 'Video',
  },
  'tile.textModule': {
    en: '[Text Module]', de: '[Textmodul]', uk: '[Текстовий модуль]', ru: '[Текстовый модуль]',
    id: '[Modul Teks]', ky: '[Текст модулу]', bg: '[Текстов модул]', es: '[Módulo de texto]',
  },
  'tile.shoppable': {
    en: 'Shoppable', de: 'Shoppable', uk: 'Shoppable', ru: 'Shoppable',
    id: 'Shoppable', ky: 'Shoppable', bg: 'Shoppable', es: 'Shoppable',
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
  'price.setup': {
    en: 'Setup', de: 'Einrichtung', uk: 'Налаштування', ru: 'Настройка',
    id: 'Pengaturan', ky: 'Орнотуу', bg: 'Настройка', es: 'Configuración',
  },
  'price.estimatedTotal': {
    en: 'Estimated total', de: 'Geschätzter Gesamtpreis', uk: 'Орієнтовна вартість', ru: 'Ориентировочная стоимость',
    id: 'Estimasi total', ky: 'Болжолдуу жалпы', bg: 'Приблизителна обща цена', es: 'Total estimado',
  },
  'price.customerPrice': {
    en: 'Customer Price', de: 'Kundenpreis', uk: 'Ціна для клієнта', ru: 'Цена для клиента',
    id: 'Harga Pelanggan', ky: 'Кардар баасы', bg: 'Цена за клиент', es: 'Precio cliente',
  },
  'price.images': {
    en: 'Images', de: 'Bilder', uk: 'Зображення', ru: 'Изображения',
    id: 'Gambar', ky: 'Сүрөттөр', bg: 'Изображения', es: 'Imágenes',
  },
  'price.videos': {
    en: 'Videos', de: 'Videos', uk: 'Відео', ru: 'Видео',
    id: 'Video', ky: 'Видеолор', bg: 'Видеа', es: 'Videos',
  },
  'price.internalCost': {
    en: 'Internal Cost', de: 'Interner Einsatz', uk: 'Внутрішні витрати', ru: 'Внутренние затраты',
    id: 'Biaya Internal', ky: 'Ички чыгымдар', bg: 'Вътрешни разходи', es: 'Coste interno',
  },
  'price.productionCost': {
    en: 'Production', de: 'Produktion', uk: 'Виробництво', ru: 'Производство',
    id: 'Produksi', ky: 'Өндүрүш', bg: 'Продукция', es: 'Producción',
  },
  'price.margin': {
    en: 'Margin', de: 'Marge', uk: 'Маржа', ru: 'Маржа',
    id: 'Margin', ky: 'Маржа', bg: 'Маржа', es: 'Margen',
  },
  'price.close': {
    en: 'Close', de: 'Schliessen', uk: 'Закрити', ru: 'Закрыть',
    id: 'Tutup', ky: 'Жабуу', bg: 'Затвори', es: 'Cerrar',
  },

  // ─── ASIN PANEL ───
  'asins.title': {
    en: 'ASIN Overview', de: 'ASIN-Übersicht', uk: 'Огляд ASIN', ru: 'Обзор ASIN',
    id: 'Ikhtisar ASIN', ky: 'ASIN сереп', bg: 'ASIN преглед', es: 'Resumen ASIN',
  },
  'asins.requested': {
    en: 'Requested', de: 'Angefragt', uk: 'Запитано', ru: 'Запрошено',
    id: 'Diminta', ky: 'Суралды', bg: 'Заявени', es: 'Solicitados',
  },
  'asins.scraped': {
    en: 'Scraped', de: 'Gescrapt', uk: 'Зібрано', ru: 'Собрано',
    id: 'Di-scrape', ky: 'Чогултулду', bg: 'Извлечени', es: 'Scrapeados',
  },
  'asins.integrated': {
    en: 'Integrated', de: 'Integriert', uk: 'Інтегровано', ru: 'Интегрировано',
    id: 'Terintegrasi', ky: 'Интеграцияланды', bg: 'Интегрирани', es: 'Integrados',
  },
  'asins.unassigned': {
    en: 'Unassigned', de: 'Nicht zugewiesen', uk: 'Не призначено', ru: 'Не назначено',
    id: 'Belum ditugaskan', ky: 'Дайындалган эмес', bg: 'Неразпределени', es: 'Sin asignar',
  },
  'asins.failed': {
    en: 'Failed', de: 'Fehlgeschlagen', uk: 'Помилка', ru: 'Ошибка',
    id: 'Gagal', ky: 'Катачылык', bg: 'Неуспешни', es: 'Fallidos',
  },
  'asins.close': {
    en: 'Close', de: 'Schliessen', uk: 'Закрити', ru: 'Закрыть',
    id: 'Tutup', ky: 'Жабуу', bg: 'Затвори', es: 'Cerrar',
  },
  'asins.failedToScrape': {
    en: 'Failed to scrape', de: 'Scraping fehlgeschlagen', uk: 'Помилка збору даних', ru: 'Ошибка сбора данных',
    id: 'Gagal scrape', ky: 'Чогултуу катачылыгы', bg: 'Неуспешно извличане', es: 'Error al scrapear',
  },
  'asins.notFound': {
    en: 'Not found on Amazon', de: 'Nicht auf Amazon gefunden', uk: 'Не знайдено на Amazon', ru: 'Не найдено на Amazon',
    id: 'Tidak ditemukan di Amazon', ky: 'Amazon\'до табылган жок', bg: 'Не е намерен в Amazon', es: 'No encontrado en Amazon',
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
  'progress.processing': {
    en: 'Processing...', de: 'Verarbeitung...', uk: 'Обробка...', ru: 'Обработка...',
    id: 'Memproses...', ky: 'Иштетилүүдө...', bg: 'Обработка...', es: 'Procesando...',
  },

  // ─── BRIEFING EXPORT (DOCX) ───
  'brief.docTitle': {
    en: 'Amazon Brand Store Briefing', de: 'Amazon Brand Store Briefing', uk: 'Брифінг Amazon Brand Store', ru: 'Брифинг Amazon Brand Store',
    id: 'Briefing Amazon Brand Store', ky: 'Amazon Brand Store брифинги', bg: 'Брифинг за Amazon Brand Store', es: 'Briefing Amazon Brand Store',
  },
  'brief.date': {
    en: 'Date', de: 'Datum', uk: 'Дата', ru: 'Дата',
    id: 'Tanggal', ky: 'Дата', bg: 'Дата', es: 'Fecha',
  },
  'brief.marketplace': {
    en: 'Marketplace', de: 'Marktplatz', uk: 'Маркетплейс', ru: 'Маркетплейс',
    id: 'Marketplace', ky: 'Маркетплейс', bg: 'Маркетплейс', es: 'Marketplace',
  },
  'brief.overview': {
    en: 'Overview', de: 'Übersicht', uk: 'Огляд', ru: 'Обзор',
    id: 'Ikhtisar', ky: 'Сереп', bg: 'Преглед', es: 'Resumen',
  },
  'brief.pages': {
    en: 'Pages', de: 'Seiten', uk: 'Сторінки', ru: 'Страницы',
    id: 'Halaman', ky: 'Барактар', bg: 'Страници', es: 'Páginas',
  },
  'brief.products': {
    en: 'Products', de: 'Produkte', uk: 'Продукти', ru: 'Продукты',
    id: 'Produk', ky: 'Продукттар', bg: 'Продукти', es: 'Productos',
  },
  'brief.categories': {
    en: 'Categories', de: 'Kategorien', uk: 'Категорії', ru: 'Категории',
    id: 'Kategori', ky: 'Категориялар', bg: 'Категории', es: 'Categorías',
  },
  'brief.none': {
    en: 'None', de: 'Keine', uk: 'Немає', ru: 'Нет',
    id: 'Tidak ada', ky: 'Жок', bg: 'Няма', es: 'Ninguna',
  },
  'brief.brandTone': {
    en: 'Brand Tone', de: 'Markenton', uk: 'Тон бренду', ru: 'Тон бренда',
    id: 'Nada Merek', ky: 'Бренд тону', bg: 'Тон на бранда', es: 'Tono de marca',
  },
  'brief.heroMessage': {
    en: 'Hero Message', de: 'Hero Message', uk: 'Головне повідомлення', ru: 'Главное сообщение',
    id: 'Pesan Utama', ky: 'Негизги билдирүү', bg: 'Основно послание', es: 'Mensaje principal',
  },
  'brief.niche': {
    en: 'Niche', de: 'Nische', uk: 'Ніша', ru: 'Ниша',
    id: 'Niche', ky: 'Ниша', bg: 'Ниша', es: 'Nicho',
  },
  'brief.imageSpecs': {
    en: 'Image Specifications', de: 'Bildspezifikationen', uk: 'Специфікації зображень', ru: 'Спецификации изображений',
    id: 'Spesifikasi Gambar', ky: 'Сүрөт спецификациялары', bg: 'Спецификации на изображения', es: 'Especificaciones de imágenes',
  },
  'brief.twoVersions': {
    en: 'Each image tile requires TWO versions:', de: 'Jede Bildkachel benötigt ZWEI Versionen:', uk: 'Кожна плитка зображення потребує ДВОХ версій:', ru: 'Каждая плитка изображения требует ДВУХ версий:',
    id: 'Setiap tile gambar memerlukan DUA versi:', ky: 'Ар бир сүрөт плиткасы ЭКИ версияны талап кылат:', bg: 'Всяка плочка с изображение изисква ДВЕ версии:', es: 'Cada tile de imagen requiere DOS versiones:',
  },
  'brief.desktopVersion': {
    en: 'Desktop version (typically 3000px wide)', de: 'Desktop-Version (typisch 3000px breit)', uk: 'Десктоп-версія (зазвичай 3000px)', ru: 'Десктоп-версия (обычно 3000px)',
    id: 'Versi desktop (biasanya lebar 3000px)', ky: 'Десктоп версиясы (көбүнчө 3000px)', bg: 'Десктоп версия (обикновено 3000px)', es: 'Versión escritorio (normalmente 3000px)',
  },
  'brief.mobileVersion': {
    en: 'Mobile version (typically 1242px wide)', de: 'Mobile Version (typisch 1242px breit)', uk: 'Мобільна версія (зазвичай 1242px)', ru: 'Мобильная версия (обычно 1242px)',
    id: 'Versi mobile (biasanya lebar 1242px)', ky: 'Мобилдик версиясы (көбүнчө 1242px)', bg: 'Мобилна версия (обикновено 1242px)', es: 'Versión móvil (normalmente 1242px)',
  },
  'brief.dimensionsNote': {
    en: 'Exact dimensions are specified per tile below. If only one dimension is given, create both versions with appropriate cropping.',
    de: 'Genaue Masse werden pro Kachel unten angegeben. Wenn nur eine Grösse angegeben ist, erstellen Sie beide Versionen mit passendem Zuschnitt.',
    uk: 'Точні розміри вказані для кожної плитки нижче. Якщо вказано лише один розмір, створіть обидві версії з відповідним кадруванням.',
    ru: 'Точные размеры указаны для каждой плитки ниже. Если указан только один размер, создайте обе версии с соответствующей обрезкой.',
    id: 'Dimensi tepat ditentukan per tile di bawah. Jika hanya satu dimensi yang diberikan, buat kedua versi dengan cropping yang sesuai.',
    ky: 'Так өлчөмдөр ар бир плитка үчүн төмөндө көрсөтүлгөн. Эгер бир гана өлчөм берилсе, эки версияны да тиешелүү кыркуу менен түзүңүз.',
    bg: 'Точните размери са указани за всяка плочка по-долу. Ако е даден само един размер, създайте и двете версии с подходящо изрязване.',
    es: 'Las dimensiones exactas se especifican por tile abajo. Si solo se da una dimensión, cree ambas versiones con recorte apropiado.',
  },
  'brief.headerBanner': {
    en: 'Header Banner', de: 'Header-Banner', uk: 'Банер заголовка', ru: 'Баннер шапки',
    id: 'Banner Header', ky: 'Баннер', bg: 'Заглавен банер', es: 'Banner de encabezado',
  },
  'brief.desktop': {
    en: 'Desktop', de: 'Desktop', uk: 'Десктоп', ru: 'Десктоп',
    id: 'Desktop', ky: 'Десктоп', bg: 'Десктоп', es: 'Escritorio',
  },
  'brief.mobile': {
    en: 'Mobile', de: 'Mobil', uk: 'Мобільний', ru: 'Мобильный',
    id: 'Mobile', ky: 'Мобилдик', bg: 'Мобилен', es: 'Móvil',
  },
  'brief.status': {
    en: 'Status', de: 'Status', uk: 'Статус', ru: 'Статус',
    id: 'Status', ky: 'Статус', bg: 'Статус', es: 'Estado',
  },
  'brief.uploaded': {
    en: 'Uploaded', de: 'Hochgeladen', uk: 'Завантажено', ru: 'Загружено',
    id: 'Diunggah', ky: 'Жүктөлгөн', bg: 'Качено', es: 'Subido',
  },
  'brief.needsDesign': {
    en: 'Needs design', de: 'Design erforderlich', uk: 'Потребує дизайну', ru: 'Нужен дизайн',
    id: 'Perlu desain', ky: 'Дизайн керек', bg: 'Нужда от дизайн', es: 'Necesita diseño',
  },
  'brief.headerBannerNote': {
    en: 'Shown above the navigation on every page. Can be overridden per page.',
    de: 'Wird über der Navigation auf jeder Seite angezeigt. Kann pro Seite überschrieben werden.',
    uk: 'Показується над навігацією на кожній сторінці. Може бути замінений для кожної сторінки.',
    ru: 'Отображается над навигацией на каждой странице. Может быть переопределен для каждой страницы.',
    id: 'Ditampilkan di atas navigasi di setiap halaman. Dapat diganti per halaman.',
    ky: 'Ар бир бетте навигациянын үстүндө көрсөтүлөт. Ар бир бет үчүн алмаштырылышы мүмкүн.',
    bg: 'Показва се над навигацията на всяка страница. Може да бъде заменен за всяка страница.',
    es: 'Se muestra sobre la navegación en cada página. Se puede cambiar por página.',
  },
  'brief.page': {
    en: 'Page', de: 'Seite', uk: 'Сторінка', ru: 'Страница',
    id: 'Halaman', ky: 'Барак', bg: 'Страница', es: 'Página',
  },
  'brief.section': {
    en: 'Section', de: 'Sektion', uk: 'Секція', ru: 'Секция',
    id: 'Seksi', ky: 'Секция', bg: 'Секция', es: 'Sección',
  },
  'brief.layoutPattern': {
    en: 'Layout Pattern', de: 'Layout-Muster', uk: 'Шаблон макету', ru: 'Шаблон макета',
    id: 'Pola Layout', ky: 'Макет үлгүсү', bg: 'Шаблон на оформление', es: 'Patrón de diseño',
  },
  'brief.mobileStacking': {
    en: 'Mobile: tiles stack vertically (top to bottom)', de: 'Mobil: Kacheln werden vertikal gestapelt (oben nach unten)', uk: 'Мобільний: плитки складаються вертикально (зверху вниз)', ru: 'Мобильный: плитки располагаются вертикально (сверху вниз)',
    id: 'Mobile: tile ditumpuk secara vertikal (atas ke bawah)', ky: 'Мобилдик: плиткалар вертикалдуу жайгашат (жогортон төмөнгө)', bg: 'Мобилно: плочките се подреждат вертикално (отгоре надолу)', es: 'Móvil: los tiles se apilan verticalmente (de arriba a abajo)',
  },
  'brief.tile': {
    en: 'Tile', de: 'Kachel', uk: 'Плитка', ru: 'Плитка',
    id: 'Tile', ky: 'Плитка', bg: 'Плочка', es: 'Tile',
  },
  'brief.type': {
    en: 'Type', de: 'Typ', uk: 'Тип', ru: 'Тип',
    id: 'Jenis', ky: 'Түрү', bg: 'Тип', es: 'Tipo',
  },
  'brief.autoSelected': {
    en: 'Auto-selected by Amazon', de: 'Automatisch von Amazon ausgewählt', uk: 'Автоматично обрано Amazon', ru: 'Автоматически выбрано Amazon',
    id: 'Dipilih otomatis oleh Amazon', ky: 'Amazon тарабынан автоматтык тандалды', bg: 'Автоматично избрано от Amazon', es: 'Seleccionado automáticamente por Amazon',
  },
  'brief.productCount': {
    en: 'Product Count', de: 'Produktanzahl', uk: 'Кількість продуктів', ru: 'Количество продуктов',
    id: 'Jumlah Produk', ky: 'Продукт саны', bg: 'Брой продукти', es: 'Cantidad de productos',
  },
  'brief.brief': {
    en: 'Brief', de: 'Briefing', uk: 'Бриф', ru: 'Бриф',
    id: 'Brief', ky: 'Бриф', bg: 'Бриф', es: 'Brief',
  },
  'brief.thumbnail': {
    en: 'Thumbnail', de: 'Vorschaubild', uk: 'Мініатюра', ru: 'Превью',
    id: 'Thumbnail', ky: 'Миниатюра', bg: 'Миниатюра', es: 'Miniatura',
  },
  'brief.notSet': {
    en: 'Not set', de: 'Nicht gesetzt', uk: 'Не встановлено', ru: 'Не установлено',
    id: 'Belum diatur', ky: 'Коюлган эмес', bg: 'Не е зададено', es: 'No establecido',
  },
  'brief.colorPreview': {
    en: 'Color Preview', de: 'Farbvorschau', uk: 'Попередній перегляд кольору', ru: 'Предпросмотр цвета',
    id: 'Pratinjau Warna', ky: 'Түс алдын ала көрүү', bg: 'Преглед на цвят', es: 'Vista previa del color',
  },
  'brief.textOverlay': {
    en: 'Text Overlay', de: 'Texteinblendung', uk: 'Текст на зображенні', ru: 'Текст на изображении',
    id: 'Teks Overlay', ky: 'Текст оверлей', bg: 'Текст върху изображение', es: 'Texto superpuesto',
  },
  'brief.ctaButton': {
    en: 'CTA Button', de: 'CTA-Button', uk: 'CTA кнопка', ru: 'CTA кнопка',
    id: 'Tombol CTA', ky: 'CTA баскычы', bg: 'CTA бутон', es: 'Botón CTA',
  },
  'brief.imageCategory': {
    en: 'Image Category', de: 'Bildkategorie', uk: 'Категорія зображення', ru: 'Категория изображения',
    id: 'Kategori Gambar', ky: 'Сүрөт категориясы', bg: 'Категория изображение', es: 'Categoría de imagen',
  },
  'brief.designerBrief': {
    en: 'Designer Brief', de: 'Designer-Briefing', uk: 'Бриф дизайнера', ru: 'Бриф дизайнера',
    id: 'Brief Desainer', ky: 'Дизайнер брифи', bg: 'Бриф за дизайнер', es: 'Brief del diseñador',
  },
  'brief.linkAsin': {
    en: 'Link ASIN', de: 'Link-ASIN', uk: 'Посилання ASIN', ru: 'Ссылка ASIN',
    id: 'Link ASIN', ky: 'Шилтеме ASIN', bg: 'Линк ASIN', es: 'Enlace ASIN',
  },
  'brief.linkUrl': {
    en: 'Link URL', de: 'Link-URL', uk: 'URL посилання', ru: 'URL ссылки',
    id: 'Link URL', ky: 'Шилтеме URL', bg: 'Линк URL', es: 'Enlace URL',
  },
  'brief.desktopImage': {
    en: 'Desktop Image', de: 'Desktop-Bild', uk: 'Зображення для десктопу', ru: 'Изображение для десктопа',
    id: 'Gambar Desktop', ky: 'Десктоп сүрөт', bg: 'Десктоп изображение', es: 'Imagen escritorio',
  },
  'brief.mobileImage': {
    en: 'Mobile Image', de: 'Mobile Bild', uk: 'Мобільне зображення', ru: 'Мобильное изображение',
    id: 'Gambar Mobile', ky: 'Мобилдик сүрөт', bg: 'Мобилно изображение', es: 'Imagen móvil',
  },
  'brief.usesDesktop': {
    en: 'Uses desktop', de: 'Verwendet Desktop', uk: 'Використовує десктоп', ru: 'Используется десктоп',
    id: 'Menggunakan desktop', ky: 'Десктопту колдонот', bg: 'Използва десктоп', es: 'Usa escritorio',
  },
  'brief.asinOverview': {
    en: 'ASIN Overview', de: 'ASIN-Übersicht', uk: 'Огляд ASIN', ru: 'Обзор ASIN',
    id: 'Ikhtisar ASIN', ky: 'ASIN сереп', bg: 'ASIN преглед', es: 'Resumen ASIN',
  },
  'brief.productName': {
    en: 'Product Name', de: 'Produktname', uk: 'Назва продукту', ru: 'Название продукта',
    id: 'Nama Produk', ky: 'Продукт аты', bg: 'Име на продукт', es: 'Nombre del producto',
  },
  'brief.category': {
    en: 'Category', de: 'Kategorie', uk: 'Категорія', ru: 'Категория',
    id: 'Kategori', ky: 'Категория', bg: 'Категория', es: 'Categoría',
  },
  'brief.price': {
    en: 'Price', de: 'Preis', uk: 'Ціна', ru: 'Цена',
    id: 'Harga', ky: 'Баа', bg: 'Цена', es: 'Precio',
  },
  'brief.rating': {
    en: 'Rating', de: 'Bewertung', uk: 'Рейтинг', ru: 'Рейтинг',
    id: 'Rating', ky: 'Рейтинг', bg: 'Рейтинг', es: 'Valoración',
  },
  'brief.unassigned': {
    en: 'Unassigned', de: 'Nicht zugewiesen', uk: 'Не призначено', ru: 'Не назначено',
    id: 'Belum ditugaskan', ky: 'Дайындалган эмес', bg: 'Неразпределен', es: 'Sin asignar',
  },
  'brief.subPage': {
    en: 'Sub-Page', de: 'Unterseite', uk: 'Підсторінка', ru: 'Подстраница',
    id: 'Sub-Halaman', ky: 'Суб-барак', bg: 'Подстраница', es: 'Subpagina',
  },

  // ─── EXPORT MODAL ───
  'export.title': {
    en: 'Export Briefing', de: 'Briefing exportieren', uk: 'Експорт брифінгу', ru: 'Экспорт брифинга',
    id: 'Ekspor Briefing', ky: 'Брифинг экспорту', bg: 'Експорт на брифинг', es: 'Exportar briefing',
  },
  'export.briefingLanguage': {
    en: 'Briefing Language', de: 'Briefing-Sprache', uk: 'Мова брифінгу', ru: 'Язык брифинга',
    id: 'Bahasa Briefing', ky: 'Брифинг тили', bg: 'Език на брифинга', es: 'Idioma del briefing',
  },
  'export.briefingLanguageHint': {
    en: 'All headings and labels in the DOCX will use this language. Image texts and content stay as-is.',
    de: 'Alle Ueberschriften und Labels im DOCX verwenden diese Sprache. Bildtexte und Inhalte bleiben wie sie sind.',
    uk: 'Всі заголовки та мітки в DOCX будуть цією мовою. Тексти зображень та контент залишаються як є.',
    ru: 'Все заголовки и метки в DOCX будут на этом языке. Тексты изображений и контент остаются как есть.',
    id: 'Semua judul dan label di DOCX akan menggunakan bahasa ini. Teks gambar dan konten tetap seperti semula.',
    ky: 'DOCX-догу бардык аталыштар жана энбелгилер бул тилде болот. Сүрөт тексттери жана мазмун өзгөрүүсүз калат.',
    bg: 'Всички заглавия и етикети в DOCX ще бъдат на този език. Текстовете на изображения и съдържанието остават непроменени.',
    es: 'Todos los titulos y etiquetas en el DOCX usaran este idioma. Los textos de imagen y contenido permanecen igual.',
  },
  'export.download': {
    en: 'Download DOCX', de: 'DOCX herunterladen', uk: 'Завантажити DOCX', ru: 'Скачать DOCX',
    id: 'Unduh DOCX', ky: 'DOCX жүктөө', bg: 'Изтегли DOCX', es: 'Descargar DOCX',
  },
};

export function t(key, lang) {
  var entry = translations[key];
  if (!entry) return key;
  return entry[lang || 'en'] || entry['en'] || key;
}
