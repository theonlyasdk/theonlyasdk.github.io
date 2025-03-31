---
layout: post
title: Some Processing 4 Snippets
date: 2025-03-31
categories: ["processing-4", "programming", "graphics", "code", "snippets"]
---

Here are some Processing 4 code snippets:

# Find pixel width of a string
If you have a string `text` and you want to find the width of it in pixels, use:
```java
textWidth(text); // Where text is a string
```
For example, to make the text stick to top right of the window
```java
String aLabel = "Hello";
text(aLabel, width - textWidth(aLabel), 10);
```
