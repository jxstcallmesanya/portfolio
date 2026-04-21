<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

api_method('GET');
api_start_session();

$ok = !empty($_SESSION['admin_ok']);
$csrf = $ok ? api_csrf_token() : null;

api_json([
    'ok' => $ok,
    'csrfToken' => $csrf
]);
