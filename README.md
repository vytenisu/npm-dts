# npm-dts

_by Vytenis Urbonavičius_

This utility generates single _index.d.ts_ file for whole NPM package.

It allows creating bundled _NPM_ library packages without _TypeScript_ sources and yet still keeping code suggestions wherever these libraries are imported.

_TypeScript_ picks up _index.d.ts_ automatically.

---

**Some useful forks:**

* **[@htho/npm-dts](https://www.npmjs.com/package/@htho/npm-dts) by [Hauke Thorenz](https://www.npmjs.com/~htho)** - custom alias functionality (--customAlias), tree shaking (--shake)

---

## Installation

Local:

```
npm install --save-dev npm-dts
```

Global:

```
npm install -g npm-dts
```

---

## CLI Usage

Please make sure that target project has _"typescript"_ installed in _node_modules_.

To see full _CLI_ help - run without arguments:

```
npm-dts
```

Typical usage (using global install):

```
cd /your/project
npm-dts generate
```

<br />

### Supported options

```
npm-dts [options] generate
```

| Option&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Alias&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Description                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| <code>--entry [file]</code>                                                                                                                                                          | <code>-e [file]</code>                                                                                                                                                        | Allows changing main _src_ file from _index.ts_ to something else. It can also be declared as a path, relative to _rootDir_ of _TSC_. Note that if _rootDir_ is not specified in _tsconfig.json_ and all _TS_ source code is under some sub-directory such as "src" - _TSC_ might auto-magically set _rootDir_ to "src". |
| <code>--force</code>                                                                                                                                                                 | <code>-f</code>                                                                                                                                                               | Ignores non-critical errors and attempts to at least partially generate typings (disabled by default).                                                                                                                                                                                                                   |
| <code>--help</code>                                                                                                                                                                  | <code>-h</code>                                                                                                                                                               | Output usage information.                                                                                                                                                                                                                                                                                                |
| <code>--logLevel [level]</code>                                                                                                                                                      | <code>-L [level]</code>                                                                                                                                                       | Log level (error, warn, info, verbose, debug) (defaults to "info").                                                                                                                                                                                                                                                      |
| <code>--output [file]</code>                                                                                                                                                         | <code>-o [file]</code>                                                                                                                                                        | Overrides recommended output target to a custom one (defaults to "index.d.ts").                                                                                                                                                                                                                                          |
| <code>--root [path]</code>                                                                                                                                                           | <code>-r [path]</code>                                                                                                                                                        | NPM package directory containing package.json (defaults to current working directory).                                                                                                                                                                                                                                   |
| <code>--tmp [path]</code>                                                                                                                                                            | <code>-t [path]</code>                                                                                                                                                        | Directory for storing temporary information (defaults to OS-specific temporary directory). Note that tool completely deletes this folder once finished.                                                                                                                                                                  |
| <code>--tsc [options]</code>                                                                                                                                                         | <code>-c [options]</code>                                                                                                                                                     | Passed through additional TSC options (defaults to ""). Note that they are not validated or checked for suitability. When passing through CLI it is recommended to surround arguments in quotes **and start with a space** (work-around for a bug in argument parsing dependency of _npm-dts_).                          |
| <code>--version</code>                                                                                                                                                               | <code>-v</code>                                                                                                                                                               | Output the version number.                                                                                                                                                                                                                                                                                               |

<br>

## Integration using _WebPack_

You would want to use [**"npm-dts-webpack-plugin"**](https://www.npmjs.com/package/npm-dts-webpack-plugin) package instead.

<br />

## Integration into _NPM_ scripts

Example of how you could run generation of _index.d.ts_ automatically before every publish.

```
{
  // ......
  "scripts": {
    "prepublishOnly": "npm run dts && ......",
    "dts": "./node_modules/.bin/npm-dts generate"
  }
  // ......
}
```

Another possible option would be to execute "npm run dts" as part of bundling task.

<br />

## Integration into custom solution

This approach can be used for integration with tools such as _WebPack_.

Simple usage with all default values:

```typescript
import {Generator} from 'npm-dts'
new Generator({}).generate()
```

Advanced usage example with some arguments overridden:

```typescript
import * as path from 'path'
import {Generator} from 'npm-dts'

new Generator({
  entry: 'main.ts',
  root: path.resolve(process.cwd(), 'project'),
  tmp: path.resolve(process.cwd(), 'cache/tmp'),
  tsc: '--extendedDiagnostics',
}).generate()
```

Above examples were in _TypeScript_. Same in plain _JavaScript_ would look like this:

```javascript
const path = require('path')

new (require('npm-dts').Generator)({
  entry: 'main.ts',
  root: path.resolve(process.cwd(), 'project'),
  tmp: path.resolve(process.cwd(), 'cache/tmp'),
  tsc: '--extendedDiagnostics',
}).generate()
```

### Additional arguments

Constructor of generator also supports two more boolean flags as optional arguments:

- Enable log
- Throw exception on error

Initializing without any options will cause _npm-cli_ to read CLI arguments all by itself.
