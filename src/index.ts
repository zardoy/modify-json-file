import fs from "fs";
import { PackageJson, TsConfigJson } from "type-fest";
import detectIndent from "detect-indent"
import loadJsonFile from "load-json-file"

interface Options {
    /** @default utf-8 */
    encoding: BufferEncoding
    /** 
     * Will throw in case of FS error or invalid JSON
     * @default true
     *  */
    throws: boolean
    // ideally this lib should integrate with json validator
    /** @default "throw" (even if throws is false) */
    ifFieldIsMissing: "throw" | "skip" | "add"
    /** 
     * - throw - throws (even if throws param is false) 
     *-  skip - won't call the function
     * - pass - pass the `undefined` value
     * @default "throw" 
     * */
    ifFieldIsMissingForSetter: "throw" | "skip" | "pass"
    /** 
     * - null - disable formatting
     * - hard - one hard tab \t
     * - number - number of spaces
     * @default "preserve"
     *  */
    tabSize: null | number | "preserve" | "hard"
}

type GettersDeep<T extends object> = {
    [K in keyof T]: (oldValue: T[K], json: T) => unknown
    //T[K] extends object ? ((oldValue: T[K]) => unknown)/*  | GettersDeep<T[K]> */ : (oldValue: T[K]) => unknown
}

export type ModifyJsonFileFunction<T extends object> = (
    path: string,
    fields: Partial<T | GettersDeep<T>>, 
    options?: Options
) => Promise<void>;

type ModifyJsonFileGenericFunction = <T extends object>(
    path: string,
    fields: Partial<T | GettersDeep<T>>, 
    options?: Partial<Options>
) => Promise<void>;

/** It's just Error */
class InnerError extends Error {
    innerError = true;
}

/**
 * modifies **original** JSON file
 * You can pass generic, that reflects the structure of original JSON file
 * 
 * Fields, that are functions will be skipped if they're not preset in original JSON file
 */
export const modifyJsonFile: ModifyJsonFileGenericFunction = async (
    path,
    fields, 
    options
) => {
    const { 
        encoding = "utf-8",
        throws = true ,
        ifFieldIsMissing = "throw",
        ifFieldIsMissingForSetter = "throw",
        tabSize: tabSizeOption = "preserve"
    } = options || {};
    try {
        const json = await loadJsonFile(path);
        // todo remove restriction or not?
        if (!json || typeof json !== "object" || Array.isArray(json)) throw new TypeError(`${path}: JSON root type must be object`);
        // todo we don't need to read the file twice
        const rawText = await fs.promises.readFile(path, encoding);
        const indent = tabSizeOption === "preserve" ? detectIndent(rawText).indent : tabSizeOption === "hard" ? "\t" : tabSizeOption === null ? undefined : " ".repeat(tabSizeOption);
        
        for (const [name, value] of Object.entries(fields)) {
            if (!(name in json)) {
                const isSetter = typeof value === "function";
                const generalAction = isSetter ? ifFieldIsMissingForSetter : ifFieldIsMissing;
                if (generalAction === "throw") throw new InnerError(`Property to modify "${name}" is missing in ${path}`);
                if (generalAction === "skip") continue;
            }
            json[name as string] = typeof value === "function" ? value(json[name as string], json) : value;
        }

        await fs.promises.writeFile(
            path, 
            JSON.stringify(json, undefined, indent)
        );
    } catch(err) {
        if (err.innerError) throw new Error(err.message);
        if (throws) throw err;
    }
}

// todo: use read-pkg / write-pkg for normalization

/**
 * Almost the same is sindresorhus/write-pkg, but with proper typing support and setters for fields
 */
export const modifyPackageJson: ModifyJsonFileFunction<PackageJson> = modifyJsonFile;

export const modifyTsConfigJson: ModifyJsonFileFunction<TsConfigJson> = modifyJsonFile;

