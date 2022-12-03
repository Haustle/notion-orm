import "module-alias/register";
import { createDatabaseTypes } from "./NotionActions/NotionConfig";
import { notion } from "./NotionActions/notion";

async function main() {
	// createDatabaseTypes({
	// 	auth: process.env.NOTION_KEY ?? "",
	// 	databaseIds: ["a52239e4839d4a3a8f4875376cfbfb02"],
	// });

	notion.dimitriSFightingVideo.add({
		combo: "some late combo",
		character: ["Joker", "Kid buu"],
		game: "smash",
	});
}

main();
