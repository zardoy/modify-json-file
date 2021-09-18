import test from 'ava'
import del from 'del'
import fs from 'fs/promises'
import jsonfile from 'jsonfile'
import path from 'path'

// todo convert paths
import { modifyJsonFile, modifyPackageJsonFile } from '../build/'

const jsonFilePath = path.join(__dirname, 'testing-file.json')

const prepare = async (dataToWrite?) => {
    await jsonfile.writeFile(
        jsonFilePath,
        dataToWrite ?? {
            name: 'package',
            main: 'index.js',
            author: 'eldar',
            dependencies: {
                'type-fest': '*',
                fdir: '>=2',
            },
        },
        { spaces: 4 },
    )
}

test.afterEach.always(async () => {
    await del(jsonFilePath)
})

test('modifies JSON file', async t => {
    await prepare()
    await modifyJsonFile(jsonFilePath, {
        name: s => `super ${s}`,
        main: 'build/electron.js',
        dependencies: {
            'type-fest': '^1.0.0',
        },
    })
    const modifiedJsonFle = await fs.readFile(jsonFilePath, 'utf8')
    t.snapshot(modifiedJsonFle)
})

test('modifies package.json file with async function', async t => {
    await prepare()
    await modifyPackageJsonFile(jsonFilePath, async ({ main }) => {
        return { types: main, name: 'ahaha' }
    })
    const modifiedJsonFle = await fs.readFile(jsonFilePath, 'utf8')
    t.snapshot(modifiedJsonFle)
})

test('modifies package.json file which has numeric type', async t => {
    await prepare(50)
    await modifyJsonFile<number>(jsonFilePath, n => n + 5)
    const modifiedJsonFle = await fs.readFile(jsonFilePath, 'utf8')
    t.snapshot(modifiedJsonFle)
})
