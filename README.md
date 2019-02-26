# npm-dts

_by Vytenis Urbonavičius_

This utility generates single _index.d.ts_ file for whole NPM package.

It allows creating NPM library packages without _TypeScript_ sources and yet still keeping code suggestions wherever these libraries are imported.

_Typescript_ picks up _index.d.ts_ automatically.

---

## Installation

Local:

```
npm install npm-dts
```

Global:

```
npm install -g npm-dts
```

---

## CLI Usage

Please make sure that target project has "typescript" installed in _node_modules_.

To see full _CLI_ help - run without arguments:

```
npm-dts
```

Typical usage (using global install):

```
cd /your/project
npm-dts generate
```

#### Additional supported configuration:

- **-e** - change main _src_ file from _index.ts_ to something else
- **-r** - root of your project containing project.json
- **-t** - set tmp directory - used for storing some files during generation. Note that tool completely deletes this folder once finished.
- **-c** - pass additional directives to _TSC_. Note that they are not validated or checked for suitability. When passing through CLI it is recommended to surround arguments in quotes and start with space inside. Value without space in some cases may be treated as invalid argument for _npm-dts_ itself.
- **-L** - sets log level (error, warn, info, verbose, debug)

## Integration into WebPack

You would want to use "npm-dts-webpack-plugin" package instead.

## Integration into NPM scripts

Example of how you could run dts generation automatically before every publish.

```
{
  ......
  "scripts": {
    "prepublishOnly": "npm run dts && ......",
    "dts": "./node_modules/.bin/npm-dts generate"
  }
  ......
}
```

Another possible option would be to execute "npm run dts" as part of bundling task.

## Integration into custom solution

This approach can be used for integration with tools such as _WebPack_.

Simple usage with all default values:

```
import { Generator } from 'npm-dts'
new Generator().generate({})
```

Advanced usage example with all arguments overridden:

```
import * as path from 'path'
import { Generator } from 'npm-dts'

new Generator().generate({
  entry: 'main.ts',
  root: path.resolve(process.cwd(), 'project'),
  tmp: path.resolve(process.cwd(), 'cache/tmp'),
  tsc: '--extendedDiagnostics',
})
```

Above examples were in _TypeScript_. Same in plain _JavaScript_ would look like this:

```
const path = require('path')

new (require('npm-dts').Generator)({
  entry: 'main.ts',
  root: path.resolve(process.cwd(), 'project'),
  tmp: path.resolve(process.cwd(), 'cache/tmp'),
  tsc: '--extendedDiagnostics'
}).generate()
```

### Additional arguments

Constructor of generator also supports two more boolean flags as optional arguments:

- Enable log
- Throw exception on error

Initializing without any options will cause _npm-cli_ to read CLI arguments by itself.

---

## Contribution

Contribution is welcome in a form of pull requests and issues.
