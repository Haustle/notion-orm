#! /usr/bin/env node

import fs from "fs";
import { createDatabaseTypes } from "./index";
import path from "path";

async function main() {
	const args = process.argv.slice(2);

	if (args.length === 1 && args[0] === "generate") {
		const projDir = process.cwd();

		const notionConfigDirJS = fs.existsSync(
			path.join(projDir, "notion.config.js")
		);
		const notionConfigDirTS = fs.existsSync(
			path.join(projDir, "notion.config.ts")
		);

		console.log(path.join(projDir, "notion.config"));
		if (notionConfigDirJS || notionConfigDirTS) {
			// this is a relative import, so we can escape out

			const config = require(path.join(projDir, "notion.config"));

			const { databaseNames } = await createDatabaseTypes(config);
			if (databaseNames.length < 0) {
				console.log("generated no types");
			} else {
				console.log("Generated types for the following Database's: ");
				for (let x = 0; x < databaseNames.length; x++) {
					console.log(`${x}. ${databaseNames[x]}`);
				}
			}
		} else {
			console.error("Could not find file `notion.config.ts` in root");
			process.exit(1);
		}
	}
}

main();
