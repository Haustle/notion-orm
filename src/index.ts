import "module-alias/register";
import { notion } from "./NotionActions/notion";
import { getDatabaseTypes } from "./NotionActions/NotionConfig";
import "dotenv";

async function main() {
    const fascinationIds = "d623506cf7584f7cb5350f363301169a";

    getDatabaseTypes({
        auth: process.env.NOTION_KEY ?? "",
        databaseIds: [fascinationIds, "f6d58ae659a942178efeb13fddab0e25"],
    });

    // notion.tyrusFascinations.add({
    //     name: "steve jobs x joe rogan",
    //     mediaType: "Podcast",
    //     discussion: ["AI", "Coding"],
    // });
}

main();
