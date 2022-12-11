#! /usr/bin/env node

import fs from "fs";
import { createDatabaseTypes } from "./NotionActions/NotionConfig";
require("dotenv").config();

async function main() {
	const args = process.argv.slice(2);

	if (args.length === 1 && args[0] === "generate") {
		const notionConfigDir = "./build/notion.config.js";
		if (fs.existsSync(notionConfigDir)) {
			// this is a relative import, so we can escape out
			const config = require("./notion.config").default;
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
