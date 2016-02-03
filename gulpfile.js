// todo
// - css & js minifier + sourcemaps
// - automated release with gulp-git

// note: the current file is not watched nor linted

'use strict';
 
var gulp = require('gulp');
var jshint = require('gulp-jshint');
var browsersync = require('browser-sync');
//var nodemon = require('gulp-nodemon');
//var sass = require('gulp-sass');
var cache = require('gulp-cached');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var ts = require('gulp-typescript');


// launch nodemon
// gulp.task('nodemon', function() {
// 	nodemon({
// 		ignore: ['public/*', './gulpfile.js'],
// 		ext: 'js json'
// 	});
// });

// prepare external sources (this is only done on launch)
gulp.task('js_ext', function () {
	var stream = gulp.src([
    	'./bower_components/babylonjs/dist/babylon.2.2.js',
    	'./bower_components/pepjs/dist/pep.min.js'
	])
	.pipe(concat('inc.min.js'))
	//.pipe(uglify())
	.pipe(gulp.dest('./public/'))
	.on('error', errorHandler);

	return stream;	// hint end of task
});

// linting
// this task is ran at launch (on all files) and on changed files
gulp.task('lint', function () {
	var stream = gulp.src(['./js/*.js'])
	.pipe(cache('linting'))
	.pipe(jshint())
	.pipe(jshint.reporter('jshint-stylish'))
	.on('error', errorHandler);

	return stream;	// hint end of task
});

// compile typescript files
gulp.task('ts', function () {
	var stream = gulp.src(['./ts/*.ts',])
	.pipe(ts({
		noImplicitAny: false,
		out: 'ts_output.js'
	}))
	.pipe(gulp.dest('./js/'))
	.on('error', errorHandler);

	return stream;	// hint end of task
});

// concat and minify js sources to public
gulp.task('js', ['ts', 'lint'], function () {
	var stream = gulp.src(['./js/*.js'])
	.pipe(concat('app.min.js'))
	//.pipe(uglify())
	.pipe(gulp.dest('./public/'))
	.on('error', errorHandler);

	return stream;	// hint end of task
});

// compile sass to css
// gulp.task('sass', function() {
// 	gulp.src(['./sass/*.scss'])
// 	.pipe(sass().on('error', sass.logError))
// 	.pipe(gulp.dest('./css/'));
// });

// concat css to public
gulp.task('css', function () {
	var stream = gulp.src([
    	'./css/*.css'
	])
	.pipe(concat('style.min.css'))
	.pipe(gulp.dest('./public/'))
	.on('error', errorHandler);

	return stream;	// hint end of task
});


// entry point
gulp.task('default', ['css', 'js_ext', 'js'], function () {

	// launch browser-sync & watch public files for change
	browsersync({
        port: 8000,
        server: {
        	baseDir: './public'
        }
	});
	gulp.watch(['public/{*.js,*.css,*.html}'], browsersync.reload);

	// add a watch for css compiling
	gulp.watch(['./css/*.css'], ['css']);

	// add a watch for js linting & minifying
	gulp.watch(['./ts/*.ts'], ['js']);

});


// error handlin'
function errorHandler(error) {
  console.log(error.toString());
  this.emit('end');
}