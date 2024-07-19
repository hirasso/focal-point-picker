<?php

/**
 * Plugin Name: WP FocalPoint
 * Description: Set a custom focal point for your images, directly in the WP media grid
 * Version: 1.2.1
 * Author: Rasso Hilber
 * Author URI: https://rassohilber.com/
 * Tested up to: 6.7
 * Requires PHP: 8.2
 * License: GPLv3 or later
 * License URI: http://www.gnu.org/licenses/gpl-3.0.html
 * GitHub Plugin URI: hirasso/wp-focalpoint
 */

use WPFocalPoint\WPFocalPoint;

if (!defined('ABSPATH')) exit; // Exit if accessed directly

define('WPFP_PLUGIN_URI', untrailingslashit(plugin_dir_url(__FILE__)));
define('WPFP_PLUGIN_DIR', untrailingslashit(__DIR__));

require_once dirname(__FILE__) . '/vendor/autoload.php';

WPFocalPoint::init();

/**
 * Helper function to retrieve a focal point for an image
 */
if (!function_exists('get_wp_focalpoint')) {
    function wpfp_get_focalpoint(WP_Post|int $post) {
        return WPFocalPoint::getFocalPoint(...func_get_args());
    }
}
