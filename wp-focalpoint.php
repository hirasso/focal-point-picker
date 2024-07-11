<?php

/**
 * Plugin Name: WP FocalPoint
 * Description: Set a custom focal point on every image, directly in the WP media grid
 * Version: 1.2.0
 * Author: Rasso Hilber
 * Author URI: https://rassohilber.com/
 * Tested up to: 6.7
 * Requires PHP: 8.2
 * License: GPLv3 or later
 * License URI: http://www.gnu.org/licenses/gpl-3.0.html
 * GitHub Plugin URI: hirasso/wp-focalpoint
 */

namespace RH\WPFocalPoint;

use WP_Post;

if (!defined('ABSPATH')) exit; // Exit if accessed directly

define('WPFP_PLUGIN_DIR', __DIR__);

class WPFocalPoint
{
    public static function init()
    {
        add_filter('attachment_fields_to_edit', [self::class, 'attachmentFieldsToEdit'], 10, 2);
        add_action('edit_attachment', [self::class, 'saveAttachment']);
        add_filter('wp_get_attachment_image_attributes', [self::class, 'filterAttachmentImageAttributes'], 10, 2);
        add_action('admin_enqueue_scripts', [self::class, 'enqueueAssets']);
    }

    /**
     * Enqueue assets
     */
    public static function enqueueAssets(): void
    {
        wp_enqueue_style('wp-focalpoint-css', self::assetUri('/wp-focalpoint.css'), [], null);
        wp_enqueue_script('wp-focalpoint-js', self::assetUri('/wp-focalpoint.js'), ['jquery', 'jquery-ui-draggable'], null, true);
    }

    /**
     * Helper function to get versioned asset urls
     */
    private static function assetUri(string $path): string
    {
        $uri = trailingslashit(plugin_dir_url(__FILE__)) . trim($path, '/');
        $file = WPFP_PLUGIN_DIR . ltrim($path, '/');

        if (file_exists($file)) {
            $version = filemtime($file);
            $uri .= "?v=$version";
        }
        return $uri;
    }

    /**
     * Render the focal point picker field.
     * Uses custom elements for simple self-initialization
     */
    public static function attachmentFieldsToEdit(
        array $fields,
        \WP_Post $post
    ): array {
        if (!wp_attachment_is_image($post)) {
            return $fields;
        }
        $focalPoint = self::getFocalPoint($post);

        ob_start() ?>

        <focal-point-picker>
            <input type='text' readonly value="<?= $focalPoint['left'] ?> <?= $focalPoint['top'] ?>" id='focalpoint-input' name='attachments[<?= $post->ID ?>][focalpoint]'>
            <div data-focalpoint-preview aria-hidden="true">
                <div data-landscape></div>
                <div data-portrait></div>
            </div>
            <button data-focal-point-handle aria-hidden="true" tabindex="-1" type="button" title="Drag to change. Double-click to reset."></button>
        </focal-point-picker>

<?php $html = ob_get_clean();

        $fields['focalpoint-input'] = array(
            'label' => __('Focal Point'),
            'helps' => __(''),
            'input'  => 'html',
            'html' => $html
        );

        return $fields;
    }

    /**
     * Save the focal point
     */
    public static function saveAttachment(int $attachment_id)
    {
        $value = trim($_REQUEST['attachments'][$attachment_id]['focalpoint'] ?? '');
        if (empty($value)) return;

        [$left, $top] = array_map('floatval', explode(' ', $value));

        update_post_meta($attachment_id, 'focalpoint', compact('left', 'top'));
    }

    /**
     * Add the focal point to the image attributes in WordPress image functions
     */
    public static function filterAttachmentImageAttributes(array $atts, \WP_Post $attachment): array
    {
        $focalPoint = get_post_meta($attachment->ID, 'focalpoint', true);

        if (!is_array($focalPoint)) {
            return $atts;
        }

        if (empty($focalPoint['left']) || empty($focalPoint['top'])) {
            return $atts;
        }

        $atts['style'] = "object-position: {$focalPoint['left']}% {$focalPoint['top']}%";
        return $atts;
    }

    /**
     * Get the focal point of an image.
     * e.g. ['left' => 50, 'top' => 50]
     */
    public static function getFocalPoint(WP_Post $post): array
    {
        $value = get_post_meta($post->ID, 'focalpoint', true);

        $left = $value['left'] ?? null;
        $top = $value['top'] ?? null;

        $value = [
            'left' => 50,
            'top' => 50
        ];

        if ($left) $value['left'] = floatval($left);
        if ($top) $value['top'] = floatval($top);

        return $value;
    }
}

WPFocalPoint::init();
