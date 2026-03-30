<?php
$dir = 'img/projects/';
$folders = array_filter(glob($dir . '*'), 'is_dir');
$result = [];
foreach ($folders as $folder) {
    $result[] = basename($folder);
}
echo json_encode($result);
?>