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
	const databaseClassExports: ts.ExportDeclaration[] = [];
	const databaseCamelizedNames: string[] = [];
	const buildDir = path.join(__dirname, "../../build", "databases");
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

		databaseClassExports.push(
			databaseExportStatement({
				databaseClassName,
				databaseId,
			})
		);
	}

	const nodeArr = [...databaseClassExports];
	createNotionFile(nodeArr);
	return { databaseNames };
};

// Create the import statement for notion.ts file
function databaseExportStatement(dbClass: importClassType) {
	return ts.factory.createExportDeclaration(
		undefined,
		false,
		ts.factory.createNamedExports([
			ts.factory.createExportSpecifier(
				false,
				undefined,
				ts.factory.createIdentifier(dbClass.databaseClassName)
			),
		]),
		ts.factory.createStringLiteral(`./${dbClass.databaseId}`),
		undefined
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

	const typescriptCodeToString = printer.printList(
		ts.ListFormat.MultiLine,
		nodes,
		sourceFile
	);

	const transpileToJavaScript = ts.transpile(typescriptCodeToString, {
		module: ts.ModuleKind.None,
		target: ts.ScriptTarget.ES2015,
	});

	const outputDir = path.join(__dirname, "../../build", "databases");

	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir);
	}
	fs.writeFileSync(
		path.resolve(outputDir, "notion.ts"),
		typescriptCodeToString
	);
	fs.writeFileSync(
		path.resolve(outputDir, "notion.js"),
		typescriptCodeToString
	);
}
