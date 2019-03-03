const _ = require('lya')

// the s flag makes it so . matches newlines as well (new feature)
let expression = new RegExp('(.*\\{)(.*)(\\}.*)', 's')

let pureBracketExpression = new RegExp('.*import\\s+\\{(.*)\\}.*', 's')

let sortBracketImports = _.replace(
  expression,
  (match, g1, g2, g3) =>
    g1 + ' ' + _.flow(_.split(','), _.map(_.trim), _.sortBy(_.identity), _.join(', '))(g2) + ' ' + g3
)

let expandTheseImportsIntoMultipleLines = ['@material-ui/core', '@material-ui/icons', 'react-native']
let expandBracketImports = (moduleName, source) => {
  const test = pureBracketExpression.exec(source)
  if (!test) {
    return [[moduleName, source]]
  }
  return _.flow(
    _.last,
    _.split(','),
    _.map(_.trim),
    _.map(name => {
      const [ importName, importAlias ] = _.split(' as ', name)
      const newModuleName = `${moduleName}/${importName}`
      return [newModuleName, `import ${importAlias || importName} from '${newModuleName}'`]
    })
  )(test)
}

let transform = function (j, root) {
  let importStatements = []
  root.find(j.ImportDeclaration).forEach(
    s => {
      const moduleName = s.value.source.value // e.g. 'lodash/fp'
      const source = j(s).toSource()
      if (_.includes(moduleName, expandTheseImportsIntoMultipleLines)) {
        importStatements = _.concat(importStatements, expandBracketImports(moduleName, source))
      } else {
        importStatements.push([moduleName, sortBracketImports(source)])
      }
    }
  ).remove()

  let g0 = [] // no prefix
  let g1 = [] // @
  let g2 = [] // ../
  let g3 = [] // ./

  _.flow(
    _.sortBy(_.first),
    _.map(([val, line]) => {
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
