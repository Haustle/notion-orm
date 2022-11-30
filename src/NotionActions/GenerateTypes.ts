import {
	DatabaseObjectResponse,
	GetDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";
import * as ts from "typescript";
import fs from "fs";
import path from "path";

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
export async function generateTypes(dbResponse: GetDatabaseResponse) {
	const {
		id: databaseId,
		properties,
		title,
	} = dbResponse as DatabaseObjectResponse;
	const propNameToColumnName: propNameToColumnNameType = {};

	const databaseClassName = camelize(title[0].plain_text).replace(
		/[^a-zA-Z0-9]/g,
		""
	);

	// keep track of column Types
	const columnTypes: Record<string, PropertyType> = {};

	const collectionTypeProps: ts.TypeElement[] = [];

	// Looping through each column of database
	Object.values(properties).forEach((value) => {
		const { type, name: columnName } = value;
		// Creating map of column name to the column's name in the database's typescript type

		const typePropColumnName = camelize(columnName);
		propNameToColumnName[typePropColumnName] = {
			columnName,
			type,
		};

		type x = {
			d: Date;
		};
		if (type === "title" || type === "rich_text") {
			// add text column to collection type
			collectionTypeProps.push(
				textProperty(typePropColumnName, type === "title")
			);
		} else if (type === "number") {
			collectionTypeProps.push(numberProperty(typePropColumnName));
		} else if (type === "url") {
			collectionTypeProps.push(textProperty(typePropColumnName, false));
		} else if (type === "date") {
			collectionTypeProps.push(dateProperty(typePropColumnName));
		} else if (type == "select" || type == "multi_select") {
			// Because select's and types are going to ha
			// @ts-ignore
			const options = value[type].options.map((x) => x.name);
			collectionTypeProps.push(
				multiOptionType(typePropColumnName, options, type === "multi_select")
			);
		}

		// set the column type
		columnTypes[columnName] = type;
	});

	console.log("column size: ", collectionTypeProps.length);
	// Object
	const CollectionType = ts.factory.createTypeAliasDeclaration(
		undefined,
		[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createIdentifier("CollectionType"),
		undefined,
		ts.factory.createTypeLiteralNode(collectionTypeProps)
	);

	// Top level non-nested variable, functions, types
	const nodeArr = [
		importCollectionClass(),
		generateDatabaseIdVariable(databaseId),
		CollectionType,
		mapPropNameToColumnDetails(propNameToColumnName),
		exportCollectionActions(databaseClassName),
	];

	const nodes = ts.factory.createNodeArray(nodeArr);

	const sourceFile = ts.createSourceFile(
		"placeholder.ts",
		"",
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TS
	);
	const printer = ts.createPrinter();

	const outputFile = printer.printList(
		ts.ListFormat.MultiLine,
		nodes,
		sourceFile
	);

	// Create our output folder
	const outputDir = path.join(
		__dirname,
		"../../src",
		"NotionActions",
		"DatabaseTypes"
	);
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir);
	}
	fs.writeFileSync(path.resolve(outputDir, `${databaseId}.ts`), outputFile);

	return { databaseClassName, databaseId };
}

// generate text property
function textProperty(name: string, isTitle: boolean) {
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
function numberProperty(name: string) {
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
function multiOptionType(name: string, options: string[], array: boolean) {
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
							otherStringProp(),
						])
					)
			  )
			: ts.factory.createUnionTypeNode([
					...options.map((option) =>
						ts.factory.createLiteralTypeNode(
							ts.factory.createStringLiteral(option)
						)
					),
					otherStringProp(),
			  ])
	);
}

// string & {}. Allows users to pass in values
function otherStringProp() {
	return ts.factory.createIntersectionTypeNode([
		ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
		ts.factory.createTypeLiteralNode([]),
	]);
}
function dateProperty(name: string) {
	return ts.factory.createPropertySignature(
		undefined,
		ts.factory.createIdentifier("s"),
		undefined,
		ts.factory.createTypeReferenceNode(
			ts.factory.createIdentifier("Date"),
			undefined
		)
	);
}

// Generate database Id variable
// const databaseId = <database-id>
function generateDatabaseIdVariable(databaseId: string) {
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
				)
			),
		],
		ts.NodeFlags.Const
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
					ts.factory.createIdentifier("CollectionActions")
				),
			])
		),
		ts.factory.createStringLiteral("../NotionCollection"),
		undefined
	);
}

// We export the database with the class above.
// export

/**
 * We export the database with
 * @param databaseName
 *
 * const <datbase-name> = new CollectionActions<CollectionType>(datbaseId, propMap)
 */
function exportCollectionActions(databaseName: string) {
	return ts.factory.createVariableStatement(
		[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createVariableDeclarationList(
			[
				ts.factory.createVariableDeclaration(
					ts.factory.createIdentifier(databaseName),
					undefined,
					undefined,
					ts.factory.createNewExpression(
						ts.factory.createIdentifier("CollectionActions"),
						[
							ts.factory.createTypeReferenceNode(
								ts.factory.createIdentifier("CollectionType"),
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
