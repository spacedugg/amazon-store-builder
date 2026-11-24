export const TEST_DRIVE_FOLDER = 'https://drive.google.com/drive/folders/testFolderId123';

export async function openStoreBuilder(page, baseURL) {
  const headquarter = 'https://intern.temoa.de/embed/store-builder';
  const builder = new URL('/', baseURL);
  await page.route(headquarter, route => route.fulfill({ contentType: 'text/html', body: `
    <style>body { margin:0 } iframe { width:100vw; height:100vh; border:0 }</style>
    <iframe name="builder" referrerpolicy="unsafe-url" src="${builder.href}"></iframe>
    <script>
      const frame = document.querySelector('iframe');
      window.addEventListener('message', event => {
        if (event.source !== frame.contentWindow || event.origin !== '${builder.origin}' ||
            event.data?.type !== 'temoa-store-drive-export' || event.data.payload.action !== 'configure') return;
        if (event.data.payload.folderUrl !== '${TEST_DRIVE_FOLDER}') throw Error('Unexpected folder');
        frame.contentWindow.postMessage({
          type: 'temoa-store-drive-export-result', requestId: event.data.requestId,
          value: { projectKey: '0123456789abcdef0123456789abcdef' }
        }, event.origin);
      });
    </script>` }));
  await page.goto(headquarter);
  const app = page.frame({ name: 'builder' });
  await app.waitForURL(builder.href);
  return app;
}
