<?php

declare(strict_types=1);

define('CONFIG_FILENAME', __DIR__.'/../config.php');
define('SAVE_FILENAME', 'data.md');

/**
 * Send an error as response.
 *
 * @param int    $type
 * @param string $message
 */
function sendError(int $type, string $message): void
{
    switch ($type) {
        case 400:
            $header = ' 400 Bad Request';
            break;
        case 404:
            $header = ' 404 Not Found';
            break;
        case 500:
            $header = ' 500 Internal Server Error';
            break;
        default:
            die;
    }

    \header($_SERVER['SERVER_PROTOCOL'].$header, true, $type);
    echo $message."\n";
    die;
}

/**
 * Get configuration.
 *
 * @return array
 */
function getConfiguration(): array
{
    if (false === \file_exists(CONFIG_FILENAME) || false === \is_readable(CONFIG_FILENAME)) {
        sendError(500, 'Configuration file missing');
    }

    $config = include CONFIG_FILENAME;

    if (
        false === \array_key_exists('git_bin', $config)
        ||
        false === \array_key_exists('data_directory', $config)
    ) {
        sendError(500, 'Configuration file is invalid');
    }

    return $config;
}

/**
 * Send a Git command and return success or error.
 *
 * @param array  $config
 * @param string $directory
 * @param array  $arguments
 * @param string $return
 *
 * @return bool
 */
function sendGitCommand(array $config, string $directory, array $arguments, string &$return = ''): bool
{
    $descriptors = [
        1 => ['pipe', 'w'], // stdout
    ];

    $command = implode(' ', array_map('escapeshellarg', array_merge([$config['git_bin']], $arguments)));

    $process = proc_open($command, $descriptors, $pipes, $directory);
    if (false === is_resource($process)) {
        return false;
    }

    $return = stream_get_contents($pipes[1]);
    fclose($pipes[1]);

    $return_value = proc_close($process);

    return 0 === $return_value;
}

/**
 * Load a content into a revision.
 *
 * @param array  $config
 * @param string $directory
 * @param int    $revision
 *
 * @return string
 */
function load(array $config, string $directory, int $revision): string
{
    if (false === isSafeDirectoryName($directory)) {
        sendError(400, 'Bad directory name');
    }

    $directory_path = $config['data_directory'].DIRECTORY_SEPARATOR.$directory;

    if (
        false === \is_dir($directory_path)
        ||
        false === \is_file($directory_path.DIRECTORY_SEPARATOR.SAVE_FILENAME)
    ) {
        sendError(404, 'Document is missing');
    }

    $result = '';
    if (false === sendGitCommand($config, $directory_path, ['rev-list', 'HEAD', '--count'], $result)) {
        sendError(500, 'Impossible to get revision count');
    }

    $nb_revisions = (int) $result;

    if ($revision > $nb_revisions) {
        sendError(400, 'Bad revision requested');
    } elseif ($revision < 1) {
        $revision = $nb_revisions;
    }

    $result = '';
    if (false === sendGitCommand($config, $directory_path, [
            'show',
            'HEAD~'.($nb_revisions - $revision).':'.SAVE_FILENAME,
        ], $result)) {
        sendError(500, 'Impossible to get content');
    }

    return $result;
}

/**
 * Save the content in Git.
 *
 * @param array       $config
 * @param string      $content
 * @param string|null $directory
 *
 * @return array
 */
function save(array $config, string $content, ? string $directory = null): array
{
    if (null === $directory) {
        $directory = generateDirectoryName();
    }

    if (false === isSafeDirectoryName($directory)) {
        sendError(400, 'Bad directory name');
    }

    $directory_path = $config['data_directory'].DIRECTORY_SEPARATOR.$directory;

    if (
        false === \is_dir($directory_path)
        &&
        false === \mkdir($directory_path, 0755, true)
        &&
        false === \is_dir($directory_path)
    ) {
        sendError(500, 'Fail to create directory');
    }

    // Initialize Git repository if necessary
    $is_new = false;
    if (false === \is_dir($directory_path.DIRECTORY_SEPARATOR.'.git')) {
        $is_new = true;
        if (false === sendGitCommand($config, $directory_path, ['init'])) {
            sendError(500, 'Impossible to initialize Git repository');
        }
    }

    $filename = $directory_path.DIRECTORY_SEPARATOR.SAVE_FILENAME;
    if (false === \file_put_contents($filename, $content)) {
        sendError(500, 'Impossible to save file');
    }

    $to_commit = true;
    if (false === $is_new) {
        if (true === sendGitCommand($config, $directory_path, ['diff', '--exit-code'])) {
            // If command, return success : nothing to commit
            $to_commit = false;
        }
    }

    if (true === $to_commit) {
        if (false === sendGitCommand($config, $directory_path, ['add', $filename])) {
            sendError(500, 'Impossible to add file to Git');
        }

        if (false === sendGitCommand($config, $directory_path, ['commit', '-m', '~markdownConvertor commit~'])) {
            sendError(500, 'Impossible to commit revision');
        }
    }

    $result = '';
    if (false === sendGitCommand($config, $directory_path, ['rev-list', 'HEAD', '--count'], $result)) {
        sendError(500, 'Impossible to get revision count');
    }

    return [
        'directory' => $directory,
        'revision' => (int) $result,
    ];
}

/**
 * Check if the directory name is safe.
 *
 * @param string $directory
 *
 * @return bool
 */
function isSafeDirectoryName(string $directory): bool
{
    return 0 === \preg_match('/^[a-z0-9]$/i', $directory);
}

/**
 * Generate an unique directory name.
 *
 * @return string
 */
function generateDirectoryName(): string
{
    return \uniqid('', false);
}

/**
 * Get the data of a document.
 *
 * @param array $config
 * @param array $request
 *
 * @return string
 */
function getContent(array $config, array $request): string
{
    /** @var string|null $directory */
    $directory = $request['directory'] ?? null;
    $revision = (int) ($request['revision'] ?? 0);

    if (null === $directory) {
        sendError(400, 'Directory is missing');
    }

    return load($config, $directory, $revision);
}

/**
 * Save the request into a document.
 *
 * @param array $config
 * @param array $request
 *
 * @return array
 */
function setContent(array $config, array $request): array
{
    $directory = $request['directory'] ?? null;
    $content = $request['content'] ?? '';

    return save($config, $content, $directory);
}

//#######################################################
//
//                   MAIN PROGRAM
//
//#######################################################
$config = getConfiguration();

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        echo getContent($config, $_GET);
        break;
    case 'POST':
        $response = \json_encode(setContent($config, $_POST));
        \header('Content-Type: application/json');
        echo $response;
        break;
    default:
        sendError(400, '');
}
