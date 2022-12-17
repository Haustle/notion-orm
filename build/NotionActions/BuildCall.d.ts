import { PropertyType } from "./GenerateTypes";
export declare function getCall(args: {
    type: PropertyType;
    value: string | number | boolean;
}): {
    select: {
        name: string;
    };
} | {
    multi_select: {
        name: string;
    }[];
} | {
    number: number;
} | {
    url: string;
} | {
    checkbox: boolean;
} | {
    title: {
        text: {
            content: string;
        };
    }[];
} | {
    rich_text: {
        text: {
            content: string;
        };
    }[];
} | undefined;
//# sourceMappingURL=BuildCall.d.ts.map