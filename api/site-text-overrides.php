<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? '');
$path = api_root() . '/site-text-overrides.json';

if ($method === 'GET') {
    api_require_auth();
    if (!is_file($path)) {
        api_json(['ok' => true, 'overrides' => []]);
    }
    $raw = file_get_contents($path);
    $json = json_decode((string) $raw, true);
    if (!is_array($json)) {
        api_json(['ok' => false, 'error' => 'Некорректный site-text-overrides.json'], 500);
    }
    api_json(['ok' => true, 'overrides' => $json]);
}

if ($method === 'POST') {
    api_require_auth();
    api_require_csrf();
    $body = api_read_json_body();
    $overrides = $body['overrides'] ?? null;
    if (!is_array($overrides)) {
        api_json(['ok' => false, 'error' => 'Некорректный payload'], 400);
    }

    $allowedPages = ['home', 'auto', 'people', 'shooting'];
    $clean = [];
    foreach ($allowedPages as $page) {
        $clean[$page] = [];
        $pageData = $overrides[$page] ?? [];
        if (!is_array($pageData)) continue;
        foreach ($pageData as $selector => $value) {
            $selectorKey = trim((string) $selector);
            if ($selectorKey === '') continue;
            $clean[$page][$selectorKey] = trim((string) $value);
        }
    }

    $tmp = $path . '.tmp';
    $payload = json_encode($clean, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($payload === false) {
        api_json(['ok' => false, 'error' => 'Не удалось сериализовать overrides'], 500);
    }
    if (file_put_contents($tmp, $payload . PHP_EOL, LOCK_EX) === false) {
        api_json(['ok' => false, 'error' => 'Не удалось записать временный файл'], 500);
    }
    if (!@rename($tmp, $path)) {
        @unlink($tmp);
        api_json(['ok' => false, 'error' => 'Не удалось сохранить site-text-overrides.json'], 500);
    }

    api_json(['ok' => true]);
}

header('Allow: GET, POST');
api_json(['ok' => false, 'error' => 'Method not allowed'], 405);
