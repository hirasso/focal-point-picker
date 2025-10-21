<?php

add_action('admin_init', function () {
    register_setting('media', 'fcp_default_x', ['type' => 'number', 'sanitize_callback' => 'floatval']);
    register_setting('media', 'fcp_default_y', ['type' => 'number', 'sanitize_callback' => 'floatval']);

    add_settings_section(
        'fcp_settings_section',
        'Focal Picker Default',
        null,
        'media'
    );

    add_settings_field('fcp_default_x', 'X Position', function () {
        $value = get_option('fcp_default_x', '0.5');
        ?>
        <select name="fcp_default_x">
            <option value="0" <?php selected($value, '0'); ?>>Left</option>
            <option value="0.5" <?php selected($value, '0.5'); ?>>Center</option>
            <option value="1" <?php selected($value, '1'); ?>>Right</option>
        </select>
        <?php
    }, 'media', 'fcp_settings_section');

    add_settings_field('fcp_default_y', 'Y Position', function () {
        $value = get_option('fcp_default_y', '0.5');
        ?>
        <select name="fcp_default_y">
            <option value="0" <?php selected($value, '0'); ?>>Top</option>
            <option value="0.5" <?php selected($value, '0.5'); ?>>Center</option>
            <option value="1" <?php selected($value, '1'); ?>>Bottom</option>
        </select>
        <?php
    }, 'media', 'fcp_settings_section');

    // Add "Danger Zone" section below the dropdowns
    add_settings_field('fcp_apply_defaults_to_all_images', '', function () {
        ?>
        <h2 style="color:#b32d2e;">Danger Zone</h2>
        <p><strong>Warning:</strong> This will overwrite <em>all</em> image focal points with the current default.</p>
        <p><em>Note:</em> Make sure you click <strong>Save Changes</strong> above before applying defaults to all images.</p>
        <br />
        <?php
            $apply_url = wp_nonce_url(
                admin_url('admin-post.php?action=fcp_apply_defaults'),
                'fcp_apply_defaults_action'
            );
        ?>
        <a href="<?php echo esc_url($apply_url); ?>" class="button button-danger">Apply Default to All Images</a>
        <?php
    }, 'media', 'fcp_settings_section');
});

// Show admin notice on success
add_action('admin_notices', function () {
    if (isset($_GET['fcp_applied']) && $_GET['fcp_applied'] === '1') {
        echo '<div class="notice notice-success is-dismissible"><p>Focal point defaults applied to all images.</p></div>';
    }
});

add_action('admin_post_fcp_apply_defaults', function () {
    check_admin_referer('fcp_apply_defaults_action');

    $x = floatval(get_option('fcp_default_x', 0.5));
    $y = floatval(get_option('fcp_default_y', 0.5));

    $images = get_posts([
        'post_type'      => 'attachment',
        'post_mime_type' => 'image',
        'posts_per_page' => -1,
        'fields'         => 'ids',
    ]);

    foreach ($images as $image_id) {
        update_post_meta($image_id, 'focalpoint', [
            'left' => $x,
            'top'  => $y,
        ]);
    }

    wp_redirect(add_query_arg('fcp_applied', '1', admin_url('options-media.php')));
    exit;
});