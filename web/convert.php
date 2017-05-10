<?php
/*
 Copyright © 2014 Simon Leblanc <contact@leblanc-simon.eu>
 This work is free. You can redistribute it and/or modify it under the
 terms of the Do What The Fuck You Want To Public License, Version 2,
 as published by Sam Hocevar. See http://www.wtfpl.net/ for more details.
 */

require_once dirname(__DIR__).'/vendor/autoload.php';

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

$parsedown = new ParsedownCheckbox();
echo $parsedown->text($source);

