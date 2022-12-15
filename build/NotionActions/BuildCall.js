"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCall = void 0;
function getCall(args) {
    const { type, value } = args;
    console.log(type, value, typeof value);
    if (type === "select" && typeof value === "string") {
        return selectCall({ value });
    }
    else if (type === "multi_select" && Array.isArray(value)) {
        return multiSelectCall({ value });
    }
    else if (type === "number" && typeof value === "number") {
        return numberCall({ value });
    }
    else if (type === "url" && typeof value === "string") {
        return urlCall({ url: value });
    }
    else if (type === "checkbox" && typeof value === "boolean") {
        return checkboxCall({ checked: value });
    }
    else if (type === "title" && typeof value === "string") {
        return titleCall({ title: value });
    }
    else if (type === "text" && typeof value === "string") {
        return textCall({ text: value });
    }
}
exports.getCall = getCall;
/*
======================================================
GENERATE OBJECT BASED ON TYPE
======================================================
*/
const selectCall = (args) => {
    const { value } = args;
    const select = {
        name: value,
    };
    return { select };
};
const multiSelectCall = (args) => {
    const { value } = args;
    const multi_select = value.map((option) => ({ name: option }));
    return { multi_select };
};
const textCall = (args) => {
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
const titleCall = (args) => {
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
const numberCall = (args) => {
    const { value: number } = args;
    return { number };
};
const urlCall = (args) => {
    const { url } = args;
    return { url };
};
const checkboxCall = (args) => {
    const { checked: checkbox } = args;
    return { checkbox };
};
