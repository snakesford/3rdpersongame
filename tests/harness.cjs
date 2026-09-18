const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
if (!vm.SourceTextModule) {
  const result = require('node:child_process').spawnSync(process.execPath,
    ['--experimental-vm-modules', ...process.argv.slice(1)], {stdio: 'inherit'});
  process.exit(result.status ?? 1);
}
const noop = () => {};
const canvasContext = new Proxy({measureText: text => ({width: text.length * 8})}, {get: (target, key) => target[key] ?? noop});
function element() {
  const classes = new Set(['hidden']);
  return {style: {setProperty: noop}, dataset: {}, value: '', textContent: '', width: 240, height: 190,
    classList: {add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle(x, force) {if (force) classes.add(x); else classes.delete(x);}},
    querySelector: element, querySelectorAll: () => [], replaceChildren: noop, remove: noop, removeAttribute: noop, addEventListener(type, handler) { (this.listeners ??= {})[type] = handler; }, append: noop, appendChild: noop, focus: noop, setAttribute: noop,
    getAttribute() {return this.src;}, getContext: () => canvasContext, getBoundingClientRect: () => ({left: 0, top: 0}),
  };
}
const elements = new Map();
const storage = new Map();
const errors = [];
const context = vm.createContext({console: {...console, error: (...args) => { errors.push(args); console.error(...args); }}, assert, Math, Set, Map, setTimeout: noop, clearTimeout: noop, setInterval: noop, ResizeObserver: class {observe() {}}, Image: class {},
  window: {location: {protocol: "http:"}, innerWidth: 1200, innerHeight: 800, addEventListener: noop},
  document: {body: element(), getElementById(id) {if (!elements.has(id)) elements.set(id, element()); return elements.get(id);}, querySelectorAll: () => [], querySelector: element, createElement: element},
  localStorage: {getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v)}, requestAnimationFrame: noop,
  fetch: async path => ({ok: true, json: async () => JSON.parse(fs.readFileSync(path, 'utf8'))}),
});

const path = require('node:path');
const modules = new Map();
function loadModule(filename) {
  filename = path.resolve(filename);
  if (modules.has(filename)) return modules.get(filename);
  let source = fs.readFileSync(filename, 'utf8');
  if (filename === path.resolve('game.js')) {
    source = source.replace(/initializeGame\(\);\s*$/, 'await initializeGame();')
      + '\nimport * as testState from "./modules/state.js";'
      + '\nimport * as testConstants from "./modules/constants.js";'
      + '\nimport * as testMath from "./modules/math.js";'
      + '\nconst testBindings = {...testState, ...testMath, ...testConstants, ...systems};'
      + '\nglobalThis.runGameChecks = code => eval("const {" + Object.keys(testBindings).join(",") + "} = testBindings;\\n" + code);';
  }
  const module = new vm.SourceTextModule(source, {context, identifier: filename});
  modules.set(filename, module);
  return module;
}
const ready = (async () => {
  const game = loadModule('game.js');
  await game.link((specifier, parent) => loadModule(path.resolve(path.dirname(parent.identifier), specifier)));
  await game.evaluate();
  assert.equal(errors.length, 0, 'Game initialization must not log errors');
})();
module.exports = {ready, run: code => context.runGameChecks(code)};
