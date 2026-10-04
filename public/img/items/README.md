# Фото позиций меню

Папка: `public/img/items/` · сюда кладутся фотографии для карточек товаров в меню сайта.

> Этот файл лежит в репозитории и уезжает на продакшен вместе с остальным `public/` (доступен по адресу `/img/items/README.md`, нигде на сайте не используется и ни на что не влияет). Если фотографий очень много и нужно держать папку «чистой» — просто удалите README, на работу сайта это не повлияет.

## Требования

| | |
|---|---|
| Размер | **не менее 800×600 px** (больше не нужно — на карточке фото показывается максимум ≈350 px шириной, 800 px хватает с запасом для Retina-экранов) |
| Пропорции | **4:3** (горизонтальный кадр). Другое соотношение будет обрезано по краям |
| Формат | **JPEG** (`.jpg`) — фото на сплошном фоне, без прозрачности |
| Вес | до **150–200 КБ** на файл (JPEG, качество ≈80–85) |
| Имя файла | **строго как в списке ниже** (маленькими латинскими буквами, через дефис) — сайт ищет файл по точному имени |

## Фон под обе темы сайта

На сайте две темы — светлая и тёмная, а фон снимка — часть самого фото, под тему он не подстраивается. Поэтому фон выбираем **среднетоновый, тёплый**, который нормально смотрится на любой из них:

| Вариант | Hex | Когда использовать |
|---|---|---|
| **Тёплый таупе — основной** | `#9C8A78` | Фон для всего меню по умолчанию. Одинаково чётко читается и на светлой, и на тёмной теме сайта |
| Терракота / глина | `#B5754D` | Запасной вариант для части позиций (например кофе и десерты) — но тогда держите единый стиль внутри группы |
| Ореховое дерево | `#8B6B4A` | Уютно, но на тёмной теме уже ближе к фону карточки |
| Тёплый серый камень | `#B8AFA4` | Нейтральный; на светлой теме отличается от карточки слабовато |
| Шалфей (зелёно-серый) | `#A3A58A` | Акцент для лимонадов/завтраков, выбивается из коричневой палитры |

Это ориентир по ТОНУ и средней яркости, а не точный цвет заливки: живой фон (дерево, камень, лён, мягкий свет) — нормально и даже лучше ровной краски.

**Не использовать:** чисто белый и очень светлые фоны (например овсяный `#E3D3B8`) — на светлой теме фото растворяется в карточке; чёрный и очень тёмные (например мокко `#6B4F3A`) — на тёмной теме фото проваливается.

## Как снимать

- **Единообразие важнее красоты отдельного кадра:** один фон, один свет, одна цветокоррекция на всё меню — тогда сетка карточек выглядит цельно.
- Блюдо/напиток **по центру**, с небольшим запасом воздуха со всех сторон (≈5–8 % от края) — края могут слегка обрезаться на разных экранах.
- Свет мягкий, рассеянный, без жёстких теней; без текста, логотипов и рамок на снимке.
- Не вырезать предмет с фона и не делать прозрачность — только полноценный кадр с фоном.
- Стекло, пена, лёд, лимонады: следить, чтобы не пропадали на фоне — это нормальный повод подсветить контровым светом.

## Как проверить, что фото подхватилось

1. Положить файл в эту папку **с точным именем** из списка.
2. **Перезапустить** `npm run dev` (список имеющихся фото собирается один раз при запуске/сборке — `scripts/generate-image-manifest.mjs`, горячая перезагрузка его не обновляет).
3. Открыть сайт в обеих темах и убедиться, что фон выглядит ровно и читается.

Если у позиции нет файла, на сайте показывается серая иконка-заглушка — это нормально.

## Список файлов (69)

Источник правды — `src/data/menu.json` (поле `image`). Если в меню добавится позиция, имя файла для неё — это `<id позиции>.jpg`.

### Спец. предложения → Постоянные (1)

| Файл | Позиция |
|---|---|
| `combo-latte-sandwich.jpg` | Комбо: Латте/Капучино + сэндвич |

### Спец. предложения → Сезонные (10)

| Файл | Позиция |
|---|---|
| `spicy-tea-strawberry-raspberry.jpg` | Чай Пряный Клубника-Малина |
| `tea-seabuckthorn-passionfruit.jpg` | Чай Облепиха-Маракуйя |
| `tea-barberry-mint-orange.jpg` | Чай Барбарис Мята-Апельсин |
| `spicy-tea-apple-cinnamon.jpg` | Чай Пряный Яблоко-Корица |
| `milk-oolong-cranberry-orange.jpg` | Молочный Улун Клюква-Апельсин |
| `milk-oolong-peach.jpg` | Молочный Улун-Персик |
| `mocha-orange-chocolate.jpg` | Мокко Апельсин-Шоколад |
| `raf-raspberry-cheese-foam.jpg` | Малиновый Раф с Сырной Пенкой |
| `raf-cherry-chocolate.jpg` | Раф Вишня-Шоколад |
| `matcha-raspberry-white-chocolate.jpg` | Матча Малина-Белый Шоколад |

### Напитки → Coffee (10)

| Файл | Позиция |
|---|---|
| `espresso.jpg` | Espresso |
| `americano.jpg` | Americano |
| `doppio.jpg` | Doppio |
| `cortado.jpg` | Cortado |
| `cappuccino.jpg` | Cappuccino |
| `grand-cappuccino.jpg` | Grand Cappuccino |
| `latte.jpg` | Latte |
| `flat-white.jpg` | Flat White |
| `moccacino.jpg` | Moccacino |
| `raf-coffee.jpg` | Raf Coffee |

### Напитки → Ice Coffee (5)

| Файл | Позиция |
|---|---|
| `iced-latte.jpg` | Ice Latte |
| `frappe.jpg` | Frappe |
| `espresso-tonic.jpg` | Espresso Tonic |
| `bumblebee.jpg` | Bumblebee |
| `raspberry-pink-latte.jpg` | Raspberry Pink Latte |

### Напитки → Милкшейки (5)

| Файл | Позиция |
|---|---|
| `milkshake-classic.jpg` | Classic Milkshake |
| `milkshake-chocolate.jpg` | Chocolate Milkshake |
| `milkshake-banana.jpg` | Banana Milkshake |
| `milkshake-strawberry.jpg` | Strawberry Milkshake |
| `milkshake-oreo.jpg` | Oreo Milkshake |

### Напитки → Лимонады (5)

| Файл | Позиция |
|---|---|
| `lemonade-mojito.jpg` | Mojito |
| `lemonade-tropic.jpg` | Tropical Lemonade |
| `lemonade-strawberry.jpg` | Strawberry Lemonade |
| `lemonade-blue-lagoon.jpg` | Blue Lagoon |
| `lemonade-raspberry-chai-fizz.jpg` | Raspberry Chai Fizz |

### Напитки → Matcha (5)

| Файл | Позиция |
|---|---|
| `matcha-classic.jpg` | Classic Matcha Latte |
| `matcha-coconut.jpg` | Coconut Matcha Latte |
| `matcha-strawberry.jpg` | Strawberry Matcha |
| `matcha-tonic.jpg` | Matcha Tonic |
| `matcha-mango.jpg` | Mango Matcha Latte |

### Напитки → Ube (3)

| Файл | Позиция |
|---|---|
| `ube-latte.jpg` | Ube Latte |
| `ube-cream-latte.jpg` | Ube Cream Latte |
| `ube-smoothie.jpg` | Ube Smoothie |

### Напитки → Bubble Tea (6)

| Файл | Позиция |
|---|---|
| `bubble-tea-tropic.jpg` | Bubble Tea Tropic |
| `bubble-tea-kiwi.jpg` | Bubble Tea Kiwi |
| `bubble-tea-strawberry.jpg` | Bubble Tea Strawberry |
| `bubble-tea-peach.jpg` | Bubble Tea Peach |
| `bubble-latte-caramel.jpg` | Bubble Latte Caramel |
| `bubble-latte-chocolate.jpg` | Bubble Latte Chocolate |

### Напитки → Алкогольные напитки (6)

| Файл | Позиция |
|---|---|
| `jack-daniels-honey.jpg` | Jack Daniel's Honey |
| `jack-daniels-apple.jpg` | Jack Daniel's Apple |
| `crema-kick-mango.jpg` | Crema Kick The Rules Mango |
| `crema-kick-watermelon.jpg` | Crema Kick The Rules Watermelon |
| `johnnie-walker-red.jpg` | Johnnie Walker Red Label |
| `jagermeister.jpg` | Jägermeister |

### Блюда → Завтраки (5)

| Файл | Позиция |
|---|---|
| `english-breakfast.jpg` | Английский завтрак |
| `shakshuka.jpg` | Шакшука |
| `syrniki.jpg` | Сырники |
| `salmon-scramble.jpg` | Скрэмбл с лососем |
| `chicken-sandwich.jpg` | Сэндвич с курицей |

### Блюда → Мексиканская кухня (4)

| Файл | Позиция |
|---|---|
| `nachos.jpg` | Начос |
| `quesadilla.jpg` | Кессадилья |
| `burrito.jpg` | Бурито |
| `tacos.jpg` | Тако |

### Блюда → Десерты (4)

| Файл | Позиция |
|---|---|
| `cheesecake-caramel.jpg` | Cheesecake Caramel |
| `cheesecake-mac.jpg` | Cheesecake Mac |
| `smetannik.jpg` | Smetannik |
| `donuts.jpg` | Donuts |
