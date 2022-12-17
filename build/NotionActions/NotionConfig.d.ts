export type NotionConfigType = {
    auth: string;
    databaseIds: string[];
};
export declare const createDatabaseTypes: (notionInfo: NotionConfigType) => Promise<{
    databaseNames: string[];
}>;
//# sourceMappingURL=NotionConfig.d.ts.map