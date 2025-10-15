#!/usr/bin/env python3
import json
import sys
import os

def validate_url(url):
    if not url.startswith(('http://', 'https://')):
        raise ValueError("Invalid URL. URL should start with 'http://' or 'https://'")

def validate_file(file_path):
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"File {file_path} does not exist.")
    if not file_path.endswith('.json'):
        raise ValueError("Invalid file type. Only JSON files are allowed.")

if len(sys.argv) != 2:
    print("Usage: new_project.py <project_file>")
    sys.exit(1)

project_file = sys.argv[1]
validate_file(project_file)

data = []

with open(project_file, "r") as file:
    data = json.load(file)
    print(f"Data loaded from {project_file}.")
    print(f"Total {len(data)} items in list (before adding).")

name = input("Project name: ").strip()
if not name:
    raise ValueError("Project name cannot be empty.")

desc = input("Project description: ").strip()
if not desc:
    raise ValueError("Project description cannot be empty.")

url = input("Project URL: ").strip()
validate_url(url)

demo_url = input("Demo URL (default none): ").strip()
if demo_url:
    validate_url(demo_url)

tags = input("Tags: ").strip()
if not tags:
    raise ValueError("Tags cannot be empty.")

data_to_append = {
    "name": name,
    "description": desc,
    "url": url,
    "tags": tags,
}

if demo_url:
    data_to_append['demo_url'] = demo_url

data.append(data_to_append)

with open(project_file, "w") as file:
    json.dump(data, file, indent=2)
    print(f"Data written to {project_file}.")
    print(f"Total {len(data)} items in list (after adding).")
