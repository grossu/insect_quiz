# Руководство по оптимизации изображений iNaturalist

## Доступные размеры изображений

iNaturalist API предоставляет изображения в следующих размерах:

| Размер | Разрешение | Использование | Пример URL |
|--------|------------|---------------|------------|
| `square` | 75×75px | Миниатюры, списки | `.../square.jpg` |
| `small` | ~240px высота | Превью для мобильных | `.../small.jpg` |
| `medium` | ~500px высота | Карточки, превью для desktop | `.../medium.jpg` |
| `large` | ~1024px высота | Основное отображение | `.../large.jpg` |
| `original` | Полный размер | Детальный просмотр, зум | `.../original.jpg` |

## Текущая реализация

### 1. Утилиты для работы с изображениями (`src/utils/imageUtils.ts`)

```typescript
import { getImageUrl, getImageSrcSet, preloadImage } from '../utils/imageUtils';

// Получить URL конкретного размера
const largeUrl = getImageUrl(photo.url, 'large');
const originalUrl = getImageUrl(photo.url, 'original');

// Создать srcset для адаптивной загрузки
const srcset = getImageSrcSet(photo.url);

// Предзагрузить изображение
await preloadImage(largeUrl);
```

### 2. Компонент InsectImage

**Миниатюры (основное отображение):**
- Используется размер `large` (1024px) для четкого отображения
- Добавлен `srcset` для автоматического выбора оптимального размера
- Предзагрузка изображений с индикатором загрузки

**Полноразмерный просмотр:**
- Используется размер `original` для максимального качества
- Fallback на `large` при недоступности оригинала
- Адаптивный рендеринг в зависимости от уровня зума

### 3. CSS оптимизации (`src/index.css`)

**Глобальные настройки:**
- `image-rendering: crisp-edges` - предотвращение размытия
- `transform: translateZ(0)` - аппаратное ускорение
- `backface-visibility: hidden` - улучшенная производительность

**Специальные правила:**
- Автоматическое улучшение качества для `large` и `original` размеров
- Утилитные классы для точной настройки рендеринга

## Оптимизация производительности

### 1. Стратегия загрузки

```typescript
// ✅ ПРАВИЛЬНО: Предзагрузка перед отображением
useEffect(() => {
  const largeUrl = getImageUrl(currentPhoto.url, 'large');
  preloadImage(largeUrl)
    .then(() => setIsLoading(false))
    .catch(() => setImageError(true));
}, [currentPhoto.url]);

// ❌ НЕПРАВИЛЬНО: Загрузка без контроля
<img src={photo.url} />
```

### 2. Адаптивная загрузка с srcset

```typescript
<img
  src={getImageUrl(photo.url, 'large')}
  srcSet={getImageSrcSet(photo.url)}
  sizes="(max-width: 768px) 100vw, 768px"
/>
```

Браузер автоматически выберет оптимальный размер на основе:
- Разрешения экрана
- Размера viewport
- DPI устройства

### 3. Обработка ошибок

```typescript
// Fallback на меньший размер при ошибке загрузки
onError={(e) => {
  const target = e.target as HTMLImageElement;
  target.src = getImageUrl(photo.url, 'large');
}}
```

## Рекомендации по использованию

### Для миниатюр и превью
```typescript
// Используйте medium или large в зависимости от размера контейнера
const thumbnailUrl = getImageUrl(photo.url, containerWidth > 500 ? 'large' : 'medium');
```

### Для основного отображения
```typescript
// Всегда используйте large с srcset
<img
  src={getImageUrl(photo.url, 'large')}
  srcSet={getImageSrcSet(photo.url)}
  sizes="(max-width: 768px) 100vw, 768px"
  loading="eager"
/>
```

### Для полноразмерного просмотра
```typescript
// Используйте original с fallback
<img
  src={getImageUrl(photo.url, 'original')}
  onError={(e) => {
    e.target.src = getImageUrl(photo.url, 'large');
  }}
/>
```

## Fallback стратегия

Иерархия размеров для fallback:
1. `original` → `large` → `medium` → `small` → `square`

Пример реализации:

```typescript
const imageSizes: ImageSize[] = ['original', 'large', 'medium', 'small', 'square'];
let currentSizeIndex = 0;

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  currentSizeIndex++;
  if (currentSizeIndex < imageSizes.length) {
    const target = e.target as HTMLImageElement;
    target.src = getImageUrl(photo.url, imageSizes[currentSizeIndex]);
  } else {
    setImageError(true);
  }
};
```

## Тестирование качества

### Проверка размытости
1. Откройте изображение в браузере
2. Увеличьте масштаб (Ctrl + колесико мыши)
3. Проверьте четкость деталей

### Проверка производительности
```javascript
// В консоли браузера
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('inaturalist'))
  .forEach(r => console.log(r.name, r.duration + 'ms'));
```

### Проверка адаптивности
1. Откройте DevTools (F12)
2. Переключите Device Toolbar (Ctrl+Shift+M)
3. Проверьте загрузку на разных разрешениях

## Частые проблемы и решения

### Изображение размыто
**Причина:** Используется слишком маленький размер
**Решение:** Используйте `large` или `original`

### Медленная загрузка
**Причина:** Загружается `original` для всех изображений
**Решение:** Используйте `srcset` для адаптивной загрузки

### Изображение не отображается
**Причина:** URL недоступен или формат неправильный
**Решение:** Добавьте обработку ошибок и fallback

### Искажение пропорций
**Причина:** CSS `object-fit` не настроен
**Решение:** Используйте `object-cover` для миниатюр, `object-contain` для полноразмерных

## Дополнительные возможности

### Ленивая загрузка
```typescript
<img
  loading="lazy"  // Для изображений вне viewport
  loading="eager" // Для критичных изображений
/>
```

### Placeholder пока загружается
```typescript
{isLoading && (
  <div className="absolute inset-0 bg-gray-100">
    <Spinner />
  </div>
)}
```

### Прогрессивная загрузка
```typescript
// 1. Показываем small сразу
// 2. Загружаем large в фоне
// 3. Заменяем при готовности
```

## Метрики качества

- **Time to First Image:** < 500ms
- **Largest Contentful Paint:** < 2.5s
- **Image Clarity:** Четкость на 100% zoom
- **Fallback Success Rate:** > 99%
