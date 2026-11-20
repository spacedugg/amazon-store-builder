import { upload } from '@vercel/blob/client';
export async function uploadImage(file) {
  if (!["image/png", "image/jpeg"].includes(file.type))
    throw Error("Bitte JPG oder PNG hochladen.");
  const local = URL.createObjectURL(file);
  let dimensions;
  try {
    dimensions = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () =>
        resolve({ width: im.naturalWidth, height: im.naturalHeight });
      im.onerror = () => reject(Error("Bild kann nicht gelesen werden."));
      im.src = local;
    });
  } finally {
    URL.revokeObjectURL(local);
  }
  const blob = await upload(
    `brand-stories/${crypto.randomUUID()}/${file.name}`,
    file,
    { access: "public", handleUploadUrl: "/api/blob-upload" },
  );
  return { url: blob.url, name: file.name, size: file.size, ...dimensions };
}
