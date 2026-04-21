<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

api_method('GET');
api_require_auth();

$gallery = api_read_gallery();
api_json(['ok' => true, 'gallery' => $gallery]);
