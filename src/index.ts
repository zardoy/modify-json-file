import fs from 'graceful-fs'
import { join } from 'path'
import { PackageJson, TsConfigJson } from 'type-fest'
import { JsonRoot, loadJsonFile } from './loadJsonFile'
import { PartialObjectDeep } from './typesUtils'

type MaybePromise<T> = T | Promise<T>

export type Options = Partial<{
    /** @default utf-8 */
    encoding: BufferEncoding
    /**
     * If `false`, FS or JSON errors will be ignored
     * @default true
     *  */
    throws: boolean
    // ideally this lib should integrate with json validator
    /**
     * This check is disabled when function is passed as argument
     * @default "throw" (silent if throws: false)
     */
    ifPropertyIsMissing: 'throw' | 'skip' | 'add'
    /**
     * - null - disable formatting
     * - hard - one hard tab \t
     * - number - number of spaces
     * @default "preserve"
     *  */
    tabSize: null | number | 'preserve' | 'hard'
    /**
     * Allows to modify `jsonc` files (json with comments and trailing commas). These files are usually used by VSCode
     * @default  if path ends with .jsonc `true`, otherwise `false`
     */
    jsonc: boolean
    /**
     * Whether to silent errors and try to fix invalid JSON.
     * @default false
     */
    errorTolerant: boolean
}>

type ModifyProperties<T extends Record<string, any>, CallbacksPassUndefined extends boolean> = {
    [K in keyof T]?: T[K] | ((oldValue: CallbacksPassUndefined extends true ? T[K] | undefined : Exclude<T[K], undefined>, json: T) => T[K])
    //T[K] extends Record<string, any> ? ((oldValue: T[K]) => unknown)/*  | GettersDeep<T[K]> */ : (oldValue: T[K]) => unknown
}
type ModifyFunction<T> = (oldJson: T) => MaybePromise<T>

// TODO remove duplicated definitions

export type ModifyJsonFileFunction<T extends JsonRoot, DefaultName extends boolean = false> = <ActionSetter extends 'throw' | 'skip' | 'pass' = 'throw'>(
    path: DefaultName extends true ? string | { dir: string } : string,
    modifyProperties: T extends Record<string, any> ? ModifyProperties<T, ActionSetter extends 'pass' ? true : false> | ModifyFunction<T> : ModifyFunction<T>,
    options?: Options & {
        /**
         * - throw - throws (silent if throws: false)
         * - skip - won't call the function
         * - pass - pass the `undefined` value
         * @default "throw"
         * */
        ifPropertyIsMissingForSetter?: ActionSetter
    },
) => Promise<void>

type ModifyJsonFileGenericFunction = <T extends JsonRoot = Record<string, JsonRoot>, ActionSetter extends 'throw' | 'skip' | 'pass' = 'throw'>(
    path: string,
    modifyProperties: T extends Record<string, any> ? ModifyProperties<T, ActionSetter extends 'pass' ? true : false> | ModifyFunction<T> : ModifyFunction<T>,
    options?: Options & {
        /**
         * - throw - throws (silent if throws: false)
         * - skip - won't call the function
         * - pass - pass the `undefined` value
         * @default "throw"
         * */
        ifPropertyIsMissingForSetter?: ActionSetter
    },
) => Promise<void>

/** It's just Error */
// class InnerError extends Error {
//     innerError = true;
// }

/**
 * modifies **original** JSON file
 * You can pass generic, that reflects the structure of original JSON file
 *
 * @param modifyProperties If file contents is object, you can pass properties to merge or callback (can be async). If callback is passed, JSON properties won't be merged. In case if file contents is not an object, you must pass callback.
 */
export const modifyJsonFile: ModifyJsonFileGenericFunction = async (path, modifyProperties, options = {}) => {
    // TODO handle deprecated gracefully
    // if (options.ifFieldIsMissing) options.ifPropertyIsMissing = options.ifFieldIsMissing
    // if (options.ifFieldIsMissingForSetter) options.ifPropertyIsMissingForSetter = options.ifFieldIsMissingForSetter

    const {
        encoding = 'utf-8',
        throws = true,
        ifPropertyIsMissing = 'throw',
        ifPropertyIsMissingForSetter = 'throw',
        tabSize = 'preserve',
        jsonc = path.endsWith('.jsonc'),
        errorTolerant = false,
    } = options
    try {
        let { json, indent } = await loadJsonFile(path, { encoding, tabSize, jsonc, errorTolerant })
        if (typeof modifyProperties === 'function') {
            // TODO why arg is never
            json = await (modifyProperties as any)(json)
        } else {
            if (typeof json !== 'object' || Array.isArray(json) || json === null)
                throw new TypeError(`${path}: Root type is not object. Only callback can be used`)
            for (const parts of Object.entries(modifyProperties)) {
                const name = parts[0]
                const value = parts[1]

                const isSetter = typeof value === 'function'
                if (!(name in json)) {
                    const generalAction = isSetter ? ifPropertyIsMissingForSetter : ifPropertyIsMissing
                    if (generalAction === 'throw') throw new TypeError(`Property to modify "${name}" is missing in ${path}`)
                    if (generalAction === 'skip') continue
                }
                // `pass` and `add` handled there
                json[name as string] = isSetter ? value(json[name as string], json) : value
            }
        }

        await fs.promises.writeFile(path, JSON.stringify(json, undefined, indent))
    } catch (err) {
        if (throws) throw err
    }
}

/**
 * `modifyJsonFile` wrapper (helper) with proper typing and `{dir: string}` option.
 * Does not perform [normalization](https://github.com/npm/normalize-package-data)
 */

export const modifyPackageJsonFile: ModifyJsonFileFunction<PartialObjectDeep<PackageJson>, true> = (path, modify, options = {}) => {
    if (typeof path === 'object') {
        path = join(path.dir, 'package.json')
    }
    return modifyJsonFile(path, modify, { removeJsonc: true, ...options })
}

/** `modifyJsonFile` wrapper (helper) with proper typing and `{dir: string}` option.  */
export const modifyTsConfigJsonFile: ModifyJsonFileFunction<PartialObjectDeep<TsConfigJson>, true> = (path, modify, options = {}) => {
    if (typeof path === 'object') {
        path = join(path.dir, 'tsconfig.json')
    }
    return modifyJsonFile(path, modify, { removeJsonc: true, ...options })
}
