import { expectType } from 'tsd'

import { modifyJsonFile, modifyPackageJsonFile } from '../src'

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

modifyPackageJsonFile('someDirWithPackageJson', {
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
    // TODO
    // devDependencies: deps => ({ ...deps, 'react-script': undefined }),
})
