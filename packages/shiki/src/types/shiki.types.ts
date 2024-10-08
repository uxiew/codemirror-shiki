// Type definitions from shiki

export type {
    Awaitable,
    ShikiInternal,
    CodeOptionsMultipleThemes,
    CodeToTokensOptions,
    ThemeRegistrationAny,
    LanguageInput,
    SpecialLanguage,
    StringLiteralUnion,
    SpecialTheme,
    CodeToTokensWithThemesOptions,
    RegexEngine,
    TokenizeWithThemeOptions
} from "@shikijs/core"

// from `shiki/dist/langs.d.mts`
export type BundledLanguage = 'abap' | 'actionscript-3' | 'ada' | 'adoc' | 'angular-html' | 'angular-ts' | 'apache' | 'apex' | 'apl' | 'applescript' | 'ara' | 'asciidoc' | 'asm' | 'astro' | 'awk' | 'ballerina' | 'bash' | 'bat' | 'batch' | 'be' | 'beancount' | 'berry' | 'bibtex' | 'bicep' | 'blade' | 'c' | 'c#' | 'c++' | 'cadence' | 'cdc' | 'clarity' | 'clj' | 'clojure' | 'closure-templates' | 'cmake' | 'cmd' | 'cobol' | 'codeowners' | 'codeql' | 'coffee' | 'coffeescript' | 'common-lisp' | 'console' | 'cpp' | 'cql' | 'crystal' | 'cs' | 'csharp' | 'css' | 'csv' | 'cue' | 'cypher' | 'd' | 'dart' | 'dax' | 'desktop' | 'diff' | 'docker' | 'dockerfile' | 'dream-maker' | 'edge' | 'elisp' | 'elixir' | 'elm' | 'emacs-lisp' | 'erb' | 'erl' | 'erlang' | 'f' | 'f#' | 'f03' | 'f08' | 'f18' | 'f77' | 'f90' | 'f95' | 'fennel' | 'fish' | 'fluent' | 'for' | 'fortran-fixed-form' | 'fortran-free-form' | 'fs' | 'fsharp' | 'fsl' | 'ftl' | 'gdresource' | 'gdscript' | 'gdshader' | 'genie' | 'gherkin' | 'git-commit' | 'git-rebase' | 'gjs' | 'gleam' | 'glimmer-js' | 'glimmer-ts' | 'glsl' | 'gnuplot' | 'go' | 'gql' | 'graphql' | 'groovy' | 'gts' | 'hack' | 'haml' | 'handlebars' | 'haskell' | 'haxe' | 'hbs' | 'hcl' | 'hjson' | 'hlsl' | 'hs' | 'html' | 'html-derivative' | 'http' | 'hxml' | 'hy' | 'imba' | 'ini' | 'jade' | 'java' | 'javascript' | 'jinja' | 'jison' | 'jl' | 'js' | 'json' | 'json5' | 'jsonc' | 'jsonl' | 'jsonnet' | 'jssm' | 'jsx' | 'julia' | 'kotlin' | 'kql' | 'kt' | 'kts' | 'kusto' | 'latex' | 'less' | 'liquid' | 'lisp' | 'log' | 'logo' | 'lua' | 'luau' | 'make' | 'makefile' | 'markdown' | 'marko' | 'matlab' | 'md' | 'mdc' | 'mdx' | 'mediawiki' | 'mermaid' | 'mojo' | 'move' | 'nar' | 'narrat' | 'nextflow' | 'nf' | 'nginx' | 'nim' | 'nix' | 'nu' | 'nushell' | 'objc' | 'objective-c' | 'objective-cpp' | 'ocaml' | 'pascal' | 'perl' | 'perl6' | 'php' | 'plsql' | 'po' | 'postcss' | 'pot' | 'potx' | 'powerquery' | 'powershell' | 'prisma' | 'prolog' | 'properties' | 'proto' | 'ps' | 'ps1' | 'pug' | 'puppet' | 'purescript' | 'py' | 'python' | 'ql' | 'qml' | 'qmldir' | 'qss' | 'r' | 'racket' | 'raku' | 'razor' | 'rb' | 'reg' | 'regex' | 'regexp' | 'rel' | 'riscv' | 'rs' | 'rst' | 'ruby' | 'rust' | 'sas' | 'sass' | 'scala' | 'scheme' | 'scss' | 'sh' | 'shader' | 'shaderlab' | 'shell' | 'shellscript' | 'shellsession' | 'smalltalk' | 'solidity' | 'soy' | 'sparql' | 'spl' | 'splunk' | 'sql' | 'ssh-config' | 'stata' | 'styl' | 'stylus' | 'svelte' | 'swift' | 'system-verilog' | 'systemd' | 'tasl' | 'tcl' | 'templ' | 'terraform' | 'tex' | 'tf' | 'tfvars' | 'toml' | 'ts' | 'tsp' | 'tsv' | 'tsx' | 'turtle' | 'twig' | 'typ' | 'typescript' | 'typespec' | 'typst' | 'v' | 'vala' | 'vb' | 'verilog' | 'vhdl' | 'vim' | 'viml' | 'vimscript' | 'vue' | 'vue-html' | 'vy' | 'vyper' | 'wasm' | 'wenyan' | 'wgsl' | 'wiki' | 'wikitext' | 'wl' | 'wolfram' | 'xml' | 'xsl' | 'yaml' | 'yml' | 'zenscript' | 'zig' | 'zsh' | '文言';

// from `shiki/dist/themes.d.mts`
export type BundledTheme = 'andromeeda' | 'aurora-x' | 'ayu-dark' | 'catppuccin-frappe' | 'catppuccin-latte' | 'catppuccin-macchiato' | 'catppuccin-mocha' | 'dark-plus' | 'dracula' | 'dracula-soft' | 'github-dark' | 'github-dark-default' | 'github-dark-dimmed' | 'github-light' | 'github-light-default' | 'houston' | 'laserwave' | 'light-plus' | 'material-theme' | 'material-theme-darker' | 'material-theme-lighter' | 'material-theme-ocean' | 'material-theme-palenight' | 'min-dark' | 'min-light' | 'monokai' | 'night-owl' | 'nord' | 'one-dark-pro' | 'one-light' | 'poimandres' | 'red' | 'rose-pine' | 'rose-pine-dawn' | 'rose-pine-moon' | 'slack-dark' | 'slack-ochin' | 'snazzy-light' | 'solarized-dark' | 'solarized-light' | 'synthwave-84' | 'tokyo-night' | 'vesper' | 'vitesse-black' | 'vitesse-dark' | 'vitesse-light';
