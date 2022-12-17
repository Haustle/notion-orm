"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTypescriptFileForDatabase = void 0;
const ts = __importStar(require("typescript"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// This can be grabbed from // api-endpoints.d.ts with some work
const propertyArr = [
    "text",
    "select",
    "title",
    "number",
    "multi_select",
    "checkbox",
    "url",
];
/*
Responsible for generating `.ts` files
*/
function createTypescriptFileForDatabase(dbResponse) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id: databaseId, properties, title, } = dbResponse;
        const propNameToColumnName = {};
        const databaseName = title[0].plain_text;
        const databaseClassName = camelize(databaseName).replace(/[^a-zA-Z0-9]/g, "");
        const databaseColumnTypeProps = [];
        // Looping through each column of database
        Object.values(properties).forEach((value) => {
            const { type: columnType, name: columnName } = value;
            // Taking the column name and camelizing it for typescript use
            const camelizedColumnName = camelize(columnName);
            // Creating map of column name to the column's name in the database's typescript type
            propNameToColumnName[camelizedColumnName] = {
                columnName,
                type: columnType,
            };
            if (columnType === "title" || columnType === "rich_text") {
                // add text column to collection type
                databaseColumnTypeProps.push(createTextProperty(camelizedColumnName, columnType === "title"));
            }
            else if (columnType === "number") {
                // add number column to collection type
                databaseColumnTypeProps.push(createNumberProperty(camelizedColumnName));
            }
            else if (columnType === "url") {
                // add url column to collection type
                databaseColumnTypeProps.push(createTextProperty(camelizedColumnName, false));
            }
            else if (columnType === "date") {
                // add Date column to collection type
                databaseColumnTypeProps.push(createDateProperty(camelizedColumnName));
            }
            else if (columnType == "select" || columnType == "multi_select") {
                // @ts-ignore
                const options = value[columnType].options.map((x) => x.name);
                databaseColumnTypeProps.push(createMultiOptionProp(camelizedColumnName, options, 
                // This determines whether the property needs to be a union or a union array
                columnType === "multi_select"));
            }
        });
        // Object type that represents the database schema
        const CollectionType = ts.factory.createTypeAliasDeclaration([ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)], ts.factory.createIdentifier("CollectionType"), undefined, ts.factory.createTypeLiteralNode(databaseColumnTypeProps));
        // Top level non-nested variable, functions, types
        const nodeArr = [
            importCollectionClass(),
            createDatabaseIdVariable(databaseId),
            CollectionType,
            mapPropNameToColumnDetails(propNameToColumnName),
            ColNameToType(),
            exportCollectionActions(databaseClassName),
        ];
        const nodes = ts.factory.createNodeArray(nodeArr);
        const sourceFile = ts.createSourceFile("placeholder.ts", "", ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
        const printer = ts.createPrinter();
        const outputFile = printer.printList(ts.ListFormat.MultiLine, nodes, sourceFile);
        // Create our output folder
        const outputDir = path_1.default.join(__dirname, "../../src", "NotionActions", "DatabaseTypes");
        if (!fs_1.default.existsSync(outputDir)) {
            fs_1.default.mkdirSync(outputDir);
        }
        fs_1.default.writeFileSync(path_1.default.resolve(outputDir, `${databaseId}.ts`), outputFile);
        return { databaseName, databaseClassName, databaseId };
    });
}
exports.createTypescriptFileForDatabase = createTypescriptFileForDatabase;
// generate text property
function createTextProperty(name, isTitle) {
    const text = ts.factory.createPropertySignature(undefined, ts.factory.createIdentifier(name), !isTitle ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined, ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword));
    return text;
}
/**
 * Generate number property to go inside a type
 * name: number
 */
function createNumberProperty(name) {
    const number = ts.factory.createPropertySignature(undefined, ts.factory.createIdentifier(name), ts.factory.createToken(ts.SyntaxKind.QuestionToken), ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword));
    return number;
}
/**
 *
 * @param name name of property
 * @param options
 * @param array
 * @returns
 *
 * For selects and multi-select collection properties
 *
 * array = true for multi-select
 *
 * name = ("x" | "y" | "z")[]
 */
function createMultiOptionProp(name, options, array) {
    return ts.factory.createPropertySignature(undefined, ts.factory.createIdentifier(name), ts.factory.createToken(ts.SyntaxKind.QuestionToken), array
        ? ts.factory.createArrayTypeNode(ts.factory.createParenthesizedType(ts.factory.createUnionTypeNode([
            ...options.map((option) => ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(option))),
            createOtherStringProp(),
        ])))
        : ts.factory.createUnionTypeNode([
            ...options.map((option) => ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(option))),
            createOtherStringProp(),
        ]));
}
// string & {}. Allows users to pass in values
function createOtherStringProp() {
    return ts.factory.createIntersectionTypeNode([
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        ts.factory.createTypeLiteralNode([]),
    ]);
}
function createDateProperty(name) {
    return ts.factory.createPropertySignature(undefined, ts.factory.createIdentifier("s"), undefined, ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("Date"), undefined));
}
// Generate database Id variable
// const databaseId = <database-id>
function createDatabaseIdVariable(databaseId) {
    return ts.factory.createVariableStatement(undefined, ts.factory.createVariableDeclarationList([
        ts.factory.createVariableDeclaration(ts.factory.createIdentifier("databaseId"), undefined, undefined, ts.factory.createStringLiteral(databaseId)),
    ], ts.NodeFlags.Const));
}
/**
 * Instead of refering to the column names 1:1 such as "Book Rating", we transform them to
 * camelcase (eg. bookRating). So we need to keep track of the original name and the type
 * for when we construct request for API
 *
 * Example
 *
 * const propMap = {
 *
 *      "bookRating": {
 *          columnName: "Book Rating",
 *          type: "select"
 *      },
 *      "genre": {
 *          columnName: "Genre",
 *          type: "multi_select"
 *      }
 *
 * }
 * @param colMap
 * @returns
 */
function mapPropNameToColumnDetails(colMap) {
    return ts.factory.createVariableDeclarationList([
        ts.factory.createVariableDeclaration(ts.factory.createIdentifier("propMap"), undefined, undefined, ts.factory.createAsExpression(ts.factory.createObjectLiteralExpression([
            ...Object.entries(colMap).map(([propName, value]) => ts.factory.createPropertyAssignment(ts.factory.createStringLiteral(propName), ts.factory.createObjectLiteralExpression([
                ts.factory.createPropertyAssignment(ts.factory.createIdentifier("columnName"), ts.factory.createStringLiteral(value.columnName)),
                ts.factory.createPropertyAssignment(ts.factory.createIdentifier("type"), ts.factory.createStringLiteral(value.type)),
            ], true))),
        ], true), ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("const"), undefined))),
    ], ts.NodeFlags.Const);
}
function ColNameToType() {
    return ts.factory.createTypeAliasDeclaration(undefined, ts.factory.createIdentifier("ColNameToType"), undefined, ts.factory.createMappedTypeNode(undefined, ts.factory.createTypeParameterDeclaration(undefined, ts.factory.createIdentifier("Property"), ts.factory.createTypeOperatorNode(ts.SyntaxKind.KeyOfKeyword, ts.factory.createTypeQueryNode(ts.factory.createIdentifier("propMap"), undefined)), undefined), undefined, undefined, ts.factory.createIndexedAccessTypeNode(ts.factory.createIndexedAccessTypeNode(ts.factory.createTypeQueryNode(ts.factory.createIdentifier("propMap"), undefined), ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("Property"), undefined)), ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral("type"))), undefined
    /* unknown */
    ));
}
// Need to import the class responsible for adding and querying the database
function importCollectionClass() {
    return ts.factory.createImportDeclaration(undefined, ts.factory.createImportClause(false, undefined, ts.factory.createNamedImports([
        ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier("CollectionActions")),
    ])), ts.factory.createStringLiteral("../NotionCollection"), undefined);
}
// We export the database with the class above.
// export
/**
 * We export the database with
 * @param databaseName
 *
 * const <datbase-name> = new CollectionActions<CollectionType>(datbaseId, propMap)
 */
function exportCollectionActions(databaseName) {
    return ts.factory.createVariableStatement([ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)], ts.factory.createVariableDeclarationList([
        ts.factory.createVariableDeclaration(ts.factory.createIdentifier(databaseName), undefined, undefined, ts.factory.createNewExpression(ts.factory.createIdentifier("CollectionActions"), [
            ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("CollectionType"), undefined),
            ts.factory.createTypeReferenceNode(ts.factory.createIdentifier("ColNameToType"), undefined),
        ], [
            ts.factory.createIdentifier("databaseId"),
            ts.factory.createIdentifier("propMap"),
        ])),
    ], ts.NodeFlags.Const));
}
// for a type's property name
function camelize(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
        if (+match === 0)
            return ""; // or if (/\s+/.test(match)) for white spaces
        return index === 0 ? match.toLowerCase() : match.toUpperCase();
    });
}
//# sourceMappingURL=GenerateTypes.js.map