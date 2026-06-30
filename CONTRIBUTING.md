# Contributing

This project is owned and maintained as `Corbeno/Idleon-Api-Downloader`.

## Licensing

No license has been declared for this repository at this time. Do not assume permission to reuse, redistribute, or relicense the code outside this project unless the owner adds a license or gives explicit permission.

By submitting a pull request, you are proposing that your contribution be included in `Corbeno/Idleon-Api-Downloader` under whatever license the owner later chooses to apply to the project.

## Development

The extension source is TypeScript under `src/js`. Packaged releases are built from compiled output and published through GitHub Releases.

Before opening a pull request, run:

```sh
npm test
npm run lint
npm run typecheck
npm run validate
```

## Pull Requests

Keep changes focused. Include a short description of the problem, what changed, and how you validated the change.

For parser changes, include enough context to explain which Idleon data field or export path is affected.

For user-facing changes, include screenshots or concise before/after notes when useful.
