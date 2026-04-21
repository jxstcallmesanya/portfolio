<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

api_method('POST');
api_start_session();

$cfg = api_config();
$body = api_read_json_body();
$password = (string) ($body['password'] ?? '');

$expected = (string) ($cfg['admin_password'] ?? '');
if ($expected === '' || $expected === 'CHANGE_ME_STRONG_PASSWORD') {
    api_json(['ok' => false, 'error' => 'Настройте api/config.php (admin_password)'], 500);
}

if (!hash_equals($expected, $password)) {
    api_json(['ok' => false, 'error' => 'Неверный пароль'], 401);
}

$_SESSION['admin_ok'] = true;
$csrf = api_csrf_token();
api_json(['ok' => true, 'csrfToken' => $csrf]);
