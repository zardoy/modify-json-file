import { expectType } from "tsd";

// todo-high https://nodejs.org/api/packages.html#packages_package_entry_points
import { modifyJsonFile, modifyPackageJsonFile } from "../build";

modifyJsonFile("path.json", {
    value: 5,
    extremeValue: n => n + 1,
    // //@ts-expect-error
    notAllowed: {
        test: () => 10
    }
});

modifyJsonFile<{ someNumber: number; anotherProp: { someString: string; }; }>("path.json", {
    someNumber: 5
});

//@ts-expect-error
modifyJsonFile<number>("path.json", {});

modifyJsonFile<number>("path.json", n => {
    expectType<number>(n);
    return n + 5;
});

modifyPackageJsonFile("someDirWithPackageJson", {
    name: name => `@supertf/${name}`,
    dependencies: {
        string: "string"
    },
    author: {
        //@ts-expect-error
        name: name => `super ${name}`
    }
});
