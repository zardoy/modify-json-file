import detectIndent from 'detect-indent'
import fs from 'graceful-fs'
import parseJson from 'parse-json'
import stripBom from 'strip-bom'
import stripJsonComments from 'strip-json-comments'
import stripJsonCommas from 'strip-json-trailing-commas'
import { JsonValue } from 'type-fest'
import type { Options } from './index'
import { PartialObjectDeep } from './typesUtils'

export type JsonRoot = JsonValue

type LoadJsonFileOptions = Required<Pick<Options, 'encoding' | 'tabSize' | 'removeJsonc'>>
/** returns additional info, not only JSON */
export const loadJsonFile = async (filePath: string, { encoding, tabSize, removeJsonc: jsonc }: LoadJsonFileOptions) => {
    let contents = stripBom(await fs.promises.readFile(filePath, encoding))
    if (jsonc) {
        contents = stripJsonCommas(stripJsonComments(contents, { whitespace: false }))
    }
    return {
        json: parseJson(contents, filePath) as JsonRoot,
        indent: tabSize === 'preserve' ? detectIndent(contents).indent : tabSize === 'hard' ? '\t' : tabSize === null ? undefined : ' '.repeat(tabSize),
    }
}
