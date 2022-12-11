import {
	CreatePageParameters,
	QueryDatabaseParameters,
} from "@notionhq/client/build/src/api-endpoints";
import { Client } from "@notionhq/client";
import { getCall } from "./BuildCall";
import { PropertyType } from "./GenerateTypes";
import {
	apiFilterType,
	apiSingleFilter,
	CompoundFilters,
	FilterOptionNames,
	Query,
	QueryFilter,
	SingleFilter,
} from "./queryTypes";
require("dotenv").config();

export type propNameToColumnNameType = Record<
	string,
	{ columnName: string; type: PropertyType }
>;

export class CollectionActions<
	CollectionType extends Record<string, any>,
	ColNameToType extends Record<keyof CollectionType, FilterOptionNames>
> {
	private NotionClient: Client = new Client({
		auth: process.env.NOTION_KEY,
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
	async add(pageObject: CollectionType) {
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

		// console.log(JSON.stringify(callBody, null, 4));
		await this.NotionClient.pages.create(callBody);
	}

	// Look for page inside the database
	async query(query: Query<CollectionType, ColNameToType>) {
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

		console.log(JSON.stringify(queryCall, null, 4));

		const sort = query.sort;

		const apiQuery = await this.NotionClient.databases.query(queryCall);
		console.log(apiQuery);
	}

	recursivelyBuildFilter(
		queryFilter: QueryFilter<CollectionType, ColNameToType>
	): apiFilterType {
		// Need to loop because we don't kno
		for (const prop in queryFilter) {
			// if the filter is "and" || "or" we need to recursively
			if (prop === "and" || prop === "or") {
				const compoundFilters: QueryFilter<CollectionType, ColNameToType>[] =
					// @ts-ignore
					queryFilter[prop];

				const compoundApiFilters = compoundFilters.map(
					(i: QueryFilter<CollectionType, ColNameToType>) => {
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
				temp[propType] = (queryFilter as SingleFilter<ColNameToType>)[prop];
				return temp;
			}
		}
	}
}
