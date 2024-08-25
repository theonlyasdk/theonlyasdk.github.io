import os
from datetime import datetime

script_path = os.path.dirname(os.path.realpath(__file__))

if script_path != "scripts":
    print("Please run this script from inside the 'scripts' directory!")
    exit()

post_dir = "../all_collections/_posts"
post_time = datetime.today().strftime('%Y-%m-%d')
post_title_raw = input("Enter post title: ")
post_title = post_title_raw.replace(" ", "-").lower()
post_filename = f"{post_time}-{post_title}.md"
post_path = f"{post_dir}/{post_filename}"
post_categories = input("Enter post categories (comma-seperated): ").split(",")
post_header = f"""---
layout: post
title: {post_title}
date: {post_time}
categories: {post_categories}
---

# {post_title_raw}
"""

with open(post_path, "w") as file:
    file.write(post_header)
    print(f"Created {post_path} 👍")