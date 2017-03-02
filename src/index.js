'use strict';

var nodePath = require('path');
var esprima = require('esprima');
var escodegen = require('escodegen');
var estraverse = require('estraverse');
var parseOpts = {};
var through = require('through');
var compiler = require('marko/compiler');
var minprops = require('minprops');

var isDevelopment =
    !process.env.NODE_ENV ||
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'dev';

var minpropsEnabled = !isDevelopment;

function transformAST(file, input, callback) {
    var ast = esprima.parse(input, parseOpts);

    estraverse.traverse(ast, {
        enter: function(node, parent) {
            var path;
            var ext;

            // Transform require.resolve('./template.marko') to require('./template.marko')
            if (node.type === 'CallExpression' &&
                node.callee.type === 'MemberExpression' &&
                node.callee.object.type === 'Identifier' &&
                node.callee.object.name === 'require' &&
                node.callee.property.type === 'Identifier' &&
                node.callee.property.name === 'resolve' &&
                node.arguments.length === 1 &&
                node.arguments[0].type === 'Literal') {

                path = node.arguments[0].value;
                ext = nodePath.extname(path);

                if (ext === '.marko') {
                    node.callee = {
                        "type": "Identifier",
                        "name": "require"
                    };

                    node.arguments = [
                        {
                            "type": "Literal",
                            'value': path,
                        }
                    ];
                }
            }
        }
    });

    var code = escodegen.generate(ast);
    callback(null, code);
}

module.exports = function transform(file) {
    var input = '';
    var stream = through(
        function write(data) {
            input += data;
        },
        function(end) {
            if (/.marko$/.test(file)) {
                if (compiler.compileForBrowser) {
                    var compiled = compiler.compileForBrowser(input, file);
                    // TODO Do something with compiled.dependencies
                    input = compiled.code;
                } else {
                    input = compiler.compile(input, file);
                }
            } else {
                if (minpropsEnabled) {
                    input = minprops(input, file);
                }
            }

            if (input.indexOf('.marko') === -1) {
                stream.queue(input);
                return stream.queue(null);
            }

            transformAST(file, input, function(err, code) {
                if (err) {
                    stream.emit('error', err);
                    stream.queue(null);
                } else {
                    stream.queue(code);
                }
                stream.queue(null);
            });
        });

    return stream;
};