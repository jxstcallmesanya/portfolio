<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

api_method('POST');
api_require_auth();
api_require_csrf();

$body = api_read_json_body();
$action = (string) ($body['action'] ?? '');
$section = (string) ($body['section'] ?? '');
if ($section !== 'auto' && $section !== 'people') {
    api_json(['ok' => false, 'error' => 'Неверный раздел'], 400);
}

$gallery = api_read_gallery();
$entries = array_values(is_array($gallery[$section] ?? null) ? $gallery[$section] : []);

if ($action === 'delete') {
    $index = (int) ($body['index'] ?? -1);
    if (!isset($entries[$index])) api_json(['ok' => false, 'error' => 'Индекс вне диапазона'], 400);
    $deleteFiles = ($body['deleteFiles'] ?? true) !== false;
    $removed = $entries[$index];
    array_splice($entries, $index, 1);
    $gallery[$section] = array_values($entries);
    api_write_gallery($gallery);
    if ($deleteFiles) {
        foreach (api_entry_files($removed) as $p) api_delete_file_if_exists($p);
    }
    api_json(['ok' => true]);
}

if ($action === 'deleteMany') {
    $indices = $body['indices'] ?? [];
    if (!is_array($indices)) $indices = [];
    $indices = array_values(array_unique(array_map('intval', $indices)));
    rsort($indices, SORT_NUMERIC);
    $deleteFiles = ($body['deleteFiles'] ?? true) !== false;
    $removed = [];
    foreach ($indices as $idx) {
        if (!isset($entries[$idx])) continue;
        $removed[] = $entries[$idx];
        array_splice($entries, $idx, 1);
    }
    $gallery[$section] = array_values($entries);
    api_write_gallery($gallery);
    if ($deleteFiles) {
        foreach ($removed as $entry) {
            foreach (api_entry_files($entry) as $p) api_delete_file_if_exists($p);
        }
    }
    api_json(['ok' => true]);
}

if ($action === 'clearSection') {
    $deleteFiles = ($body['deleteFiles'] ?? true) !== false;
    $removed = $entries;
    $gallery[$section] = [];
    api_write_gallery($gallery);
    if ($deleteFiles) {
        foreach ($removed as $entry) {
            foreach (api_entry_files($entry) as $p) api_delete_file_if_exists($p);
        }
    }
    api_json(['ok' => true]);
}

if ($action === 'reorder') {
    $order = $body['order'] ?? [];
    if (!is_array($order)) api_json(['ok' => false, 'error' => 'Некорректный порядок'], 400);
    $used = [];
    $next = [];
    foreach ($order as $idxRaw) {
        $idx = (int) $idxRaw;
        if (!isset($entries[$idx])) continue;
        if (isset($used[$idx])) continue;
        $used[$idx] = true;
        $next[] = $entries[$idx];
    }
    if (count($next) !== count($entries)) {
        api_json(['ok' => false, 'error' => 'Неверный список порядка'], 400);
    }
    $gallery[$section] = $next;
    api_write_gallery($gallery);
    api_json(['ok' => true]);
}

if ($action === 'updateMeta') {
    $index = (int) ($body['index'] ?? -1);
    if (!isset($entries[$index])) api_json(['ok' => false, 'error' => 'Индекс вне диапазона'], 400);
    if (!is_array($entries[$index])) $entries[$index] = [];
    $title = api_sanitize_meta($body['title'] ?? '', 200);
    $desc = api_sanitize_meta($body['description'] ?? '', 2000);
    if ($title === '') unset($entries[$index]['title']);
    else $entries[$index]['title'] = $title;
    if ($desc === '') unset($entries[$index]['description']);
    else $entries[$index]['description'] = $desc;
    $gallery[$section] = $entries;
    api_write_gallery($gallery);
    api_json(['ok' => true]);
}

api_json(['ok' => false, 'error' => 'Неизвестное действие'], 400);
