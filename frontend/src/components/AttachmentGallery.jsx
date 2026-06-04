import { BACKEND_ROOT } from '../api.js';
import ImageLightbox from './ImageLightbox.jsx';
import { useState } from 'react';

function fileUrl(file) {
  if (!file) return '';
  return file.startsWith('http') ? file : `${BACKEND_ROOT}${file}`;
}

export default function AttachmentGallery({ attachments = [] }) {
  const [lightbox, setLightbox] = useState(null);
  const images = attachments.map((attachment) => ({
    url: fileUrl(attachment.file),
    name: attachment.original_name || 'Вложение',
  }));

  if (!attachments.length) return null;

  return (
    <>
      <div className="attachment-grid">
        {images.map((image, index) => (
          <button key={`${image.url}-${index}`} className="attachment-tile" type="button" onClick={() => setLightbox(index)}>
            <img src={image.url} alt={image.name} />
            <span>{image.name}</span>
          </button>
        ))}
      </div>
      {lightbox !== null && <ImageLightbox images={images} startIndex={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}
