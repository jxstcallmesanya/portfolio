# Админка на Jino (PHP)

Этот проект переведён на PHP API в `api/*.php`, совместимый с текущим `admin/admin.js`.

## 1) Что загрузить на хостинг

Загрузите/обновите файлы:

- `.htaccess` (в корне сайта)
- `admin/admin.js`
- `api/_bootstrap.php`
- `api/config.php`
- `api/login.php`
- `api/session.php`
- `api/logout.php`
- `api/gallery.php`
- `api/gallery-mutate.php`
- `api/gallery-commit-series.php`
- `api/upload.php`
- `api/track.php`
- `api/stats.php`

## 2) Обязательная настройка пароля

Откройте `api/config.php` и замените:

```php
'admin_password' => 'CHANGE_ME_STRONG_PASSWORD'
```

на ваш реальный пароль для входа в `/admin/`.

## 3) Права на запись

Хостингу нужны права записи для:

- `gallery.json`
- `img/auto/`
- `img/people/`
- `img/thumbs/auto/`
- `img/thumbs/people/`
- `api/data/` (создастся автоматически для статистики)

Если загрузка/изменения не работают, выставьте для этих путей запись для пользователя веб-сервера.

## 4) Проверка API

После загрузки откройте:

- `/api/session` -> должен вернуть JSON `{"ok":false,...}` до логина
- `/admin/` -> вход с паролем из `api/config.php`

## 5) Важно

- Старые `api/*.js` файлы больше не используются на Jino.
- URL API остаются прежними (`/api/login`, `/api/upload`, ...), поэтому фронтенд менять не нужно.
