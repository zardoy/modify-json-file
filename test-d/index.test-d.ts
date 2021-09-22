import { expectType } from 'tsd'

// TODO-high map to build/ only on script run somehow
import { modifyJsonFile, modifyPackageJsonFile } from 'modify-json-file'
import { PackageJson, PartialDeep } from 'type-fest';

modifyJsonFile('path.json', {
    value: 5,
    extremeValue: n => n + 1,
    notAllowed: {
        test: () => 10,
    },
})

modifyJsonFile<{ someNumber: number; anotherProp: { someString: string } }>('path.json', {
    someNumber: 5,
})

//@ts-expect-error
modifyJsonFile<number>('path.json', {})

modifyJsonFile<number>('path.json', n => {
    expectType<number>(n)
    return n + 5
})

modifyPackageJsonFile('', {
    name: name => `@supertf/${name}`,
    dependencies: {
        string: 'string',
    },
    author: {
        //@ts-expect-error unknown prop
        name: name => `super ${name}`,
    },
    files: undefined,
    // removing react-scripts from devDependencies
    devDependencies: deps => ({ ...deps, 'react-script': undefined }),
})

const b: PartialDeep<PackageJson> = {
    // typesVersions: {
    //     ">=4": {
    //         "*": undefined
    //     }
    // }
    scripts: {
        install: undefined
    }
}

modifyPackageJsonFile({ dir: '.' }, old => ({ files: undefined }))
