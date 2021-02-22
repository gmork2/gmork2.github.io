let {src} = require('gulp');
let srv = require('gulp-webserver');
let config = require("../config");

function serve(cb) {
    return src(config.BUILD)
        .pipe(srv({
            port: 3000,
            livereload: true,
            directoryListing: {
                enable: true,
                path: config.BUILD
            },
            open: true
        }));
}

exports.serve = serve;


