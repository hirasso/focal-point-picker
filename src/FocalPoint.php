<?php
/*
 * Copyright (c) Rasso Hilber
 * https://rassohilber.com
 */

namespace FocalPointPicker;

use InvalidArgumentException;
use WP_Post;

final class FocalPoint
{
    public float $left;
    public float $top;

    public float $leftPercent;
    public float $topPercent;

    public function __construct(WP_Post|int $post) {
        $post = get_post($post);

        if (!wp_attachment_is_image($post)) {
            throw new InvalidArgumentException("\$post is not an image");
        }

        $raw = get_post_meta($post->ID, 'focalpoint', true);

        $this->left = $this->sanitize($raw['left'] ?? null);
        $this->top = $this->sanitize($raw['top'] ?? null);

        $this->leftPercent = $this->left * 100;
        $this->topPercent = $this->top * 100;
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
