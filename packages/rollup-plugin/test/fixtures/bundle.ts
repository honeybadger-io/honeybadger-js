// Example structure of a rollup bundle
// Output from examples/rollup with some typescript mixed in

const chunks = {
  'index.js': {
    exports: [ 'default' ],
    facadeModuleId: '/Users/bethanyberkowitz/projects/honeybadger/honeybadger-js/packages/rollup-plugin/examples/rollup/src/index.js',
    isDynamicEntry: false,
    isEntry: true,
    isImplicitEntry: false,
    moduleIds: [
      '/Users/bethanyberkowitz/projects/honeybadger/honeybadger-js/packages/rollup-plugin/examples/rollup/src/index.js'
    ],
    name: 'index',
    type: 'chunk' as const,
    dynamicImports: [],
    fileName: 'index.js',
    implicitlyLoadedBefore: [],
    importedBindings: { 'foo.js': [], 'subfolder/bar.js': [] },
    imports: [ 'foo.js', 'subfolder/bar.js' ],
    modules: {
      '/Users/bethanyberkowitz/projects/honeybadger/honeybadger-js/packages/rollup-plugin/examples/rollup/src/index.js': {
        'code': 'function index () {\n  console.log(foo);\n  console.log(bar);\n}',
        'originalLength': 134,
        'removedExports': [],
        'renderedExports': ['default'],
        'renderedLength': 61
      }
    },
    referencedFiles: [],
    code: "'use strict';\n" +
      '\n' +
      "var foo = require('./foo.js');\n" +
      "var bar = require('./subfolder/bar.js');\n" +
      '\n' +
      'function index () {\n' +
      '  console.log(foo);\n' +
      '  console.log(bar);\n' +
      '}\n' +
      '\n' +
      'module.exports = index;\n',
    map: null
  },
  'foo.js': {
    exports: [ 'default' ],
    facadeModuleId: '/Users/bethanyberkowitz/projects/honeybadger/honeybadger-js/packages/rollup-plugin/examples/rollup/src/foo.js',
    isDynamicEntry: false,
    isEntry: false,
    isImplicitEntry: false,
    moduleIds: [
      '/Users/bethanyberkowitz/projects/honeybadger/honeybadger-js/packages/rollup-plugin/examples/rollup/src/foo.js'
    ],
    name: 'foo',
    type: 'chunk' as const,
    dynamicImports: [],
    fileName: 'foo.js',
    implicitlyLoadedBefore: [],
    importedBindings: {},
    imports: [],
    modules: {
      '/Users/bethanyberkowitz/projects/honeybadger/honeybadger-js/packages/rollup-plugin/examples/rollup/src/foo.js': {
        'code': "var foo = 'hello world!';",
        'originalLength': 29,
        'removedExports': [],
        'renderedExports': ['default'],
        'renderedLength': 25
      }
    },
    referencedFiles: [],
    code: "'use strict';\n\nvar foo = 'hello world!';\n\nmodule.exports = foo;\n",
    map: null
  },
  'subfolder/bar.js': {
    exports: [ 'default' ],
    facadeModuleId: '/Users/bethanyberkowitz/projects/honeybadger/honeybadger-js/packages/rollup-plugin/examples/rollup/src/subfolder/bar.js',
    isDynamicEntry: false,
    isEntry: false,
    isImplicitEntry: false,
    moduleIds: [
      '/Users/bethanyberkowitz/projects/honeybadger/honeybadger-js/packages/rollup-plugin/examples/rollup/src/subfolder/bar.js'
    ],
    name: 'subfolder/bar',
    type: 'chunk' as const,
    dynamicImports: [],
    fileName: 'subfolder/bar.js',
    implicitlyLoadedBefore: [],
    importedBindings: {},
    imports: [],
    modules: {
      '/Users/bethanyberkowitz/projects/honeybadger/honeybadger-js/packages/rollup-plugin/examples/rollup/src/subfolder/bar.js': {
        'code': "var bar = 'This is in a subfolder!';",
        'originalLength': 40,
        'removedExports': [],
        'renderedExports': ['default'],
        'renderedLength': 36
      }
    },
    referencedFiles: [],
    code: "'use strict';\n" +
      '\n' +
      "var bar = 'This is in a subfolder!';\n" +
      '\n' +
      'module.exports = bar;\n',
    map: null
  },
  'empty.sass': {
    exports: [ 'default' ],
    facadeModuleId: '/Users/bethanyberkowitz/projects/honeybadger/honeybadger-js/packages/rollup-plugin/examples/rollup/src/empty.sass',
    isDynamicEntry: false,
    isEntry: false,
    isImplicitEntry: false,
    moduleIds: [
      '/Users/bethanyberkowitz/projects/honeybadger/honeybadger-js/packages/rollup-plugin/examples/rollup/src/empty.sass'
    ],
    name: 'empty',
    type: 'chunk' as const,
    dynamicImports: [],
    fileName: 'empty.sass',
    implicitlyLoadedBefore: [],
    importedBindings: {},
    imports: [],
    modules: {
      '/Users/bethanyberkowitz/projects/honeybadger/honeybadger-js/packages/rollup-plugin/examples/rollup/src/empty.sass': {
        'code': 'color: blue;',
        'originalLength': 12,
        'removedExports': [],
        'renderedExports': ['default'],
        'renderedLength': 12
      }
    },
    referencedFiles: [],
    code: 'color: blue;',
    map: null
  },
}

const assets = {
  'index.js.map': {
    fileName: 'index.js.map',
    name: undefined,
    source: '{"version":3,"file":"index.js","sources":["../src/index.js"],"sourcesContent":["import foo from \'./foo.js\';\\nimport bar from \'./subfolder/bar.js\'\\n\\nexport default function () {\\n  console.log(foo)\\n  console.log(bar)\\n}"],"names":[],"mappings":";;;;;AAGe,cAAQ,IAAI;AAC3B,EAAE,OAAO,CAAC,GAAG,CAAC,GAAG,EAAC;AAClB,EAAE,OAAO,CAAC,GAAG,CAAC,GAAG,EAAC;AAClB;;;;"}',
    type: 'asset' as const,
    needsCodeReference: false
  },
  'subfolder/bar.js.map': {
    fileName: 'subfolder/bar.js.map',
    name: undefined,
    source: '{"version":3,"file":"bar.js","sources":["../../src/subfolder/bar.js"],"sourcesContent":["export default \'This is in a subfolder!\'"],"names":[],"mappings":";;AAAA,UAAe;;;;"}',
    type: 'asset' as const,
    needsCodeReference: false
  },
  // The subfolder is included in the "file" key within "source"
  'sub/folder/baz.js.map': {
    fileName: 'sub/folder/baz.js.map',
    name: undefined,
    source: '{"version":3,"file":"sub/folder/baz.js","sources":["../../src/subfolder/baz.js"],"sourcesContent":["export default \'This is in a subfolder!\'"],"names":[],"mappings":";;AAAA,UAAe;;;;"}',
    type: 'asset' as const,
    needsCodeReference: false
  },
  'foo.js.map': {
    fileName: 'foo.js.map',
    name: undefined,
    source: '{"version":3,"file":"foo.js","sources":["../src/foo.js"],"sourcesContent":["export default \'hello world!\'"],"names":[],"mappings":";;AAAA,UAAe;;;;"}',
    type: 'asset' as const,
    needsCodeReference: false
  },
  'empty.js.map': {
    fileName: 'empty.js.map',
    name: undefined,
    source: '{"version":3,"file":"empty.sass","sources":[], "sourcesContent": [], "names":[],"mappings":""}',
    type: 'asset' as const,
    needsCodeReference: false
  }
}


export default { ...chunks, ...assets }
