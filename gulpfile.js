var fs = require("fs");
var gulp = require("gulp");
var browserify = require("browserify");
var vinylSrcStream = require('vinyl-source-stream');
var watchify = require("watchify");
var tsify = require("tsify");
var gutil = require("gulp-util");
var ginsert = require("gulp-insert");
var uglify = require('gulp-uglify');
var buffer = require('vinyl-buffer');
var glob = require('glob');
var babel = require('gulp-babel');
var BODY_UNIQUE_TOKEN = require('./src/uniqueToken.json').BODY_UNIQUE_TOKEN;

var tampermonkeyHeader = getModifiedTampermonkeyHeader();

var watchedBrowserify = watchify(browserify({
    basedir: '.',
    debug: false, // This causes tsify to emit source maps inside the bundled JavaScript file
    entries: [...glob.sync('./src/**/*.ts'), 'config/repositories.json'],
    cache: {},
    packageCache: {}
}).plugin(tsify));

function bundle() {
    return watchedBrowserify
        .bundle()
        .pipe(vinylSrcStream('issueMover.js'))
        .pipe(buffer())
        .pipe(babel({
            presets: ['env']
        }))
        .pipe(uglify())
        .pipe(ginsert.prepend(tampermonkeyHeader))
        .pipe(gulp.dest("dist"))
}

function getModifiedTampermonkeyHeader() {
    var headerSettings = fs.readFileSync('config/settings.js', 'utf-8');
    const idx = headerSettings.indexOf('// ==/UserScript==');
    headerSettings = headerSettings.slice(0, idx) +
        `/** Script needs to be activated when a new issue with our unique sign is created */\n` +
        `// @match       https://github.com/*/issues/new?title*${BODY_UNIQUE_TOKEN}\n\n` +
        headerSettings.slice(idx);
    return headerSettings;
}

gulp.task("default", bundle);
watchedBrowserify.on("update", bundle);
watchedBrowserify.on("log", gutil.log); // useful for debugging setup