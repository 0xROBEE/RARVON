import { useEffect, useRef, useState } from 'react';
import { renderPdfPageToCanvas } from '../../../lib/pdfjs';

const thumbCache = new Map<string, string>(); // key: `${srcId}:${originalIndex}` -> data URL

export default function LazyThumb({
  srcBytes,
  srcId,
  originalIndex,
  rotation,
}: {
  srcBytes: ArrayBuffer;
  srcId: string;
  originalIndex: number;
  rotation: number;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(thumbCache.get(`${srcId}:${originalIndex}`) ?? null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dataUrl) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          renderPdfPageToCanvas(srcBytes.slice(0), originalIndex + 1, 0.5)
            .then((canvas) => {
              const url = canvas.toDataURL('image/png');
              thumbCache.set(`${srcId}:${originalIndex}`, url);
              setDataUrl(url);
            })
            .catch(() => {});
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [dataUrl, srcBytes, srcId, originalIndex]);

  return (
    <div ref={ref} className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded bg-paper">
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={`Page ${originalIndex + 1}`}
          className="max-h-full max-w-full"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      ) : (
        <span className="text-[10px] text-ink/30">…</span>
      )}
    </div>
  );
}
