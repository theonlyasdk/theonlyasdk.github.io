---
title: Lazarus Dark Mode Tutorial (Windows Only)
date: 2024-08-25
categories: ["lazarus", "dark-mode", "tutorial", "pascal", "fpc", "windows", "ide"]
tags: ["lazarus", "dark-mode", "tutorial", "pascal", "fpc", "windows", "ide"]
---

In this article, I'm going to show you how to add dark mode to your Lazarus LCL application on Windows (and Lazarus IDE as well!)
> **PS:** This method is **Windows only**. Other platforms do not need this method, as setting the system theme to dark is enough for LCL applications to switch to dark mode in those enviornments.
{: .prompt-info }

# Adding dark mode to Lazarus IDE

## Prerequisites
Make sure that:
- You're on the latest version of Lazarus IDE
- You're using the correct architecture for your device (i.e x86_64 version of the IDE and FPC if you're on 64-bit, etc)
- You have a clean install of Lazarus (_This is avoid any configuration issues which might prevent the package from applying the theme correctly. I figured this out the hard way :P_)
- You have enabled dark mode in Windows settings

## Installing dark mode

1. Open Lazarus IDE
2. Go to <https://github.com/zamtmn/metadarkstyle/> and follow the instructions there on installing the `metadarkstyle` package
3. After you've installed it, rebuild the IDE

## Final checks

- If `metadarkstyle` was installed correctly, in **Tools > Options** you will have an option called **Dark Style** under **Environment**
- Next, set the `PreferredAppMode` option to `Allow Dark`
- Restart your IDE and it should have a dark theme

# Using dark theme in your own application

1. Open your project
2. Make sure you have done steps 2 and 3 from the section **Installing dark mode**
3. Go to **Project > Project Inspector...**
4. Click **Add > New Requirement**
5. In the **Package Name** field, search for `metadarkstyle` and add it to your project
6. Also add the `metadarkstyledsgn` package to your project
7. After you've added it, go to your application file (it should have a `.lpr` extension)
8. In the `uses` section, add:
```pascal
uses
  // ...
  uDarkStyleParams,
  uMetaDarkStyle,
  uDarkStyleSchemes,
```
9. Under the `begin` section, add:
```pascal
PreferredAppMode := pamAllowDark;
uMetaDarkStyle.ApplyMetaDarkStyle(DefaultDark);
```
10. Now run your application and it should have dark mode!
