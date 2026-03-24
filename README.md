# Jour News

Новостной сайт (публичная часть + админка) в одном репозитории, ориентирован под деплой на Hostinger Node.js Web App.

## Стек

- Node.js 20+
- Next.js (App Router) + TypeScript
- TailwindCSS + shadcn/ui
- Prisma ORM
- Локально: SQLite
- Прод: PostgreSQL (через `DATABASE_URL`)
- Auth: NextAuth (Credentials) + роли `admin/editor`
- Редактор: TipTap (сохранение HTML)
- Uploads: локально в `public/uploads`, в production рекомендуется `Supabase Storage`
- SEO: metadata, OpenGraph, Twitter cards, `sitemap.xml`, `robots.txt`, `rss.xml`

## Локальный запуск (работает сразу)

Команды:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Открыть:

- Главная: `http://localhost:3000`
- Админка: `http://localhost:3000/admin`
- Логин: `http://localhost:3000/admin/login`

Тестовые учётки (seed):

- admin: `admin@local.test` / `Admin123!`
- editor: `editor@local.test` / `Editor123!`

## ENV

Смотри `.env.example`.

Минимально нужно:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

Для production-медиа на Hostinger дополнительно нужно:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` (обычно `media`, bucket должен быть public)

По умолчанию в dev используется SQLite: `DATABASE_URL="file:./dev.db"`.

## Scheduler (scheduled -> published)

Публикации со статусом `scheduled` автоматически становятся `published`, когда наступает `scheduledAt`.

Без cron: лёгкая проверка запускается при запросах к публичной части и админке (не чаще 1 раза в минуту на процесс).

## Просмотры и “популярное за 7 дней”

При открытии новости выполняется POST на `/api/views/:newsId`:

- `views` увеличивается
- создаётся событие просмотра (для “популярного за 7 дней”)
- защита от накрутки: 1 просмотр на один браузер/новость раз в ~10 минут (cookie)

## SEO endpoints

- `GET /sitemap.xml`
- `GET /robots.txt`
- `GET /rss.xml`

## Деплой (Hostinger Node.js Web App / Linux)

1. Создай сайт именно как `Node.js Apps` и выстави:
   - `Node version = 20.x`
   - `Root directory = ./`
   - `Install command = npm install`
   - `Build command = npm run build`
   - `Start command = npm start`
2. В переменных окружения укажи:
   - `DATABASE_URL` (PostgreSQL)
   - `NEXTAUTH_URL` (например `https://your-domain.tld`)
   - `NEXTAUTH_SECRET`
   - `NODE_ENV=production`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET=media`
3. Установи зависимости и собери:
   - `npm install`
   - `npm run build`
4. Запуск:
   - `npm run start`

Важно:

- Prisma schema выбирается автоматически по `DATABASE_URL`:
  - `file:...` -> SQLite (`prisma/schema.prisma`)
  - `postgres://...` -> PostgreSQL (`prisma/postgres/schema.prisma`)
- Для Hostinger с `Build command = npm run build`:
  миграции Prisma уже встроены в `build`-скрипт (`prisma generate` + `prisma migrate deploy` + `next build`), отдельная команда не нужна.
- Не коммить реальные `.env`, `.env.production` и `.env.hostinger` в GitHub. Используй только переменные окружения Hostinger и шаблон из `.env.example`.
- Для production на Hostinger не храни пользовательские загрузки в `public/uploads`: при redeploy они могут пропасть. Создай публичный bucket `media` в `Supabase Storage` и укажи `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
- Локально проект по-прежнему умеет падать обратно на файловую систему `public/uploads`, если storage env не заданы.
- Старые записи, которые уже ссылаются на `/uploads/...`, не восстановятся автоматически, если файлы уже исчезли с Hostinger. Такие изображения нужно загрузить заново через админку.