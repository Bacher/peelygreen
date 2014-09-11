
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

        var i = functionDeclaration.length - 1;
        while (/\s/.test(functionDeclaration.charAt(i))) {
            i--;
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

        var newFunctionDeclaration =
            functionDeclaration.substr(0, i + 1) +
            "console.log(new Date().toTimeString().split(' ')[0], '=== PG:Call " + funcName + "', arguments);" +
            functionDeclaration.substr(i + 1);

        outputFile += getFragment(codeLines, {
            start: lastSavedLoc,
            end: node.loc.start
        });

        outputFile += newFunctionDeclaration;

        lastSavedLoc = node.body.body[0].loc.start;
    }
}

function revertNode(node) {
    if (node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression' &&
        node.callee.object.name === 'console' &&
        node.callee.property.name === 'log' &&
        node.arguments.length > 1 &&
        node.arguments[1].type === 'Literal' &&
        /^=== PG:Call/.test(node.arguments[1].value)
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
