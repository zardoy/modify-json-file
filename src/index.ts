import fs from 'graceful-fs'
import { join } from 'path'
import { PackageJson, PartialDeep, TsConfigJson } from 'type-fest'
import { JsonRoot, loadJsonFile } from './loadJsonFile'

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
    // TODO paste {@linkcode Options.ifPropertyIsMissing} when the plugin is ready
    /**
     * @default "throw" (silent if throws: false)
     * @deprecated use `ifPropertyIsMissing`
     */
    ifFieldIsMissing: 'throw' | 'skip' | 'add'
    /**
     * @default "throw" (silent if throws: false)
     */
    ifPropertyIsMissing: 'throw' | 'skip' | 'add'
    /**
     * - throw - throws (silent if throws: false)
     * - skip - won't call the function
     * - pass - pass the `undefined` value
     * @default "throw"
     * @deprecated use `ifPropertyIsMissingForSetter`
     * */
    ifFieldIsMissingForSetter: 'throw' | 'skip' | 'pass'
    /**
     * - throw - throws (silent if throws: false)
     * - skip - won't call the function
     * - pass - pass the `undefined` value
     * @default "throw"
     * */
    ifPropertyIsMissingForSetter: 'throw' | 'skip' | 'pass'
    /**
     * - null - disable formatting
     * - hard - one hard tab \t
     * - number - number of spaces
     * @default "preserve"
     *  */
    tabSize: null | number | 'preserve' | 'hard'
    /**
     * Allows to modify `jsonc` files (json with comments and trailing commas). These files are usually used by VSCode
     * @default false
     */
    removeJsonc: boolean
}>

type ModifyProperties<T extends Record<string, any>> = {
    [K in keyof T]?: T[K] | ((oldValue: T[K], json: T) => T[K])
    //T[K] extends Record<string, any> ? ((oldValue: T[K]) => unknown)/*  | GettersDeep<T[K]> */ : (oldValue: T[K]) => unknown
}
type ModifyFunction<T> = (oldJson: T) => MaybePromise<T>

// TODO remove duplicated definitions

export type ModifyJsonFileFunction<T extends JsonRoot, DefaultName extends boolean = false> = (
    path: DefaultName extends true ? string | { dir: string } : string,
    modifyProperties: T extends Record<string, any> ? ModifyProperties<T> | ModifyFunction<T> : ModifyFunction<T>,
    options?: Partial<Options>,
) => Promise<void>

type ModifyJsonFileGenericFunction = <T extends JsonRoot = Record<string, any>>(
    path: string,
    modifyProperties: T extends Record<string, any> ? ModifyProperties<T> | ModifyFunction<T> : ModifyFunction<T>,
    options?: Partial<Options>,
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
    if (options.ifFieldIsMissing) options.ifPropertyIsMissing = options.ifFieldIsMissing
    if (options.ifFieldIsMissingForSetter) options.ifPropertyIsMissingForSetter = options.ifFieldIsMissingForSetter

    const {
        encoding = 'utf-8',
        throws = true,
        ifPropertyIsMissing = 'throw',
        ifPropertyIsMissingForSetter = 'throw',
        tabSize = 'preserve',
        removeJsonc = false,
    } = options
    try {
        let { json, indent } = await loadJsonFile(path, { encoding, tabSize, removeJsonc })
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

// todo: use read-pkg / write-pkg for normalization

/**
 * Almost the same is sindresorhus/write-pkg, but with proper typing support and setters for properties
 */
// TODO remove workaround once my pr is merged
export const modifyPackageJsonFile: ModifyJsonFileFunction<PartialDeep<PackageJson>, true> = (path, modify, options = {}) => {
    if (typeof path === 'object') {
        path = join(path.dir, 'package.json')
    }
    return modifyJsonFile(path, modify, { removeJsonc: true, ...options })
}

export const modifyTsConfigJsonFile: ModifyJsonFileFunction<PartialDeep<TsConfigJson>, true> = (path, modify, options = {}) => {
    if (typeof path === 'object') {
        path = join(path.dir, 'tsconfig.json')
    }
    return modifyJsonFile(path, modify, { removeJsonc: true, ...options })
}
