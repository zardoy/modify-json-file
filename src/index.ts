import { PackageJson, PartialDeep, TsConfigJson } from "type-fest";
import detectIndent from "detect-indent";
import stripBom from "strip-bom";
import parseJson from "parse-json";
import fs from "graceful-fs";

type MaybePromise<T> = T | Promise<T>;

type Options = PartialDeep<{
    /** @default utf-8 */
    encoding: BufferEncoding;
    /** 
     * If `false`, FS or JSON errors will be ignored
     * @default true
     *  */
    throws: boolean;
    // ideally this lib should integrate with json validator
    /** @default "throw" (silent if throws: false) */
    ifFieldIsMissing: "throw" | "skip" | "add";
    /** 
     * - throw - throws (silent if throws: false) 
     *-  skip - won't call the function
     * - pass - pass the `undefined` value
     * @default "throw" 
     * */
    ifFieldIsMissingForSetter: "throw" | "skip" | "pass";
    /** 
     * - null - disable formatting
     * - hard - one hard tab \t
     * - number - number of spaces
     * @default "preserve"
     *  */
    tabSize: null | number | "preserve" | "hard";
}>;

type ModifyFields<T extends object> = {
    [K in keyof T]?: T[K] | ((oldValue: T[K], json: T) => T[K])
    //T[K] extends object ? ((oldValue: T[K]) => unknown)/*  | GettersDeep<T[K]> */ : (oldValue: T[K]) => unknown
};

type ModifyFunction<T> = (oldJson: T) => MaybePromise<T>;

export type ModifyJsonFileFunction<T> = (
    path: string,
    modifyFields: T extends object ? ModifyFields<T> | ModifyFunction<T> : ModifyFunction<T>,
    options?: Partial<Options>
) => Promise<void>;

type ModifyJsonFileGenericFunction = <T extends any = object>(
    path: string,
    modifyFields: T extends object ? ModifyFields<T> | ModifyFunction<T> : ModifyFunction<T>,
    options?: Partial<Options>
) => Promise<void>;

type LoadJsonFileOptions = Required<Pick<Options, "encoding" | "tabSize">>;
/** returns additional info, not only JSON */
const loadJsonFile = async (filePath: string, { encoding, tabSize }: LoadJsonFileOptions) => {
    const contents = stripBom(
        await fs.promises.readFile(filePath, encoding)
    );
    return {
        json: parseJson(contents, filePath),
        indent: tabSize === "preserve" ?
            detectIndent(contents).indent :
            tabSize === "hard" ? "\t" : tabSize === null ?
                undefined : " ".repeat(tabSize)
    };
};

/** It's just Error */
// class InnerError extends Error {
//     innerError = true;
// }

/**
 * modifies **original** JSON file
 * You can pass generic, that reflects the structure of original JSON file
 * 
 * @param modifyFields If file contents is object, you can pass fields to merge or callback (can be async). If callback is passed, JSON fields won't be merged. In case if file contents is not an object, you must pass callback.
 */
export const modifyJsonFile: ModifyJsonFileGenericFunction = async (
    path,
    modifyFields,
    options
) => {
    const {
        encoding = "utf-8",
        throws = true,
        ifFieldIsMissing = "throw",
        ifFieldIsMissingForSetter = "throw",
        tabSize = "preserve"
    } = options || {};
    try {
        let { json, indent } = await loadJsonFile(path, { encoding, tabSize });
        if (typeof modifyFields === "function") {
            json = await modifyFields(json);
        } else {
            if (typeof json !== "object" || Array.isArray(json)) throw new TypeError(`${path}: Root type is not object. Only callback can be used`);
            for (const parts of Object.entries(modifyFields)) {
                // todo fix typescript types workaround
                const name = parts[0] as string;
                const value = parts[1] as any;

                const isSetter = typeof value === "function";
                if (!(name in json)) {
                    const generalAction = isSetter ? ifFieldIsMissingForSetter : ifFieldIsMissing;
                    if (generalAction === "throw") throw new TypeError(`Property to modify "${name}" is missing in ${path}`);
                    if (generalAction === "skip") continue;
                }
                json[name as string] = isSetter ? value(json[name as string], json) : value;
            }
        }

        await fs.promises.writeFile(
            path,
            JSON.stringify(json, undefined, indent)
        );
    } catch (err) {
        if (throws) throw err;
    }
};

// todo: use read-pkg / write-pkg for normalization

/**
 * Almost the same is sindresorhus/write-pkg, but with proper typing support and setters for fields
 */
export const modifyPackageJsonFile: ModifyJsonFileFunction<PackageJson> = modifyJsonFile;

export const modifyTsConfigJsonFile: ModifyJsonFileFunction<TsConfigJson> = modifyJsonFile;

