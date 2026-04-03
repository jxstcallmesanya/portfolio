# Админ-панель `/admin`

После деплоя на **Vercel** откройте:

`https://ваш-сайт.vercel.app/admin`

## Переменные окружения (Vercel → Project → Settings → Environment Variables)

| Переменная | Обязательно | Описание |
|------------|-------------|----------|
| `ADMIN_PASSWORD` | да | Пароль для входа в форму |
| `SESSION_SECRET` | да | Длинная случайная строка (например 32+ символа), для подписи cookie |
| `GITHUB_TOKEN` | да | GitHub PAT с правом **Contents: Read and write** на репозиторий портфолио |
| `GITHUB_OWNER` | нет | По умолчанию `jxstcallmesanya` |
| `GITHUB_REPO` | нет | По умолчанию `portfolio` |
| `GITHUB_BRANCH` | нет | По умолчанию `main` |

### Токен GitHub

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** (classic или fine-grained).
2. Для **classic**: scope **`repo`** (полный доступ к приватным репозиториям) или минимум на один репозиторий с записью содержимого.
3. Для **fine-grained**: Repository access → ваш репорт → Permissions → **Contents: Read and write**.
4. Вставьте токен в `GITHUB_TOKEN` на Vercel и сделайте **Redeploy**.

## Как это работает

- Вход проверяет пароль и выставляет **HttpOnly** cookie с сессией.
- Логин защищён от брутфорса: ограничение количества попыток за период по IP.
- POST-запросы (`/api/upload`, `/api/logout`) требуют CSRF-токен + проверку origin/referer.
- Загрузка отправляет файл в **Serverless Function** `/api/upload`, которая через GitHub API:
  - кладёт файл в `img/auto/` или `img/people/`;
  - дописывает путь в **`gallery.json`**.
- Vercel запускает новый деплой после пуша в репозиторий (если включена интеграция с GitHub) — обычно **1–2 минуты** до появления фото на сайте.

## Лимиты

- Размер одного файла на **Hobby** ~**4.5 МБ** (ограничение Vercel). Большие RAW/JPEG лучше сжать перед загрузкой.
- Очень длинные имена файлов заменяются на безопасное имя с timestamp.
- На сервере дополнительно проверяется сигнатура файла (magic bytes), чтобы отклонять не-изображения.

## Локальная разработка

```bash
npm install
npx vercel dev
```

Задайте те же переменные в `.env.local` (см. документацию Vercel CLI).

## Безопасность

- Не публикуйте `ADMIN_PASSWORD` и `GITHUB_TOKEN` в репозиторий.
- Пароль храните только в переменных окружения Vercel.
- При компрометации смените пароль и перевыпустите токен GitHub.
