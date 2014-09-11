#!/usr/bin/env sh

find test/texts/*[^_e].js -exec ./pg.js {} -o {}_e.js {} \;
