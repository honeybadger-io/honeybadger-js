module.exports = (grunt) ->

  _ = require 'underscore'

  # paths setup - separate as some modules dont process templates correctly
  paths =

    # build directory
    build_dir: 'build'

    # -- sources --

    # coffescript sources
    coffee_dir: 'coffee'
    coffee_src: 'coffee/**/*.coffee'

    # -- compiled output --

    # javascript sources
    js_dir: 'build/js'
    js_src: 'build/js/src/**/*.js'
    js_specs: 'build/js/test/**/*.spec.js'
    js_vendor: 'build/js/vendor/*.js'

    # minified target name
    minified: 'honeybadger.min.js'

    # -- libraries --

    # libraries to load in the frontend
    frontend_libs: [
      'lib/closure/library/closure/goog/base.js',     # for dependencies
      'vendor/tracekit.js'                            # awesome stack traces
    ]


  # -- YOU SHOULD NOT NEED TO MODIFY BELOW THIS LINE --
  # you may have to... if things break...


  # Paths to copy into the build directory:
  #
  #   build_includes:
  #     '<dest-path-1>'   : '<src-path-1>'
  #     '<dest-path-2>/'  : '<src-path-2>/**'
  #     '<dest-path-3>/'  : [ '<src-path-3>', '<src-path-4>' ]
  #
  # The above will copy:
  #   <src-path-1>  to <paths.build_dir>/<src-dest-1> (single file)
  #   <src-path-2>/ to <paths.build_dir>/<dest-path-2> (directory and contents)
  #   <src-path-3> and <src-path-4> into <paths.build_dir>/<dest-path-3>/
  #
  # Note that:
  # - if a source path ends in a '/**' and points to a directory, the
  #   contents of the directory are copied, rather than the directory itself.
  # - destination paths _must_ end in a '/' to be directories. e.g.
  #   `'dest': 'src'`  copies `src` to `<paths.build_dir>/dest`
  #   `'dest/': 'src/**'` copies `src` to `<paths.build_dir>/dest/src`
  paths.build_includes =
    'js/vendor/tracekit.js' :  'vendor/tracekit.js'

  # prepend all dst paths with the build dir.
  paths.build_includes = _.object _.map paths.build_includes, (src, dst) ->
    [ "#{paths.build_dir}/#{dst}", src ]

  # google closure paths
  paths.closure =

    # dependencies file
    deps: "#{paths.js_dir}/deps.js"

    # main entry point
    main: "#{paths.js_dir}/src/honeybadger.js"

    # output file for the compiler
    compiled: paths.minified

    # source map output filepath
    source_map: "#{paths.minified}.map"

    # root of the sources that closure should use
    # silliness. because depswriter.py uses paths relative to closure library
    root_with_prefix: "'#{paths.js_dir} ../../../../../#{paths.js_dir}'"

    # path to library. this should be a submodule.
    library: 'lib/closure/library'

    # path to compiler. this should be a symlink (or the actual jar).
    compiler: 'lib/closure/compiler.jar'


  # jasmine paths
  paths.jasmine =

    # lib to include before sources (e.g. jquery, underscore, etc).
    lib: paths.frontend_libs

    # src to include. use closure deps and main entry point
    src: [paths.closure.deps, paths.closure.main]

    # specs to include.
    specs: paths.js_specs



  # Project configuration.
  grunt.initConfig

    # load package information
    pkg: grunt.file.readJSON 'package.json'

    # task to compile coffeescript into javascript
    coffee:
      default:
        src: paths.coffee_src
        dest: paths.js_dir
        options:
          preserve_dirs: true
          base_path: paths.coffee_dir



    # task to compute file dependencies (closure)
    closureDepsWriter:
      default:
        closureLibraryPath: paths.closure.library
        options:
          output_file: paths.closure.deps
          root_with_prefix: paths.closure.root_with_prefix

    # task to compile code into a minified file (closure)
    closureCompiler:
      default:
        js: [paths.js_vendor, paths.js_src]
        closureCompiler: paths.closure.compiler
        checkModified: true
        options:
           # compilation_level: 'ADVANCED_OPTIMIZATIONS',
           # externs: ['path/to/file.js', '/source/**/*.js'],
           # define: ["'goog.DEBUG=false'"],
           # warning_level: 'verbose',
           # jscomp_off: ['checkTypes', 'fileoverviewTags'],
           # summary_detail_level: 3,
           js_output_file: paths.closure.compiled
           output_wrapper: '"\'use strict\';\n(function(){%output%}).call(this);"'
           create_source_map: paths.closure.source_map
           source_map_format: "V3"

    # task to run jasmine tests through the commandline via phantomjs
    jasmine:
      # concat because jasmine-runner doesnt support libs (before srcs)
      src: [].concat(paths.jasmine.lib, paths.jasmine.src)
      specs: paths.jasmine.specs

    # task to run jasmine tests in a webserver
    jasmineSpecServer:
      lib: paths.jasmine.lib
      src: paths.jasmine.src
      specs: paths.jasmine.specs

    # task to watch sources for changes and recompile during development
    watch:
      files: paths.coffee_src
      tasks: 'deps' # or 'test', or 'server' :)

    # task to copy files into build
    copy:
      build:
        files: paths.build_includes

    # task to clean up directories
    clean:

      # the generated build dir
      build: paths.build_dir

      # the generated jasmine-runner tester file
      test: ['_SpecRunner.html']

    # task to run shell commands
    exec:
      # create the build directory. closure errors out if it isn't there...
      mkbuild: command: "mkdir -p \"#{paths.build_dir}\""

      process_source_maps:
        stdout: true
        command: (grunt) ->
          "python build_scripts/process_source_maps.py
           --compiled-source=#{paths.closure.compiled}
           --source-map=#{paths.closure.source_map}
           --web-root=#{paths.build_dir}"



  # Load tasks
  grunt.loadNpmTasks 'grunt-exec'
  grunt.loadNpmTasks 'grunt-coffee'
  grunt.loadNpmTasks 'grunt-contrib-copy'
  grunt.loadNpmTasks 'grunt-contrib-clean'
  grunt.loadNpmTasks 'grunt-closure-tools'
  grunt.loadNpmTasks 'grunt-jasmine-runner'
  grunt.loadNpmTasks 'grunt-jasmine-spec-server'

  # Register tasks
  grunt.registerTask 'compile', ['exec:mkbuild', 'coffee', 'closureCompiler',
    'copy:build',
                                 'exec:process_source_maps']
  grunt.registerTask 'deps', ['coffee', 'closureDepsWriter']
  grunt.registerTask 'test', ['deps', 'jasmine', 'clean:test']
  grunt.registerTask 'server', ['deps', 'jasmineSpecServer', 'watch']
  grunt.registerTask 'default', ['compile']
