/**
 * iNaturalist Image Size Utilities
 *
 * iNaturalist provides images in multiple sizes:
 * - square: 75x75px (квадратная миниатюра, обрезана)
 * - small: ~240px (пропорциональная)
 * - medium: ~500px (пропорциональная)
 * - large: ~1024px (пропорциональная)
 * - original: Оригинальный размер (может быть очень большим)
 */

export type ImageSize = 'square' | 'small' | 'medium' | 'large' | 'original';

/**
 * Преобразует URL изображения в нужный размер
 *
 * @param url - Исходный URL изображения из iNaturalist API
 * @param size - Желаемый размер изображения
 * @returns URL изображения нужного размера
 *
 * @example
 * const url = 'https://static.inaturalist.org/photos/123/square.jpg';
 * getImageUrl(url, 'large') // https://static.inaturalist.org/photos/123/large.jpg
 */
export function getImageUrl(url: string, size: ImageSize): string {
  if (!url) return '';

  // Заменяем размер в URL
  // Поддерживаем все возможные варианты: square, small, medium, large, original
  const sizePattern = /(square|small|medium|large|original)/;

  if (sizePattern.test(url)) {
    return url.replace(sizePattern, size);
  }

  // Fallback: если формат URL неожиданный, возвращаем оригинал
  return url;
}

/**
 * Создает набор URL для разных размеров изображения
 * Полезно для предзагрузки или srcset
 *
 * @param url - Исходный URL изображения
 * @returns Объект с URL всех доступных размеров
 */
export function getImageUrls(url: string) {
  return {
    square: getImageUrl(url, 'square'),
    small: getImageUrl(url, 'small'),
    medium: getImageUrl(url, 'medium'),
    large: getImageUrl(url, 'large'),
    original: getImageUrl(url, 'original'),
  };
}

/**
 * Генерирует srcset для адаптивной загрузки изображений
 * Браузер автоматически выберет оптимальный размер
 *
 * @param url - Исходный URL изображения
 * @returns Строка srcset для атрибута img
 */
export function getImageSrcSet(url: string): string {
  return [
    `${getImageUrl(url, 'small')} 240w`,
    `${getImageUrl(url, 'medium')} 500w`,
    `${getImageUrl(url, 'large')} 1024w`,
  ].join(', ');
}

/**
 * Предзагружает изображение для более быстрого отображения
 *
 * @param url - URL изображения для предзагрузки
 * @returns Promise, который разрешается когда изображение загружено
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Проверяет доступность изображения
 *
 * @param url - URL изображения для проверки
 * @returns Promise<boolean> - true если изображение доступно
 */
export async function isImageAvailable(url: string): Promise<boolean> {
  try {
    await preloadImage(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Получает оптимальный размер изображения для отображения
 * на основе ширины контейнера
 *
 * @param containerWidth - Ширина контейнера в пикселях
 * @returns Оптимальный размер изображения
 */
export function getOptimalImageSize(containerWidth: number): ImageSize {
  if (containerWidth <= 240) return 'small';
  if (containerWidth <= 500) return 'medium';
  if (containerWidth <= 1024) return 'large';
  return 'original';
}
