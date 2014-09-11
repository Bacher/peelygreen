#!/usr/bin/env node

require('colors');
var fs = require('fs');
var args = require('optimist').argv;
var pg = require('./src/pg');

var code = fs.readFileSync(args._[0]).toString();
var newCode;

//console.log(args);

//try {
    if (args.r) {
        newCode = pg.revert(code);
    } else {
        newCode = pg.process(code);
    }
//} catch (e) {
//    console.warn('  [PARSE ERROR]'.red);
//    console.warn('    Error:'.red, e.message.red);
//    process.exit(1);
//}

if (args.o) {
    fs.writeFileSync(args.o, newCode);
} else if (args.i) {
    fs.writeFileSync(args._[0], newCode);
} else {
    process.stdout.write('' + newCode);
}
