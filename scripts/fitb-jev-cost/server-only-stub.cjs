// `server-only` is not installed (Next aliases it at build time), so point it
// at an empty module when running server code from a script.
const Module = require("node:module");

const empty = require.resolve("./empty.cjs");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") return empty;
  return resolve.call(this, request, ...rest);
};
