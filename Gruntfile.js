module.exports = function(grunt) {
  var browsers = [{
    browserName: 'firefox',
    platform: 'Windows 10'
  }, {
    browserName: 'googlechrome',
    platform: 'OS X 10.11'
  }, {
    browserName: 'googlechrome',
    platform: 'linux'
  }, {
    browserName: 'internet explorer',
    platform: 'WIN8',
    version: '10'
  }, {
    browserName: 'internet explorer',
    platform: 'XP',
    version: '8'
  }];

  grunt.initConfig({
    connect: {
      server: {
        options: {
          base: '',
          port: 9999
        }
      }
    },
    jasmine : {
      src : ['build/src/**/*.js', 'src/**/*.js'],
      options : {
        specs : 'build/spec/**/*.js'
      }
    },
    'saucelabs-jasmine': {
      all: {
        options: {
          urls: ['http://127.0.0.1:9999/spec/runner.html'],
          tunnelTimeout: 5,
          build: process.env.TRAVIS_JOB_ID,
          concurrency: 3,
          browsers: browsers,
          testname: 'honeybadger.js specs',
          tags: ['master']
        }
      }
    },
    shell: {
      compile: {
        command: 'make compile'
      }
    },
    watch: {
      compile: {
        files: ['Makefile', 'spec/**/*.*', 'src/**/*.*', 'spec/runner.html'],
        tasks: 'shell:compile'
      },
      specs: {
        files: ['build/spec/**/*.js'],
        tasks: 'jasmine'
      }
    }
  });

  // Loading dependencies
  for (var key in grunt.file.readJSON('package.json').devDependencies) {
    if (key !== 'grunt' && key.indexOf('grunt') === 0) grunt.loadNpmTasks(key);
  }

  grunt.registerTask('dev', ['connect', 'watch']);
  grunt.registerTask('test', ['shell:compile', 'connect', 'saucelabs-jasmine']);
};
