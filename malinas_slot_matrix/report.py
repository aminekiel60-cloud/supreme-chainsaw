"""Terminal and CSV report formatters."""

from __future__ import annotations
import csv
import io
import sys
from typing import Dict, List

from .config import FLOWS
from .profile import HOURS
from .engine import SlotMatrix, subtotals


# ---------------------------------------------------------------------------
# Slot matrix table
# ---------------------------------------------------------------------------

def _bar(value: float, max_val: float = 1.0, width: int = 10) -> str:
    filled = int(round(value / max_val * width)) if max_val else 0
    return "█" * filled + "░" * (width - filled)


def print_matrix(
    matrix: SlotMatrix,
    scenario: str,
    weekday: str,
    volumes: Dict[str, float],
) -> None:
    subs = subtotals(matrix)

    flow_cols = FLOWS
    sub_cols = ["IN (+prod)", "OUT live", "STAND", "OUT total", "TOTAL act."]
    all_cols = flow_cols + sub_cols

    col_w = 8
    label_w = 7

    header1 = f"  SLOT MATRIX — {scenario} · {weekday}"
    print()
    print(header1)
    print("  " + "─" * (label_w + col_w * len(all_cols) + 4))

    # Column headers (abbreviated)
    abbrev = {
        "Inbound DACH/HGM":   "IN-DACH",
        "Inbound Kellogg":    "IN-KELL",
        "Production":         "PROD",
        "Outbound FR":        "OUT-FR",
        "Outbound BNL":       "OUT-BNL",
        "Outbound DACH/HGM":  "OUT-DAC",
        "Other & Full Pallets":"OTHER",
        "Stand Tr. DACH/HGM": "ST-DAC",
        "Stand Tr. FRBNL":    "ST-FRB",
        "Stand Tr. Full Pallets":"ST-FP",
        "IN (+prod)":         "IN+PRD",
        "OUT live":           "OUT-LV",
        "STAND":              "STAND",
        "OUT total":          "OUT-TOT",
        "TOTAL act.":         "TOTAL",
    }
    hdr = f"  {'Hour':<{label_w}}"
    for c in all_cols:
        hdr += f"{abbrev[c]:>{col_w}}"
    print(hdr)

    # Daily volumes row
    vol_row = f"  {'VOL/day':<{label_w}}"
    for flow in flow_cols:
        vol_row += f"{volumes[flow]:>{col_w}.1f}"
    vol_row += " " * (col_w * len(sub_cols))
    print(vol_row)
    print("  " + "─" * (label_w + col_w * len(all_cols) + 4))

    for hour in HOURS:
        row = f"  {hour:<{label_w}}"
        for flow in flow_cols:
            v = matrix[flow][hour]
            row += f"{v:>{col_w}}"
        for sub in sub_cols:
            v = subs[sub][hour]
            row += f"{v:>{col_w}}"
        print(row)

    print("  " + "─" * (label_w + col_w * len(all_cols) + 4))

    # Totals row
    tot_row = f"  {'TOTAL':<{label_w}}"
    for flow in flow_cols:
        tot_row += f"{sum(matrix[flow][h] for h in HOURS):>{col_w}}"
    for sub in sub_cols:
        tot_row += f"{sum(subs[sub][h] for h in HOURS):>{col_w}}"
    print(tot_row)

    # Peak row
    pk_row = f"  {'PEAK h':<{label_w}}"
    for flow in flow_cols:
        pk_row += f"{max(HOURS, key=lambda h: matrix[flow][h]):>{col_w}}"
    for sub in sub_cols:
        pk_row += f"{max(HOURS, key=lambda h: subs[sub][h]):>{col_w}}"
    print(pk_row)
    print()


# ---------------------------------------------------------------------------
# Utilisation summary
# ---------------------------------------------------------------------------

def print_utilisation(peak_util: Dict[str, float]) -> None:
    print("  DOCK ZONE PEAK UTILISATION")
    print("  " + "─" * 50)
    for zone, util in peak_util.items():
        status = "OVER" if util > 1.0 else "WARN" if util > 0.85 else "OK"
        bar = _bar(min(util, 1.0))
        print(f"  {zone:<22} {util:5.1%}  {bar}  {status}")
    print()


# ---------------------------------------------------------------------------
# Backtest summary
# ---------------------------------------------------------------------------

def print_backtest(coverages) -> None:
    from .backtest import FlowCoverage
    print("  BACKTEST — day coverage (offered >= actual)")
    print("  " + "─" * 65)
    print(f"  {'Flow':<26} {'Offered':>8} {'Days':>5} {'Covered':>8} {'Coverage':>9} {'Avg act':>8}")
    print("  " + "─" * 65)
    for c in coverages:
        bar = _bar(c.day_coverage)
        print(
            f"  {c.flow:<26} {c.offered_per_day:>8.1f}"
            f" {c.n_clean_days:>5} {c.n_covered:>8}"
            f" {c.day_coverage:>8.1%}  {c.mean_actual:>6.1f}"
        )
    print()


# ---------------------------------------------------------------------------
# Sweep CSV
# ---------------------------------------------------------------------------

def sweep_to_csv(rows: List[Dict], file=None) -> None:
    if not rows:
        return
    out = file or sys.stdout
    writer = csv.DictWriter(out, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)


# ---------------------------------------------------------------------------
# Sweep console table
# ---------------------------------------------------------------------------

def print_sweep(rows: List[Dict]) -> None:
    if not rows:
        return
    print()
    print("  SCENARIO SWEEP — all combinations")
    print(f"  {'Scenario':<22} {'Day':<5} {'IN':>5} {'OUT-LV':>7} {'STAND':>6} "
          f"{'TOTAL':>6} {'PkHr':>6} {'PkSl':>5} "
          f"{'DOM%':>6} {'HOR%':>6} {'OVF%':>6} {'INB%':>6}")
    print("  " + "─" * 105)
    prev_scen = None
    for r in rows:
        if r["scenario"] != prev_scen and prev_scen is not None:
            print()
        prev_scen = r["scenario"]
        flag_inb = " !" if r["util_inbound"] > 1.0 else "  "
        print(
            f"  {r['scenario']:<22} {r['weekday']:<5}"
            f" {r['daily_inbound']:>5} {r['daily_outbound_live']:>7}"
            f" {r['daily_stand']:>6} {r['daily_total']:>6}"
            f" {r['peak_total_hour']:>6} {r['peak_total_slots']:>5}"
            f" {r['util_domestic']:>5.0%} {r['util_horizon']:>6.0%}"
            f" {r['util_overflow']:>6.0%} {r['util_inbound']:>5.0%}{flag_inb}"
        )
    print()
