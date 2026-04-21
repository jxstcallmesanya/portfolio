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
$mime = (string) (@mime_content_type($tmp) ?: '');
$mime = strtolower($mime);
$allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
if (!in_array($mime, $allowed, true)) {
    api_json(['ok' => false, 'error' => 'Допустимы только JPG, PNG, WebP, GIF'], 400);
}

$ext = api_upload_ext_from_mime($mime);
$base = time() . '-' . bin2hex(random_bytes(4));
$fullRel = "img/{$section}/{$base}.{$ext}";
$thumbRel = "img/thumbs/{$section}/{$base}-thumb.webp";
$fullAbs = api_rel_to_abs($fullRel);
$thumbAbs = api_rel_to_abs($thumbRel);

@mkdir(dirname($fullAbs), 0775, true);
@mkdir(dirname($thumbAbs), 0775, true);

if (!@move_uploaded_file($tmp, $fullAbs)) {
    api_json(['ok' => false, 'error' => 'Не удалось сохранить файл на сервер'], 500);
}

$srcIm = api_image_from_file($fullAbs, $mime);
$thumbOk = false;
if ($srcIm !== false) {
    $thumbOk = api_save_thumb($srcIm, $thumbAbs);
    imagedestroy($srcIm);
}
if (!$thumbOk) {
    @copy($fullAbs, $thumbAbs);
}

$skipGallery = in_array((string) ($_POST['skipGallery'] ?? ''), ['1', 'true', 'yes'], true);
if (!$skipGallery) {
    $gallery = api_read_gallery();
    array_unshift($gallery[$section], [
        'full' => $fullRel,
        'thumb' => $thumbRel
    ]);
    api_write_gallery($gallery);
}

api_json([
    'ok' => true,
    'path' => $fullRel,
    'thumbPath' => $thumbRel
]);
