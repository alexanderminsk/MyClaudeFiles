# Экономическая статистика региона

Простой статический сайт с данными World Bank по Беларуси и соседним странам (ВВП, инфляция, зарплата). Данные обновляются автоматически раз в неделю через GitHub Actions. Хостинг бесплатный на Vercel или GitHub Pages.

## Что внутри

```
index.html              — сайт (один файл, без фреймворков)
data/stats.json         — данные (генерируются автоматически)
scripts/fetch-data.js   — скрипт загрузки данных из World Bank API
.github/workflows/      — GitHub Actions (автообновление данных)
```

---

## Деплой за 10 минут

### Шаг 1 — создать репозиторий на GitHub

1. Зайди на [github.com](https://github.com) → New repository
2. Назови, например, `regional-stats`
3. Сделай **Public** (нужно для бесплатного хостинга)
4. Загрузи все файлы проекта

Через терминал:
```bash
cd stats-site
git init
git add .
git commit -m "init"
git remote add origin https://github.com/ВАШ-ЛОГИН/regional-stats.git
git push -u origin main
```

### Шаг 2 — первый запуск скрипта данных

GitHub Actions запустится по расписанию, но для первого раза:

```bash
node scripts/fetch-data.js
git add data/stats.json
git commit -m "add initial data"
git push
```

Или запусти вручную на GitHub: **Actions → Update economic data → Run workflow**

### Шаг 3 — деплой на Vercel (рекомендую)

1. Зайди на [vercel.com](https://vercel.com) → Log in with GitHub
2. **Add New Project** → выбери репозиторий `regional-stats`
3. Framework Preset: **Other**
4. Нажми **Deploy**

Готово. Vercel автоматически публикует каждый новый коммит, в том числе от GitHub Actions.

### Альтернатива — GitHub Pages

1. Settings → Pages
2. Source: **Deploy from a branch** → `main` / `/ (root)`
3. Сайт появится по адресу `https://ВАШ-ЛОГИН.github.io/regional-stats/`

---

## Как работает автообновление

```
Каждый понедельник в 06:00 UTC
  → GitHub Actions запускает scripts/fetch-data.js
  → Скрипт тянет свежие данные из api.worldbank.org
  → Если данные изменились — делает коммит data/stats.json
  → Vercel замечает новый коммит → публикует обновлённый сайт
```

Данные World Bank обновляются раз в год (ежегодный выпуск), поэтому еженедельный cron достаточен.

---

## Источники данных

| Показатель | Индикатор World Bank |
|---|---|
| ВВП на душу населения | `NY.GDP.PCAP.CD` (USD, текущие цены) |
| Инфляция (ИПЦ) | `FP.CPI.TOTL.ZG` (%, г/г) |
| Средняя зарплата | расчёт: ВВП × 55% (доля труда) / 12 |

Зарплата — приблизительный показатель. Для точных данных можно добавить ручной CSV из Белстата/Росстата в папку `data/` и дополнить `scripts/fetch-data.js`.

---

## Страны

🇧🇾 Беларусь · 🇵🇱 Польша · 🇱🇹 Литва · 🇱🇻 Латвия · 🇺🇦 Украина · 🇷🇺 Россия
