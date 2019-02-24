# npm-dts

_by Vytenis Urbonavičius, 2019_

This utility generates single index.d.ts file for whole NPM package.

It allows creating NPM library packages without TypeScript sources and yet still keeping code suggestions wherever these libraries are imported.

# Installation

```
npm install -g npm-dts
```

# Usage

**To see full _CLI_ help, run without arguments:**

```
npm-dts
```

**Typical usage:**

```
cd /your/project
npm-dts -r . generate
```

**Supported additional configuration:**

- **-e** - change main src file from index.ts to something else
- **-r** - root of your project containing project.json
- **-t** - set tmp directory - used for storing some files during generation. Note that tool completely deletes this folder once finished.
- **-c** - pass additional directives to _TSC_. Note that they are not validated or checked for suitability.

# Motivation

NPM packages commonly include both library sources (_/src_) and bundled files (_/dist_). In case of TypeScript this is needed in order to have code suggestions. Bundle itself does not contain type information.

This problem can be fixed by adding _index.d.ts_ file to the root of the package. It is automatically recognized by TypeScript and no additional configuration is required.

There are arguments for and against holding non-bundled source code inside packages. Here are few examples:

- For keeping source

  - Storing source in NPM is a common practice
  - It makes easier to debug
  - It may allow including only specific files of the package
  - It is less risky due to license restrictions

- Against keeping source
  - It is also common to have NPM packages already transpiled and ready for usage. Main file will normally point to _dist_ and using _src_ would require additional configuration in order to debug anyway.
  - Keeping source code adds additional unnecessary data into the package which will likely never ever be used by the consuming code.
  - Debugging can still be done by cloning source code from original source code repository commonly specified in _package.json_ and using _npm link_. In addition to that, source maps can be used in the package itself to aid debugging.
  - Including specific files of the package requires knowledge of its inner structure. Therefor it might be better to always import packages via their main file. In case of bundling, one could rely on tree-shaking.
  - In regards to licenses, third party libraries should be excluded from bundling anyway so they would still be dynamically linked. This can be done with utilities like _webpack-node-externals_. If external libraries are not excluded when bundling a lib, there is a high chance of dependency duplication when several bundled libraries would be used together.

It is easy to see from above points that I am subjective and would opt to only include essentials into the package.

In order to achieve this goal, a single _index.d.ts_ file need to be created. Unfortunately there does not seem to be a way to do this with _TypeScript_ compiler directly.

As a work-around there are tools like _dts-generator_ and _dts-bundle_. I personally used _dts-generator_ till now which is a great tool! However, it did not work perfectly for my use case - some modules were not resolved correctly, new version changed _CLI_ interface and I had to back-engineer code to understand what broke, etc. I considered contributing to the project, but eventually decided to write my own tool which suits my needs since it did not seem too complicated and I needed it for multiple modules.

All in all, here it is. If _npm-dts_ will be suitable for your needs as well - take it and enjoy! :)

# Contribution

Contribution is welcome in a form of pull requests and issues.
