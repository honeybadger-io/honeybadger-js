PHANTOM = node_modules/phantomjs/bin/phantomjs

FINAL=honeybadger.js

VERSION=v$(shell cat package.json | ruby -r json -e "puts JSON.parse(ARGF.read)['version'][/\d\.\d/]")
BUILD_DIR=build/$(VERSION)
CDN=//js.honeybadger.io/$(VERSION)
MINIFIED=honeybadger.min.js
SOURCE_MAP=honeybadger.min.js.map

BUILD_FILES = src/header.txt \
							build/src/configuration.js \
							build/src/notice.js \
              build/src/honeybadger.js \
							src/footer.txt

all: compile concat minify

clean:
	rm -rf build/

compile: clean
	coffee --compile --bare --output ./build .

concat: $(BUILD_FILES)
	cat $^ >$(FINAL)

minify:
	mkdir -p $(BUILD_DIR)
	uglifyjs --source-map $(BUILD_DIR)/$(SOURCE_MAP) --source-map-url $(CDN)/$(SOURCE_MAP) -o $(BUILD_DIR)/$(MINIFIED) $(FINAL)

server:
	node spec/server.js &

kill:
	kill -9 `cat spec/pid.txt`
	rm spec/pid.txt

test: compile server
	sleep 1
	$(PHANTOM) ./spec/runner.js http://localhost:8000/spec/runner.html
	make kill
