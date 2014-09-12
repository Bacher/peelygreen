
var esprima = require('esprima');
var _ = require('lodash');
var getFragment = require('./fragutils').getFragment;
var fs = require('fs');

var codeLines;
var lastSavedLoc;
var outputFile;
var isRevert;

var spyFunctions;
var idCounter;

function processCode(codeText) {
    codeLines = codeText.split('\n');
    codeLines.unshift('');

    idCounter = 0;
    spyFunctions = {};
    outputFile = '';
    lastSavedLoc = {
        line: 1,
        column: 0
    };

    var ast = esprima.parse(codeText, {
        loc: true,
        raw: true
    });

    parseNode(ast, null);

    outputFile += getFragment(codeLines, {
        start: lastSavedLoc,
        end: 'EOF'
    });

    if (!isRevert) {
        var funcSpiesDeclaration = '';
        var isFirst = true;

        for (var id in spyFunctions) {
            if (!isFirst) {
                funcSpiesDeclaration += ',';
            }
            funcSpiesDeclaration += id + ":'" + spyFunctions[id].funcName + "'";
            isFirst = false;
        }

        if (!isFirst) {
            var pgInjectionCode = String(fs.readFileSync('src/_pg-injection.js'));

            pgInjectionCode = pgInjectionCode.replace(/['"]REPLACE_THIS['"]/, '{' + funcSpiesDeclaration + '}');

            outputFile += pgInjectionCode;
        }
    }

    return outputFile;
}

function process(codeText) {
    return processCode(codeText);
}

function revert(codeText) {
    isRevert = true;

    return processCode(codeText);
}

function parseNode(node, parent) {
    if (Array.isArray(node)) {
        node.forEach(function(el) {
            parseNode(el);
        });
    }

    if (!node || !node.type) {
        return;
    }

    if (isRevert) {
        revertNode(node);
    } else {
        processNode(node, parent);
    }

    for (var prop in node) {
        if (node.hasOwnProperty(prop) && prop !== 'type' && prop !== 'loc') {
            parseNode(node[prop], node);
        }
    }
}

function processNode(node, parent) {
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {

        var functionDeclaration = getFragment(codeLines, {
            start: node.loc.start,
            end: node.body.body[0].loc.start
        });

        var inComment = false;

        for (var i = 0; i < functionDeclaration.length; ++i) {
            if (inComment) {

                if (inComment === 'line') {
                    if (functionDeclaration[i] === '\n') {
                        inComment = false;
                    }
                } else if (inComment === 'block') {
                    if (functionDeclaration[i] === '*' && functionDeclaration[i + 1] === '/') {
                        i++;
                        inComment = false;
                    }
                }

            } else {
                if (functionDeclaration[i] === '{') {
                    i++;
                    break;
                }

                if (functionDeclaration[i] === '/' && functionDeclaration[i + 1] === '/') {
                    i++;
                    inComment = 'line';
                }

                if (functionDeclaration[i] === '/' && functionDeclaration[i + 1] === '*') {
                    i++;
                    inComment = 'block';
                }
            }
        }

        var funcName = '';

        if (parent) {
            if (parent.type === 'Property') {
                funcName = parent.key.name;
            } else if (parent.type === 'VariableDeclarator') {
                funcName = parent.id.name;
            }
        }

        if (node.id) {
            funcName += (funcName ? ' (' : '') + node.id.name + (funcName ? ')' : '');
        }

        if (!funcName) {
            funcName = '{unknown}';
        }

        var id = ++idCounter;

        spyFunctions[id] = {
            funcName: funcName
        };

        var newFunctionDeclaration =
            functionDeclaration.substr(0, i) +
            'pg(' + id + ',arguments);' +
            functionDeclaration.substr(i);

        outputFile += getFragment(codeLines, {
            start: lastSavedLoc,
            end: node.loc.start
        });

        outputFile += newFunctionDeclaration;

        lastSavedLoc = node.body.body[0].loc.start;
    }
}

function revertNode(node) {
    if (node.type === 'ExpressionStatement' &&
        node.expression.type === 'CallExpression' &&
        node.expression.callee.name === 'pg'
        ) {

        outputFile += getFragment(codeLines, {
            start: lastSavedLoc,
            end: node.loc.start
        });

        lastSavedLoc = {
            line: node.loc.end.line,
            column: node.loc.end.column + 1
        };

    } else if (node.type === 'FunctionDeclaration' &&
        node.id.name === 'pg') {

        outputFile += getFragment(codeLines, {
            start: lastSavedLoc,
            end: node.loc.start
        });

        if (node.loc.end.line + 1 === codeLines.length) {
            lastSavedLoc = 'EOF';
        } else {
            lastSavedLoc = {
                line: node.loc.end.line + 1,
                column: 0
            };
        }
    }
}

module.exports = {
    process: process,
    revert: revert
};
