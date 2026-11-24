import { readFile } from 'node:fs/promises';

export const TEST_DRIVE_FOLDER = 'https://drive.google.com/drive/folders/testFolderId123';

export async function openStoreBuilder(page, baseURL) {
  // Keep the editor's normal local Playwright origin. The production bridge is
  // covered separately by the tests of headquarterDriveRequest.
  const source = await readFile(new URL('../../src/storeDriveExport.mjs', import.meta.url), 'utf8');
  const moduleUrl = new URL('/src/storeDriveExport.mjs', baseURL);
  await page.route(url => url.origin === moduleUrl.origin && url.pathname === moduleUrl.pathname, route => route.fulfill({
    contentType: 'text/javascript',
    body: source.replace('export async function configureStoreDriveFolder', 'async function configureStoreDriveFolderLive') + `
      export async function configureStoreDriveFolder(folderUrl) {
        if (folderUrl !== '${TEST_DRIVE_FOLDER}') throw Error('Unexpected folder');
        return { projectKey: '0123456789abcdef0123456789abcdef' };
      }
    `,
  }));
  await page.goto(baseURL);
  return page;
}
