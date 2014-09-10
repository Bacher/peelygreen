
var esprima = require('esprima');
var _ = require('lodash');
var getFragment = require('./fragutils').getFragment;

var codeLines;
var lastSavedLoc;
var outputFile;
var isRevert;

function processCode(codeText) {
    codeLines = codeText.split('\n');
    codeLines.unshift('');

    outputFile = '';
    lastSavedLoc = { line: 1, column: 0 };

    var ast = esprima.parse(codeText, {
        loc: true,
        raw: true
    });

    parseNode(ast, null);

    outputFile += getFragment(codeLines, {
        start: lastSavedLoc,
        end: 'EOF'
    });

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
        _.forEachRight(node, function(el) {
            parseNode(el);
        });
    }

    if (!node || !node.type) {
        return;
    }

    if (isRevert) {
        if (revertNode(node)) {
            return;
        }
    } else {
        if (processNode(node, parent)) {
            return;
        }
    }

    for (var prop in node) {
        if (node.hasOwnProperty(prop) && prop !== 'type' && prop !== 'loc') {
            parseNode(node[prop], node);
        }
    }
}

function processNode(node, parent) {
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {

        outputFile += getFragment(codeLines, {
            start: lastSavedLoc,
            end: node.loc.start
        });

        var functionDeclaration = getFragment(codeLines, {
            start: node.loc.start,
            end: node.body.body[0].loc.start
        });

        var i = functionDeclaration.length - 1;
        while (/\s/.test(functionDeclaration.charAt(i))) {
            i--;
        }

        var funcName = '';

        if (parent.type === 'Property') {
            funcName = parent.key.name;
        } else if (parent.type === 'VariableDeclarator') {
            funcName = parent.id.name;
        }

        if (node.id) {
            funcName += (funcName ? ' (' : '') + node.id.name + (funcName ? ')' : '');
        }

        if (!funcName) {
            funcName = '{unknown}';
        }

        var newFunctionDeclaration =
            functionDeclaration.substr(0, i + 1) +
            "console.log('=== PG:Call " + funcName + "', arguments);" +
            functionDeclaration.substr(i + 1);

        outputFile += newFunctionDeclaration;

        outputFile += getFragment(codeLines, {
            start: node.body.body[0].loc.start,
            end: node.loc.end
        });

        lastSavedLoc = node.loc.end;

        return true;
    }
}

function revertNode(node) {
    if (node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression' &&
        node.callee.object.name === 'console' &&
        node.callee.property.name === 'log' &&
        node.arguments.length &&
        node.arguments[0].type === 'Literal' &&
        /^=== PG:Call/.test(node.arguments[0].value)
        ) {

        outputFile += getFragment(codeLines, {
            start: lastSavedLoc,
            end: node.loc.start
        });

        lastSavedLoc = {
            line: node.loc.end.line,
            column: node.loc.end.column + 1
        };
    }
}

module.exports = {
    process: process,
    revert: revert
};
