=== focal-point-picker ===

Zero-dependency [focal point](<[url](https://en.wikipedia.org/wiki/Focus_(optics))>) picker for your WordPress website. Works with older installs, too.

![CleanShot 2024-06-24 at 15 18 15@2x](https://github.com/hirasso/focal-point-picker/assets/869813/3717cedb-d1db-4192-b24d-9997e48432c9)

== Installation ==

= Via Composer (recommended): =

1. You'll need a custom entry in the `repositories` array in your `composer.json`:

<pre>{
  "repositories": [
    {
      "type": "vcs",
      "url": "git@github.com:hirasso/focal-point-picker.git"
    }
  ]
}</pre>

2. Run `composer require hirasso/focal-point-picker` in your terminal – Done!

= Manually: =

1. Download and extract the plugin
2. Copy the `focal-point-picker` folder into your `wp-content/plugins` folder
3. Activate the plugin via the plugins admin page – Done!
4. Handle updates via [afragen/git-updater](https://github.com/afragen/git-updater)

== Data structure ==

You can retrieve the focal point for an image like this:

<pre>$focalPoint = fcp_get_focalpoint($imageID);
var_dump($focalPoint);</pre>

= Output: =

<pre>object(FocalPointPicker\FocalPoint)#2796 (4) {
  ["left"]=>
  float(0.5)
  ["top"]=>
  float(0.5)
  ["leftPercent"]=>
  float(50)
  ["topPercent"]=>
  float(50)
}</pre>

== Usage in your templates: ==

= Object Position =

<pre><?php

$imageID = 1234;
$imageSRC = wp_get_attachment_image_src($imageID)['large'];
$focalPoint = fcp_get_focalpoint($imageID);

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
  <img src="<?= $imageSRC[0] ?>" style="object-position: <?= $focusPoint->leftPercent ?? 50 ?>% <?= $focusPoint->topPercent ?? 50 ?>%;">
</div></pre>

= Background Position =

<pre><?php

$imageID = 1234;
$imageSRC = wp_get_attachment_image_src($imageID)['large'];
$focalPoint = fcp_get_focalpoint($imageID);

?>

<style>
#my-image {
  background-image: url('<?php echo $imageSRC[0]; ?>');
  background-size: cover;
  height: 300px;
  width: 600px;
}
</style>

<div id="my-image" style="background-position: <?= $focalPoint->leftPercent ?? 50 ?>% <?= $focalPoint->topPercent ?? 50 ?>%;"></div></pre>
