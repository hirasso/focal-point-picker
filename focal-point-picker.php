<?php

/**
 * Plugin Name: Focal Point Picker
 * Description: Zero-dependency custom focal point picker for your WordPress images 🎯
 * Plugin URI: https://github.com/hirasso/focal-point-picker
 * Version: 1.3.4
 * Author: Rasso Hilber
 * Author URI: https://rassohilber.com/
 * Tested up to: 6.7
 * Requires PHP: 8.2
 * License: GPL-3.0-or-later
 * License URI: http://www.gnu.org/licenses/gpl-3.0.html
 * GitHub Plugin URI: hirasso/focal-point-picker
 */

use Hirasso\FocalPointPicker\FocalPointPicker;
use Hirasso\FocalPointPicker\FocalPoint;

if (!defined('ABSPATH')) {
    exit;
} // Exit if accessed directly

define('WPFP_PLUGIN_URI', untrailingslashit(plugin_dir_url(__FILE__)));
define('WPFP_PLUGIN_DIR', untrailingslashit(__DIR__));

/**
 * Get all files in a directory, recoursively
 */
function fcpGetAllFiles(
    string $directory,
    ?string $extension = null
): array {

    $results = [];

    // Loop through the items, recoursively
    foreach (glob(untrailingslashit($directory) . '/*') as $dirOrFile) {
        if (is_dir($dirOrFile)) {
            $results = array_merge($results, fcpGetAllFiles($dirOrFile, $extension));
        } elseif (!$extension || pathinfo($dirOrFile, PATHINFO_EXTENSION) === $extension) {

            $results[] = $dirOrFile;
        }
    }

    return $results;
}

/**
 * Require all files in ./src
 * Using this instead of composer so that the plugin can also be installed without composer
 */
foreach (fcpGetAllFiles(__DIR__ . '/src') as $file) {
    require_once $file;
}

// if (is_readable(__DIR__ . '/vendor/autoload.php')) {
//     require_once __DIR__ . '/vendor/autoload.php';
// }

FocalPointPicker::init();

/**
 * Helper function to retrieve a focal point for an image
 */
if (!function_exists('fcp_get_focalpoint')) {
    function fcp_get_focalpoint(WP_Post|int $post)
    {
        return new FocalPoint($post);
    }
}
