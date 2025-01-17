<?php

declare(strict_types=1);

namespace Hirasso\FocalPointPicker;

/**
 * A custom Autoloader to replace composer's during distribution.
 * Otherwise, we would need to commit the vendor folder to git to
 * be able to install the plugin without composer.
 */

spl_autoload_register(function (string $class): void {
    /** Base namespace and directory mapping */
    $prefix = __NAMESPACE__;
    $baseDir = __DIR__ . '/src/';

    /** Check if the class uses the namespace prefix */
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    /** Get the relative class name (minus the prefix) */
    $relativeClass = substr($class, strlen($prefix));

    /**
     * Replace namespace separators with directory separators and append '.php'
     * NOT using DIRECTORY_SEPARATOR as PHP normalized the path internally (for e.g. Windows)
     * DIRECTORY_SEPARATOR is meant for interacting with other tools outside of PHP.
     */
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    /** If the file exists, require it */
    if (is_file($file)) {
        require_once $file;
    }
});
