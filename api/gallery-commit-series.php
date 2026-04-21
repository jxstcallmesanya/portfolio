<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

api_method('POST');
api_require_auth();
api_require_csrf();

$body = api_read_json_body();
$section = (string) ($body['section'] ?? '');
if ($section !== 'auto' && $section !== 'people') {
    api_json(['ok' => false, 'error' => 'Неверный раздел'], 400);
}

$cover = $body['cover'] ?? null;
$items = $body['items'] ?? [];
if (!is_array($cover) || empty($cover['full'])) {
    api_json(['ok' => false, 'error' => 'Некорректная обложка'], 400);
}
if (!is_array($items)) $items = [];

$entry = [
    'cover' => [
        'full' => (string) ($cover['full'] ?? ''),
        'thumb' => (string) ($cover['thumb'] ?? ($cover['full'] ?? ''))
    ],
    'items' => []
];
foreach ($items as $it) {
    if (!is_array($it) || empty($it['full'])) continue;
    $entry['items'][] = [
        'full' => (string) $it['full'],
        'thumb' => (string) ($it['thumb'] ?? $it['full'])
    ];
}
$title = api_sanitize_meta($body['title'] ?? '', 200);
$desc = api_sanitize_meta($body['description'] ?? '', 2000);
if ($title !== '') $entry['title'] = $title;
if ($desc !== '') $entry['description'] = $desc;

$gallery = api_read_gallery();
array_unshift($gallery[$section], $entry);
api_write_gallery($gallery);

api_json(['ok' => true]);
