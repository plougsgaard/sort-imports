#!/usr/bin/env node

var args = process.argv.splice(process.execArgv.length + 2)

var program = require('../src/index')

program(args)
