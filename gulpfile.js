var fs = require("fs");
var gulp = require("gulp");
var browserify = require("browserify");
var vinylSrcStream = require('vinyl-source-stream');
var watchify = require("watchify");
var tsify = require("tsify");
var gutil = require("gulp-util");
var ginsert = require("gulp-insert");
var buffer = require('vinyl-buffer');
var glob = require('glob');

var tampermonkeyHeader = generateTampermonkeyHeader();

var watchedBrowserify = watchify(browserify({
    basedir: '.',
    debug: false, // This causes tsify to emit source maps inside the bundled JavaScript file
    entries: [...glob.sync('./src/**/*.ts'), './config/config.json'],
    cache: {},
    packageCache: {}
}).plugin(tsify));

function bundle() {
    return watchedBrowserify
        .bundle()
        .pipe(vinylSrcStream('issueMover.js'))
        .pipe(buffer())
        .pipe(ginsert.prepend(tampermonkeyHeader))
        .pipe(gulp.dest("dist"))
}

function generateTampermonkeyHeader() {
    var config = require('./config/config.json');
    var settingsHeader = fs.readFileSync('config/tampermonkeyHeader.js', 'utf-8');
    settingsHeader = insertString(settingsHeader,
        '// ==/UserScript==',
        `/** Script needs to be activated when a new issue with the unique token has been created */\n` +
        `// @match       https://github.com/*/issues/new?title*${config.uniqueToken}\n\n`);
    settingsHeader = insertString(settingsHeader,
        '// ==UserScript==',
        `// Source Repos:\n${config.repositories.sourceRepos.map(repo => '// @match\t\t' + repo).join('\n')}`,
        false);
    return settingsHeader;
}

function insertString(haystack, needle, data, beforeNeedle = true) {
    const idx = beforeNeedle ? haystack.indexOf(needle) : haystack.indexOf(needle) + needle.length + 1;
    return haystack.slice(0, idx) + data + haystack.slice(idx);
}

gulp.task("default", bundle);
watchedBrowserify.on("update", bundle);
watchedBrowserify.on("log", gutil.log);