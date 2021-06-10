import { PackageJson, TsConfigJson } from "type-fest";
import detectIndent from "detect-indent"
import stripBom from "strip-bom"
import parseJson from "parse-json"
import fs from "graceful-fs"

type MaybePromise<T> = T | Promise<T>;

interface Options {
    /** @default utf-8 */
    encoding: BufferEncoding
    /** 
     * If `false`, FS or JSON errors will be ignored
     * @default true
     *  */
    throws: boolean
    // ideally this lib should integrate with json validator
    /** @default "throw" (silent if throws: false) */
    ifFieldIsMissing: "throw" | "skip" | "add"
    /** 
     * - throw - throws (silent if throws: false) 
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
    [K in keyof T]: (oldValue: T[K], json: T) => T[K]
    //T[K] extends object ? ((oldValue: T[K]) => unknown)/*  | GettersDeep<T[K]> */ : (oldValue: T[K]) => unknown
}

export type ModifyJsonFileFunction<T extends object> = (
    path: string,
    modifyFields: Partial<T | GettersDeep<T>> | ((oldJson: T) => MaybePromise<T>), 
    options?: Options
) => Promise<void>;

type ModifyJsonFileGenericFunction = <T extends object>(
    path: string,
    modifyFields: Partial<T | GettersDeep<T>> | ((oldJson: T) => MaybePromise<T>), 
    options?: Partial<Options>
) => Promise<void>;

/** returns additional info, not only JSON */
const loadJsonFile = async (filePath: string, { encoding, tabSize }: Pick<Options, "encoding" | "tabSize">) => {
    const contents = stripBom(
        await fs.promises.readFile(filePath, encoding)
    );
    return {
        json: parseJson(contents, filePath),
        indent: tabSize === "preserve" ? 
            detectIndent(contents).indent : 
                tabSize === "hard" ? "\t" : tabSize === null ? 
                    undefined : " ".repeat(tabSize)
    }
};

/** It's just Error */
// class InnerError extends Error {
//     innerError = true;
// }

/**
 * modifies **original** JSON file
 * You can pass generic, that reflects the structure of original JSON file
 * 
 * @param modifyFields Fields to merge or callback (can be async). If callback is passed, JSON fields won't be merged.
 */
export const modifyJsonFile: ModifyJsonFileGenericFunction = async (
    path,
    modifyFields, 
    options
) => {
    const { 
        encoding = "utf-8",
        throws = true ,
        ifFieldIsMissing = "throw",
        ifFieldIsMissingForSetter = "throw",
        tabSize = "preserve"
    } = options || {};
    try {
        let {json, indent} = await loadJsonFile(path, { encoding, tabSize });
        // todo remove restriction or not?
        if (!json || typeof json !== "object" || Array.isArray(json)) throw new TypeError(`${path}: JSON root type must be object`);
        if (typeof modifyFields === "function") {
            json = await modifyFields(json)
        } else {
            for (const [name, value] of Object.entries(modifyFields)) {
                if (!(name in json)) {
                    const isSetter = typeof value === "function";
                    const generalAction = isSetter ? ifFieldIsMissingForSetter : ifFieldIsMissing;
                    if (generalAction === "throw") throw new TypeError(`Property to modify "${name}" is missing in ${path}`);
                    if (generalAction === "skip") continue;
                }
                json[name as string] = typeof value === "function" ? value(json[name as string], json) : value;
            }
        }

        await fs.promises.writeFile(
            path,
            JSON.stringify(json, undefined, indent)
        );
    } catch(err) {
        // if (err.innerError) throw new Error(err.message);
        if (throws) throw err;
    }
}

// todo: use read-pkg / write-pkg for normalization

/**
 * Almost the same is sindresorhus/write-pkg, but with proper typing support and setters for fields
 */
export const modifyPackageJsonFile: ModifyJsonFileFunction<PackageJson> = modifyJsonFile;

export const modifyTsConfigJsonFile: ModifyJsonFileFunction<TsConfigJson> = modifyJsonFile;

