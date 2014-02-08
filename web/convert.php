<?php

require_once dirname(__DIR__).DIRECTORY_SEPARATOR.'vendor'.DIRECTORY_SEPARATOR.'autoload.php';

if (isset($_SERVER['REQUEST_METHOD']) === false || (string)$_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('HTTP/1.0 405 Method Not Allowed');
    exit();
}

if (isset($_POST['source']) === false || is_string($_POST['source']) === false) {
    header('HTTP/1.0 400 Bad Request');
    exit();
}

$source = trim((string)$_POST['source']);

if (empty($source) === true) {
    header('HTTP/1.0 204 No Content');
    exit();
}

echo Parsedown::instance()->parse($source);