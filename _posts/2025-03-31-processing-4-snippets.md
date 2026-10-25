---
title: Some Processing 4 Snippets
date: 2025-03-31
categories: ["Development"]
tags: ["graphics", "processing-4", "programming", "code", "snippets"]
description: "Short Processing 4 code snippets for common tasks like measuring text width."
---

Here are some Processing 4 code snippets:

## Find pixel width of a string
If you have a string `text` and you want to find the width of it in pixels, use:
```java
textWidth(text); // Where text is a string
```
For example, to make the text stick to top right of the window
```java
String aLabel = "Hello";
text(aLabel, width - textWidth(aLabel), 10);
```
