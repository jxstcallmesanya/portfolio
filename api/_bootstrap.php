<?php
declare(strict_types=1);

function api_config(): array {
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    $path = __DIR__ . '/config.php';
    if (!is_file($path)) {
        $examplePath = __DIR__ . '/config.example.php';
        if (is_file($examplePath)) {
            $cfg = require $examplePath;
            return is_array($cfg) ? $cfg : [];
        }
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => false, 'error' => 'Missing api/config.php (copy api/config.example.php)']);
        exit;
    }
    $cfg = require $path;
    return is_array($cfg) ? $cfg : [];
}

function api_root(): string {
    return dirname(__DIR__);
}

function api_json($payload, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function api_method(string $method): void {
    if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== strtoupper($method)) {
        header('Allow: ' . strtoupper($method));
        api_json(['ok' => false, 'error' => 'Method not allowed'], 405);
    }
}

function api_start_session(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => 7 * 86400,
            'path' => '/',
            'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        session_start();
    }
}

function api_csrf_token(): string {
    api_start_session();
    if (empty($_SESSION['admin_csrf'])) {
        $_SESSION['admin_csrf'] = bin2hex(random_bytes(16));
    }
    setcookie('admin_csrf', $_SESSION['admin_csrf'], [
        'expires' => time() + 7 * 86400,
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => false,
        'samesite' => 'Lax'
    ]);
    return (string) $_SESSION['admin_csrf'];
}

function api_require_auth(): void {
    api_start_session();
    if (empty($_SESSION['admin_ok']) || $_SESSION['admin_ok'] !== true) {
        api_json(['ok' => false, 'error' => 'Нужен вход'], 401);
    }
}

function api_require_csrf(): void {
    api_start_session();
    $hdr = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $sess = $_SESSION['admin_csrf'] ?? '';
    if (!$hdr || !$sess || !hash_equals((string) $sess, (string) $hdr)) {
        api_json(['ok' => false, 'error' => 'CSRF check failed'], 403);
    }
}

function api_read_json_body(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function api_gallery_path(): string {
    return api_root() . '/gallery.json';
}

function api_read_gallery(): array {
    $path = api_gallery_path();
    if (!is_file($path)) {
        return ['auto' => [], 'people' => [], 'autoVideos' => [], 'peopleVideos' => []];
    }
    $raw = file_get_contents($path);
    $json = json_decode((string) $raw, true);
    if (!is_array($json)) return ['auto' => [], 'people' => [], 'autoVideos' => [], 'peopleVideos' => []];
    $json['auto'] = array_values(is_array($json['auto'] ?? null) ? $json['auto'] : []);
    $json['people'] = array_values(is_array($json['people'] ?? null) ? $json['people'] : []);
    $json['autoVideos'] = array_values(is_array($json['autoVideos'] ?? null) ? $json['autoVideos'] : []);
    $json['peopleVideos'] = array_values(is_array($json['peopleVideos'] ?? null) ? $json['peopleVideos'] : []);
    return $json;
}

function api_write_gallery(array $gallery): void {
    $path = api_gallery_path();
    $tmp = $path . '.tmp';
    $payload = json_encode($gallery, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($payload === false) api_json(['ok' => false, 'error' => 'Не удалось сериализовать gallery.json'], 500);
    if (file_put_contents($tmp, $payload . PHP_EOL, LOCK_EX) === false) {
        api_json(['ok' => false, 'error' => 'Не удалось записать временный gallery.json'], 500);
    }
    if (!@rename($tmp, $path)) {
        @unlink($tmp);
        api_json(['ok' => false, 'error' => 'Не удалось сохранить gallery.json'], 500);
    }
}

function api_sanitize_meta($value, int $maxLen): string {
    $s = trim((string) $value);
    if ($s === '') return '';
    if (mb_strlen($s) > $maxLen) {
        $s = mb_substr($s, 0, $maxLen);
    }
    return $s;
}

function api_rel_to_abs(string $rel): string {
    $clean = ltrim(str_replace('\\', '/', $rel), '/');
    return api_root() . '/' . $clean;
}

function api_delete_file_if_exists(string $rel): void {
    if ($rel === '') return;
    $path = api_rel_to_abs($rel);
    if (is_file($path)) {
        @unlink($path);
    }
}

function api_entry_files($entry): array {
    $paths = [];
    if (is_array($entry) && isset($entry['cover']) && is_array($entry['cover'])) {
        $cover = $entry['cover'];
        if (!empty($cover['full'])) $paths[] = (string) $cover['full'];
        if (!empty($cover['thumb'])) $paths[] = (string) $cover['thumb'];
        $items = is_array($entry['items'] ?? null) ? $entry['items'] : [];
        foreach ($items as $it) {
            if (!is_array($it)) continue;
            if (!empty($it['full'])) $paths[] = (string) $it['full'];
            if (!empty($it['thumb'])) $paths[] = (string) $it['thumb'];
        }
    } elseif (is_array($entry)) {
        if (!empty($entry['full'])) $paths[] = (string) $entry['full'];
        if (!empty($entry['thumb'])) $paths[] = (string) $entry['thumb'];
        if (!empty($entry['src'])) $paths[] = (string) $entry['src'];
        if (!empty($entry['poster'])) $paths[] = (string) $entry['poster'];
    } elseif (is_string($entry) && $entry !== '') {
        $paths[] = $entry;
    }
    return array_values(array_unique($paths));
}

function api_stats_path(): string {
    return __DIR__ . '/data/stats.json';
}

function api_read_stats(): array {
    $path = api_stats_path();
    if (!is_file($path)) return [];
    $raw = file_get_contents($path);
    $json = json_decode((string) $raw, true);
    return is_array($json) ? $json : [];
}

function api_write_stats(array $stats): void {
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    $payload = json_encode($stats, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($payload === false) return;
    file_put_contents(api_stats_path(), $payload . PHP_EOL, LOCK_EX);
}

function api_today_key_msk(): string {
    $dt = new DateTime('now', new DateTimeZone('Europe/Moscow'));
    return $dt->format('Y-m-d');
}

function api_is_bot(string $ua): bool {
    if ($ua === '') return false;
    return (bool) preg_match('/bot|crawl|spider|slurp|facebookexternalhit|preview/i', $ua);
}

function api_upload_ext_from_mime(string $mime): string {
    return match ($mime) {
        'image/jpeg', 'image/jpg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        default => 'bin'
    };
}

function api_image_from_file(string $tmp, string $mime) {
    return match ($mime) {
        'image/jpeg', 'image/jpg' => @imagecreatefromjpeg($tmp),
        'image/png' => @imagecreatefrompng($tmp),
        'image/gif' => @imagecreatefromgif($tmp),
        'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($tmp) : false,
        default => false
    };
}

function api_save_thumb($srcIm, string $thumbAbs): bool {
    $w = imagesx($srcIm);
    $h = imagesy($srcIm);
    if ($w < 1 || $h < 1) return false;
    $max = 640;
    $ratio = min($max / $w, $max / $h, 1);
    $tw = max(1, (int) floor($w * $ratio));
    $th = max(1, (int) floor($h * $ratio));
    $thumb = imagecreatetruecolor($tw, $th);
    if (!$thumb) return false;
    imagealphablending($thumb, false);
    imagesavealpha($thumb, true);
    imagecopyresampled($thumb, $srcIm, 0, 0, 0, 0, $tw, $th, $w, $h);
    $ok = false;
    if (function_exists('imagewebp')) {
        $ok = imagewebp($thumb, $thumbAbs, 68);
    }
    if (!$ok) {
        $ok = imagejpeg($thumb, $thumbAbs, 80);
    }
    imagedestroy($thumb);
    return (bool) $ok;
}
