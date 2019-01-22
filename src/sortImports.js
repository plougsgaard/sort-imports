const _ = require('lodash/fp')

// the s flag makes it so . matches newlines as well (new feature)
let expression = new RegExp('(.*\\{)(.*)(\\}.*)', 's')

let transform = function (j, root) {
  let importStatements = []
  root.find(j.ImportDeclaration).forEach(
    s => {
      const moduleName = s.value.source.value // e.g. 'lodash/fp'
      let statementSource = _.replace(
        expression,
        (match, g1, g2, g3) =>
          g1 + ' ' + _.flow(_.split(','), _.map(_.trim), _.sortBy(_.identity), _.join(', '))(g2) + ' ' + g3,
        j(s).toSource()
      )
      importStatements.push([moduleName, statementSource])
    }
  ).remove()

  let g0 = [] // no prefix
  let g1 = [] // @
  let g2 = [] // ../
  let g3 = [] // ./

  _.flow(
    _.sortBy(_.first),
    _.each(([val, line]) => {
      if (_.startsWith('@', val)) {
        g1.push(line)
      } else if (_.startsWith('../', val)) {
        g2.push(line)
      } else if (_.startsWith('./', val)) {
        g3.push(line)
      } else {
        g0.push(line)
      }
    })
  )(importStatements)

  const importLines = _.flow(
    _.reject(_.isEmpty),
    _.reduce((acc, x) => acc + _.join('\n', x) + '\n\n', '')
  )([
    g0,
    g1,
    g2,
    g3
  ])

  return j(importLines + root.toSource())
}

let wrapper = function (fileInfo, api) {
  const j = api.jscodeshift
  let root = j(fileInfo.source)
  const getFirstNode = () => root.find(j.Program).get('body', 0).node

  // sort out comments in top of file
  let firstNode = getFirstNode()
  let firstNodeComments = _.get('comments', firstNode)
  let hasComments = !_.isEmpty(firstNodeComments)

  firstNode.comments = null

  // actual transform, the other stuff is just to retain comments
  root = transform(j, root)

  if (hasComments) {
    firstNode = getFirstNode()
    firstNode.comments = firstNodeComments
  }

  return root.toSource()
}

module.exports = wrapper
