<?php

$finder = PhpCsFixer\Finder::create()
    ->in([
        './',
    ]);

return (new PhpCsFixer\Config())
    ->setRules([
        '@PSR12' => true,
        '@PHP83Migration' => true,
        'no_unused_imports' => true,
        // @see https://github.com/PHP-CS-Fixer/PHP-CS-Fixer/issues/7906
        'single_space_after_construct' => true,
    ])
    ->setFinder($finder);
