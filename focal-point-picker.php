<?php

/**
 * Plugin Name: focal-point-picker
 * Description: Set a custom focal point for your images, directly in the WP media grid
 * Version: 1.2.1
 * Author: Rasso Hilber
 * Author URI: https://rassohilber.com/
 * Tested up to: 6.7
 * Requires PHP: 8.2
 * License: GPLv3 or later
 * License URI: http://www.gnu.org/licenses/gpl-3.0.html
 * GitHub Plugin URI: hirasso/focal-point-picker
 */

use FocalPointPicker\FocalPointPicker;
use FocalPointPicker\FocalPoint;

if (!defined('ABSPATH')) {
    exit;
} // Exit if accessed directly

define('WPFP_PLUGIN_URI', untrailingslashit(plugin_dir_url(__FILE__)));
define('WPFP_PLUGIN_DIR', untrailingslashit(__DIR__));

require_once dirname(__FILE__) . '/vendor/autoload.php';

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
