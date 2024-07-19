<?php
/*
 * Copyright (c) Rasso Hilber
 * https://rassohilber.com
 */

namespace FocalPointPicker;

use WP_Post;

class FocalPointPicker
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
        wp_enqueue_style('focal-point-picker-css', self::assetUri('/focal-point-picker.css'), [], null);
        wp_enqueue_script('focal-point-picker-js', self::assetUri('/focal-point-picker.js'), ['jquery', 'jquery-ui-draggable'], null, true);
    }

    /**
     * Helper function to get versioned asset urls
     */
    private static function assetUri(string $path): string
    {
        $uri = WPFP_PLUGIN_URI . '/' . ltrim($path, '/');
        $file = WPFP_PLUGIN_DIR . '/' . ltrim($path, '/');

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
        $focalPoint = new FocalPoint($post);

        ob_start() ?>

        <focal-point-picker>
            <div data-focalpoint-input-wrap>
                <input data-focalpoint-input type='text' readonly value="<?= $focalPoint->left ?> <?= $focalPoint->top ?>" id='focalpoint-input' name='attachments[<?= $post->ID ?>][focalpoint]'>
                <button data-focalpoint-reset disabled type="button" class="button-primary">Reset</button>
            </div>

            <div data-focalpoint-preview aria-hidden="true">
                <div data-portrait></div>
                <div data-landscape></div>
            </div>
            <button data-focalpoint-handle aria-hidden="true" tabindex="-1" type="button" title="Drag to change. Double-click to reset."></button>
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
     * e.g. ['left' => 0.5, 'top' => 0.5]
     */
    public static function getFocalPoint(WP_Post|int $post): FocalPoint {
        return new FocalPoint($post);
    }
}
