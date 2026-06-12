"""Core slot matrix computation engine.

Main entry point: compute_matrix()
"""

from __future__ import annotations
import math
from typing import Dict, List, Tuple

from .config import Assumptions, FLOWS, DOCK_UNITS
from .volume import daily_volumes
from .profile import PROFILE, HOURS


# ---------------------------------------------------------------------------
# Slot matrix
# ---------------------------------------------------------------------------

SlotMatrix = Dict[str, Dict[str, int]]   # flow → hour → slots


def compute_matrix(
    scenario: str,
    weekday: str,
    assumptions: Assumptions | None = None,
) -> Tuple[SlotMatrix, Dict[str, float]]:
    """Compute the slot matrix for a scenario + weekday combination.

    Returns:
        matrix:  {flow: {hour: slot_count}}
        volumes: {flow: daily_volume}  (the daily numbers driving the matrix)
    """
    a = assumptions or Assumptions()
    vols = daily_volumes(scenario, weekday, a)

    matrix: SlotMatrix = {}
    for flow in FLOWS:
        matrix[flow] = {}
        daily = vols[flow]
        for hour in HOURS:
            raw = daily * PROFILE[flow][hour]
            matrix[flow][hour] = round(raw)

    return matrix, vols


def subtotals(matrix: SlotMatrix) -> Dict[str, Dict[str, int]]:
    """Compute the four sub-total columns per hour.

    Returns dict with keys: IN (+prod), OUT live, STAND, OUT total, TOTAL act.
    """
    inbound_flows = ["Inbound DACH/HGM", "Inbound Kellogg", "Production"]
    outbound_live = ["Outbound FR", "Outbound BNL", "Outbound DACH/HGM", "Other & Full Pallets"]
    stand_flows   = ["Stand Tr. DACH/HGM", "Stand Tr. FRBNL", "Stand Tr. Full Pallets"]

    result: Dict[str, Dict[str, int]] = {
        "IN (+prod)": {}, "OUT live": {}, "STAND": {},
        "OUT total":  {}, "TOTAL act.": {},
    }
    for hour in HOURS:
        in_sum  = sum(matrix[f][hour] for f in inbound_flows)
        out_sum = sum(matrix[f][hour] for f in outbound_live)
        st_sum  = sum(matrix[f][hour] for f in stand_flows)
        result["IN (+prod)"][hour]  = in_sum
        result["OUT live"][hour]    = out_sum
        result["STAND"][hour]       = st_sum
        result["OUT total"][hour]   = out_sum + st_sum
        result["TOTAL act."][hour]  = in_sum + out_sum + st_sum

    return result


# ---------------------------------------------------------------------------
# Dock zone utilisation
# ---------------------------------------------------------------------------

def dock_utilisation(
    matrix: SlotMatrix,
    assumptions: Assumptions | None = None,
) -> Dict[str, Dict[str, float]]:
    """Hourly utilisation % per dock zone.

    util = door_minutes_demanded / (n_docks × 60)
    Returns {zone: {hour: utilisation_fraction}}
    """
    a = assumptions or Assumptions()

    zone_flow_time = {
        "Domestic (U1+U2)": (["Outbound FR", "Outbound BNL"],      a.time_live_load_min),
        "Horizon (U4)":      (["Outbound DACH/HGM"],                a.time_live_load_min),
        "Overflow (U3)":     (["Other & Full Pallets"],              a.time_live_load_min),
        "Inbound":           (["Inbound DACH/HGM", "Inbound Kellogg"], a.time_inbound_min),
    }

    result: Dict[str, Dict[str, float]] = {}
    for zone, (flows, time_min) in zone_flow_time.items():
        n_docks = DOCK_UNITS[zone]["docks"]
        capacity_min = n_docks * 60
        result[zone] = {}
        for hour in HOURS:
            demand_min = sum(matrix[f][hour] for f in flows) * time_min
            result[zone][hour] = demand_min / capacity_min

    return result


def peak_utilisation(matrix: SlotMatrix, assumptions: Assumptions | None = None) -> Dict[str, float]:
    """Peak (max across hours) utilisation per dock zone."""
    util = dock_utilisation(matrix, assumptions)
    return {zone: max(v.values()) for zone, v in util.items()}


# ---------------------------------------------------------------------------
# Scenario sweep
# ---------------------------------------------------------------------------

def sweep_all(assumptions: Assumptions | None = None) -> List[Dict]:
    """Run all scenario × weekday combinations and return summary rows."""
    from .config import SCENARIOS, WEEKDAYS

    rows = []
    for scenario in SCENARIOS:
        for weekday in WEEKDAYS:
            matrix, vols = compute_matrix(scenario, weekday, assumptions)
            subs = subtotals(matrix)
            peak = peak_utilisation(matrix, assumptions)

            daily_out = sum(subs["OUT live"][h] for h in HOURS)
            daily_in  = sum(subs["IN (+prod)"][h] for h in HOURS)
            daily_stand = sum(subs["STAND"][h] for h in HOURS)
            peak_total_hour = max(HOURS, key=lambda h: subs["TOTAL act."][h])

            rows.append({
                "scenario": scenario,
                "weekday": weekday,
                "daily_inbound": daily_in,
                "daily_outbound_live": daily_out,
                "daily_stand": daily_stand,
                "daily_total": daily_in + daily_out + daily_stand,
                "peak_total_hour": peak_total_hour,
                "peak_total_slots": subs["TOTAL act."][peak_total_hour],
                "util_domestic": peak["Domestic (U1+U2)"],
                "util_horizon":  peak["Horizon (U4)"],
                "util_overflow": peak["Overflow (U3)"],
                "util_inbound":  peak["Inbound"],
            })
    return rows
