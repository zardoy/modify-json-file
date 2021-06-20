import test from "ava";
import del from "del";
import fs from "fs/promises";
import jsonfile from "jsonfile";
import path from "path";

// todo convert paths
import { modifyJsonFile, modifyPackageJsonFile } from "../build/";

const jsonFilePath = path.join(__dirname, "testing-file.json");

// that's fine until tests are running with --serial flag
let dataToWrite;

test.beforeEach(async () => {
    await jsonfile.writeFile(jsonFilePath, dataToWrite ?? {
        "name": "package",
        "main": "index.js",
        "author": "eldar",
        "dependencies": {
            "type-fest": "*",
            "fdir": ">=2"
        }
    }, { spaces: 4 });
});

test.afterEach.always(async () => {
    await del(jsonFilePath);
});

test("modifies JSON file", async t => {
    await modifyJsonFile(jsonFilePath, {
        name: s => `super ${s}`,
        main: "build/electron.js",
        dependencies: {
            "type-fest": "^1.0.0"
        }
    });
    const modifiedJsonFle = await fs.readFile(jsonFilePath, "utf8");
    t.snapshot(modifiedJsonFle);
});

test("modifies package.json file with async function", async t => {
    await modifyPackageJsonFile(jsonFilePath, async ({ main }) => {
        return { types: main, name: "ahaha" };
    });
    const modifiedJsonFle = await fs.readFile(jsonFilePath, "utf8");
    t.snapshot(modifiedJsonFle);
});

test("modifies package.json file which has numeric type", async t => {
    dataToWrite = 50;
    await modifyPackageJsonFile(jsonFilePath, n => n + 5);
    const modifiedJsonFle = await fs.readFile(jsonFilePath, "utf8");
    t.snapshot(modifiedJsonFle);
});
