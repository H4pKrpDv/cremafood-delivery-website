/**
 * scripts/generate-image-manifest.mjs
 * ------------------------------------------------------------------
 * 01.10.2026. Генерирует src/data/imageManifest.json — плоский список
 * путей (вида "img/items/espresso.jpg", без ведущего слэша — тот же
 * формат, что и в menu.json), для которых в public/ РЕАЛЬНО лежит файл.
 *
 * Зачем: см. подробный разбор в lib/useImageFallback.ts и lib/data.ts
 * (hasRealImage). Короткая версия — сейчас у ВСЕХ ~80 позиций/баннеров
 * подкатегорий путь к картинке ведёт в никуда (ни одной настоящей
 * фотографии в проекте пока нет), и раньше <img> каждый раз реально
 * пытался запросить такой путь по сети и только ПОСЛЕ провала (onError)
 * подставлял SVG-заглушку. Из-за лимита браузера на число одновременных
 * соединений к одному хосту (6 у HTTP/1.1 — именно так локально работает
 * `next dev`/`next start`; на реальном продакшен-хостинге обычно HTTP/2,
 * там этого лимита по факту нет) резкий всплеск из ~80 таких запросов при
 * переключении вкладки категории вставал в очередь, и часть картинок по
 * несколько секунд (а то и дольше) просто ждала своей очереди — всё это
 * время браузер показывает натив-иконку "битой картинки". Это объясняет
 * ВСЕ симптомы: почему `next dev` и `next start` ведут себя одинаково
 * (лимит — особенность браузера, а не сервера), почему в DevTools у
 * отдельных запросов время ответа маленькое (сервер и правда отвечает
 * быстро, как только до запроса дошла очередь), и почему в продакшене
 * бага нет (там HTTP/2 без этого лимита, плюс до продакшена эта версия
 * меню с увеличенным числом позиций ещё не доехала).
 *
 * Решение: не ПЫТАТЬСЯ грузить по сети путь, про который заранее (на
 * этапе сборки/старта сервера) известно, что файла нет — вместо гонки
 * "запрос -> 404 -> onError -> заглушка" сразу рендерим заглушку, без
 * единого сетевого запроса. Как только для позиции появится настоящее
 * фото в public/img/items (или public/img/categories для баннера) —
 * манифест на следующий запуск/сборку подхватит его автоматически, и
 * <img> начнёт showить его напрямую — никаких ручных правок в коде.
 *
 * Запускается автоматически перед dev/build/start через npm-хуки
 * predev/prebuild/prestart (см. package.json) — обновлять руками не
 * нужно. Файл-результат (src/data/imageManifest.json) в .gitignore —
 * это генерируемый артефакт, а не исходные данные.
 * ------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');

// Те же подкаталоги, которые раньше были в зоне действия middleware.ts
// (теперь он не нужен — см. комментарий выше). 07.10.2026 добавлен
// img/modifiers — фото соусов/добавок на страницах позиций.
const WATCHED_DIRS = ['img/items', 'img/categories', 'img/modifiers'];

// Учитываем только настоящие картинки. В этих же папках лежат README.md с
// памяткой по фото (04.10.2026) — без фильтра он попал бы в манифест как
// "реальное фото" (на работу сайта это не влияло бы — ни у одной позиции
// нет такого пути, — но манифест должен быть честным), так же как и
// случайные служебные файлы вроде Thumbs.db/.DS_Store.
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg']);

function listFilesRecursive(absDir, relPrefix, out) {
  let entries;
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    // Каталога ещё нет (например, public/img/items пока не создан) —
    // это нормально, пока нет ни одной настоящей фотографии.
    return;
  }
  for (const entry of entries) {
    const absPath = path.join(absDir, entry.name);
    const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      listFilesRecursive(absPath, relPath, out);
    } else if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      out.push(relPath);
    }
  }
}

const existingPaths = [];
for (const dir of WATCHED_DIRS) {
  listFilesRecursive(path.join(publicDir, dir), dir, existingPaths);
}
existingPaths.sort();

const outPath = path.join(projectRoot, 'src', 'data', 'imageManifest.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(existingPaths, null, 2) + '\n', 'utf8');

console.log(
  `[generate-image-manifest] ${existingPaths.length} real image file(s) found under public/img/{items,categories,modifiers} -> src/data/imageManifest.json`
);
