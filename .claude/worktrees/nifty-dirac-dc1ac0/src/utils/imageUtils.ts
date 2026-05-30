/**
 * iNaturalist image sizes:
 * square: 75x75px (cropped), small: ~240px, medium: ~500px, large: ~1024px, original: full size
 */
export type ImageSize = 'square' | 'small' | 'medium' | 'large' | 'original';

export function getImageUrl(url: string, size: ImageSize): string {
  if (!url) return '';
  return url.replace(/(square|small|medium|large|original)/, size) || url;
}

export function getImageSrcSet(url: string): string {
  return [
    `${getImageUrl(url, 'small')} 240w`,
    `${getImageUrl(url, 'medium')} 500w`,
    `${getImageUrl(url, 'large')} 1024w`,
  ].join(', ');
}

export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
}
