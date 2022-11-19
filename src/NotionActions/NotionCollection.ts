import { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { getCall } from "./BuildCall";
import { PropertyType } from "./GenerateTypes";

interface Query<T> {
    query: {
        where: Partial<T>;
    };
}
type propNameToColumnNameType = Record<
    string,
    { columnName: string; type: PropertyType }
>;

export class CollectionActions<CollectionType extends {}> {
    private databaseId: string;
    private propNameToColumnName: propNameToColumnNameType;

    constructor(
        datbaseId: string,
        propNameToColumnName: propNameToColumnNameType
    ) {
        this.databaseId = datbaseId;
        this.propNameToColumnName = propNameToColumnName;
    }

    // Add page to a database
    add(pageObject: CollectionType) {
        console.log(pageObject);
        const callBody: CreatePageParameters = {
            parent: {
                database_id: this.databaseId,
            },
            properties: {},
        };

        const columnTypePropNames = Object.keys(pageObject);
        columnTypePropNames.forEach((propName) => {
            const { type, columnName } = this.propNameToColumnName[propName];
            const columnObject = getCall({
                type,
                // @ts-ignore
                value: pageObject[propName],
            });

            callBody.properties[columnName] = columnObject!;
        });

        console.log(JSON.stringify(callBody, null, 4));
    }

    // Look for page inside the database
    query(q: Query<CollectionType>) {}
}
