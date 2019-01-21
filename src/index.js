var _ = require('lodash/fp')
var Runner = require('jscodeshift/dist/Runner')
var path = require('path')

function cli (argumentVector) {
  var userInput = _.first(argumentVector)

  if (_.isEmpty(userInput)) {
    console.error('No user input')
    return
  }

  Runner.run(path.resolve(__dirname, './sortImports.js'), [userInput], {})
}

module.exports = cli
