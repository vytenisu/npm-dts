# npm-dts

_by Vytenis Urbonavičius_

This utility generates single _index.d.ts_ file for whole NPM package.

It allows creating bundled _NPM_ library packages without _TypeScript_ sources and yet still keeping code suggestions wherever these libraries are imported.

_TypeScript_ picks up _index.d.ts_ automatically.

---

## Installation

Local:

```cmd
npm install --save-dev npm-dts
```

Global:

```cmd
npm install -g npm-dts
```

---

## CLI Usage

Please make sure that target project has _"typescript"_ installed in _node_modules_.

To see full _CLI_ help - run without arguments:

```cmd
npm-dts
```

Typical usage (using global install):

```cmd
cd /your/project
npm-dts generate
```

### Supported options

```cmd
npm-dts [options] generate
```

| Option | Alias | Description |
|--------|-------|-------------|
| `--entry [file]` | `-e [file]` | Allows changing main _src_ file from _index.ts_ to something else. It can also be declared as a path, relative to root. |
| `--force` | `-f` | Ignores non-critical errors and attempts to at least partially generate typings (disabled by default). |
| `--template` | | Append this template where {0} is replaced with the name/path of the entry module. |
| `--noAlias` | | Don't add an alias for the main NPM package file to the generated .d.ts source. |
| `--help` | `-h` | Output usage information. |
| `--logLevel [level]` | `-L [level]` | Log level (error, warn, info, verbose, debug) (defaults to "info"). |
| `--output [file]` | `-o [file]` | Overrides recommended output target to a custom one (defaults to "index.d.ts"). |
| `--shake` | Basic tree-shaking for modules. (off (default), exportOnly, allImports). Drops modules not referenced by entry. exportOnly only keeps modules which are referenced with the export from ... keyowrd. |
| `--root [path]` | `-r [path]` | NPM package directory containing package.json (defaults to current working directory). |
| `--tmp [path]` | `-t [path]` | Directory for storing temporary information (defaults to OS-specific temporary directory). Note that tool completely deletes this folder once finished. |
| `--tsc [options]` | `-c [options]` | Passed through additional TSC options (defaults to ""). Note that they are not validated or checked for suitability. When passing through CLI it is recommended to surround arguments in quotes **and start with a space** (work-around for a bug in argument parsing dependency of _npm-dts_). |
| `--version` | `-v` | Output the version number. |

## Integration using _WebPack_

You would want to use [**"npm-dts-webpack-plugin"**](https://www.npmjs.com/package/npm-dts-webpack-plugin) package instead.

## Integration into _NPM_ scripts

Example of how you could run generation of _index.d.ts_ automatically before every publish.

```json
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
