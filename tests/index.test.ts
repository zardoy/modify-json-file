/// <reference types="jest" />

import { join } from 'path'
import gracefulFs from 'graceful-fs'

import { modifyJsonFile, ModifyJsonFileFunction, modifyTsConfigJsonFile } from '../src'
import { JsonRoot, loadJsonFile } from '../src/loadJsonFile'

// I know that it's hard to read but I did my best

// TODO reset mock after each test
const prepare = <JSON extends boolean = true>({
    data,
    // TODO why can't specify default here
    json,
    writeCallback,
}: {
    data: JSON extends true ? JsonRoot : string
    json?: JSON
    // TODO allow JsonRoot
    writeCallback?: (data) => void
}) => {
    const readSpy = jest.spyOn(gracefulFs.promises, 'readFile')
    readSpy.mockResolvedValueOnce(json === false ? (data as string) : JSON.stringify(data))

    if (writeCallback) {
        const writeSpy = jest.spyOn(gracefulFs.promises, 'writeFile')
        writeSpy.mockImplementationOnce(async (_path, data) => writeCallback(data))
    }
}

/** Ensure isn't mocked */
const readFile = async (path: string) => gracefulFs.promises.readFile(path, 'utf-8')

/** Ensure isn't mocked */
const readAndParse = async (path: string): Promise<JsonRoot> => JSON.parse(await readFile(path))

type TestData = any
type ModifyParams = Parameters<ModifyJsonFileFunction<TestData>>

const readmeExample = {
    name: 'package',
    main: 'index.js',
    author: 'eldar',
    files: ['build'],
    dependencies: {
        'type-fest': '*',
        fdir: '>=2',
    },
}
// TODO don't use it. isn't stable enough
describe.each<{
    title: string
    input: TestData
    modify: [ModifyParams[1], ModifyParams[2]?]
    expected: (data) => void
}>([
    {
        title: 'First example from readme',
        input: readmeExample,
        modify: [
            {
                name: s => `super ${s}`,
                main: 'build/electron.js',
                files: undefined, // removing the property
                dependencies: {
                    'type-fest': '^1.0.0',
                },
            },
            {},
        ],
        expected: d =>
            expect(JSON.parse(d)).toMatchInlineSnapshot(`
Object {
  "author": "eldar",
  "dependencies": Object {
    "type-fest": "^1.0.0",
  },
  "main": "build/electron.js",
  "name": "super package",
}
`),
    },
    {
        title: 'Async setter',
        input: readmeExample,
        modify: [async ({ main }) => ({ types: main, name: 'ahaha' }), {}],
        expected: d => expect(d).toMatchInlineSnapshot(`"{\\"types\\":\\"index.js\\",\\"name\\":\\"ahaha\\"}"`),
    },
    {
        title: 'Number root-type',
        input: 50,
        modify: [n => n + 5],
        expected: d => expect(d).toMatchInlineSnapshot(`"55"`),
    },
    {
        title: 'String root-type',
        input: '50',
        modify: [s => s + 5],
        expected: d => expect(d).toMatchInlineSnapshot(`"\\"505\\""`),
    },
    {
        title: 'Null root-type',
        input: null,
        modify: [n => n],
        expected: d => expect(d).toMatchInlineSnapshot(`"null"`),
    },
    {
        title: 'Array root-type',
        input: [50, 'Hey'],
        modify: [arr => [...arr, 'there']],
        expected: d => expect(d).toMatchInlineSnapshot(`"[50,\\"Hey\\",\\"there\\"]"`),
    },
])('test data matches expected', ({ title, input, modify, expected }) => {
    test(title, async () => {
        prepare({ data: input, writeCallback: expected })
        await modifyJsonFile('', ...modify)
    })
})

// The philosophy is that it should modify existing data
test('Throw error by default on missing property in input', async () => {
    prepare({ data: readmeExample })
    await expect(
        modifyJsonFile('./path', {
            bin: 'build/bin.js',
        }),
    ).rejects.toMatchInlineSnapshot(`[TypeError: Property to modify "bin" is missing in ./path]`)
})

describe('Silent is silent', () => {
    test('incorrect path (fs error)', async () => {
        await expect(
            modifyJsonFile(
                './not-existing-path',
                {},
                {
                    throws: false,
                },
            ),
        ).resolves.toBeUndefined()
    })

    test('incorrect json syntax (json parse error)', async () => {
        prepare({ data: 'not-json' })
        await expect(
            modifyJsonFile(
                '',
                {},
                {
                    throws: false,
                },
            ),
        ).resolves.toBeUndefined()
    })
})

test("Don't throw error if option is provided on missing property in input", async () => {
    expect.assertions(1)
    prepare({
        data: readmeExample,
        writeCallback(data) {
            expect(JSON.parse(data)).toMatchInlineSnapshot(`
            Object {
              "author": "eldar",
              "bin": "build/bin.js",
              "dependencies": Object {
                "fdir": ">=2",
                "type-fest": "*",
              },
              "files": Array [
                "build",
              ],
              "main": "index.js",
              "name": "package",
            }
        `)
        },
    })
    await modifyJsonFile(
        '',
        {
            bin: 'build/bin.js',
            somethingWeird: list => [...list, 'new-item'],
        },
        {
            ifPropertyIsMissing: 'add',
            ifPropertyIsMissingForSetter: 'skip',
        },
    )
})

test('Preserves empty newline', async () => {
    expect.assertions(1)
    prepare({
        data: `
{
    "author": "eldar",
    "bin": "src/bin.ts",
    "dependencies": {
        "fdir": ">=2",
        "type-fest": "*"
    }
}
`,
        json: false,
        writeCallback(data) {
            expect(data).toMatchInlineSnapshot(`
"{
    \\"author\\": \\"eldar\\",
    \\"bin\\": \\"build/bin.js\\",
    \\"dependencies\\": {
        \\"fdir\\": \\">=2\\",
        \\"type-fest\\": \\"*\\"
    },
    \\"somethingWeird\\": \\"new-item\\"
}
"
`)
        },
    })
    await modifyJsonFile(
        '',
        {
            bin: 'build/bin.js',
            somethingWeird: () => 'new-item',
        },
        {
            ifPropertyIsMissingForSetter: 'pass',
        },
    )
})

test('loader removes comments and trailing commas', async () => {
    const { json } = await loadJsonFile(join(__dirname, './tsconfig.fixture.json'), { encoding: 'utf-8', removeJsonc: true, tabSize: 'preserve' })
    expect(json).toMatchInlineSnapshot(`
        Object {
          "compilerOptions": Object {
            "module": "commonjs",
            "noImplicitAny": true,
            "outDir": "dist",
            "preserveConstEnums": true,
            "removeComments": true,
            "sourceMap": true,
          },
          "files": Array [
            "./src/foo.ts",
          ],
        }
    `)
})

test('Modifies TSConfig (removes comments and trailing commas)', async () => {
    prepare({
        data: await readFile(join(__dirname, './tsconfig.fixture.json')),
        json: false,
        writeCallback(data) {
            expect(JSON.parse(data)).toMatchInlineSnapshot(`
Object {
  "compilerOptions": Object {
    "composite": true,
    "module": "commonjs",
    "noImplicitAny": true,
    "outDir": "dist",
    "preserveConstEnums": true,
    "removeComments": true,
    "sourceMap": true,
  },
  "files": Array [
    "./src/foo.ts",
  ],
  "references": Array [
    Object {
      "path": "project",
    },
  ],
}
`)
        },
    })
    await modifyTsConfigJsonFile(
        '',
        {
            references: [{ path: 'project' }],
            compilerOptions: (options = {}) => ({
                ...options,
                composite: true,
            }),
        },
        {
            ifPropertyIsMissing: 'add',
            ifPropertyIsMissingForSetter: 'pass',
        },
    )
})

test('Dir option', async () => {
    await modifyTsConfigJsonFile(
        { dir: join(__dirname, './someDir') },
        {
            include: ['.'],
        },
        {
            ifPropertyIsMissing: 'add',
        },
    )
    const tsconfigPath = join(__dirname, './someDir/tsconfig.json')
    expect(await readFile(tsconfigPath)).toMatchInlineSnapshot(`"{\\"include\\":[\\".\\"]}"`)
    await gracefulFs.promises.writeFile(tsconfigPath, '{}', 'utf-8')
})
