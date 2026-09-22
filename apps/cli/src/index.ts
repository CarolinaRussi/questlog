import { QUESTLOG_CORE_VERSION } from "@questlog/core";

const command = process.argv[2] ?? "help";
console.log(`questlog ${command} (core ${QUESTLOG_CORE_VERSION})`);
