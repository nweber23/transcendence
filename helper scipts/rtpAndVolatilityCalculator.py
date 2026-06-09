#!/usr/bin/env python3
import sys
import json

if len(sys.argv) < 2:
    print("Error: Missing file argument.")
    print("Usage: ./script_name.py <filename.json>")
    sys.exit(1)

filename = sys.argv[1]

if not filename.lower().endswith('.config.json'):
    print(f"Error: '{filename}' is not a valid configuration file.")
    print("The file extension must be exactly '.config.json'.")
    sys.exit(1)

try:
    with open(filename, "r") as file:
        data = json.load(file)
        print("Success! File loaded successfully.")
        print(data)
except FileNotFoundError:
    print(f"Error: The file '{filename}' was not found.")
except json.JSONDecodeError:
    print(f"Error: '{filename}' contains invalid JSON formatting.")