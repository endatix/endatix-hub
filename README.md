# Endatix Hub
This is the Endatix Hub, a Form Management system, built with Next.js. It uses the Endatix API to manage forms and submissions and offer data collection and reporting.

## System Requirements

- **Node.js 20.x.x** (Node 20.9.0 is recommended)
- Windows, Linux and MacOS are all supported

## Prerequisites

- **pnpm >=9.0.0** - we recommend using pnpm as the package manager for this project. You can install pnpm by running `npm install -g pnpm`
- **nvm** - we recommend using nvm to manage node versions as this will help you install the correct version of node without having to manually change the node version in your system. Download nvm [here](https://github.com/nvm-sh/nvm)

>[!TIP]
>If you are using nvm, you can install the correct version of node by running `nvm install v20.9.0`

## Getting Started

1. Setup correct node version. Open the terminal and run `nvm use v20.9.0`
2. Install the dependencies. Run `pnpm install`
3. Run the development server. We recommend using pnpm dev:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. 

## Environment Variables

Check the [.env.example](./.env.example) file for all variables and their description. The required variables are marked with a `[REQUIRED]` tag.

## Running Production Build Locally

This is useful for testing the production build locally (assumes you have run `pnpm install`)

1. Run `pnpm build:standalone`;
1. Run the site

```bash
# For localhost **without SSL certificate**
NODE_TLS_REJECT_UNAUTHORIZED=0 node .next/standalone/server.js

# For localhost **with SSL certificate**
node .next/standalone/server.js
```

## E2E Testing

The end-to-eng test suite (e2e) is built with [Playwright](https://playwright.dev/docs/intro). 

> [!TIP]
> At this time, we recommend using [Playwright's MCP](https://github.com/microsoft/playwright-mcp) to accelerate the workflow of intiial prototyping, debugging and running the tests. Playwright's team is actgively adding new features and improving the experience, so we recommend using the latest version of MCP.

Check most common commands below (note you can also use `npx` instead of `pnpm exec`):

```bash
pnpm exec playwright test
```

To run the tests in interactive mode, use the following command:

```bash
pnpm exec playwright test --ui
```

To run the tests in debug mode, use the following command:

```bash
pnpm exec playwright test --debug
```

For CI, we need to install the playwright browsers by running the following command:
```bash
pnpm exec playwright install
```


## Learn More

To learn more about Endatix, take a look at the following resources:

- [Endatix Documentation](https://docs.endatix.com/docs/category/getting-started) - learn about Endatix features and API.
