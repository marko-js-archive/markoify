var nodePath = require('path');
var esprima = require('esprima');
var escodegen = require('escodegen');
var estraverse = require('estraverse');
var parseOpts = {};
var through = require('through');
var shortCircuitRegExp = /require\.resolve/;
var fs = require('fs');
var compiler = require('raptor-templates/compiler');
var raptorAsync = require('raptor-async');

function addCompileJob(asyncJobs, sourceFile) {
    var outFile = sourceFile + '.js';

    var lastModifiedSource = fs.statSync(sourceFile).mtime.getTime();
    var lastModifiedOut;
    try {
        lastModifiedOut = fs.statSync(outFile).mtime.getTime();
    } catch(e) {
        lastModifiedOut = 0;
    }

    if (lastModifiedSource > lastModifiedOut) {
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
}

function transformAST(file, input, callback) {
    var ast = esprima.parse(input, parseOpts);
    var modified = false;

    var transformNodes = [];

    estraverse.traverse(ast, {
        enter: function(node, parent) {
            if (node.type === 'CallExpression' &&
                node.callee.type === 'MemberExpression' &&
                node.callee.object.type === 'Identifier' &&
                node.callee.object.name === 'require' &&
                node.callee.property.type === 'Identifier' &&
                node.callee.property.name === 'resolve' &&
                node.arguments.length === 1 &&
                node.arguments[0].type === 'Literal') {

                var path = node.arguments[0].value;
                var ext = nodePath.extname(path);
                if (ext === '.rhtml') {
                    transformNodes.push({
                        path: path,
                        node: node
                    });
                }
            }
        }
    });

    var asyncJobs = [];

    if (transformNodes.length) {
        var dirname = nodePath.dirname(file);
        modified = true;
        for (var i=0, len=transformNodes.length; i<len; i++) {
            var node = transformNodes[i].node;
            var sourceFile = nodePath.resolve(dirname, transformNodes[i].path);
            
            addCompileJob(asyncJobs, sourceFile);

            node.callee.type = 'Identifier';
            node.callee.name = 'require';
            node.arguments[0].value += '.js';

            // require.resolve is not supported

            // var callee = node.callee;
            // var args = node.arguments;
            // delete node.callee;
            // delete node.arguments;

            // node.type = 'LogicalExpression';
            // node.operator = '&&';
            // node.left = {
            //     type: 'CallExpression',
            //     callee: {
            //         type: 'Identifier',
            //         name: 'require'
            //     },
            //     arguments: [
            //         {
            //             type: 'Literal',
            //             value: sourceFile + '.js'
            //         }
            //     ]
            // };

            // node.right = {
            //     type: 'CallExpression',
            //     callee: callee,
            //     arguments: args
            // };
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
    } else {
        callback(null, input);
    }
}

module.exports = function transform(file) {
    var input = '';
    var stream = through(
        function write(data) {
            input += data;
        },
        function(end) {
            if (shortCircuitRegExp.test(input) === false) {
                stream.queue(input);
                stream.queue(null);
            } else {
                transformAST(file, input, function(err, code) {
                    if (err) {
                        stream.emit('error', err);
                        stream.queue(null);
                    } else {
                        stream.queue(code);
                    }
                    stream.queue(null);
                });
            }
            
        });

    return stream;
};