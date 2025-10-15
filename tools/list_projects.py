#!/usr/bin/env python3
import json
import sys
import os

if len(sys.argv) != 2:
	print("Usage: python list_projects.py <project_file>")
	sys.exit(1)

project_file = sys.argv[1]

if not os.path.isfile(project_file):
	print(f"Error: File '{project_file}' does not exist.")
	sys.exit(1)

try:
	with open(project_file, "r") as file:
		data = json.load(file)
		print(f"Data loaded from {project_file}.")
except json.JSONDecodeError:
	print(f"Error: File '{project_file}' is not a valid JSON file.")
	sys.exit(1)
except Exception as e:
	print(f"Error: {e}")
	sys.exit(1)

print(f"Total {len(data)} items.")
print("Listing data...")

for project in data:
	name = project.get("name", "N/A")
	desc = project.get("description", "N/A")
	url = project.get("url", "N/A")
	tags = project.get("tags", "N/A")
	demo_url = project.get("demo_url", "None")

	print("-----------------------")
	print(f"Name: {name}")
	print(f"Desc: {desc}")
	print(f"URL: {url}")
	print(f"Demo URL: {demo_url}")
	print(f"Tags: {tags}")
	print("-----------------------")

print("\nEnd.")
