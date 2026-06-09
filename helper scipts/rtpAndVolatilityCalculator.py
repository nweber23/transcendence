#!/usr/bin/env python3
import sys
import json
import itertools
import math

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
        config = json.load(file)
        print("Success! File loaded successfully.")
except FileNotFoundError:
    print(f"Error: The file '{filename}' was not found.")
except json.JSONDecodeError:
    print(f"Error: '{filename}' contains invalid JSON formatting.")

reels = config["reels"]
paytable = config["paytable"]
lineoptions = config["line_options"]
paylines = config["paylines"]
scatterpaytable = config["scatter_paytable"]
bonustrigger_count = config["bonus_trigger_count"]
free_spin_count = config["free_spin_count"]
free_spin_multiplier = config["free_spin_multiplier"]
free_spin_retrigger_count = config["free_spin_retrigger_count"]
free_spin_multiplier_increment = config["free_spin_multiplier_increment"]
free_spin_max_multiplier = config["free_spin_max_multiplier"]
max_win_multiplier = config["max_win_multiplier"]

print("=============================================")
print("         SLOT CONFIGURATION VARIABLES        ")
print("=============================================")
print(f"Line Options                   : {lineoptions}")
print(f"Number of Reels                : {len(reels)}")
print(f"Paylines Defined               : {len(paylines)}")
print("---------------------------------------------")
print(f"Bonus/Scatter Trigger Count    : {bonustrigger_count}")
print(f"Free Spin Count Granted        : {free_spin_count}")
print(f"Free Spin Retrigger Count      : {free_spin_retrigger_count}")
print(f"Free Spin Base Multiplier      : {free_spin_multiplier}x")
print(f"Free Spin Multiplier Increment : +{free_spin_multiplier_increment}x")
print(f"Free Spin Max multiplier       : {free_spin_max_multiplier}x")
print(f"Max Win Multiplier Cap         : {max_win_multiplier}x")
print("---------------------------------------------")
print("Reel Strips Configuration:")
for i, reel in enumerate(reels):
    print(f"  Reel {i+1} ({len(reel)} symbols): {reel}")
print("---------------------------------------------")
print("Paylines Matrix Indices:")
for i, line in enumerate(paylines):
    print(f"  Line {i+1}: {line}")
print("---------------------------------------------")
print("Standard Paytable:")
print(json.dumps(paytable, indent=2))
print("---------------------------------------------")
print("Scatter Paytable:")
print(json.dumps(scatterpaytable, indent=2))
print("=============================================")

for active_lines in lineoptions:
    print(f"Calculations for {active_lines}")
    standard_gain = 0
    scatter_gain = 0
    free_spin_gain = 0
    combination_count = math.prod(len(reel) for reel in reels)
    print(f"count{combination_count}")
