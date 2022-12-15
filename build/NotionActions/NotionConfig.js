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
exports.createDatabaseTypes = void 0;
const client_1 = require("@notionhq/client");
const GenerateTypes_1 = require("./GenerateTypes");
const ts = __importStar(require("typescript"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
require("dotenv").config();
const createDatabaseTypes = (notionInfo) => __awaiter(void 0, void 0, void 0, function* () {
    const { auth, databaseIds } = notionInfo;
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
    const NotionClient = new client_1.Client({
        auth: auth,
    });
    const databaseNames = [];
    // retrieve the database object
    const databaseClassImports = [];
    const databaseCamelizedNames = [];
    for (const database_id of databaseIds) {
        let dbOjbect;
        // Try to get the database schema
        try {
            dbOjbect = yield NotionClient.databases.retrieve({
                database_id,
            });
        }
        catch (e) {
            console.error(e);
            return { databaseNames: [] };
        }
        const { databaseClassName, databaseId, databaseName } = yield (0, GenerateTypes_1.createTypescriptFileForDatabase)(dbOjbect);
        databaseNames.push(databaseName);
        databaseCamelizedNames.push(databaseClassName);
        databaseClassImports.push(databaseImportStatement({
            databaseClassName,
            databaseId,
        }));
    }
    const nodeArr = [
        ...databaseClassImports,
        mainNotionVariable(databaseCamelizedNames),
    ];
    createNotionFile(nodeArr);
    return { databaseNames };
});
exports.createDatabaseTypes = createDatabaseTypes;
// Create the import statement for notion.ts file
function databaseImportStatement(dbClass) {
    return ts.factory.createImportDeclaration(undefined, ts.factory.createImportClause(false, undefined, ts.factory.createNamedImports([
        ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(dbClass.databaseClassName)),
    ])), 
    // We've setup paths to allow @notion-database access
    ts.factory.createStringLiteral(`@notion-database/${dbClass.databaseId}`), undefined);
}
function mainNotionVariable(databaseNames) {
    return ts.factory.createVariableStatement([ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)], ts.factory.createVariableDeclarationList([
        ts.factory.createVariableDeclaration(ts.factory.createIdentifier("notion"), undefined, undefined, ts.factory.createObjectLiteralExpression([
            ...databaseNames.map((name) => ts.factory.createShorthandPropertyAssignment(ts.factory.createIdentifier(name), undefined)),
        ], true)),
    ], ts.NodeFlags.Const));
}
// Creates file that import all generated notion database Ids
function createNotionFile(nodeArr) {
    const nodes = ts.factory.createNodeArray(nodeArr);
    const sourceFile = ts.createSourceFile("placeholder.ts", "", ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
    const printer = ts.createPrinter();
    const outputFile = printer.printList(ts.ListFormat.MultiLine, nodes, sourceFile);
    const outputDir = path_1.default.join(__dirname, "../../src", "NotionActions");
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir);
    }
    fs_1.default.writeFileSync(path_1.default.resolve(outputDir, "notion.ts"), outputFile);
}
