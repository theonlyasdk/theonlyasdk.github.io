---
title: "PNPM for NPM Users"
date: 2025-10-11 19:08:50 +0530
categories: ["JavaScript", "NodeJS", "NPM", "PNPM", "Package Managers"]
tags: ["javascript", "nodejs", "npm", "pnpm", "package-managers", "", "cheatsheet"]
---
If you've ever tried to make a web app using NodeJS, you might recall using something called `npm`. It is the package manager for NodeJS, and it allows you to install NodeJS packages quite easily without much effort. Installing a package is as simple as running `npm install <package_name>`. But sometimes, it can be quite slow, and I've experienced a lot of issues with `npm` myself. So I have decided to use an alternative to `npm` called `pnpm`. Although the name might sound similar (it does use `npm` under the hood), it's much much faster than `npm` at installing packages and other operations.

Let's get to the point, this is a cheatsheet for `npm` users to use `pnpm`, and you will find `pnpm` counterparts of some `npm` commands below.

So here they are:


| npm                                     | pnpm                                 | Description                             |
|-----------------------------------------|--------------------------------------|-----------------------------------------|
| `npm install`                           | `pnpm install`                       | Install all dependencies                |
| `npm install <package_name>`            | `pnpm add <package_name>`            | Install a specific package              |
| `npm install <package_name> --save-dev` | `pnpm add <package_name> --save-dev` | Install a package as a dev dependency   |
| `npm uninstall <package_name>`          | `pnpm remove <package_name>`         | Uninstall a package                     |
| `npm update`                            | `pnpm update`                        | Update all dependencies                 |
| `npm run <script>`                      | `pnpm <script>`                      | Run a package.json script               |
| `npm init`                              | `pnpm init`                          | Initialize a new package.json           |
| `npm cache clean --force`               | `pnpm store prune`                   | Clear the package cache                 |
| `npm list`                              | `pnpm list`                          | List installed packages                 |
| `npm outdated`                          | `pnpm outdated`                      | Show outdated packages                  |
| `npm publish`                           | `pnpm publish`                       | Publish a package to the registry       |
| `npm ci`                                | `pnpm install --frozen-lockfile`     | Install dependencies from a locked file |
| `npm install <package_name> --global`   | `pnpm add <package_name> --global`   | Install a package globally              |
| `npx <package_name>`                    | `pnpm dlx <package_name>`            | Execute a package without installing    |

For more commands, visit: [PNPM docs](https://pnpm.io/pnpm-cli) or [NPM docs](https://docs.npmjs.com/)

If you have any more suggestions please mail me at theonlyasdk@gmail.com! Thanks for reading!!