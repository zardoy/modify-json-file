export type PartialObjectDeep<T extends object> = {
    [K in keyof T]?: T[K] extends any[] ? T[K] : T[K] extends Record<string, any> ? PartialObjectDeep<T[K]> : T[K]
}
