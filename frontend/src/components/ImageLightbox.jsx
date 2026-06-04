import { useEffect, useMemo, useState } from 'react';

export default function ImageLightbox({ images, startIndex = 0, onClose }) {
  const safeImages = useMemo(() => images || [], [images]);
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    setIndex(startIndex);
  }, [startIndex]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'ArrowLeft') setIndex((current) => (current - 1 + safeImages.length) % safeImages.length);
      if (event.key === 'ArrowRight') setIndex((current) => (current + 1) % safeImages.length);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [safeImages.length, onClose]);

  if (!safeImages.length) return null;
  const current = safeImages[index];

  return (
    <div className="lightbox-backdrop" onMouseDown={onClose}>
      <section className="lightbox" onMouseDown={(event) => event.stopPropagation()}>
        <header className="lightbox-header">
          <strong>{current.name || `Изображение ${index + 1}`}</strong>
          <span>{index + 1} / {safeImages.length}</span>
          <button className="small ghost" type="button" onClick={onClose}>Закрыть</button>
        </header>
        <div className="lightbox-stage">
          {safeImages.length > 1 && <button className="lightbox-arrow left" type="button" onClick={() => setIndex((index - 1 + safeImages.length) % safeImages.length)}>‹</button>}
          <img src={current.url} alt={current.name || 'Вложение'} />
          {safeImages.length > 1 && <button className="lightbox-arrow right" type="button" onClick={() => setIndex((index + 1) % safeImages.length)}>›</button>}
        </div>
        {safeImages.length > 1 && (
          <div className="lightbox-thumbs">
            {safeImages.map((image, imageIndex) => (
              <button
                key={`${image.url}-${imageIndex}`}
                className={imageIndex === index ? 'active' : ''}
                type="button"
                onClick={() => setIndex(imageIndex)}
              >
                <img src={image.url} alt={image.name || `Вложение ${imageIndex + 1}`} />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
