# WP Focal Point

Zero-dependency [focal point](<[url](https://en.wikipedia.org/wiki/Focus_(optics))>) picker for your WordPress website. Works with older installs, too.

![CleanShot 2024-06-24 at 15 18 15@2x](https://github.com/hirasso/wp-focalpoint/assets/869813/3717cedb-d1db-4192-b24d-9997e48432c9)

## Installation

### Via Composer (recommended):

1. You'll need a custom entry in the `repositories` array in your `composer.json`:

```json
{
  "repositories": [
    {
      "type": "vcs",
      "url": "git@github.com:hirasso/wp-focalpoint.git"
    }
  ]
}
```

2. Run `composer require hirasso/wp-focalpoint` – Done!

### Manually:

1. Download and extract the plugin
2. Copy the `wp-focalpoint` folder into your `wp-content/plugins` folder
3. Activate the WP FocalPoint plugin via the plugins admin page – Done!
4. Handle updates via [afragen/git-updater](https://github.com/afragen/git-updater)

## Data structure

The focal point will be saved as attachment meta and in this shape:

```php
$focalPoint = get_post_meta($imageID, 'focalpoint', true);
assert($focalPoint == [
  'left' => 50,
  'top' => 50
]);
```

## Usage in your templates:

### Object Position

```php
<?php

$imageID = 1234;
$imageSRC = wp_get_attachment_image_src($imageID)['large'];
$focalPoint = get_post_meta($imageID, 'focalpoint', true);

?>

<style>
#my-image {
  height: 300px;
  width: 600px;
  position: relative;
}
#my-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>

<div id="my-image">
  <img src="<?= $imageSRC[0] ?>" style="object-position: <?= $focusPoint['left'] ?? 50 ?>% <?= $focusPoint['top'] ?? 50 ?>%;">
</div>
```

### Background Position

```php
<?php

$imageID = 1234;
$imageSRC = wp_get_attachment_image_src($imageID)['large'];
$focalPoint = get_post_meta($imageID, 'focalpoint', true);

?>

<style>
#my-image {
  background-image: url('<?php echo $imageSRC[0]; ?>');
  background-size: cover;
  height: 300px;
  width: 600px;
}
</style>

<div id="my-image" style="background-position: <?= $focalPoint['left'] ?? 50 ?>% <?= $focalPoint['top'] ?? 50 ?>%;"></div>
```
