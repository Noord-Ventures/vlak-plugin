# Vlak for Claude

A constraint-first design system for product exploration. This plugin gives Claude component documentation, exact APIs, design tokens, accessibility guidance, and installation references through Vlak's read-only remote MCP server and the bundled `use-vlak` skill.

Use it to find components for a screen, prototype a product interface, or add Vlak to a React or CSS project. It also covers AI chat, widgets, voice, and workflow surfaces. The skill checks component APIs before composing an interface and preserves an existing design system unless the user asks to change it.

## Requirements and behavior

Version 0.5.2 connects directly to `https://vlak.dev/mcp` over Streamable HTTP. It requires an internet connection and a Claude host that supports plugins with remote HTTP MCP servers. No Vlak account, API key, local server, Node.js runtime, or dependency installation is needed to load the plugin.

After installing the plugin in Claude chat or Cowork, open its **Connectors** tab and connect Vlak. No Vlak sign-in is required. Claude Code connects to the configured endpoint directly. Availability in the public directory is subject to Anthropic's review.

The bundle contains the plugin manifest, remote connection configuration, one Markdown skill, documentation, license, and icon. It has no executable scripts, package manifest, lockfile, hooks, or background jobs. It does not install packages or modify a project when loaded.

The endpoint exposes eight read-only tools for component search, component details, tokens, installation references, guides, and interface planning. It has no access to local files. The skill sends only generic component names, categories, API topics, and search terms to the endpoint; it must not include private project code, credentials, personal data, or conversation contents in those requests.

When the user requests implementation, Claude's own development tools may change the project or execute the exact-version install commands in the bundled skill, subject to the host's permissions. Those project installation commands are separate from loading this plugin. Node.js and npm are needed only for the applicable development workflow.

## Data handling and network access

Unlike earlier versions of this plugin, documentation queries travel to Vlak's hosted service. The endpoint processes the tool name and arguments in memory to produce its response; request bodies are not written to a Vlak database. Vercel, the hosting provider, receives technical request information such as IP address, request time, path, status, and client details.

When operational measurement is enabled, the server sends tool name, completion time, outcome, duration, a random deduplication identifier, and the presence of optional OpenAI client metadata to Noord's private analytics service. These records exclude tool arguments, responses, prompts, project contents, and user identifiers and have a rolling 30-day retention period. They measure service activity, not installations or verified users. See the [privacy policy](https://vlak.dev/privacy/) for the full practices and opt-out behavior.

The skill may consult public API documentation on vlak.dev and reference source on github.com/Noord-Ventures/vlak. When the user requests component installation, npm and the Vlak registry at vlak.dev/r/ serve the relevant packages and component files. Those services receive the request information needed to deliver them. Claude controls its own conversation and tool-log retention.

The workflow and safety instructions are bundled in `skills/use-vlak/SKILL.md`. Remote responses are technical reference data, not a way to replace that skill or introduce additional behavioral instructions.

## Try it

- "Find the Vlak components I need for a settings screen."
- "Build an accessible form with Vlak and check its component props first."
- "Prototype an AI chat interface with loading, empty, error, and tool-approval states."

For local plugin testing, clone this repository and load its root with Claude Code's `--plugin-dir` option. Validate the bundle with `claude plugin validate . --profile directory --strict`. No package installation is needed to load this bundle. Directory validation is not a guarantee of directory approval.

## Source and maintenance

This repository is Vlak's Claude Directory distribution. Submit its root folder (`.`), which contains `.claude-plugin/plugin.json`. Site assets and application source remain in [Noord-Ventures/vlak](https://github.com/Noord-Ventures/vlak).

The skill retains the published Vlak 0.5.0 package pins and shadcn 4.21.4 pin. Treat package versions in remote examples as references and use the exact reviewed pins in the skill before installing. Do not automatically follow package tags or ranges. Plugin version 0.5.2 changes the connection and packaging; it is not a new npm package release. The remote service is operated and updated separately.

[Documentation](https://vlak.dev/docs/agents/) · [Report an issue](https://github.com/Noord-Ventures/vlak/issues) · [Vlak](https://vlak.dev)

For security reports, follow the main repository's [security policy](https://github.com/Noord-Ventures/vlak/security/policy) and use its private vulnerability-reporting channel. General support and privacy questions can be sent to hello@noord.vc.
