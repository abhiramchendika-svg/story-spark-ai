import { useState, useEffect } from "react";

interface ImageFallbackProps {
  src?: string;
  alt: string;
  className?: string;
}

const FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400' viewBox='0 0 800 400'%3E%3Crect width='800' height='400' fill='%23374151'/%3E%3Ctext x='400' y='200' font-family='sans-serif' font-size='24' fill='%239CA3AF' text-anchor='middle' dominant-baseline='middle'%3EStory Image%3C/text%3E%3C/svg%3E";
  

export default function ImageFallback({
  src,
  alt,
  className,
}: ImageFallbackProps) {
  const [imageSrc, setImageSrc] = useState(src || FALLBACK);

  useEffect(() => {
    setImageSrc(src || FALLBACK);
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={() => setImageSrc(FALLBACK)}
    />
  );
}