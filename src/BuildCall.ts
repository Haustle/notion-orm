import { SupportedNotionColumnTypes } from "./queryTypes";

export function getCall(args: {
	type: SupportedNotionColumnTypes;
	value: string | number | boolean;
}) {
	const { type, value } = args;
	if (type === "select" && typeof value === "string") {
		return selectCall({ value });
	} else if (type === "multi_select" && Array.isArray(value)) {
		return multiSelectCall({ value });
	} else if (type === "number" && typeof value === "number") {
		return numberCall({ value });
	} else if (type === "url" && typeof value === "string") {
		return urlCall({ url: value });
	} else if (type === "checkbox" && typeof value === "boolean") {
		return checkboxCall({ checked: value });
	} else if (type === "title" && typeof value === "string") {
		return titleCall({ title: value });
	} else if (type === "rich_text" && typeof value === "string") {
		return textCall({ text: value });
	} else {
		console.error(
			`'[@haustle/notion-orm] ${type}' column type currently not supported`
		);
	}
}

/* 
======================================================
GENERATE OBJECT BASED ON TYPE
======================================================
*/

const selectCall = (args: { value: string }) => {
	const { value } = args;
	const select = {
		name: value,
	};
	return { select };
};

const multiSelectCall = (args: { value: Array<string> }) => {
	const { value } = args;
	const multi_select = value.map((option) => ({ name: option }));
	return { multi_select };
};

const textCall = (args: { text: string }) => {
	const { text } = args;
	const rich_text = [
		{
			text: {
				content: text,
			},
		},
	];

	return { rich_text };
};

const titleCall = (args: { title: string }) => {
	const { title } = args;
	const titleObject = [
		{
			text: {
				content: title,
			},
		},
	];

	return { title: titleObject };
};

const numberCall = (args: { value: number }) => {
	const { value: number } = args;
	return { number };
};

const urlCall = (args: { url: string }) => {
	const { url } = args;
	return { url };
};

const checkboxCall = (args: { checked: boolean }) => {
	const { checked: checkbox } = args;
	return { checkbox };
};
