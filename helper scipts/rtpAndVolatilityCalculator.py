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

rows = config["rows"]
cols = config["cols"]
reels = config["reels"]
paytable = config["paytable"]
scatter_symbol = config["scatter_symbol"]
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
flag = 0
rtp_max = 0

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

print("\n=============================================")
print("          STARTING CALCULATIONS              ")
print("=============================================")

combination_count = math.prod(len(reel) for reel in reels)
reel_indices = [range(len(reel)) for reel in reels]
for active_lines in lineoptions:
    print(f"Calculations for {active_lines}")
    standard_gain = 0
    scatter_gain = 0
    free_spin_gain = 0
    free_spin_triggers = 0
    total_scatters_found = 0

    print_counter = 0

    for stop_positions in itertools.product(*reel_indices):
        grid = []
        for row in range(rows):
            grid_row = []
            for reel_idx, stop_pos in enumerate(stop_positions):
                symbol_index = (stop_pos + row) % len(reels[reel_idx])
                symbol = reels[reel_idx][symbol_index]
                grid_row.append(symbol)
            grid.append(grid_row)


        for line_idx in range(active_lines):
            line_path = paylines[line_idx]
            line_symbols = [grid[coord[1]][coord[0]] for coord in line_path]

            first_symbol = line_symbols[0]
            match_count = 1

            for symbol in line_symbols[1:]:
                if symbol == first_symbol:
                    match_count += 1
                else:
                    break

            symbol_payouts = paytable.get(first_symbol, {})
            payout = int(symbol_payouts.get(str(match_count), 0))

            standard_gain += payout

        flat_grid = [symbol for row in grid for symbol in row]
        scatter_count = flat_grid.count(scatter_symbol)

        if scatter_count > 0:
            scatter_payout = int(scatterpaytable.get(str(scatter_count), 0))
            scatter_gain += scatter_payout

        total_scatters_found += scatter_count
        if scatter_count >= bonustrigger_count:
            free_spin_triggers += 1


    total_bet_spent = combination_count * active_lines
    avg_win_per_comb = standard_gain / combination_count
    avg_scatters_per_spin = total_scatters_found / combination_count
    total_multiplier_weight = 0
    current_multiplier = float(free_spin_multiplier)
    expected_growth_per_spin = avg_scatters_per_spin * free_spin_multiplier_increment

    for spin in range(free_spin_count):
        total_multiplier_weight += current_multiplier
        current_multiplier += expected_growth_per_spin
        if current_multiplier > free_spin_max_multiplier:
            current_multiplier = float(free_spin_max_multiplier)

    free_spin_gain = free_spin_triggers * avg_win_per_comb * total_multiplier_weight
    standard_rtp = (standard_gain / total_bet_spent) * 100
    scatter_rtp = (scatter_gain / total_bet_spent) * 100
    free_spin_rtp = (free_spin_gain / total_bet_spent) * 100
    total_rtp = standard_rtp + scatter_rtp + free_spin_rtp
    if total_rtp > 100:
        flag = 1
        if rtp_max < total_rtp:
            rtp_max = total_rtp
    print("---------------------------------------------")
    print(f"  FINAL METRICS FOR {active_lines} ACTIVE PLAYLINE(S):")
    print(f"    -> Standard Line RTP : {standard_rtp:.3f}%")
    print(f"    -> Scatter Payout RTP: {scatter_rtp:.3f}%")
    print(f"    -> Free Spins RTP    : {free_spin_rtp:.3f}%")
    print(f"    => TOTAL COMBINED RTP: {total_rtp:.3f}%")
    print("=============================================\n")

if flag:
    print("---------------------------------------------")
    print(f"  Warning Biggest RTP is: {rtp_max} player has advantage:")
    print("=============================================\n")
#TODO: the logic for volatility