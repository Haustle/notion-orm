import { Client } from "@notionhq/client";
import { GetDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { createTypescriptFileForDatabase } from "./GenerateTypes";
import * as ts from "typescript";
import fs from "fs";
import path from "path";

require("dotenv").config();

export type NotionConfigType = {
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
		console.error("Please pass a valid Notion Integration Key");
		process.exit(1);
	}
	if (databaseIds.length < 0) {
		console.error("Please pass some database Ids");
		process.exit(1);
	}

	// Initialize client
	const NotionClient = new Client({
		auth: auth,
	});

	const databaseNames: string[] = [];

	// retrieve the database object
	const databaseClassImports: ts.ImportDeclaration[] = [];
	const databaseCamelizedNames: string[] = [];
	const buildDir = path.join(
		__dirname,
		"../../build",
		"NotionActions",
		"DatabaseTypes"
	);
	fs.rmdir(buildDir, () => console.log("Deleting current database types..."));
	for (const database_id of databaseIds) {
		let dbOjbect: GetDatabaseResponse;

		// Try to get the database schema
		try {
			dbOjbect = await NotionClient.databases.retrieve({
				database_id,
			});
		} catch (e) {
			console.error(e);
			return { databaseNames: [] };
		}
		const { databaseClassName, databaseId, databaseName } =
			await createTypescriptFileForDatabase(dbOjbect);
		databaseNames.push(databaseName);
		databaseCamelizedNames.push(databaseClassName);

		databaseClassImports.push(
			databaseImportStatement({
				databaseClassName,
				databaseId,
			})
		);
	}

	const nodeArr = [
		...databaseClassImports,
		mainNotionVariable(databaseCamelizedNames),
	];
	createNotionFile(nodeArr);
	return { databaseNames };
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
