var _ = require('lodash/fp')

function cli (argumentVector) {
  var userInput = _.first(argumentVector)

  if (_.isEmpty(userInput)) {
    console.error('No user input')
    return
  }

  console.log('Program ran fine with these arguments', userInput)
}

module.exports = cli
