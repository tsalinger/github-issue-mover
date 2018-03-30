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

var headerSettings = fs.readFileSync('config/settings.js', 'utf-8');

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
        .pipe(ginsert.prepend(headerSettings))
        .pipe(gulp.dest("dist"))
}

gulp.task("default", bundle);
watchedBrowserify.on("update", bundle);
watchedBrowserify.on("log", gutil.log); // useful for debugging setup