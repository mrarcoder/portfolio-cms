# Contributing

Read `AGENTS.yml`, `SCOPE.yml`, and `PROGRESS.yml` before changing the project. Use JavaScript, keep changes inside the accepted scope, and preserve the separation between Next.js presentation and the Worker backend.

Install with `npm ci`, then run `npm run lint`, `npm test`, `npm run build`, and `npm run worker:check` before opening a pull request. Database changes require a new ordered migration; do not edit migrations already used in production.

Never commit secrets, local portfolio data, or private contact messages. Explain what changed, why it was needed, and which checks passed.
