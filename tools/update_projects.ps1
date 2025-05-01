# Run this file to update the projects database

# Define the URL and the destination path
$url = "https://raw.githubusercontent.com/theonlyasdk/libasdk/main/web/data/projects.json"
$destinationPath = "..\assets\data\projects.json"

# Create the destination directory if it doesn't exist
$destinationDirectory = Split-Path -Path $destinationPath
if (!(Test-Path -Path $destinationDirectory)) {
    New-Item -ItemType Directory -Path $destinationDirectory -Force
}

# Download the file
Invoke-WebRequest -Uri $url -OutFile $destinationPath

Write-Host "Projects data file has been updated. It has been saved at $destinationPath"