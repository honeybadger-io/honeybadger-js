'use strict';

const TEST_FILE_REGEX= /(spec|test(s?))\.(js|ts|tsx)/
// we can add more modules here
const TEST_MODULES_REGEX= /jest/

module.exports = {
  'no-test-imports': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow importing test files in source code',
      },
      fixable: 'code',
      schema: [] // no options
    },
    create: function(context) {
      return {
        ImportDeclaration: function(node) {
          const physicalFilename = context.getPhysicalFilename().toLowerCase();

          // stop if the filename is not in the src/ directory or is a test file
          if (!physicalFilename.includes('src/') ||
              physicalFilename.match(TEST_FILE_REGEX)) {
            return;
          }

          // if we get here, we're in a source file, not a test file
          const importSource = node.source.value.trim();
          // do not allow importing test files or modules that include 'jest', such as 'jest-fetch-mock'
          if (importSource.match(TEST_FILE_REGEX) ||
              importSource.match(TEST_MODULES_REGEX)) {
            context.report({
              node: node,
              message: 'Do not import test modules in source code',
              fix: function(fixer) {
                return fixer.remove(node);
              }
            });
          }
        }
      };
    }
  }
};
