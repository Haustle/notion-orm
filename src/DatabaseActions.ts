import {
	CreatePageParameters,
	CreatePageResponse,
	PageObjectResponse,
	QueryDatabaseParameters,
	QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { Client } from "@notionhq/client";
import { getCall } from "./BuildCall";
import path from "path";
import { NotionConfigType } from "./index";
import {
	apiFilterType,
	apiSingleFilter,
	CompoundFilters,
	Query,
	QueryFilter,
	SimpleQueryResponse,
	SingleFilter,
	SupportedNotionColumnTypes,
} from "./queryTypes";

import { camelize } from "./GenerateTypes";
export type propNameToColumnNameType = Record<
	string,
	{ columnName: string; type: SupportedNotionColumnTypes }
>;

// Import auth key from config file
const { auth }: NotionConfigType = require(path.join(
	process.cwd(),
	"notion.config"
));

export class DatabaseActions<
	DatabaseSchemaType extends Record<string, any>,
	ColumnNameToColumnType extends Record<
		keyof DatabaseSchemaType,
		SupportedNotionColumnTypes
	>
> {
	private NotionClient: Client = new Client({
		auth,
	});
	private databaseId: string;
	private propNameToColumnName: propNameToColumnNameType;
	private columnNames: string[];

	constructor(
		datbaseId: string,
		propNameToColumnName: propNameToColumnNameType
	) {
		this.databaseId = datbaseId;
		this.propNameToColumnName = propNameToColumnName;
		this.columnNames = Object.keys(propNameToColumnName);
	}

	// Add page to a database
	async add(
		pageObject: DatabaseSchemaType,
		getCallBody?: boolean
	): Promise<CreatePageParameters | CreatePageResponse> {
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
				value: pageObject[propName],
			});

			callBody.properties[columnName] = columnObject!;
		});

		// CORS: If user wants the body of the call. Can then send to API
		if (getCallBody) {
			return callBody;
		}

		return await this.NotionClient.pages.create(callBody);
	}

	// Look for page inside the database
	async query(
		query: Query<DatabaseSchemaType, ColumnNameToColumnType>
	): Promise<SimpleQueryResponse<DatabaseSchemaType>> {
		const queryCall: QueryDatabaseParameters = {
			database_id: this.databaseId,
		};

		const filters = query.filter
			? this.recursivelyBuildFilter(query.filter)
			: undefined;
		if (filters) {
			// @ts-ignore errors vs notion api types
			queryCall["filter"] = filters;
		}

		const sort = query.sort;

		const response = await this.NotionClient.databases.query(queryCall);

		return this.simplifyQueryResponse(response);
	}

	private simplifyQueryResponse(
		res: QueryDatabaseResponse
	): SimpleQueryResponse<DatabaseSchemaType> {
		// Is this smart too do...idk
		const rawResults = res.results as PageObjectResponse[];
		const rawResponse = res;

		const results: Partial<DatabaseSchemaType>[] = rawResults.map((result) => {
			const simpleResult: Partial<DatabaseSchemaType> = {};
			const properties = Object.entries(result.properties);

			for (const [columnName, result] of properties) {
				const camelizeColumnName = camelize(columnName);

				const columnType = this.propNameToColumnName[camelizeColumnName].type;

				// @ts-ignore
				simpleResult[camelizeColumnName] = this.getResponseValue(
					columnType,
					result
				);
			}
			return simpleResult;
		});

		return {
			results,
			rawResponse,
		};
	}

	private getResponseValue(
		prop: SupportedNotionColumnTypes,
		x: Record<string, any>
	) {
		switch (prop) {
			case "select": {
				const { select } = x;
				if (select) {
					return select["name"];
				}
				return undefined;
			}
			case "title": {
				const { title } = x;
				if (title) {
					const combinedText = title.map(
						({ plain_text }: { plain_text: string }) => plain_text
					);
					return combinedText.join("");
				}
				return undefined;
			}
			case "url": {
				const { url } = x;
				return url;
			}

			case "multi_select": {
				const { multi_select } = x;
				if (multi_select) {
					const multi_selectArr: string[] = multi_select.map(
						({ name }: { name: string }) => name
					);
					return multi_selectArr;
				}
				return undefined;
			}
			default: {
				return "lol";
			}
		}
	}

	private recursivelyBuildFilter(
		queryFilter: QueryFilter<DatabaseSchemaType, ColumnNameToColumnType>
	): apiFilterType {
		// Need to loop because we don't kno
		for (const prop in queryFilter) {
			// if the filter is "and" || "or" we need to recursively
			if (prop === "and" || prop === "or") {
				const compoundFilters: QueryFilter<
					DatabaseSchemaType,
					ColumnNameToColumnType
				>[] =
					// @ts-ignore
					queryFilter[prop];

				const compoundApiFilters = compoundFilters.map(
					(i: QueryFilter<DatabaseSchemaType, ColumnNameToColumnType>) => {
						return this.recursivelyBuildFilter(i);
					}
				);

				// Either have an `and` or an `or` compound filter
				let temp: apiFilterType = {
					...(prop === "and"
						? { and: compoundApiFilters }
						: { or: compoundApiFilters }),
				};
				return temp;
			} else {
				const propType = this.propNameToColumnName[prop].type;
				const temp: apiSingleFilter = {
					property: this.propNameToColumnName[prop].columnName,
				};

				//@ts-ignore
				temp[propType] = (queryFilter as SingleFilter<ColumnNameToColumnType>)[
					prop
				];
				return temp;
			}
		}
	}
}
