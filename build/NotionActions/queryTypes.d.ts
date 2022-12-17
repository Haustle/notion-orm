/**
 * Column types' for all query options
 */
export type FilterOptionNames = "text" | "title" | "number" | "checkbox" | "select" | "multi_select" | "url";
type TextPropertyFilters = {
    equals: string;
    does_not_equal: string;
    contains: string;
    does_not_contain: string;
    starts_with: string;
    ends_with: string;
    is_empty: true;
    is_not_empty: true;
};
type NumberPropertyFilters = {
    equals: number;
    does_not_equals: number;
    greater_than: number;
    less_than: number;
    greater_than_or_equal_to: number;
    less_than_or_equal_to: number;
    is_empty: true;
    is_not_empty: true;
};
type CheckBoxPropertyFilters = {
    equals: boolean;
    does_not_equal: boolean;
};
type SelectPropertyFilters<T> = {
    equals: (T extends Array<any> ? T[number] : T) | (string & {});
    does_not_equal: (T extends Array<any> ? T[number] : T) | (string & {});
    is_empty: true;
    is_not_empty: true;
};
type MultiSelectPropertyFilters<T> = {
    contains: (T extends Array<any> ? T[number] : T) | (string & {});
    does_not_contain: (T extends Array<any> ? T[number] : T) | (string & {});
    is_empty: true;
    is_not_empty: true;
};
export type FilterOptions<T = []> = {
    text: TextPropertyFilters;
    title: TextPropertyFilters;
    number: NumberPropertyFilters;
    checkbox: CheckBoxPropertyFilters;
    select: SelectPropertyFilters<T>;
    multi_select: MultiSelectPropertyFilters<T>;
    url: string;
};
type ColumnNameToNotionColumnType<T> = Record<keyof T, FilterOptionNames>;
export type SingleFilter<Y extends Record<string, any>, T extends ColumnNameToNotionColumnType<Y>> = {
    [Property in keyof Y]?: Partial<FilterOptions<Y[Property]>[T[Property]]>;
};
export type CompoundFilters<Y extends Record<string, any>, T extends Record<keyof Y, FilterOptionNames>> = {
    and: Array<SingleFilter<Y, T> | CompoundFilters<Y, T>>;
} | {
    or: Array<SingleFilter<Y, T> | CompoundFilters<Y, T>>;
};
export type QueryFilter<Y extends Record<string, any>, T extends Record<keyof Y, FilterOptionNames>> = SingleFilter<Y, T> | CompoundFilters<Y, T>;
export type Query<Y extends Record<string, any>, T extends Record<keyof Y, FilterOptionNames>> = {
    filter?: QueryFilter<Y, T>;
    sort?: [];
};
export type apiFilterQuery = {
    filter?: apiSingleFilter | apiAndFilter | apiOrFilter;
};
/**
 * Transform the types above to build types to
 * actually build schema for query request
 */
type apiColumnTypeToOptions = {
    [prop in keyof FilterOptions]?: Partial<FilterOptions[prop]>;
};
export interface apiSingleFilter extends apiColumnTypeToOptions {
    property: string;
}
export type apiFilterType = apiSingleFilter | apiAndFilter | apiOrFilter | undefined;
type apiAndFilter = {
    and: Array<apiFilterType>;
};
type apiOrFilter = {
    or: Array<apiFilterType>;
};
export {};
//# sourceMappingURL=queryTypes.d.ts.map