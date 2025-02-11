<?php

/**
 * Plugin Name: Focal Point Picker
 * Description: Zero-dependency custom focal point picker for your WordPress images 🎯
 * Plugin URI: https://github.com/hirasso/focal-point-picker
 * Version: 1.3.7
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

/** Exit if accessed directly */
if (!defined('ABSPATH')) {
    exit;
}

define('WPFP_PLUGIN_URI', untrailingslashit(plugin_dir_url(__FILE__)));
define('WPFP_PLUGIN_DIR', untrailingslashit(__DIR__));

/**
 * Require the autoloader
 * - vendor/autoload.php in development (composer)
 * - autoload.dist.php in production (not composer)
 */
require_once match(is_readable(__DIR__ . '/vendor/autoload.php')) {
    true => __DIR__ . '/vendor/autoload.php',
    default => __DIR__ . '/autoload.dist.php'
};

/**
 * Initialize the Admin Functionality
 */
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
