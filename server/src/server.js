require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs"
  }
});
// Triggering nodemon restart again
require('./server.ts');
