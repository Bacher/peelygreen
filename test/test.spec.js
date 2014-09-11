
var _ = require('lodash');
var assert = require('assert');

var fs = require('fs');
var pg = require('../src/pg');

var TEST_PATH = './test';

describe('positive cases', function() {

    makeTests('texts');

    makeTests('revert')

});

function makeTests(directory) {
    var files = fs.readdirSync(TEST_PATH + '/' + directory);

    files.filter(function(file) {
        return /^text\d+\.js$/.test(file);
    }).forEach(function(file) {
        makeTest(directory, file);
    });
}

function makeTest(directory, name) {
    it(name, function() {

        var expectCode;
        var newCode;

        var code = fs.readFileSync(TEST_PATH + '/' + directory + '/' + name).toString();

        if (directory === 'revert') {
            expectCode = code;

            newCode = pg.process(code);
            newCode = pg.revert(newCode);

        } else {
            expectCode = fs.readFileSync(TEST_PATH + '/' + directory + '/' + name + '_e.js').toString();
            newCode = pg.process(code);
        }

        assert.equal(newCode.trim(), expectCode.trim());

    });
}
