<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? '');
if ($method !== 'GET' && $method !== 'POST') {
    header('Allow: GET, POST');
    api_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
if (api_is_bot($ua)) {
    http_response_code(204);
    exit;
}

$stats = api_read_stats();
$key = api_today_key_msk();
$stats[$key] = (int) ($stats[$key] ?? 0) + 1;
api_write_stats($stats);

api_json(['ok' => true, 'date' => $key, 'count' => $stats[$key]]);
