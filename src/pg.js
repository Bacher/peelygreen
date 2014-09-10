
var esprima = require('esprima');
var _ = require('lodash');
var getFragment = require('./fragutils').getFragment;

var codeLines;
var lastSavedLoc;
var outputFile;

function processCode(codeText) {
    codeLines = codeText.split('\n');
    codeLines.unshift('');

    outputFile = '';
    lastSavedLoc = { line: 1, column: 0 };

    var ast = esprima.parse(codeText, {
        loc: true,
        raw: true
    });

    parseNode(ast);

    outputFile += getFragment(codeLines, {
        start: lastSavedLoc,
        end: 'EOF'
    });

    return outputFile;
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

    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
        //console.log(getFragment(codeLines, node.loc));

        outputFile += getFragment(codeLines, {
            start: lastSavedLoc,
            end: node.loc.start
        });

        var functionDeclaration =  getFragment(codeLines, {
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

        return;
    }

    for (var prop in node) {
        if (node.hasOwnProperty(prop) && prop !== 'type' && prop !== 'loc') {
            parseNode(node[prop], node);
        }
    }
}

module.exports = {
    process: processCode
};
