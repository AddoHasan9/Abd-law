const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const root = path.resolve(__dirname, '../..')
// Execute the actual TypeScript module with explicit dependencies, never a live Supabase client.
function load(file, mocks = {}) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  new Function('require', 'exports', compiled)(id => {
    if (Object.hasOwn(mocks, id)) return mocks[id]
    if (id === 'zod') return require('zod')
    throw new Error(`Unmocked dependency ${id} in ${file}`)
  }, exports)
  return exports
}
module.exports = { load, root }
