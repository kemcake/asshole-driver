/* browserify task
   ---------------
   Bundle javascripty things with browserify!

   This task is set up to generate multiple separate bundles, from
   different sources, and to use Watchify when run from the default task.

   See browserify.bundleConfigs in gulp/config.js
*/

var browserify   = require('browserify');
var watchify     = require('watchify');
var reactify = require('reactify');
var bundleLogger = require('../util/bundleLogger');
var gulp         = require('gulp');
var gulpif       = require('gulp-if');
var uglify       = require('gulp-uglify');
var handleErrors = require('../util/handleErrors');
var source       = require('vinyl-source-stream');
var buffer       = require('vinyl-buffer');
var config       = require('../config').browserify;

gulp.task('browserify', function(callback) {

  var bundleConfig = config.bundleConfig;
  var bundleQueue = config.bundleConfigs.length;
  
  var browserifyThis = function(bundleConfig) {

    var bundler = browserify({
      // Required watchify args
      cache: {}, packageCache: {}, fullPaths: true,
      // Specify the entry point of your app
      entries: bundleConfig.entries,
      // Add file extentions to make optional in your requires
      extensions: config.extensions,
      // Enable source maps!
      debug: config.debug
    });
    bundler.transform(reactify);
    
    var bundle = function() {
      // Log when bundling starts
      bundleLogger.start(bundleConfig.outputName);
      return bundler
        .bundle()
        .on('error', handleErrors)        
        .pipe(source(bundleConfig.outputName))
        .pipe(buffer())
        .pipe(gulpif(process.env.NODE_ENV == 'production', uglify()))
        // Specify the output destination
        .pipe(gulp.dest(bundleConfig.dest))
        .on('end', reportFinished);
    };

    if(global.isWatching) {
      // Wrap with watchify and rebundle on changes
      bundler = watchify(bundler);
      // Rebundle on update
      bundler.on('update', bundle);
    }

    var reportFinished = function() {
      // Log when bundling completes
      bundleLogger.end(bundleConfig.outputName)

      if(bundleQueue) {
        bundleQueue--;
        if(bundleQueue === 0) {
          // If queue is empty, tell gulp the task is complete.
          // https://github.com/gulpjs/gulp/blob/master/docs/API.md#accept-a-callback
          callback();
        }
      }
    };

    return bundle();
  };

  // Start bundling with Browserify for each bundleConfig specified
  config.bundleConfigs.forEach(browserifyThis);
});
