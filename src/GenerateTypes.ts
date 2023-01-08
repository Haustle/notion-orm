import {
	DatabaseObjectResponse,
	GetDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";
import * as ts from "typescript";
import fs from "fs";
import path from "path";
import { DATABASES_DIR } from "./NotionConfig";

// This can be grabbed from // api-endpoints.d.ts with some work
const propertyArr = [
	"text",
	"select",
	"title",
	"number",
	"multi_select",
	"checkbox",
	"url",
];
export type PropertyType = typeof propertyArr[number];

type propNameToColumnNameType = Record<
	string,
	{ columnName: string; type: PropertyType }
>;

/* 
Responsible for generating `.ts` files
*/
export async function createTypescriptFileForDatabase(
	dbResponse: GetDatabaseResponse
) {
	const {
		id: databaseId,
		properties,
		title,
	} = dbResponse as DatabaseObjectResponse;
	const propNameToColumnName: propNameToColumnNameType = {};
	const databaseName = title[0].plain_text;
	const databaseClassName = camelize(databaseName).replace(/[^a-zA-Z0-9]/g, "");

	const databaseColumnTypeProps: ts.TypeElement[] = [];

	// Looping through each column of database
	Object.values(properties).forEach((value) => {
		const { type: columnType, name: columnName } = value;

		// Taking the column name and camelizing it for typescript use
		const camelizedColumnName = camelize(columnName);

		// Creating map of column name to the column's name in the database's typescript type
		propNameToColumnName[camelizedColumnName] = {
			columnName,
			type: columnType,
		};

		if (columnType === "title" || columnType === "rich_text") {
			// add text column to collection type
			databaseColumnTypeProps.push(
				createTextProperty(camelizedColumnName, columnType === "title")
			);
		} else if (columnType === "number") {
			// add number column to collection type
			databaseColumnTypeProps.push(createNumberProperty(camelizedColumnName));
		} else if (columnType === "url") {
			// add url column to collection type
			databaseColumnTypeProps.push(
				createTextProperty(camelizedColumnName, false)
			);
		} else if (columnType === "date") {
			// add Date column to collection type
			databaseColumnTypeProps.push(createDateProperty(camelizedColumnName));
		} else if (columnType == "select" || columnType == "multi_select") {
			// @ts-ignore
			const options = value[columnType].options.map((x) => x.name);
			databaseColumnTypeProps.push(
				createMultiOptionProp(
					camelizedColumnName,
					options,
					// This determines whether the property needs to be a union or a union array
					columnType === "multi_select"
				)
			);
		}
	});

	// Object type that represents the database schema
	const DatabaseSchemaType = ts.factory.createTypeAliasDeclaration(
		undefined,
		ts.factory.createIdentifier("DatabaseSchemaType"),
		undefined,
		ts.factory.createTypeLiteralNode(databaseColumnTypeProps)
	);

	// Top level non-nested variable, functions, types for database files
	const TsNodesForDatabaseFile = ts.factory.createNodeArray([
		importCollectionClass(),
		createDatabaseIdVariable(databaseId),
		DatabaseSchemaType,
		mapPropNameToColumnDetails(propNameToColumnName),
		ColumnNameToColumnType(),
		exportDatabaseActions(databaseClassName),
	]);

	const sourceFile = ts.createSourceFile(
		"",
		"",
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TS
	);
	const printer = ts.createPrinter();

	const typescriptCodeToString = printer.printList(
		ts.ListFormat.MultiLine,
		TsNodesForDatabaseFile,
		sourceFile
	);

	const transpileToJavaScript = ts.transpile(typescriptCodeToString, {
		module: ts.ModuleKind.None,
		target: ts.ScriptTarget.ES2015,
	});

	// Create our output folder
	if (!fs.existsSync(DATABASES_DIR)) {
		fs.mkdirSync(DATABASES_DIR);
	}

	// Create TypeScript and JavaScript files
	fs.writeFileSync(
		path.resolve(DATABASES_DIR, `${databaseClassName}.ts`),
		typescriptCodeToString
	);
	fs.writeFileSync(
		path.resolve(DATABASES_DIR, `${databaseClassName}.js`),
		transpileToJavaScript
	);

	return { databaseName, databaseClassName, databaseId };
}

// generate text property
function createTextProperty(name: string, isTitle: boolean) {
	const text = ts.factory.createPropertySignature(
		undefined,
		ts.factory.createIdentifier(name),
		!isTitle ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
		ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
	);
	return text;
}

/**
 * Generate number property to go inside a type
 * name: number
 */
function createNumberProperty(name: string) {
	const number = ts.factory.createPropertySignature(
		undefined,
		ts.factory.createIdentifier(name),
		ts.factory.createToken(ts.SyntaxKind.QuestionToken),
		ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
	);
	return number;
}

/**
 *
 * @param name name of property
 * @param options
 * @param array
 * @returns
 *
 * For selects and multi-select collection properties
 *
 * array = true for multi-select
 *
 * name = ("x" | "y" | "z")[]
 */
function createMultiOptionProp(
	name: string,
	options: string[],
	array: boolean
) {
	return ts.factory.createPropertySignature(
		undefined,
		ts.factory.createIdentifier(name),
		ts.factory.createToken(ts.SyntaxKind.QuestionToken),
		array
			? ts.factory.createArrayTypeNode(
					ts.factory.createParenthesizedType(
						ts.factory.createUnionTypeNode([
							...options.map((option) =>
								ts.factory.createLiteralTypeNode(
									ts.factory.createStringLiteral(option)
								)
							),
							createOtherStringProp(),
						])
					)
			  )
			: ts.factory.createUnionTypeNode([
					...options.map((option) =>
						ts.factory.createLiteralTypeNode(
							ts.factory.createStringLiteral(option)
						)
					),
					createOtherStringProp(),
			  ])
	);
}

// string & {}. Allows users to pass in values
function createOtherStringProp() {
	return ts.factory.createIntersectionTypeNode([
		ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
		ts.factory.createTypeLiteralNode([]),
	]);
}
function createDateProperty(name: string) {
	return ts.factory.createPropertySignature(
		undefined,
		ts.factory.createIdentifier(name),
		ts.factory.createToken(ts.SyntaxKind.QuestionToken),
		ts.factory.createTypeReferenceNode(
			ts.factory.createIdentifier("Date"),
			undefined
		)
	);
}

// Generate database Id variable
// const databaseId = <database-id>
function createDatabaseIdVariable(databaseId: string) {
	return ts.factory.createVariableStatement(
		undefined,
		ts.factory.createVariableDeclarationList(
			[
				ts.factory.createVariableDeclaration(
					ts.factory.createIdentifier("databaseId"),
					undefined,
					undefined,
					ts.factory.createStringLiteral(databaseId)
				),
			],
			ts.NodeFlags.Const
		)
	);
}

/**
 * Instead of refering to the column names 1:1 such as "Book Rating", we transform them to
 * camelcase (eg. bookRating). So we need to keep track of the original name and the type
 * for when we construct request for API
 *
 * Example
 *
 * const propMap = {
 *
 *      "bookRating": {
 *          columnName: "Book Rating",
 *          type: "select"
 *      },
 *      "genre": {
 *          columnName: "Genre",
 *          type: "multi_select"
 *      }
 *
 * }
 * @param colMap
 * @returns
 */
function mapPropNameToColumnDetails(colMap: propNameToColumnNameType) {
	return ts.factory.createVariableDeclarationList(
		[
			ts.factory.createVariableDeclaration(
				ts.factory.createIdentifier("propMap"),
				undefined,
				undefined,
				ts.factory.createAsExpression(
					ts.factory.createObjectLiteralExpression(
						[
							...Object.entries(colMap).map(([propName, value]) =>
								ts.factory.createPropertyAssignment(
									ts.factory.createStringLiteral(propName),
									ts.factory.createObjectLiteralExpression(
										[
											ts.factory.createPropertyAssignment(
												ts.factory.createIdentifier("columnName"),
												ts.factory.createStringLiteral(value.columnName)
											),
											ts.factory.createPropertyAssignment(
												ts.factory.createIdentifier("type"),
												ts.factory.createStringLiteral(value.type)
											),
										],
										true
									)
								)
							),
						],
						true
					),
					ts.factory.createTypeReferenceNode(
						ts.factory.createIdentifier("const"),
						undefined
					)
				)
			),
		],
		ts.NodeFlags.Const
	);
}

function ColumnNameToColumnType() {
	return ts.factory.createTypeAliasDeclaration(
		undefined,
		ts.factory.createIdentifier("ColumnNameToColumnType"),
		undefined,
		ts.factory.createMappedTypeNode(
			undefined,
			ts.factory.createTypeParameterDeclaration(
				undefined,
				ts.factory.createIdentifier("Property"),
				ts.factory.createTypeOperatorNode(
					ts.SyntaxKind.KeyOfKeyword,
					ts.factory.createTypeQueryNode(
						ts.factory.createIdentifier("propMap"),
						undefined
					)
				),
				undefined
			),
			undefined,
			undefined,
			ts.factory.createIndexedAccessTypeNode(
				ts.factory.createIndexedAccessTypeNode(
					ts.factory.createTypeQueryNode(
						ts.factory.createIdentifier("propMap"),
						undefined
					),
					ts.factory.createTypeReferenceNode(
						ts.factory.createIdentifier("Property"),
						undefined
					)
				),
				ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral("type"))
			),
			undefined
			/* unknown */
		)
	);
}

// Need to import the class responsible for adding and querying the database
function importCollectionClass() {
	return ts.factory.createImportDeclaration(
		undefined,
		ts.factory.createImportClause(
			false,
			undefined,
			ts.factory.createNamedImports([
				ts.factory.createImportSpecifier(
					false,
					undefined,
					ts.factory.createIdentifier("DatabaseActions")
				),
			])
		),
		ts.factory.createStringLiteral("../src/DatabaseActions"),
		undefined
	);
}

// We export the database with the class above.
// export

/**
 * We export the database with
 * @param databaseName
 *
 * const <datbase-name> = new DatabaseActions<DatabaseSchemaType>(datbaseId, propMap)
 */
function exportDatabaseActions(databaseName: string) {
	return ts.factory.createVariableStatement(
		[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createVariableDeclarationList(
			[
				ts.factory.createVariableDeclaration(
					ts.factory.createIdentifier(databaseName),
					undefined,
					undefined,
					ts.factory.createNewExpression(
						ts.factory.createIdentifier("DatabaseActions"),
						[
							ts.factory.createTypeReferenceNode(
								ts.factory.createIdentifier("DatabaseSchemaType"),
								undefined
							),
							ts.factory.createTypeReferenceNode(
								ts.factory.createIdentifier("ColumnNameToColumnType"),
								undefined
							),
						],
						[
							ts.factory.createIdentifier("databaseId"),
							ts.factory.createIdentifier("propMap"),
						]
					)
				),
			],
			ts.NodeFlags.Const
		)
	);
}

// for a type's property name
function camelize(str: string) {
	return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
		if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
		return index === 0 ? match.toLowerCase() : match.toUpperCase();
	});
}
