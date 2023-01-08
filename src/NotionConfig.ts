import { Client } from "@notionhq/client";
import { GetDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { createTypescriptFileForDatabase } from "./GenerateTypes";
import * as ts from "typescript";
import fs from "fs";
import path from "path";

export const DATABASES_DIR = path.join(__dirname, "../../build", "databases");

export type NotionConfigType = {
	auth: string;
	databaseIds: string[];
};

export const createDatabaseTypes = async (args: NotionConfigType) => {
	const { auth, databaseIds } = args;

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
	const databaseClassExportStatements: ts.ExportDeclaration[] = [];

	// Remove the previous databases, so they can call get updated
	fs.rmdir(DATABASES_DIR, () =>
		console.log("Deleting current database types...")
	);

	for (const database_id of databaseIds) {
		let dbOjbect: GetDatabaseResponse;

		try {
			// Get the database schema
			dbOjbect = await NotionClient.databases.retrieve({
				database_id,
			});

			// Create typescript file based on schema
			const { databaseClassName, databaseId, databaseName } =
				await createTypescriptFileForDatabase(dbOjbect);

			databaseNames.push(databaseName);
			databaseClassExportStatements.push(
				databaseExportStatement({
					databaseClassName,
				})
			);
		} catch (e) {
			console.error(e);
			return { databaseNames: [] };
		}
	}

	// Create a file that exports all databases
	createNotionFile({
		databaseClassExportStatements,
	});
	return { databaseNames };
};

// Create the import statement for notion.ts file
function databaseExportStatement(args: { databaseClassName: string }) {
	const { databaseClassName } = args;
	return ts.factory.createExportDeclaration(
		undefined,
		false,
		ts.factory.createNamedExports([
			ts.factory.createExportSpecifier(
				false,
				undefined,
				ts.factory.createIdentifier(databaseClassName)
			),
		]),
		ts.factory.createStringLiteral(`./${databaseClassName}`),
		undefined
	);
}

// Creates file that import all generated notion database Ids
function createNotionFile(args: { databaseClassExportStatements: ts.Node[] }) {
	const { databaseClassExportStatements } = args;
	const nodes = ts.factory.createNodeArray(databaseClassExportStatements);
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

	if (!fs.existsSync(DATABASES_DIR)) {
		fs.mkdirSync(DATABASES_DIR);
	}

	// Create TypeScript and JavaScript file
	fs.writeFileSync(
		path.resolve(DATABASES_DIR, "notion.ts"),
		typescriptCodeToString
	);
	fs.writeFileSync(
		path.resolve(DATABASES_DIR, "notion.js"),
		typescriptCodeToString
	);
}
