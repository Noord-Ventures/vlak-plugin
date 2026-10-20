// Claude installs package-lock.json before starting this server. Never download
// or resolve packages at launch, and never resolve them from the user's project.
import { readFile } from "node:fs/promises";

const packageUrl = new URL("../node_modules/@noorddev/vlak-mcp/package.json", import.meta.url);
const serverUrl = new URL("../node_modules/@noorddev/vlak-mcp/dist/index.js", import.meta.url);
const expectedVersion = "0.5.0";

try {
  const installed = JSON.parse(await readFile(packageUrl, "utf8"));
  if (installed.name !== "@noorddev/vlak-mcp" || installed.version !== expectedVersion) {
    throw new Error(`Expected @noorddev/vlak-mcp@${expectedVersion}; reinstall the locked dependencies.`);
  }
  await import(serverUrl.href);
} catch (error) {
  // stdout belongs exclusively to the MCP JSON-RPC transport.
  console.error("Vlak MCP could not start:", error instanceof Error ? error.message : String(error));
  console.error("Update/reinstall this plugin in Claude Code. For a local checkout, run npm ci --ignore-scripts in the plugin root, then reload the plugin.");
  process.exitCode = 1;
}
