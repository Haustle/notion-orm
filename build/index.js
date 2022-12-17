#! /usr/bin/env node
"use strict";
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
const fs_1 = __importDefault(require("fs"));
const NotionConfig_1 = require("./NotionActions/NotionConfig");
const path_1 = __importDefault(require("path"));
require("dotenv").config();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const args = process.argv.slice(2);
        if (args.length === 1 && args[0] === "generate") {
            const projDir = process.cwd();
            const notionConfigDirJS = fs_1.default.existsSync(path_1.default.join(projDir, "notion.config.js"));
            const notionConfigDirTS = fs_1.default.existsSync(path_1.default.join(projDir, "notion.config.ts"));
            console.log(path_1.default.join(projDir, "notion.config"));
            if (notionConfigDirJS || notionConfigDirTS) {
                // this is a relative import, so we can escape out
                const config = require(path_1.default.join(projDir, "notion.config"));
                const { databaseNames } = yield (0, NotionConfig_1.createDatabaseTypes)(config);
                if (databaseNames.length < 0) {
                    console.log("generated no types");
                }
                else {
                    console.log("Generated types for the following Database's: ");
                    for (let x = 0; x < databaseNames.length; x++) {
                        console.log(`${x}. ${databaseNames[x]}`);
                    }
                }
            }
            else {
                console.error("Could not find file `notion.config.ts` in root");
                process.exit(1);
            }
        }
    });
}
main();
//# sourceMappingURL=index.js.map