// Task to copy all HTML, CSS and javascript files from the src
// directory to the tmp directory

const {series, src, dest} = require('gulp');
let config = require("../config");


function _copyHtml(cb) {
    return src(
        config.SRC_HTML
    ).pipe(
        dest(config.BUILD)
    );
}

function _copyCss(cb) {
    return src(
        config.SRC_CSS
    ).pipe(
        dest(config.BUILD)
    );
}

function _copyImg(cb) {
    return src(
        config.SRC_IMG
    ).pipe(
        dest(config.BUILD)
    );
}

function _copyJs(cb) {
    return src(
        config.SRC_JS
    ).pipe(
        dest(config.BUILD)
    );
}

exports.copy = series(_copyHtml, _copyCss, _copyImg, _copyJs)
