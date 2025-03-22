---
layout: post
title: Lazarus Dark Mode Tutorial (Windows Only)
date: 2024-08-25
categories: ["lazarus", "dark-mode", "tutorial", "pascal", "fpc", "windows", "ide"]
---

In this article, I'm going to show you how to add dark mode to your LCL application on Windows (and Lazarus IDE too!)
> **PS:** This method is for **Windows only**. Other platforms do not need this method, as setting the system theme to dark is enough for LCL applications to switch to dark mode in those enviornments.

# Adding dark mode to Lazarus IDE

## Step 1 - Prerequisites

- Make sure you're on the latest Lazarus IDE version
- Make sure you're using the correct architecture for your device (i.e x86_64 version of the IDE and FPC if you're on 64-bit, etc)
- Make sure you have a clean install of Lazarus (_**Why:** To avoid having any configuration issues which might prevent the package from applying correct theming, yes I figured this out the hard way_)
- Make sure you have enabled dark mode in Windows settings

## Step 2 - Installing dark mode

- Open Lazarus IDE
- Go to https://github.com/zamtmn/metadarkstyle/ and follow the instructions there on installing the `metadarkstyle` package
- After you've installed it, rebuild the IDE

## Step 3 - Final checks

- To check if `metadarkstyle` was installed correctly, go to **Tools > Options** and check if you have an option with the name **Dark Style** under **Environment**
- If you do, set the `PreferredAppMode` option to `Allow Dark`
- Restart your IDE and it should have a dark theme

# Using dark theme in your own application

- Open your project
- Go to **Project > Project Inspector...**
- Click **Add > New Requirement**
- In the **Package Name** field, search for `metadarkstyle` and add it to your project
- Also add the `metadarkstyledsgn` package to your project
- After you've added it, go to your application file (it should have a `.lpr` extension)
- In the `uses` section, add:
```pascal
uses
  // ...
  uDarkStyleParams,
  uMetaDarkStyle,
  uDarkStyleSchemes,
```
- Under the `begin` section, add:
```pascal
PreferredAppMode := pamAllowDark;
uMetaDarkStyle.ApplyMetaDarkStyle(DefaultDark);
```
- Now run your application and it should have dark mode!
