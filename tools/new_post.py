# Creates a new post in project_root/_posts/
import os
from datetime import datetime
import sys
from pathlib import Path

def create_new_post(title: str):
	if not title.strip():
		print("Error: Post title cannot be empty.")
		return

	now = datetime.now()
	date_str = now.strftime("%Y-%m-%d")
	time_str = now.strftime("%H:%M:%S")

	slug = title.lower().replace(' ', '-').replace('_', '-')

	file_name = f"{date_str}-{slug}.md"
	posts_dir = Path(__file__).parent.parent / "_posts"
	file_path = posts_dir / file_name

	if file_path.exists():
		print(f"Error: The post '{file_name}' already exists.")
		return

	categories = input("Enter categories (comma-separated): ").strip()
	if categories:
		categories_list = [cat.strip() for cat in categories.split(',')]
	else:
		categories_list = []

	tags = input("Enter tags (comma-separated): ").strip()
	if tags:
		tags_list = [tag.strip() for tag in tags.split(',')]
	else:
		tags_list = []

	categories_list = ', '.join(f'"{cat}"' for cat in categories_list)
	tags_list = ', '.join(f'"{tag}"' for tag in tags_list)

	content = f"""---
layout: post
title: "{title}"
date: {date_str} {time_str}
categories: [{categories_list}]
tags: [{tags_list}]
---
Placeholder content...
"""

	posts_dir.mkdir(parents=True, exist_ok=True)

	with open(file_path, 'w', encoding='utf-8') as f:
		f.write(content)

	print(f"New post created: {file_path}")

if __name__ == "__main__":
	if len(sys.argv) < 2:
		print("Usage: python new_post.py <post_title>")
		sys.exit(1)

	post_title = ' '.join(sys.argv[1:])
	create_new_post(post_title)