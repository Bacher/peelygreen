
var _ = require('lodash');
var assert = require('assert');

var fs = require('fs');
var pg = require('../src/pg');

var TEST_PATH = './test';

describe('positive cases', function() {

    makeTests('texts');

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
        var code = fs.readFileSync(TEST_PATH + '/' + directory + '/' + name).toString();
        var expectCode = fs.readFileSync(TEST_PATH + '/' + directory + '/' + name + '_e.js').toString();

        var newCode = pg.process(code);

        assert.equal(expectCode.trim(), newCode.trim());
    });
}
