#!/bin/bash

# Run this file to update the projects database

# Define the URL and the destination path
url="https://raw.githubusercontent.com/theonlyasdk/libasdk/main/web/data/projects.json"
destinationPath="../assets/data/projects.json"

# Create the destination directory if it doesn't exist
destinationDirectory=$(dirname "$destinationPath")
if [ ! -d "$destinationDirectory" ]; then
    mkdir -p "$destinationDirectory"
fi

# Download the file
# Using curl, which is commonly available on Linux/macOS
curl -o "$destinationPath" "$url"

# Check if the download was successful
if [ $? -eq 0 ]; then
    echo "Projects data file has been updated. It has been saved at $destinationPath"
else
    echo "Error: Failed to download projects data file from $url"
fi
