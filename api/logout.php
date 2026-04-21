<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

api_method('POST');
api_require_auth();
api_require_csrf();

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 3600, $params['path'], $params['domain'] ?? '', !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', true);
}
session_destroy();
setcookie('admin_csrf', '', time() - 3600, '/');

api_json(['ok' => true]);
