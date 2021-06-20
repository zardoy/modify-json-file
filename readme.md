# Modify JSON

Simplest way to modify JSON files

[API](https://paka.dev/npm/modify-json-file)

## Why?

Becaues I got tired of writing `read`/`write` functions for JSON files, especially when I need to change dozens of files.

## Usage

### Basics

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
import { modifyJsonFile } from "modify-json-file";

// modify package.json in the same dir
await modifyJsonFile(
    path.join(__dirname, "package.json"), 
    {
        name: s => `super ${s}`,
        main: "build/electron.js",
        dependencies: {
            "type-fest": "^1.0.0"
        }
    }
)
```

After running this code, *package.json* will be:

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

As you can see above, `modifyJsonFile` only merges fields **only on top level**. Currently, we don't support merging in nested fields.

Note that to simplify docs I won't use `path` module anymore. It implies that you always use `path` module to specify path.

Also, I've decided to not to add

### Non-object root value

> Remember, that at root level value can be any valid JSON value: `string`, `number`, `boolean`, `null`, `object` or `array`.

Be aware of modifying non object JSON files (where root type is not an object). For example:

Our code:

```ts
import { modifyJsonFile } from "modify-json-file";

// telling that root type is number (in this case it's obligatory)
await modifyJsonFile<number>("package.json", n => n + 1);
```

Expected JSON:

```json
// 📁someNumber.json
5
```

Actual JSON:

```json
// 📁someNumber.json
{
    "retries": 5
}
```

After running the code above, without any warnings you will get this:

```json
// 📁someNumber.json
"[object Object]1"
```

That's because callback `n => n + 1` has transformed `n` (object) into string.

Here, despite of the TS type (number), `n` is object in runtime, so `n + 1` just stringified `n` and returned `[object Object]1`.
Then this module just stringified the string to store output as valid JSON string in file.

Remember, **this module doesn't do any type checking in runtime**, you need to use `typeof` in callback for checking root types or schema validators (like [ajv](http://npmjs.com/ajv)) for objects.

### Formatting

By default, it will preserve tab size (thanks to [detect-indent](https://www.npmjs.com/package/detect-indent)), but you can control this by overriding `tabSize` option. For example, we can use it to just format the file:

```ts
import { modifyJsonFile } from "modify-json-file";

// this will format file to use \t (hard tabs)
await modifyJsonFile("someFile.json", {}, { tabSize: "hard" });
```

## TODO

Docs:

- [ ] Examples with immer
- [ ] Make usage more clear
- [ ] Fix auto generated docs
- [ ] Describe all possible usage cases
- [ ] Give a hint, that it doesn't perform schema checking again actual file contents when type is passed into generic function `modifyJsonFile`

- [ ] Performance investigation (issues welcome)
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
