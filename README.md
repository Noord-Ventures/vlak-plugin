# Vlak for Claude

A constraint-first design system for product exploration. This plugin gives Claude Vlak's component documentation, exact APIs, design tokens, accessibility guidance, and installation instructions through a read-only local MCP server and the use-vlak skill.

Use it to find components for a screen, prototype a product interface, or add Vlak to an existing React or CSS project. It also covers AI chat, widgets, voice, and workflow surfaces. The skill checks the documented component API before composing an interface and preserves an existing design system unless the user asks to change it.

## Requirements and behavior

The plugin runs the published `@noorddev/vlak-mcp@0.5.0` package locally. Its root `package.json` and `package-lock.json` lock every runtime dependency to an exact version, HTTPS npm registry source, and integrity hash. Claude Code installs those dependencies when it installs the plugin, using frozen resolution with lifecycle scripts disabled.

The MCP command runs a readable launcher inside the plugin:

```sh
node "${CLAUDE_PLUGIN_ROOT}/scripts/start-mcp.mjs"
```

Node.js 20.18.1 or newer and npm are required. This covers the locked runtime dependencies and the optional shadcn installation path in the skill.

Use a current Claude Code version that supports plugin lockfile installation. The launcher does not run npm, resolve versions, fetch code, or install missing dependencies. It loads only the plugin's installed package, checks its version, and reports a startup error if dependencies are missing. It never installs into the user's project. Plugin version 0.5.1 is a packaging update; the reviewed Vlak package versions remain 0.5.0.

The server exposes eight read-only tools for component search, component details, tokens, installation guidance, guides, and interface planning. It does not read the user's project files or write to their project. When the user asks Claude to implement an interface, Claude's own development tools may change the project or execute the documented install commands, subject to the host's permissions and approvals. This plugin declares no hooks, background jobs, authentication, or credentials.

## Data handling and network access

- At plugin installation or update, Claude Code installs the runtime dependencies recorded in the lockfile. The recorded package sources are HTTPS URLs on registry.npmjs.org; npm verifies their integrity hashes. npm handles its download requests and caching. No custom registry configuration or lifecycle install scripts are included. The MCP launcher itself makes no download requests.
- Once installed, MCP documentation queries use the package's bundled catalogue locally. Tool names and arguments stay in the local Claude-to-MCP process connection. The local server has no usage telemetry and does not send prompts, project files, or tool requests to Vlak's hosted service.
- The skill can ask Claude to fetch public documentation from vlak.dev and the linked reference source on github.com/Noord-Ventures/vlak. Installation commands can download packages from npm and registry files from vlak.dev/r/. These services receive the technical request information needed to serve those requests. Project contents and conversation history are not requested by this plugin for those downloads.
- This Claude package does not configure the hosted MCP endpoint. Vlak separately offers https://vlak.dev/mcp for hosted clients; its operational analytics and retention are described in the [privacy policy](https://vlak.dev/privacy/).

Vlak does not retain data from this local MCP server. Claude and npm control their own conversation, process, log, and cache retention. See the [privacy policy](https://vlak.dev/privacy/) for the Vlak website and hosted-service practices.

## Try it

- "Find the Vlak components I need for a settings screen."
- "Build an accessible form with Vlak and check its component props first."
- "Prototype an AI chat interface with loading, empty, error, and tool-approval states."

For local development, clone this repository and run these commands from its root before loading the plugin with Claude Code's plugin-dir option:

```sh
npm ci --ignore-scripts
npm test
```

Plugins loaded directly from a local directory do not receive Claude Code's automatic dependency installation. After dependencies are installed, loading the plugin starts the locked local MCP server. It does not install components into a project until the user requests that work. If installation fails, fix it and reload the plugin; the launcher deliberately does not fall back to a package runner.

## Source and maintenance

This small repository is the Claude Directory distribution of the reviewed plugin from [Noord-Ventures/vlak](https://github.com/Noord-Ventures/vlak/tree/d62f3fc3f0eab50ddf5de451466db1d713d5cc20/plugins/vlak). The directory should read the repository root, which contains the Claude plugin manifest. Large site assets and interface films remain in the main Vlak repository.

The MCP dependency and skill retain the reviewed Vlak 0.5.0 package pins and shadcn 4.21.4 pin. Older MCP installation examples may omit a version; the skill requires replacing those arguments with its exact reviewed pins. Do not publish an unreviewed package update or automatically follow a package version tag. This distribution is updated deliberately after checking the corresponding published packages. Dependency updates must include the regenerated lockfile and a new plugin version.

The directory still sends plugins with lockfile-installed dependencies to a human reviewer. A reproducible install does not mean automatic approval or a Verified badge.

[Documentation](https://vlak.dev/docs/agents/) · [Report an issue](https://github.com/Noord-Ventures/vlak/issues) · [Vlak](https://vlak.dev)

For security reports, follow the main repository's [security policy](https://github.com/Noord-Ventures/vlak/security/policy) and use its private vulnerability-reporting channel, not a public issue. General support and privacy questions can be sent to hello@noord.vc.
