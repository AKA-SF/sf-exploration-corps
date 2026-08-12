import { useState } from 'react';

export default function ResilientImage({ alt = '', fallback, src, ...props }) {
  return <ResilientImageContent alt={alt} fallback={fallback} key={src || 'missing'} src={src} {...props} />;
}

function ResilientImageContent({ alt, fallback, src, ...props }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) return fallback;

  return <img {...props} alt={alt} onError={() => setHasError(true)} src={src} />;
}
