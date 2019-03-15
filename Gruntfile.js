module.exports = function(grunt) {
  // NOTE: If certain OS/browser platforms start failing when grunt-sauselabs
  //       sends jobs to Sauce Labs, check that they still support the
  //       OS/browser platforms listed here.
  //       https://saucelabs.com/platforms
  //       https://wiki.saucelabs.com/display/DOCS/Platform+Configurator#/
  var browsers = [{
    browserName: 'firefox',
    platform: 'Windows 10'
  }, {
    browserName: 'googlechrome',
    platform: 'Windows 10'
  }, {
    browserName: 'MicrosoftEdge',
    platform: 'Windows 10'
  }, {
    browserName: 'internet explorer',
    platform: 'Windows 8.1',
    version: '11.0'
  }, {
    browserName: 'internet explorer',
    platform: 'Windows 8',
    version: '10.0'
  }];

  var pkg = grunt.file.readJSON('package.json');

  grunt.initConfig({
    pkg: pkg,
    buildDir: 'v' + pkg.version.match(/\d\.\d/)[0],
    connect: {
      server: {
        options: {
          base: '',
          port: 9999
        }
      }
    },
    jasmine: {
      src: ['honeybadger.js'],
      options: {
        specs: ['spec/honeybadger.spec.js'],
        vendor: ['vendor/sinon-1.17.3.js']
      }
    },
    'saucelabs-jasmine': {
      all: {
        options: {
          urls: ['http://localhost:9999/spec/runner.html'],
          build: process.env.TRAVIS_JOB_ID,
          browsers: browsers,
          testname: 'honeybadger.js specs',
          tags: ['master']
        }
      }
    },
    watch: {
      specs: {
        files: ['spec/**/*.js', 'honeybadger.js'],
        tasks: ['jasmine']
      }
    },
    copy: {
      dist: {
        files: [
          {src: 'honeybadger.js', dest: 'dist/honeybadger.js'},
        ]
      }
    },
    uglify: {
      dist: {
        options: {
          sourceMap: true,
          sourceMapName: 'dist/honeybadger.min.js.map'
        },
        files: {
          'dist/honeybadger.min.js': ['dist/honeybadger.js']
        }
      }
    },
    s3: {
      options: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_ΚΕY,
        bucket: process.env.HONEYBADGER_JS_S3_BUCKET,
        access: 'public-read',
        gzip: true
      },
      cdn: {
        cwd: 'dist/',
        src: ['honeybadger.js', 'honeybadger.min.js', 'honeybadger.min.js.map'],
        dest: '<%= buildDir %>/'
      }
    }
  });

  // Loading dependencies
  for (var key in pkg.devDependencies) {
    if (key !== 'grunt' && key.indexOf('grunt') === 0) grunt.loadNpmTasks(key);
  }

  grunt.registerTask('build', ['copy', 'uglify']);
  grunt.registerTask('release:cdn', ['test', 'build', 's3:cdn']);
  grunt.registerTask('dev', ['connect', 'watch']);
  grunt.registerTask('test', ['jasmine']);
  grunt.registerTask('test:ci', ['jasmine', 'connect', 'saucelabs-jasmine']);
  grunt.registerTask('default', ['test']);
};
