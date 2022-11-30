import { Client } from "@notionhq/client";
import { GetDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { generateTypes } from "./GenerateTypes";
import * as ts from "typescript";
import fs from "fs";
import path from "path";

require("dotenv").config();

type NotionConfigType = {
	auth: string;
	databaseIds: string[];
};

type importClassType = {
	databaseId: string;
	databaseClassName: string;
};

export const createDatabaseTypes = async (notionInfo: NotionConfigType) => {
	const { auth, databaseIds } = notionInfo;

	// Making sure the user is passing valid arguments
	if (!auth) {
		throw Error("Please pass a valid Notion Integration Key");
	}
	if (databaseIds.length < 0) {
		throw Error("Please pass some database Ids");
	}

	// Initialize client
	const NotionClient = new Client({
		auth: auth,
	});

	// retrieve the database object
	const collectionClassImports: ts.ImportDeclaration[] = [];
	const collectionNames: string[] = [];

	for (const database_id of databaseIds) {
		let dbOjbect: GetDatabaseResponse;

		// Try to get the database schema
		try {
			dbOjbect = await NotionClient.databases.retrieve({
				database_id,
			});
		} catch (e) {
			return;
		}
		const { databaseClassName, databaseId } = await generateTypes(dbOjbect);
		console.log(`database name: ${databaseClassName}`);
		collectionNames.push(databaseClassName);

		collectionClassImports.push(
			databaseImportStatement({
				databaseClassName,
				databaseId,
			})
		);
		console.log(collectionClassImports.length);
	}

	const nodeArr = [
		...collectionClassImports,
		mainNotionVariable(collectionNames),
	];

	console.log(`num imports: ${collectionClassImports.length}`);
	console.log(`num of names: ${collectionNames.length}`);

	createNotionFile(nodeArr);

	console.log("after");
};

// Create the import statement for notion.ts file
function databaseImportStatement(dbClass: importClassType) {
	return ts.factory.createImportDeclaration(
		undefined,
		ts.factory.createImportClause(
			false,
			undefined,
			ts.factory.createNamedImports([
				ts.factory.createImportSpecifier(
					false,
					undefined,
					ts.factory.createIdentifier(dbClass.databaseClassName)
				),
			])
		),

		// We've setup paths to allow @notion-database access
		ts.factory.createStringLiteral(`@notion-database/${dbClass.databaseId}`),
		undefined
	);
}

function mainNotionVariable(databaseNames: string[]) {
	return ts.factory.createVariableStatement(
		[ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
		ts.factory.createVariableDeclarationList(
			[
				ts.factory.createVariableDeclaration(
					ts.factory.createIdentifier("notion"),
					undefined,
					undefined,
					ts.factory.createObjectLiteralExpression(
						[
							...databaseNames.map((name) =>
								ts.factory.createShorthandPropertyAssignment(
									ts.factory.createIdentifier(name),
									undefined
								)
							),
						],
						true
					)
				),
			],
			ts.NodeFlags.Const
		)
	);
}

// Creates file that import all generated notion database Ids
function createNotionFile(nodeArr: ts.Node[]) {
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

	const outputDir = path.join(__dirname, "../../src", "NotionActions");

	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir);
	}
	fs.writeFileSync(path.resolve(outputDir, "notion.ts"), outputFile);
}
