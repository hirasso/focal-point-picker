# Changelog

## 1.4.1

### Patch Changes

- af2ce12: Declare `Requires PHP: 8.2` in `readme.txt` so that the PHP requirement is actually part of the update metadata reported to WordPress
- 2f48391: Add phpstan.neon and pint.json to export-ignore

## 1.4.0

### Minor Changes

- 540c8c6: Add a filter `hirasso/fcp/default-position` for filtering the default focal point position. Usage:

  ```php
  use Hirasso\FocalPointPicker\Position;

  /** center top. Great for preserving faces in cropped images */
  add_filter(
      'hirasso/fcp/default-position',
      fn() => new Position(left: 0.5, top: 0)
  );
  ```

- ca70789: Add a WP_CLI command `wp fcp apply-default-position` to apply the default position to all attachments
- 54e3a09: phpstan level 6

Thanks @bahia0019 for the inspiration!

## 1.3.8

### Patch Changes

- 4a42788: Prevent resetting coordinates if they are exactly zero. Thanks @elmarinado

## 1.3.7

### Patch Changes

- 54db62b: Fix `InvalidArgumentException` in the admin media list view. Thanks @cflaschOVL

## 1.3.6

### Patch Changes

- 0881ed6: Optimize distribution files

## 1.3.5

### Patch Changes

- b58edae: Use the composer autoloader in dev, use a custom one for distribution (zero-dependencies)

## 1.3.4

### Patch Changes

- 0735c23: Do not overwrite existing style tag values on native wordpress attachment images

## 1.3.3

### Patch Changes

- 1be45ea: Add a Changelog and a release flow using `@changesets/cli` and `@changesets/action`. Also some minor readme optimizations.

## 0.0.0 ... 1.3.2

- No changelog for these versions, sorry 😇
