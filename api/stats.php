<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

api_method('GET');
api_require_auth();

$stats = api_read_stats();
$tz = new DateTimeZone('Europe/Moscow');
$days = [];
for ($i = 29; $i >= 0; $i--) {
    $dt = new DateTime('now', $tz);
    $dt->modify("-{$i} day");
    $k = $dt->format('Y-m-d');
    $days[] = [
        'date' => $k,
        'count' => (int) ($stats[$k] ?? 0)
    ];
}

api_json([
    'ok' => true,
    'kvConfigured' => false,
    'days' => $days,
    'hint' => null
]);
