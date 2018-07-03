import expect, { createSpy, isSpy, spyOn } from 'expect';
import nock from 'nock';
import HoneybadgerSourceMapPlugin from '../src/HoneybadgerSourceMapPlugin';

describe('HoneybadgerSourceMapPlugin', function() {
  beforeEach(function() {
    this.compiler = {
      plugin: createSpy()
    };

    this.options = {
      apiKey: 'abcd1234',
      assetsUrl: 'https://cdn.example.com/assets'
    };

    this.plugin = new HoneybadgerSourceMapPlugin(this.options);
    this.plugin.apply(this.compiler);
  });

  describe('constructor', function() {
    it('should return an instance', function() {
      expect(this.plugin).toBeA(HoneybadgerSourceMapPlugin);
    });

    it('should set options', function() {
      const options = Object.assign({}, this.options, {
        apiKey: "other-api-key",
        assetsUrl: 'https://cdn.example.com/assets'
      });
      const plugin = new HoneybadgerSourceMapPlugin(options);
      expect(plugin).toInclude(options);
    });

    it('should default silent to false', function() {
      expect(this.plugin).toInclude({ silent: false });
    });

    it('should default revision to "master"', function() {
      expect(this.plugin).toInclude({ revision: "master" });
    });
  });

  describe('apply', function() {
    it('should hook into "after-emit"', function() {
      expect(this.compiler.plugin.calls.length).toBe(1);
      expect(this.compiler.plugin.calls[0].arguments).toEqual([
        'after-emit',
        this.plugin.afterEmit.bind(this.plugin)
      ]);
    });

    it('should tap into "afterEmit" hook', function() {
      this.compiler.hooks = {
        afterEmit: {
          tapAsync: createSpy(),
        }
      }

      this.plugin.apply(this.compiler);

      const { afterEmit } = this.compiler.hooks

      expect(afterEmit.tapAsync.calls.length).toBe(1);
      expect(afterEmit.tapAsync.calls[0].arguments).toEqual([
        'HoneybadgerSourceMapPlugin',
        this.plugin.afterEmit.bind(this.plugin)
      ]);
    });
  });

  describe('afterEmit', function() {
    beforeEach(function() {
      this.uploadSourceMaps = spyOn(this.plugin, 'uploadSourceMaps')
        .andCall((compilation, callback) => callback());
    });

    afterEach(function() {
      if (isSpy(this.uploadSourceMaps)) {
        this.uploadSourceMaps.restore();
      }
    });

    it('should call uploadSourceMaps', function(done) {
      const compilation = {
        errors: [],
        warnings: []
      };
      this.plugin.afterEmit(compilation, () => {
        expect(this.uploadSourceMaps.calls.length).toBe(1);
        expect(compilation.errors.length).toBe(0);
        expect(compilation.warnings.length).toBe(0);
        done();
      });
    });

    it('should add upload warnings to compilation warnings, ' +
      'if ignoreErrors is true and silent is false', function(done) {
      const compilation = {
        errors: [],
        warnings: []
      };
      this.plugin.ignoreErrors = true;
      this.plugin.silent = false;
      this.uploadSourceMaps = spyOn(this.plugin, 'uploadSourceMaps')
        .andCall((comp, callback) => callback(new Error()));
      this.plugin.afterEmit(compilation, () => {
        expect(this.uploadSourceMaps.calls.length).toBe(1);
        expect(compilation.errors.length).toBe(0);
        expect(compilation.warnings.length).toBe(1);
        expect(compilation.warnings[0]).toBeA(Error);
        done();
      });
    });

    it('should not add upload errors to compilation warnings if silent is true', function(done) {
      const compilation = {
        errors: [],
        warnings: []
      };
      this.plugin.ignoreErrors = true;
      this.plugin.silent = true;
      this.uploadSourceMaps = spyOn(this.plugin, 'uploadSourceMaps')
        .andCall((comp, callback) => callback(new Error()));
      this.plugin.afterEmit(compilation, () => {
        expect(this.uploadSourceMaps.calls.length).toBe(1);
        expect(compilation.errors.length).toBe(0);
        expect(compilation.warnings.length).toBe(0);
        done();
      });
    });

    it('should add upload errors to compilation errors', function(done) {
      const compilation = {
        errors: [],
        warnings: []
      };
      this.plugin.ignoreErrors = false;
      this.uploadSourceMaps = spyOn(this.plugin, 'uploadSourceMaps')
        .andCall((comp, callback) => callback(new Error()));
      this.plugin.afterEmit(compilation, () => {
        expect(this.uploadSourceMaps.calls.length).toBe(1);
        expect(compilation.warnings.length).toBe(0);
        expect(compilation.errors.length).toBe(1);
        expect(compilation.errors[0]).toBeA(Error);
        done();
      });
    });

    it('should add validation errors to compilation', function(done) {
      const compilation = {
        errors: [],
        warnings: [],
        getStats: () => ({
          toJson: () => ({ chunks: this.chunks })
        })
      };

      this.plugin = new HoneybadgerSourceMapPlugin({
        revision: 'fab5a8727c70647dcc539318b5b3e9b0cb8ae17b',
        assetsUrl: 'https://cdn.example.com/assets',
      });
      this.plugin.afterEmit(compilation, () => {
        expect(this.uploadSourceMaps.calls.length).toBe(0);
        expect(compilation.errors.length).toBe(1);
        done();
      });
    });
  });

  describe('getAssets', function() {
    beforeEach(function() {
      this.chunks = [
        {
          id: 0,
          names: ['app'],
          files: ['app.81c1.js', 'app.81c1.js.map']
        }
      ];
      this.compilation = {
        getStats: () => ({
          toJson: () => ({ chunks: this.chunks })
        })
      };
    });

    it('should return an array of js, sourcemap tuples', function() {
      const assets = this.plugin.getAssets(this.compilation);
      expect(assets).toEqual([
        { sourceFile: 'app.81c1.js', sourceMap: 'app.81c1.js.map' }
      ]);
    });

    it('should ignore chunks that do not have a sourcemap asset', function() {
      this.chunks = [
        {
          id: 0,
          names: ['app'],
          files: ['app.81c1.js', 'app.81c1.js.map']
        }
      ];
      const assets = this.plugin.getAssets(this.compilation);
      expect(assets).toEqual([
        { sourceFile: 'app.81c1.js', sourceMap: 'app.81c1.js.map' }
      ]);
    });
  });

  describe('uploadSourceMaps', function() {
    beforeEach(function() {
      this.compilation = { name: 'test', errors: [] };
      this.assets = [
        { sourceFile: 'vendor.5190.js', sourceMap: 'vendor.5190.js.map' },
        { sourceFile: 'app.81c1.js', sourceMap: 'app.81c1.js.map' }
      ];
      this.getAssets = spyOn(this.plugin, 'getAssets').andReturn(this.assets);
      this.uploadSourceMap = spyOn(this.plugin, 'uploadSourceMap')
        .andCall((comp, chunk, callback) => callback());
    });

    afterEach(function() {
      [this.getAssets, this.uploadSourceMap].forEach((func) => {
        if (isSpy(func)) {
          func.restore();
        }
      });
    });

    it('should call uploadSourceMap for each chunk', function(done) {
      this.plugin.uploadSourceMaps(this.compilation, (err) => {
        if (err) {
          return done(err);
        }
        expect(this.getAssets.calls.length).toBe(1);
        expect(this.compilation.errors.length).toBe(0);
        expect(this.uploadSourceMap.calls.length).toBe(2);

        expect(this.uploadSourceMap.calls[0].arguments[0])
          .toEqual({ name: 'test', errors: [] });
        expect(this.uploadSourceMap.calls[0].arguments[1])
          .toEqual({ sourceFile: 'vendor.5190.js', sourceMap: 'vendor.5190.js.map' });

        expect(this.uploadSourceMap.calls[1].arguments[0])
          .toEqual({ name: 'test', errors: [] });
        expect(this.uploadSourceMap.calls[1].arguments[1])
          .toEqual({ sourceFile: 'app.81c1.js', sourceMap: 'app.81c1.js.map' });
        done();
      });
    });

    it('should call err-back if uploadSourceMap errors', function(done) {
      this.uploadSourceMap = spyOn(this.plugin, 'uploadSourceMap')
        .andCall((comp, chunk, callback) => callback(new Error()));
      this.plugin.uploadSourceMaps(this.compilation, (err, result) => {
        expect(err).toExist();
        expect(err).toBeA(Error);
        expect(result).toBe(undefined);
        done();
      });
    });
  });

  describe('uploadSourceMap', function() {
    beforeEach(function() {
      this.info = spyOn(console, 'info');
      this.compilation = {
        assets: {
          'vendor.5190.js': { source: () => '/**/' },
          'vendor.5190.js.map': { source: () => '{"version":3,"file":"vendor.5190.js","sources":["vendor.js"],"names":[],mappings:""}' },
          'app.81c1.js': { source: () => '/**/' },
          'app.81c1.js.map': { source: () => '{"version":3,"file":"app.81c1.js","sources":["app.js"],"names":[],mappings:""}' }
        },
        errors: []
      };

      this.chunk = {
        sourceFile: 'vendor.5190.js',
        sourceMap: 'vendor.5190.js.map'
      };
    });

    afterEach(function() {
      this.info.restore();
    });

    it('should callback without err param if upload is success', function(done) {
      // FIXME/TODO test multipart form body ... it isn't really supported easily by nock
      const scope = nock('https://api.honeybadger.io') // eslint-disable-line no-unused-vars
        .filteringRequestBody(function(body) { return '*'; })
        .post('/v1/source_maps', '*')
        .reply(201, JSON.stringify({ status: 'OK' }));

      const { compilation, chunk } = this;
      this.plugin.uploadSourceMap(compilation, chunk, (err) => {
        if (err) {
          return done(err);
        }
        expect(this.info).toHaveBeenCalledWith('Uploaded vendor.5190.js.map to Honeybadger API');
        done();
      });
    });

    it('should not log upload to console if silent option is true', function(done) {
      const scope = nock('https://api.honeybadger.io') // eslint-disable-line no-unused-vars
        .filteringRequestBody(function(body) { return '*'; })
        .post('/v1/source_maps', '*')
        .reply(201, JSON.stringify({ status: 'OK' }));

      const { compilation, chunk } = this;
      this.plugin.silent = true;
      this.plugin.uploadSourceMap(compilation, chunk, (err) => {
        if (err) {
          return done(err);
        }
        expect(this.info).toNotHaveBeenCalled();
        done();
      });
    });

    it('should log upload to console if silent option is false', function(done) {
      const scope = nock('https://api.honeybadger.io') // eslint-disable-line no-unused-vars
        .filteringRequestBody(function(body) { return '*'; })
        .post('/v1/source_maps', '*')
        .reply(201, JSON.stringify({ status: 'OK' }));

      const { compilation, chunk } = this;
      this.plugin.silent = false;
      this.plugin.uploadSourceMap(compilation, chunk, (err) => {
        if (err) {
          return done(err);
        }
        expect(this.info).toHaveBeenCalledWith('Uploaded vendor.5190.js.map to Honeybadger API');
        done();
      });
    });

    it('should return error message if failure response includes message', function(done) {
      const scope = nock('https://api.honeybadger.io') // eslint-disable-line no-unused-vars
        .filteringRequestBody(function(body) { return '*'; })
        .post('/v1/source_maps', '*')
        .reply(422, JSON.stringify({ error: 'The "source_map" parameter is required' }));

      const { compilation, chunk } = this;
      this.plugin.uploadSourceMap(compilation, chunk, (err) => {
        expect(err).toExist();
        expect(err).toInclude({
          message: 'failed to upload vendor.5190.js.map to Honeybadger API: The "source_map" parameter is required'
        });
        done();
      });
    });

    it('should handle error response with empty body', function(done) {
      const scope = nock('https://api.honeybadger.io') // eslint-disable-line no-unused-vars
        .filteringRequestBody(function(body) { return '*'; })
        .post('/v1/source_maps', '*')
        .reply(422, null);

      const { compilation, chunk } = this;
      this.plugin.uploadSourceMap(compilation, chunk, (err) => {
        expect(err).toExist();
        expect(err.message).toMatch(/failed to upload vendor\.5190.js\.map to Honeybadger API: [\w\s]+/);
        done();
      });
    });

    it('should handle HTTP request error', function(done) {
      const scope = nock('https://api.honeybadger.io') // eslint-disable-line no-unused-vars
        .filteringRequestBody(function(body) { return '*'; })
        .post('/v1/source_maps', '*')
        .replyWithError('something awful happened');

      const { compilation, chunk } = this;
      this.plugin.uploadSourceMap(compilation, chunk, (err) => {
        expect(err).toExist();
        expect(err).toInclude({
          message: 'failed to upload vendor.5190.js.map to Honeybadger API: something awful happened'
        });
        done();
      });
    });
  });

});
