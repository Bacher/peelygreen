#!/usr/bin/env sh

find test/*/*[^_e].js -exec ./pg.js {} -o {}_e.js {} \;
