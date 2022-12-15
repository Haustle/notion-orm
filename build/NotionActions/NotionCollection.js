"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionActions = void 0;
const client_1 = require("@notionhq/client");
const BuildCall_1 = require("./BuildCall");
require("dotenv").config();
class CollectionActions {
    constructor(datbaseId, propNameToColumnName) {
        this.NotionClient = new client_1.Client({
            auth: process.env.NOTION_KEY,
        });
        this.databaseId = datbaseId;
        this.propNameToColumnName = propNameToColumnName;
        this.columnNames = Object.keys(propNameToColumnName);
    }
    // Add page to a database
    add(pageObject) {
        return __awaiter(this, void 0, void 0, function* () {
            const callBody = {
                parent: {
                    database_id: this.databaseId,
                },
                properties: {},
            };
            const columnTypePropNames = Object.keys(pageObject);
            columnTypePropNames.forEach((propName) => {
                const { type, columnName } = this.propNameToColumnName[propName];
                const columnObject = (0, BuildCall_1.getCall)({
                    type,
                    value: pageObject[propName],
                });
                callBody.properties[columnName] = columnObject;
            });
            // console.log(JSON.stringify(callBody, null, 4));
            yield this.NotionClient.pages.create(callBody);
        });
    }
    // Look for page inside the database
    query(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryCall = {
                database_id: this.databaseId,
            };
            const filters = query.filter
                ? this.recursivelyBuildFilter(query.filter)
                : undefined;
            if (filters) {
                // @ts-ignore errors vs notion api types
                queryCall["filter"] = filters;
            }
            console.log(JSON.stringify(queryCall, null, 4));
            const sort = query.sort;
            const apiQuery = yield this.NotionClient.databases.query(queryCall);
            console.log(apiQuery);
        });
    }
    recursivelyBuildFilter(queryFilter) {
        // Need to loop because we don't kno
        for (const prop in queryFilter) {
            // if the filter is "and" || "or" we need to recursively
            if (prop === "and" || prop === "or") {
                const compoundFilters = 
                // @ts-ignore
                queryFilter[prop];
                const compoundApiFilters = compoundFilters.map((i) => {
                    return this.recursivelyBuildFilter(i);
                });
                // Either have an `and` or an `or` compound filter
                let temp = Object.assign({}, (prop === "and"
                    ? { and: compoundApiFilters }
                    : { or: compoundApiFilters }));
                return temp;
            }
            else {
                const propType = this.propNameToColumnName[prop].type;
                const temp = {
                    property: this.propNameToColumnName[prop].columnName,
                };
                //@ts-ignore
                temp[propType] = queryFilter[prop];
                return temp;
            }
        }
    }
}
exports.CollectionActions = CollectionActions;
