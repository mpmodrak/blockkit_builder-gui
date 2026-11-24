import { useEffect, useState } from 'react';
import { isHttpUrl } from '../model/message';

export default function FitImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  const usable = isHttpUrl(src) && !failed;

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!usable) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-[#f4f4f4] px-3 text-center text-xs text-[#616061] ${className}`}
        data-testid="image-fallback"
      >
        <span className="font-semibold text-[#1d1c1d]">
          {src ? 'Preview unavailable' : 'No image yet'}
        </span>
        <span>{src ? 'Check that the link is a public http(s) image.' : 'Paste a public image URL.'}</span>
      </div>
    );
  }

  return (
    <img
      src={src.trim()}
      alt={alt || ''}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
