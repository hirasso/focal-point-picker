<?php
/*
 * Copyright (c) Rasso Hilber
 * https://rassohilber.com
 */

namespace Hirasso\FocalPointPicker;

use WP_Post;

class FocalPointPicker
{
    public static function init()
    {
        add_filter('attachment_fields_to_edit', [self::class, 'attachmentFieldsToEdit'], 10, 2);
        add_action('attachment_fields_to_save', [self::class, 'attachmentFieldsToSave'], 10, 2);
        add_filter('wp_get_attachment_image_attributes', [self::class, 'wp_get_attachment_image_attributes'], 10, 2);
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
        WP_Post $post
    ): array {
        if (!wp_attachment_is_image($post)) {
            return $fields;
        }
        $focalPoint = new FocalPoint($post);

        ob_start() ?>

        <focal-point-picker>
            <div data-focalpoint-input-wrap>
                <input data-focalpoint-input type='text' readonly value="<?php esc_attr_e($focalPoint->left) ?> <?php esc_attr_e($focalPoint->top) ?>" id='focalpoint-input' name='attachments[<?php esc_attr_e($post->ID) ?>][focalpoint]'>
                <button data-focalpoint-reset disabled type="button" class="button-primary">Reset</button>
            </div>

            <div data-focalpoint-preview aria-hidden="true">
                <div data-portrait></div>
                <div data-landscape></div>
            </div>
            <button data-focalpoint-handle aria-hidden="true" tabindex="-1" type="button" title="Drag to change. Double-click to reset."></button>
        </focal-point-picker>

<?php $html = ob_get_clean();

        $fields['focalpoint-input'] = [
            'label' => __('Focal Point'),
            'input'  => 'html',
            'html' => $html,
        ];

        return $fields;
    }

    /**
     * Save the focal point
     */
    public static function attachmentFieldsToSave(
        array $post,
        array $attachmentData
    ) {
        $id = $post['ID'] ?? '';
        check_ajax_referer('update-post_' . $id, 'nonce');

        if (!wp_attachment_is_image($id)) {
            return $post;
        }

        $focalPoint = array_map(
            'trim',
            explode(' ', $attachmentData['focalpoint'] ?? '')
        );

        /** Validation: Array of two? */
        if (count($focalPoint) !== 2) {
            return $post;
        }

        /** Validation: All numeric? */
        foreach ($focalPoint as $value) {
            if (!is_numeric($value)) {
                return $post;
            }
        }

        [$left, $top] = array_map('floatval', $focalPoint);

        $post = array_replace_recursive(
            $post,
            [
                'meta_input' => [
                    'focalpoint' => [
                        'left' => $left,
                        'top' => $top,
                    ],
                ],
            ]
        );

        return $post;
    }

    /**
     * Add the focal point to the image attributes in WordPress image functions
     */
    public static function wp_get_attachment_image_attributes(
        array $atts,
        WP_Post $attachment
    ): array {
        $focalPoint = new FocalPoint($attachment);

        $atts['class'] ??= '';
        if (!str_contains($atts['class'], "focal-point-image")) {
            $atts['class'] .= " focal-point-image";
        }

        $atts['style'] = "--focal-point-left: {$focalPoint->left}; --focal-point-top: {$focalPoint->top}";

        return $atts;
    }
}
