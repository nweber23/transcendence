#!/usr/bin/env python3
import sys
import json
import itertools
import math

if len(sys.argv) < 2:
    print("Error: Missing file argument.")
    print("Usage: ./rtpAndVolatilityCalculator.py <filename.config.json>")
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
    sys.exit(1)
except json.JSONDecodeError:
    print(f"Error: '{filename}' contains invalid JSON formatting.")
    sys.exit(1)

rows = config["rows"]
cols = config["cols"]
reels = config["reels"]
paytable = config["paytable"]
scatter_symbol = config["scatter_symbol"]
wild_symbol = config["wild_symbol"]
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

print("\n=============================================")
print("          STARTING CALCULATIONS              ")
print("=============================================")

flag = 0
rtp_max = 0

combination_count = math.prod(len(reel) for reel in reels)
reel_indices = [range(len(reel)) for reel in reels]

for active_lines in lineoptions:
    print(f"Calculations for {active_lines} active line(s)...")
    standard_gain = 0
    scatter_gain = 0
    free_spin_triggers = 0
    total_scatters_found = 0
    sum_squared_wins = 0

    scatter_outcomes = {}

    # Main cycle loop
    for stop_positions in itertools.product(*reel_indices):
        # Build screen grid
        grid = []
        for row in range(rows):
            grid_row = []
            for reel_idx, stop_pos in enumerate(stop_positions):
                symbol_index = (stop_pos + row) % len(reels[reel_idx])
                symbol = reels[reel_idx][symbol_index]
                grid_row.append(symbol)
            grid.append(grid_row)

        current_spin_total_win = 0

        # Payline logic
        for line_idx in range(active_lines):
            line_path = paylines[line_idx]
            line_symbols = [grid[coord[1]][coord[0]] for coord in line_path]

            target_symbol = None
            for sym in line_symbols:
                if sym != wild_symbol:
                    target_symbol = sym
                    break

            if target_symbol is None:
                target_symbol = wild_symbol

            match_count = 0
            for sym in line_symbols:
                if sym == target_symbol or sym == wild_symbol:
                    match_count += 1
                else:
                    break

            symbol_payouts = paytable.get(target_symbol, {})
            payout = int(symbol_payouts.get(str(match_count), 0))

            standard_gain += payout
            current_spin_total_win += payout

        # Scatter logic
        scatter_count = 0
        for reel_idx in range(cols):
            for row in range(rows):
                symbol_index = (stop_positions[reel_idx] + row) % len(reels[reel_idx])
                if reels[reel_idx][symbol_index] == scatter_symbol:
                    scatter_count += 1
                    break

        if scatter_count > 0:
            scatter_payout = int(scatterpaytable.get(str(scatter_count), 0))
            scatter_gain += scatter_payout
            current_spin_total_win += scatter_payout

        total_scatters_found += scatter_count

        if scatter_count >= bonustrigger_count:
            free_spin_triggers += 1

        win_per_unit_bet = current_spin_total_win / active_lines
        sum_squared_wins += (win_per_unit_bet ** 2)

        if scatter_count not in scatter_outcomes:
            scatter_outcomes[scatter_count] = {'freq': 0, 'total_win': 0.0}
        scatter_outcomes[scatter_count]['freq'] += 1
        scatter_outcomes[scatter_count]['total_win'] += current_spin_total_win

    # --- BASE EXPECTATIONS ---
    total_bet_spent = combination_count * active_lines

    mean_base_win_per_bet = (standard_gain + scatter_gain) / total_bet_spent
    mean_of_squares = sum_squared_wins / combination_count
    variance = mean_of_squares - (mean_base_win_per_bet ** 2)
    volatility_score = math.sqrt(max(0, variance))

    if volatility_score < 5.0:
        volatility_word = "LOW"
    elif volatility_score <= 10.0:
        volatility_word = "MEDIUM"
    else:
        volatility_word = "HIGH"

    paths = [[free_spin_count, float(free_spin_multiplier), 1.0, 0.0]]
    expected_fs_win_per_trigger = 0.0

    fs_outcomes = []
    for sc, data in scatter_outcomes.items():
        prob = data['freq'] / combination_count
        avg_win = data['total_win'] / data['freq']
        fs_outcomes.append((sc, prob, avg_win))

    # Calculate the absolute max win in credits for this bet size
    max_win_credits = float(max_win_multiplier) * active_lines

    # Expand every path step-by-step
    while paths:
        new_paths = []
        for p in paths:
            spins_left = p[0]
            mult = p[1]
            path_prob = p[2]
            path_acc_win = p[3]

            if spins_left > 0:
                for sc, outcome_prob, avg_win in fs_outcomes:
                    potential_spin_win = avg_win * mult

                    # CHECK MAX WIN CAP
                    if path_acc_win + potential_spin_win >= max_win_credits:
                        actual_spin_win = max(0.0, max_win_credits - path_acc_win)
                        expected_fs_win_per_trigger += path_prob * outcome_prob * actual_spin_win
                    else:
                        actual_spin_win = potential_spin_win
                        expected_fs_win_per_trigger += path_prob * outcome_prob * actual_spin_win
                        next_mult = mult + (sc * free_spin_multiplier_increment)
                        if next_mult > free_spin_max_multiplier:
                            next_mult = float(free_spin_max_multiplier)
                        next_spins = spins_left - 1
                        if sc >= free_spin_retrigger_count:
                            next_spins += free_spin_count
                        if next_spins > 0:
                            new_paths.append([
                                next_spins,
                                next_mult,
                                path_prob * outcome_prob,
                                path_acc_win + actual_spin_win
                            ])

        paths = new_paths

    free_spin_gain = free_spin_triggers * expected_fs_win_per_trigger

    # RTP tracking
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
    print(f"    => VOLATILITY RATING : {volatility_score:.3f} ({volatility_word})")
    print("=============================================\n")

if flag:
    print("---------------------------------------------")
    print(f"  Warning Biggest RTP is: {rtp_max:.3f}% player has advantage:")
    print("=============================================\n")