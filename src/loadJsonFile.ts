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

type LoadJsonFileOptions = Pick<ResolvedOptions, 'encoding' | 'tabSize' | 'jsonc' | 'errorTolerant'>

const jsoncParser = (jsonContent: string, {}: Pick<LoadJsonFileOptions, 'jsonc' | 'errorTolerant'>) => {}

/** returns additional info, not only JSON */
export const loadJsonFile = async (filePath: string, { encoding, tabSize, jsonc, errorTolerant }: LoadJsonFileOptions) => {
    const contents = stripBom(await fs.promises.readFile(filePath, encoding))
    return {
        json: jsonc || errorTolerant ? await jsoncParser(jsonContent, { jsonc, errorTolerant }) : (parseJson(contents, filePath) as JsonRoot),
        indent: getIndent(contents, { tabSize }),
    }
}
