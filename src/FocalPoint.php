<?php
/*
 * Copyright (c) Rasso Hilber
 * https://rassohilber.com
 */

namespace WPFocalPoint;

use InvalidArgumentException;
use WP_Post;

final class FocalPoint
{
    public float $left;
    public float $top;

    public function __construct(WP_Post|int $post) {
        if (!wp_attachment_is_image($post)) {
            throw new InvalidArgumentException("\$post is not an image");
        }

        $raw = get_post_meta($post->ID ?? $post, 'focalpoint', true);

        $this->left = $this->sanitize($raw['left'] ?? null);
        $this->top = $this->sanitize($raw['top'] ?? null);
    }

    /**
     * Sanitize a value (left or top)
     */
    private function sanitize(mixed $value): float
    {
        if (empty($value)) $value = 0.5;

        $value = floatval($value);

        if ($value > 1) $value /= 100;

        return round($value, 2);
    }
}
