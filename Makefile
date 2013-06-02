TEST_RUNNER = node_modules/phantom-jasmine/bin/phantom-jasmine

FINAL=honeybadger.js
MINIFIED=honeybadger.min.js

BUILD_FILES = src/header.txt \
							vendor/tracekit.js \
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
	uglifyjs -o $(MINIFIED) $(FINAL)

test: compile
	$(TEST_RUNNER) build/spec/
