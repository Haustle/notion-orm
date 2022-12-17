import { PropertyType } from "./GenerateTypes";
import { FilterOptionNames, Query } from "./queryTypes";
export type propNameToColumnNameType = Record<string, {
    columnName: string;
    type: PropertyType;
}>;
export declare class CollectionActions<CollectionType extends Record<string, any>, ColNameToType extends Record<keyof CollectionType, FilterOptionNames>> {
    private NotionClient;
    private databaseId;
    private propNameToColumnName;
    private columnNames;
    constructor(datbaseId: string, propNameToColumnName: propNameToColumnNameType);
    add(pageObject: CollectionType): Promise<void>;
    query(query: Query<CollectionType, ColNameToType>): Promise<void>;
    private recursivelyBuildFilter;
}
//# sourceMappingURL=NotionCollection.d.ts.map