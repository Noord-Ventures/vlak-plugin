import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const run = promisify(execFile);
const json = async (path) => JSON.parse(await readFile(join(root, path), "utf8"));

test("plugin launch and lockfile use only the reviewed runtime", async () => {
  const [manifest, config, pkg, lock] = await Promise.all([
    json(".claude-plugin/plugin.json"), json(".mcp.json"), json("package.json"), json("package-lock.json"),
  ]);
  assert.equal(manifest.version, "0.5.1");
  assert.equal(pkg.version, manifest.version);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.lockfileVersion, 3);
  assert.deepEqual(pkg.dependencies, { "@noorddev/vlak-mcp": "0.5.0" });
  assert.deepEqual(lock.packages[""].dependencies, pkg.dependencies);
  assert.deepEqual(config.mcpServers.vlak, {
    command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/scripts/start-mcp.mjs"],
  });
  assert.deepEqual(Object.keys(pkg.scripts), ["test"]);
  assert.equal(pkg.overrides, undefined);
  assert.equal(pkg.devDependencies, undefined);
  for (const [path, dependency] of Object.entries(lock.packages)) {
    if (!path) continue;
    assert.match(dependency.version, /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/, path);
    assert.equal(new URL(dependency.resolved).origin, "https://registry.npmjs.org", path);
    assert.match(dependency.integrity, /^sha512-[A-Za-z0-9+/]+=*$/, path);
    assert.ok(!dependency.hasInstallScript, path);
    assert.ok(!dependency.link, path);
    assert.equal((await json(`${path}/package.json`)).version, dependency.version, path);
  }
  const source = await readFile(join(root, "scripts/start-mcp.mjs"), "utf8");
  assert.doesNotMatch(source, /child_process|\bfetch\s*\(|\bnpx\b|\bexec\s*\(|\bspawn\s*\(/);
});

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "vlak launcher test "));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const plugin = join(dir, "plugin with spaces");
  await mkdir(join(plugin, "scripts"), { recursive: true });
  await copyFile(join(root, "scripts/start-mcp.mjs"), join(plugin, "scripts/start-mcp.mjs"));
  return { dir, plugin, entry: join(plugin, "scripts/start-mcp.mjs") };
}

test("missing dependencies fail without falling back to a parent package", async (t) => {
  const { dir, plugin, entry } = await fixture(t);
  const parentPackage = join(dir, "node_modules/@noorddev/vlak-mcp");
  await mkdir(join(parentPackage, "dist"), { recursive: true });
  await writeFile(join(parentPackage, "package.json"), JSON.stringify({ name: "@noorddev/vlak-mcp", version: "0.5.0", type: "module" }));
  await writeFile(join(parentPackage, "dist/index.js"), 'console.log("WRONG PACKAGE RAN");');
  await assert.rejects(run(process.execPath, [entry], { cwd: dir, timeout: 5000 }), (error) => {
    assert.equal(error.code, 1);
    assert.equal(error.stdout, "");
    assert.match(error.stderr, /Vlak MCP could not start/);
    assert.match(error.stderr, /npm ci --ignore-scripts/);
    return true;
  });
  await assert.rejects(readFile(join(plugin, "node_modules/@noorddev/vlak-mcp/package.json")), { code: "ENOENT" });
});

test("an unexpected local package version is never executed", async (t) => {
  const { dir, plugin, entry } = await fixture(t);
  const localPackage = join(plugin, "node_modules/@noorddev/vlak-mcp");
  await mkdir(join(localPackage, "dist"), { recursive: true });
  await writeFile(join(localPackage, "package.json"), JSON.stringify({ name: "@noorddev/vlak-mcp", version: "0.6.0", type: "module" }));
  await writeFile(join(localPackage, "dist/index.js"), 'console.log("WRONG VERSION RAN");');
  await assert.rejects(run(process.execPath, [entry], { cwd: dir, timeout: 5000 }), (error) => {
    assert.equal(error.code, 1);
    assert.equal(error.stdout, "");
    assert.match(error.stderr, /Expected @noorddev\/vlak-mcp@0.5.0/);
    return true;
  });
});

test("the launcher exits cleanly when the host closes stdin", async () => {
  const result = run(process.execPath, [join(root, "scripts/start-mcp.mjs")], { timeout: 5000 });
  result.child.stdin.end();
  const { stdout, stderr } = await result;
  assert.equal(stdout, "");
  assert.equal(stderr, "");
});

test("locked MCP starts from a foreign working directory and serves read-only tools", { timeout: 20000 }, async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), "vlak mcp client "));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const config = await json(".mcp.json");
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: config.mcpServers.vlak.args.map((arg) => arg.replace("${CLAUDE_PLUGIN_ROOT}", root)),
    cwd,
    stderr: "pipe",
  });
  const client = new Client({ name: "vlak-packaging-test", version: "1.0.0" });
  t.after(() => client.close());
  await client.connect(transport);
  assert.equal(client.getServerVersion().name, "vlak");
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((tool) => tool.name).sort(), [
    "get_component", "get_guide", "get_install", "get_tokens", "get_workflow",
    "list_components", "list_workflows", "search_components",
  ]);
  for (const tool of tools) {
    assert.equal(tool.annotations.readOnlyHint, true, tool.name);
    assert.equal(tool.annotations.destructiveHint, false, tool.name);
  }
  for (const [name, args] of [
    ["get_guide", {}], ["list_components", {}], ["search_components", { term: "button" }],
    ["get_component", { name: "button" }], ["get_install", { name: "button" }],
    ["get_tokens", {}], ["list_workflows", {}],
  ]) {
    const result = await client.callTool({ name, arguments: args });
    assert.ok(!result.isError, `${name}: ${JSON.stringify(result)}`);
    assert.ok(result.content.length > 0, name);
  }
  const workflows = await client.callTool({ name: "list_workflows", arguments: {} });
  const firstWorkflow = workflows.structuredContent.workflows[0];
  assert.ok(firstWorkflow?.id);
  const workflow = await client.callTool({ name: "get_workflow", arguments: { id: firstWorkflow.id } });
  assert.ok(!workflow.isError);
  assert.equal(workflow.structuredContent.manifest.id, firstWorkflow.id);
  const docs = await client.readResource({ uri: "vlak://docs/guide" });
  assert.ok(docs.contents[0].text.length > 100);
  const missing = await client.callTool({ name: "get_component", arguments: { name: "not-a-vlak-component" } });
  assert.equal(missing.isError, true);
});
