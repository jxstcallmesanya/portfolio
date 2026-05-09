<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

api_method('POST');
api_require_auth();
api_require_csrf();

$section = (string) ($_POST['section'] ?? '');
if ($section !== 'auto' && $section !== 'people') {
    api_json(['ok' => false, 'error' => 'Неверный раздел'], 400);
}

if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
    api_json(['ok' => false, 'error' => 'Файл не получен'], 400);
}
$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    api_json(['ok' => false, 'error' => 'Ошибка загрузки файла'], 400);
}

$tmp = (string) $file['tmp_name'];
$mime = strtolower((string) (@mime_content_type($tmp) ?: ''));
$allowed = [
    'video/mp4' => 'mp4',
    'video/webm' => 'webm',
    'video/quicktime' => 'mov'
];
if (!isset($allowed[$mime])) {
    api_json(['ok' => false, 'error' => 'Допустимы только MP4, WebM, MOV'], 400);
}

$ext = $allowed[$mime];
$base = time() . '-' . bin2hex(random_bytes(4));
$videoRel = "img/videos/{$section}/{$base}.{$ext}";
$videoAbs = api_rel_to_abs($videoRel);
@mkdir(dirname($videoAbs), 0775, true);

if (!@move_uploaded_file($tmp, $videoAbs)) {
    api_json(['ok' => false, 'error' => 'Не удалось сохранить видео на сервер'], 500);
}

$title = api_sanitize_meta($_POST['title'] ?? '', 200);
$description = api_sanitize_meta($_POST['description'] ?? '', 2000);

$entry = ['src' => $videoRel];
if ($title !== '') $entry['title'] = $title;
if ($description !== '') $entry['description'] = $description;

$gallery = api_read_gallery();
$key = $section === 'auto' ? 'autoVideos' : 'peopleVideos';
array_unshift($gallery[$key], $entry);
api_write_gallery($gallery);

api_json(['ok' => true, 'path' => $videoRel]);
