import detectIndent from 'detect-indent'
import fs from 'graceful-fs'
import parseJson from 'parse-json'
import stripBom from 'strip-bom'
import { JsonValue } from 'type-fest'
import type { Options } from './index'

export type JsonRoot = JsonValue

type ResolvedOptions = Required<Options>

export const getIndent = (contents: string, { tabSize }: Pick<ResolvedOptions, 'tabSize'>) =>
    tabSize === 'preserve' ? detectIndent(contents).indent : tabSize === 'hard' ? '\t' : tabSize === null ? undefined : ' '.repeat(tabSize)

type LoadJsonFileOptions = Pick<ResolvedOptions, 'encoding' | 'tabSize'>

/** returns additional info, not only JSON */
export const loadJsonFile = async (filePath: string, { encoding, tabSize }: LoadJsonFileOptions) => {
    const contents = stripBom(await fs.promises.readFile(filePath, encoding))
    return {
        json: parseJson(contents, filePath) as JsonRoot,
        indent: getIndent(contents, { tabSize }),
    }
}
