// gulpfile.js

let {src, dest, series} = require('gulp'),
    inject = require('gulp-inject'),
    requireDir = require('require-dir'),
    fileinclude = require('gulp-file-include'),
    plumber = require('gulp-plumber');

let config = require("./config");

let dir = requireDir('./tasks', {
    filter: function (fullPath) {
        return process.env.NODE_ENV !== 'production' && !fullPath.match(/$dev/);
    }
});


function test(cb) {
    console.log('Gulp is working!')
    cb()
}

function injectResources(cb) {
    let pathList = [config.BUILD_JS, config.BUILD_CSS];

    return src(
        config.BUILD_HTML
    ).pipe(
        inject(
            src(pathList, {read: false,}),{
                addRootSlash: false,
                relative: true
            })
    ).pipe(
        dest(config.BUILD)
    );
}

function insertContent(cb) {
    return src(
        config.SRC_HTML
    ).pipe(
        fileinclude({
            prefix: '@@',
            basepath: '@file',
            context: {
                link: 'test'
            }
        })
    ).pipe(
        dest(config.BUILD)
    );
}

exports.test = test;
exports.serve = series(dir.resources.copy, insertContent, injectResources, dir.server.serve)
exports.build = series(dir.resources.copy, insertContent, injectResources)
