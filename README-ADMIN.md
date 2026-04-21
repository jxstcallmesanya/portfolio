# Админ-панель `/admin` (Jino/PHP)

Админка работает через PHP-эндпоинты в папке `api/`.

Откройте:

`https://jxstcallmesanya.site/admin/`

## Настройка пароля

Файл: `api/config.php`

```php
return [
    'admin_password' => 'YOUR_STRONG_PASSWORD'
];
```

## Что важно на хостинге

- Веб-сервер: у домена должен быть выбран PHP-интерпретатор (8.1+).
- Права на запись: `gallery.json`, `img/auto/`, `img/people/`, `img/thumbs/auto/`, `img/thumbs/people/`, `api/data/`.
- В корне должен быть `.htaccess` (rewrite `/api/*` -> `/api/*.php`).

## Проверка API

Откройте:

- `/api/session` или `/api/session.php`

Должен вернуться JSON (до входа `ok: false`).

## Что делает админка

- Логин/логаут с сессией и CSRF.
- Загрузка фото в `img/<section>/`.
- Генерация превью в `img/thumbs/<section>/`.
- Обновление `gallery.json` (добавление/удаление/перестановка/мета).
- Статистика визитов в `api/data/stats.json`.
