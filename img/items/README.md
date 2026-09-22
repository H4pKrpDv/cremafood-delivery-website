# img/items/ — фото позиций меню

Сюда кладутся фотографии карточек товара в сетке меню (49 позиций,
формат карточки — 4:3, `object-fit: cover`).

**Важно про имена файлов:** сейчас `data/menu.json` ссылается на позиции
именно с расширением `.jpg` (как ниже). Если проще всего просто положить
сюда файлы `.jpg` с этими именами — ничего больше менять не нужно, сайт
подхватит их сам при следующей пересборке (`node build/build.js`).

Если вместо этого захотите сразу использовать `.webp` (как рекомендовано
в Context.md, раздел "Требования к медиаконтенту" — WebP как основной
формат, до ~150KB после сжатия) — дайте знать, и я одной правкой обновлю
расширения в `data/menu.json` на `.webp` (сами имена файлов менять не
придётся, я просто поменяю `.jpg` → `.webp` у всех 49 путей).

Требования к фото (см. Context.md):
- Формат карточки: горизонтальный **4:3**
- Минимум 800×600px
- Целевой вес после сжатия — до ~150KB (сжатие вручную, например через
  Squoosh, перед добавлением сюда)

Ожидаемые имена файлов (49 шт., по ключам `id` из `data/menu.json`):

- `americano.jpg`
- `bubble-coffee.jpg`
- `bubble-tea-banana.jpg`
- `bubble-tea-kiwi.jpg`
- `bubble-tea-mango.jpg`
- `bubble-tea-pineapple.jpg`
- `bubble-tea-strawberry.jpg`
- `bumblebee.jpg`
- `burrito-chicken.jpg`
- `cappuccino.jpg`
- `cheesecake-caramel.jpg`
- `cheesecake-mac.jpg`
- `combo-latte-sandwich.jpg`
- `cortado.jpg`
- `crema-kick-mango.jpg`
- `crema-kick-watermelon.jpg`
- `donuts.jpg`
- `doppio.jpg`
- `espresso-tonic.jpg`
- `espresso.jpg`
- `flat-white.jpg`
- `frappe.jpg`
- `grand-cappuccino.jpg`
- `hot-chocolate.jpg`
- `ice-tea.jpg`
- `iced-latte.jpg`
- `jack-daniels-apple.jpg`
- `jack-daniels-honey.jpg`
- `jagermeister.jpg`
- `johnnie-walker-red.jpg`
- `latte.jpg`
- `lemonade-berry.jpg`
- `lemonade-mojito.jpg`
- `lemonade-tropic.jpg`
- `milkshake-banana.jpg`
- `milkshake-chocolate.jpg`
- `milkshake-classic.jpg`
- `milkshake-oreo.jpg`
- `milkshake-strawberry.jpg`
- `moccacino.jpg`
- `omelette-cheese.jpg`
- `omelette.jpg`
- `raf-coffee.jpg`
- `smetannik.jpg`
- `tacos-beef.jpg`
- `tea-handmade-cup.jpg`
- `tea-handmade-pot.jpg`
- `tea-julius-cup.jpg`
- `tea-julius-pot.jpg`
