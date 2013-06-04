PHANTOM = node_modules/phantomjs/bin/phantomjs

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

server:
	node spec/server.js &

kill:
	kill -9 `cat spec/pid.txt`
	rm spec/pid.txt

test: compile server
	sleep 1
	$(PHANTOM) ./spec/runner.js http://localhost:8000/spec/runner.html
	make kill
