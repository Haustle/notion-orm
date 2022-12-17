import { GetDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
declare const propertyArr: string[];
export type PropertyType = typeof propertyArr[number];
export declare function createTypescriptFileForDatabase(dbResponse: GetDatabaseResponse): Promise<{
    databaseName: string;
    databaseClassName: string;
    databaseId: string;
}>;
export {};
//# sourceMappingURL=GenerateTypes.d.ts.map