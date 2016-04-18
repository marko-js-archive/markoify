var chai = require('chai');
chai.config.includeStack = true;
var expect = require('chai').expect;
var path = require('path');
var through = require('through');
var browserify = require('browserify');

var compiler = require('marko/compiler');

describe('markoify', function() {
    it('should handle require of a marko template', function(done) {

        var output = '';
        var b = browserify();
        b.transform(require('../'));
        b.add(path.join(__dirname, 'fixtures/require.js'));
        b.bundle()
            .on('error', function(err) {
                done(err);
            })
            .pipe(through(
                function write(data) {
                    output += data;
                },
                function end() {
                    expect(output).to.contain('require("marko").c(');

                    eval(output);
                    expect(global.templateOutput).to.equal('<div>Hello Frank!</div>');
                    done();
                }));
    });

    it('should handle require.resolve of a marko template', function(done) {

        var output = '';
        var b = browserify();
        b.transform(require('../'));
        b.add(path.join(__dirname, 'fixtures/require.resolve.js'));
        b.bundle()
            .on('error', function(err) {
                done(err);
            })
            .pipe(through(
                function write(data) {
                    output += data;
                },
                function end() {
                    expect(output).to.contain("require('./template.marko.js')");
                    expect(output).to.contain('require("marko").c(');

                    eval(output);
                    expect(global.templateOutput).to.equal('<div>Hello Jane!</div>');
                    done();
                }));
    });

    it('should allow view-engine to be used to load a marko template', function(done) {
        var output = '';
        var b = browserify();
        b.transform(require('../'));
        b.add(path.join(__dirname, 'fixtures/view-engine.js'));
        b.bundle()
            .on('error', function(err) {
                done(err);
            })
            .pipe(through(
                function write(data) {
                    output += data;
                },
                function end() {
                    expect(output).to.contain("require('./template.marko.js')");
                    expect(output).to.contain('require("marko").c(');

                    eval(output);
                    expect(global.templateOutput).to.equal('<div>Hello John!</div>');
                    done();
                }));
    });
});
