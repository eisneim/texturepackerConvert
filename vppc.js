#! /usr/bin/node
/**
  pre-process generated json sprite data,
  remove some unused field and compress it
  author: Eisneim Terry<eisneim1@gmail.com>
*/

var fs = require('fs')
var path = require('path')

function parseOneFile(filename) {
  var date = new Date()
  var datestring = [ date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getMilliseconds() ].join('-')
  var newFilename = path.dirname(filename) + '/' +
                    path.basename(filename, '.json')
                      .replace(/[^\u4e00-\u9fa5\w]/g, '_')
                      .substr(0, 40).toLowerCase() +
                    '_' + datestring +
                    '.json'

  console.log('[35m  === parsing file: [39m \n', filename)
  console.log('[35m  === save file: [39m \n', newFilename)

  fs.readFile(filename, 'utf8', function(err, data) {
    if (err) throw err

    // first copy one of "sourceSize": {"w":848,"h":480} to meta field
    var sourceSize = data.match(/\"sourceSize.+?\}/)[0]
    console.log('sourceSize: ', sourceSize)
    // insert this to the meta field

    data = data
      .replace(/\"sourceSize.+?\},?/g, '')
      .replace(/"meta.+?\{/, '"meta": {' + sourceSize.replace('sourceSize', 'frameSize') + ',' +
                '"startFrame": 0, "endFrame": 0,'
              )
      .replace(/\"filename.+?,/g, '')
      .replace(/\"rotated.+?,/g, '')
      .replace(/\"trimmed.+?,/g, '')
      .replace(/spriteSourceSize/g, 'sFrame')

    // make sure the syntax is correct
    // var obj = JSON.parse(data)

    fs.writeFile(newFilename,
      compress(data).replace(/\},\},/g, '}},'), // remove trial coma
      // data,
    function(err) {
      if (err) throw err
      console.log('file parsed!')
    })
  })
}

function compress(source) {
  var index = 0, length = source.length, symbol, position, result = ""
  while (index < length) {
    symbol = source[index]
    if ("\t\r\n ".indexOf(symbol) > -1) {
      // Skip whitespace tokens.
      index++
    } else if (symbol == "/") {
      symbol = source[++index]
      if (symbol == "/") {
        // Line comment.
        position = source.indexOf("\n", index)
        if (position < 0) {
          position = source.indexOf("\r", index)
        }
        index = position < 0 ? length : position
      } else if (symbol == "*") {
        // Block comment.
        position = source.indexOf("*/", index)
        if (position < 0) {
          throw SyntaxError("Unterminated block comment.")
        }
        // Advance the scanner position past the end of the comment.
        index = position += 2
      } else {
        throw SyntaxError("Invalid comment.")
      }
    } else if (symbol == '"') {
      // Save the current scanner position.
      position = index
      // Parse JavaScript strings separately to ensure that comment tokens
      // within them are preserved correctly.
      while (index < length) {
        symbol = source[++index]
        if (symbol == "\\") {
          // Advance the scanner past escaped characters.
          index++
        } else if (symbol == '"') {
          // An unescaped double-quote character marks the end of the string.
          break
        }
      }
      if (source[index] == '"') {
        result += source.slice(position, ++index)
      } else {
        throw SyntaxError("Unterminated string.")
      }
    } else {
      result += symbol
      index++
    }
  }
  return result
}

if (process.argv.length === 3) {
  parseOneFile(process.argv[2])
} else if (process.argv.length > 3) {
  var files = process.argv.slice(2)
  files.forEach(parseOneFile)
} else {
  console.log('Usage: ')
  console.log('==>$ node src/plugins/VppSpritePlugin/preprocess.js pathToYour.json')
}
