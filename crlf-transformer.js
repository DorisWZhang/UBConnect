/**
 * Custom Metro Babel transformer that normalises CRLF → LF before parsing.
 *
 * @firebase/auth@1.7.9 ships its React-Native bundle with Windows-style CRLF
 * line endings. @babel/parser 7.29 fails to parse 100%-CRLF files, throwing
 * "Unexpected token" at the very end of the file. Stripping the carriage
 * returns before handing the source to Babel fixes the issue.
 */

'use strict';

const upstreamTransformer = require('@expo/metro-config/build/babel-transformer');

module.exports = {
  transform({ src, filename, options, plugins }) {
    if (/[\\/]@firebase[\\/]auth[\\/]/.test(filename)) {
      src = src.replace(/\r\n/g, '\n');
    }
    return upstreamTransformer.transform({ src, filename, options, plugins });
  },
};
