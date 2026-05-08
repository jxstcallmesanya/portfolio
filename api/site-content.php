<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? '');
$path = api_root() . '/site-content.json';

if ($method === 'GET') {
    api_require_auth();
    if (!is_file($path)) {
        api_json(['ok' => false, 'error' => 'site-content.json not found'], 404);
    }
    $raw = file_get_contents($path);
    $json = json_decode((string) $raw, true);
    if (!is_array($json)) {
        api_json(['ok' => false, 'error' => 'Некорректный site-content.json'], 500);
    }
    api_json(['ok' => true, 'content' => $json]);
}

if ($method === 'POST') {
    api_require_auth();
    api_require_csrf();
    $body = api_read_json_body();
    $content = $body['content'] ?? null;
    if (!is_array($content)) {
        api_json(['ok' => false, 'error' => 'Некорректный payload'], 400);
    }

    $allowedKeys = [
        'heroKicker', 'heroText', 'heroCtaText', 'heroCtaUrl',
        'aboutTag', 'aboutTitleHtml', 'aboutSpecs', 'aboutBio', 'aboutItem1', 'aboutItem2',
        'contactTitle', 'contactTelegramUrl', 'contactVkUrl', 'contactEmailUrl'
    ];
    $clean = [];
    foreach ($allowedKeys as $key) {
        $val = $content[$key] ?? '';
        $clean[$key] = trim((string) $val);
    }

    $tmp = $path . '.tmp';
    $payload = json_encode($clean, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($payload === false) {
        api_json(['ok' => false, 'error' => 'Не удалось сериализовать контент'], 500);
    }
    if (file_put_contents($tmp, $payload . PHP_EOL, LOCK_EX) === false) {
        api_json(['ok' => false, 'error' => 'Не удалось записать временный файл'], 500);
    }
    if (!@rename($tmp, $path)) {
        @unlink($tmp);
        api_json(['ok' => false, 'error' => 'Не удалось сохранить site-content.json'], 500);
    }

    api_json(['ok' => true]);
}

header('Allow: GET, POST');
api_json(['ok' => false, 'error' => 'Method not allowed'], 405);
