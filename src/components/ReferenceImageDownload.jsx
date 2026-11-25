import { useState } from 'react';
import { downloadBlob } from '../exportBriefing';

export default function ReferenceImageDownload({ image, label, expanded = false }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function download(event) {
    event.stopPropagation();
    setPending(true);
    setFailed(false);
    try {
      const response = await fetch(image.dataUrl);
      if (!response.ok) throw new Error('Reference image unavailable');
      downloadBlob(await response.blob(), image.name || 'reference-image');
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" className={'reference-image-download' + (expanded ? ' reference-image-download-expanded' : '')}
        aria-label={label} title={label} disabled={pending} aria-busy={pending} onClick={download}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 2v10m-4-4 4 4 4-4M3 13v4h14v-4" />
        </svg>
        {expanded && label}
      </button>
      {failed && <span className="reference-image-download-error" role="status">Download failed</span>}
    </>
  );
}
