#!/usr/bin/env python

import argparse
import json
import os.path
import re

'''
Processes a Closure JavaScript source map to reflect a web root path that is
different from closure's current working directory (CWD).

Note that in order for source maps to work, the original source files must
reside within web-root.
'''

def process_source_map(source_map, web_root):
  # Trim 'file' property of source map
  source_map['file'] = filepath_trim_prefix(source_map['file'], web_root)

  # Trim paths in 'sources' property of source map
  sources = []
  for src in source_map['sources']:
    trimmed_src = filepath_trim_prefix(src, web_root)
    sources.append(trimmed_src)

  source_map['sources'] = sources

  return source_map


def append_source_map_directive(compiled_filepath, source_map_filepath,
                                web_root):
  trimmed_filepath = filepath_trim_prefix(source_map_filepath, web_root)
  with open(compiled_filepath, 'a') as f:
    f.write('\n//@ sourceMappingURL=%s' % trimmed_filepath)


def filepath_trim_prefix(filepath, prefix):
  match = re.match(r'^%s([^\s]*)$' % prefix, filepath)
  if match:
    return match.group(1)

  return filepath


def main():
  parser = argparse.ArgumentParser()

  parser.add_argument('--compiled-source', '-c', dest='compiled_source',
                      required=True)
  parser.add_argument('--source-map', '-m', dest='source_map', required=True)
  parser.add_argument('--web-root', '-r', dest='web_root', required=True)
  args = parser.parse_args()

  # process arguments
  web_root = os.path.normpath(args.web_root)
  compiled_filepath = os.path.normpath(args.compiled_source)
  source_map_filepath = os.path.normpath(args.source_map)

  source_map = None
  with open(source_map_filepath) as f:
    source_map_str = f.read()
    source_map = json.loads(source_map_str)

  source_map = process_source_map(source_map, web_root)
  with open(source_map_filepath, 'w') as f:
    source_map_str = json.dumps(source_map, indent=2, separators=(',', ': '),
                                sort_keys=True)
    f.write(source_map_str)

  append_source_map_directive(compiled_filepath, source_map_filepath, web_root)

if __name__ == '__main__':
  exit(main())
