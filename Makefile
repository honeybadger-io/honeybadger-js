PHANTOM = node_modules/phantomjs/bin/phantomjs

FINAL=honeybadger.js

VERSION=v$(shell cat package.json | ruby -r json -e "puts JSON.parse(ARGF.read)['version'][/\d\.\d/]")
BUILD_DIR=build/$(VERSION)
CDN=//js.honeybadger.io/$(VERSION)
MINIFIED=honeybadger.min.js
SOURCE_MAP=honeybadger.min.js.map

all: minify

clean:
	rm -rf build/

minify:
	uglifyjs --compress --mangle --source-map "filename='$(SOURCE_MAP)',url='$(CDN)/$(SOURCE_MAP)'" -o $(MINIFIED) $(FINAL)
	mkdir -p $(BUILD_DIR)
	cp $(FINAL) $(BUILD_DIR)
	mv $(MINIFIED) $(BUILD_DIR)
	mv $(SOURCE_MAP) $(BUILD_DIR)

test:
	grunt jasmine
