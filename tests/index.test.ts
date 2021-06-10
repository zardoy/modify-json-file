import test from "ava";

import jsonfile from "jsonfile";
import path from "path";
import del from "del";
import nanoid from "nanoid";
import { modifyJsonFile, modifyPackageJsonFile } from "../build/"
import fs from "fs/promises";

const jsonFilePath = path.join(__dirname, "testing-file.json");

test.beforeEach(async () => {
    await jsonfile.writeFile(jsonFilePath, {
        "name": "package",
        "main": "index.js",
        "author": "eldar",
        "dependencies": {
            "type-fest": "*",
            "fdir": ">=2"
        }
    }, { spaces: 4 });
})

test.afterEach.always(async () => {
    await del(jsonFilePath);
})

test("modifies JSON file", async t => {
    await modifyJsonFile(jsonFilePath, {
        name: s => `super ${s}`,
        main: "build/electron.js",
        dependencies: {
            "type-fest": "^1.0.0"
        }
    })
    const modifiedJsonFle = await fs.readFile(jsonFilePath, "utf8");
    t.snapshot(modifiedJsonFle);
})

test("modifies package.json file with async function", async t => {
    await modifyPackageJsonFile(jsonFilePath, async ({ main }) => {
        return { types: main, name: "ahaha" };
    })
    const modifiedJsonFle = await fs.readFile(jsonFilePath, "utf8");
    t.snapshot(modifiedJsonFle);
})