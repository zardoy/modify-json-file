# Modify JSON

Simplest way to modify JSON files

[API](https://paka.dev/npm/@zardoy/modify-json)

## Usage

- Only async use

Let's say we *package.json* file:
```json
// 📁package.json
{
    "name": "package",
    "main": "index.js",
    "author": "eldar",
    "dependencies": {
        "type-fest": "*",
        "fdir": ">=2"
    }
}
```

And this code:

```ts
import { modifyJsonFile } from "@zardoy/modify-json";

// of course, you should use path module here
await modifyJsonFile("package.json", {
    name: s => `super ${s}`,
    main: "build/electron.js",
    dependencies: {
        "type-fest": "^1.0.0"
    }
})
```
After running this code, we'll get this package.json:

```json
{
    "name": "super package",
    "main": "build/electron.js",
    "author": "eldar",
    "dependencies": {
        "type-fest": "^1.0.0"
    }
}
```

As you can see above, `modifyJsonFile` only merges fields on 1 level depth. Currently, we don't support merging in nested fields.

We're using [detect-indent](https://www.npmjs.com/package/detect-indent) to preserve the tab size in `.json` files.


## TODO

- [ ] Strip bom option
- [ ] Fix double tsc compilation (and test actual build/)
- [ ] transformer for paths (most likely babel plugin): 

```ts
await fs.promises.readFile(./package.json, "utf8");
```

Into this:

```ts
await fs.promises.readFile(path.join(__dirname, "package.json"), "utf8");
```

- [ ] find a way to use FS in builder-way (like [fdir](https://www.npmjs.com/package/fdir) does) and deprecate this module

## Related

<!-- With *jsonfile*, you need to read / write objects. 1 function is simpler. That's super important for me, because I need to work with JSON files a lot. -->

- [jsonfile](https://npmjs.com/jsonfile): simple reading / writing for json files
- immer ?

[Other cool modules for working with JSON](https://github.com/search?q=user%3Asindresorhus+json)
