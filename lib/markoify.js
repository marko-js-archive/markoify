var nodePath = require('path');
var esprima = require('esprima');
var escodegen = require('escodegen');
var estraverse = require('estraverse');
var parseOpts = {};
var through = require('through');
var fs = require('fs');
var compiler = require('marko/compiler');
var raptorAsync = require('raptor-async');

var writeToDisk = compiler.defaultOptions.writeToDisk;

function addCompileJob(asyncJobs, sourceFile) {
    var outFile = sourceFile + '.js';

    asyncJobs.push(function(callback) {
        compiler.compileFile(sourceFile, function(err, src) {
            if (err) {
                callback(err);
                return;
            }

            fs.writeFile(outFile, src, {encoding: 'utf8'}, callback);
        });
    });
}

function transformAST(file, input, callback) {
    var ast = esprima.parse(input, parseOpts);

    var templatePaths = [];

    estraverse.traverse(ast, {
        enter: function(node, parent) {
            var path;
            var ext;

            if (node.type === 'CallExpression' &&
                node.callee.type === 'Identifier' &&
                node.callee.name === 'require' &&
                node.arguments.length === 1 &&
                node.arguments[0].type === 'Literal') {

                path = node.arguments[0].value;
                ext = nodePath.extname(path);

                if (ext === '.marko') {
                    templatePaths.push({
                        path: path,
                        node: node
                    });

                    node.arguments[0] = {
                        'type': 'Literal',
                        'value': writeToDisk ? path + '.js' : path,
                    };
                }
            } else if (node.type === 'CallExpression' &&
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
                    templatePaths.push({
                        path: path,
                        node: node
                    });

                    node.callee = {
                        "type": "Identifier",
                        "name": "require"
                    };

                    node.arguments = [
                        {
                            "type": "Literal",
                            'value': writeToDisk ? path + '.js' : path,
                        }
                    ];
                }
            }
        }
    });

    var asyncJobs = [];

    var dirname = nodePath.dirname(file);

    if(writeToDisk) {
        for (var i=0, len=templatePaths.length; i<len; i++) {
            var templatePath = nodePath.resolve(dirname, templatePaths[i].path);
            addCompileJob(asyncJobs, templatePath);
        }
    }

    var code = escodegen.generate(ast);

    raptorAsync.parallel(asyncJobs, function(err) {
        if (err) {
            callback(err);
            return;
        } else {
            callback(null, code);
        }
    });
}

module.exports = function transform(file) {
    var input = '';
    var stream = through(
        function write(data) {
            input += data;
        },
        function(end) {
            if (!writeToDisk && /.marko$/.test(file)) {
                input = compiler.compile(input, file);
            } else if (input.indexOf('.marko') === -1) {
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
