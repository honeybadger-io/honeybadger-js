// Example structure of a rollup bundle
// Output from examples/rollup

export default {
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
    type: 'chunk',
    dynamicImports: [],
    fileName: 'index.js',
    implicitlyLoadedBefore: [],
    importedBindings: { 'foo.js': [Array], 'subfolder/bar.js': [Array] },
    imports: [ 'foo.js', 'subfolder/bar.js' ],
    modules: {
      '/Users/bethanyberkowitz/projects/honeybadger/honeybadger-js/packages/rollup-plugin/examples/rollup/src/index.js': {}
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
    map: {
      version: 3,
      file: 'index.js',
      sources: [Array],
      sourcesContent: [Array],
      names: [],
      mappings: ';;;;;AAGe,cAAQ,IAAI;AAC3B,EAAE,OAAO,CAAC,GAAG,CAAC,GAAG,EAAC;AAClB,EAAE,OAAO,CAAC,GAAG,CAAC,GAAG,EAAC;AAClB;;;;'
    }
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
    type: 'chunk',
    dynamicImports: [],
    fileName: 'foo.js',
    implicitlyLoadedBefore: [],
    importedBindings: {},
    imports: [],
    modules: {
      '/Users/bethanyberkowitz/projects/honeybadger/honeybadger-js/packages/rollup-plugin/examples/rollup/src/foo.js': [Object]
    },
    referencedFiles: [],
    code: "'use strict';\n\nvar foo = 'hello world!';\n\nmodule.exports = foo;\n",
    map: {
      version: 3,
      file: 'foo.js',
      sources: [Array],
      sourcesContent: [Array],
      names: [],
      mappings: ';;AAAA,UAAe;;;;'
    }
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
    type: 'chunk',
    dynamicImports: [],
    fileName: 'subfolder/bar.js',
    implicitlyLoadedBefore: [],
    importedBindings: {},
    imports: [],
    modules: {
      '/Users/bethanyberkowitz/projects/honeybadger/honeybadger-js/packages/rollup-plugin/examples/rollup/src/subfolder/bar.js': [Object]
    },
    referencedFiles: [],
    code: "'use strict';\n" +
      '\n' +
      "var bar = 'This is in a subfolder!';\n" +
      '\n' +
      'module.exports = bar;\n',
    map: {
      version: 3,
      file: 'bar.js',
      sources: [Array],
      sourcesContent: [Array],
      names: [],
      mappings: ';;AAAA,UAAe;;;;'
    }
  },
  'index.js.map': {
    fileName: 'index.js.map',
    name: undefined,
    source: '{"version":3,"file":"index.js","sources":["../src/index.js"],"sourcesContent":["import foo from \'./foo.js\';\\nimport bar from \'./subfolder/bar.js\'\\n\\nexport default function () {\\n  console.log(foo)\\n  console.log(bar)\\n}"],"names":[],"mappings":";;;;;AAGe,cAAQ,IAAI;AAC3B,EAAE,OAAO,CAAC,GAAG,CAAC,GAAG,EAAC;AAClB,EAAE,OAAO,CAAC,GAAG,CAAC,GAAG,EAAC;AAClB;;;;"}',
    type: 'asset'
  },
  'subfolder/bar.js.map': {
    fileName: 'subfolder/bar.js.map',
    name: undefined,
    source: '{"version":3,"file":"bar.js","sources":["../../src/subfolder/bar.js"],"sourcesContent":["export default \'This is in a subfolder!\'"],"names":[],"mappings":";;AAAA,UAAe;;;;"}',
    type: 'asset'
  },
  'foo.js.map': {
    fileName: 'foo.js.map',
    name: undefined,
    source: '{"version":3,"file":"foo.js","sources":["../src/foo.js"],"sourcesContent":["export default \'hello world!\'"],"names":[],"mappings":";;AAAA,UAAe;;;;"}',
    type: 'asset'
  }
}