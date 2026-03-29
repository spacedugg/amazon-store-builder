// ─── REFERENCE STORE SEED DATA ───
// Brand Store URLs for the knowledge base, organized by category.
// Unknown brands (page-only URLs) will have their brand name auto-detected during crawling.
// Quality: 5 = excellent reference, 3 = good, 1 = basic/partial

export var SEED_STORES = [
  // ─── Fashion ───
  { url: 'https://www.amazon.de/stores/SNOCKS/page/C0392661-40E4-498F-992D-2FFEB9086ABB', category: 'fashion', quality: 5 },
  { url: 'https://www.amazon.de/stores/THENORTHFACE/page/91172724-C342-482B-A300-564D9EA5E09F', category: 'fashion', quality: 5 },

  // ─── Supplements / Sports Nutrition ───
  { url: 'https://www.amazon.de/stores/ESN/page/F5F8CAD5-7990-44CF-9F5B-61DFFF5E8581', category: 'supplements', quality: 5 },
  { url: 'https://www.amazon.de/stores/AG1/page/E676C84A-8A86-4F92-B978-3343F367DD0C', category: 'supplements', quality: 5 },
  { url: 'https://www.amazon.de/stores/BearswithBenefits/page/AFC77FAF-F173-4A4E-A7DF-8779F7E16E97', category: 'supplements', quality: 5 },
  { url: 'https://www.amazon.de/stores/twentythree/page/0E8D9A31-200C-4EC5-BC94-CBBC023B28A4', category: 'supplements', quality: 5 },

  // ─── Food / Beverages ───
  { url: 'https://www.amazon.de/stores/page/2429E3F3-8BFA-466A-9185-35FB47867B06', category: 'food', quality: 5, brandHint: 'Nespresso' },
  { url: 'https://www.amazon.de/stores/HOLYEnergy/page/7913E121-CB43-4349-A8D2-9F0843B226E4', category: 'food', quality: 5 },
  { url: 'https://www.amazon.de/stores/thenucompany/page/A096FF51-79D5-440D-8789-6255E9DFE87D', category: 'food', quality: 5 },

  // ─── Tools / Cleaning ───
  { url: 'https://www.amazon.de/stores/Kärcher/page/EFE3653A-1163-432C-A85B-0486A31C0E3D', category: 'tools', quality: 5 },

  // ─── Home / Office ───
  { url: 'https://www.amazon.de/stores/Desktronic/page/1A862649-6CEA-4E30-855F-0C27A1F99A6C', category: 'office', quality: 5 },
  { url: 'https://www.amazon.de/stores/Cloudpillo/page/741141B6-87D5-44F9-BE63-71B55CD51198', category: 'home_kitchen', quality: 5 },

  // ─── Unknown brands (need category assignment) ───
  { url: 'https://www.amazon.de/stores/page/BC9A9642-4612-460E-81B4-985E9AF6A7D2', category: 'generic', quality: 5 },
  { url: 'https://www.amazon.de/stores/page/870649DE-4F7E-421F-B141-C4C47864D539', category: 'generic', quality: 5 },
  { url: 'https://www.amazon.de/stores/page/7AD425C6-C3C5-402D-A69D-D6201F98F888', category: 'generic', quality: 5 },
  { url: 'https://www.amazon.de/stores/page/34D4A812-9A68-4602-A6A0-30565D399620', category: 'generic', quality: 5 },
  { url: 'https://www.amazon.de/stores/page/44908195-3880-47D6-9EC0-D2A1543EB718', category: 'generic', quality: 5 },
  { url: 'https://www.amazon.de/stores/page/FB4FA857-CD07-4E92-A32C-CF0CD556ACF6', category: 'generic', quality: 5 },
  { url: 'https://www.amazon.de/stores/page/1758941C-AE87-4628-AB45-62C0A2BDB75C', category: 'generic', quality: 5 },
  { url: 'https://www.amazon.de/stores/page/CC609240-DCC5-47C5-A171-3B973268CD34', category: 'generic', quality: 5 },
  { url: 'https://www.amazon.de/stores/page/7DC5A9F8-2A3D-426B-B2F2-F819AE825B1F', category: 'generic', quality: 5 },

  // ─── Lower visual quality (still useful for structure) ───
  { url: 'https://www.amazon.de/stores/page/4E8E4B73-1DA5-45E1-8EFA-5EB4A3A758F6', category: 'generic', quality: 2 },
  { url: 'https://www.amazon.de/stores/page/30552E59-AC22-47B1-BBBB-AEA9225BD614', category: 'generic', quality: 2, note: 'Good homepage concept, but subpages lack structure' },
];
