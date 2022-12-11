import { NotionConfigType } from "./NotionActions/NotionConfig";
require("dotenv").config();

const NotionConfig: NotionConfigType = {
	auth: process.env.NOTION_KEY ?? "",
	databaseIds: [
		"a52239e4839d4a3a8f4875376cfbfb02",
		"9fa66b389c4e4f33ac286f46e1d33d0d",
	],
};

export default NotionConfig;
