"""Volume basis — scenario daily volumes per flow per weekday.

Source: Volume Basis sheet (Peripass history, outliers excluded).
Each Peripass flow maps to one or more matrix flows via the splits
defined in config.Assumptions.

Percentile table structure:
  PERCENTILES[peripass_flow][weekday] = {"P25": x, "P50": x, "P75": x, "P90": x}

Scenario recipes (GXO Two-Peaks definition):
  Low              = all flows P25
  Std - FRBNL Peak = FRBNL at P90, all others P50
  Std-Horizon Peak = DACH/HGM at P90, all others P50
  High             = all flows P90
"""

from __future__ import annotations
from typing import Dict
from .config import Assumptions, WEEKDAYS, SCENARIOS

# ---------------------------------------------------------------------------
# Raw percentile table (from Volume Basis sheet)
# Key: Peripass flow name; nested key: weekday abbreviation
# ---------------------------------------------------------------------------

PERCENTILES: Dict[str, Dict[str, Dict[str, float]]] = {
    "Inbound DACH/HGM": {
        "Mon": {"P25": 12.0,  "P50": 14.5, "P75": 18.0,  "P90": 19.0},
        "Tue": {"P25": 8.0,   "P50": 13.0, "P75": 17.0,  "P90": 20.4},
        "Wed": {"P25": 12.0,  "P50": 14.0, "P75": 17.0,  "P90": 19.6},
        "Thu": {"P25": 6.2,   "P50": 10.0, "P75": 16.0,  "P90": 20.0},
        "Fri": {"P25": 6.0,   "P50": 11.0, "P75": 15.5,  "P90": 21.6},
    },
    "Inbound Kellogg": {
        "Mon": {"P25": 15.2,  "P50": 18.5, "P75": 21.0,  "P90": 25.5},
        "Tue": {"P25": 15.0,  "P50": 22.0, "P75": 25.5,  "P90": 28.0},
        "Wed": {"P25": 19.0,  "P50": 24.0, "P75": 26.0,  "P90": 29.2},
        "Thu": {"P25": 15.5,  "P50": 17.5, "P75": 22.2,  "P90": 25.5},
        "Fri": {"P25": 14.0,  "P50": 17.0, "P75": 20.0,  "P90": 23.0},
    },
    "Outbound FRABNL": {
        "Mon": {"P25": 12.2,  "P50": 23.0, "P75": 27.5,  "P90": 34.5},
        "Tue": {"P25": 21.0,  "P50": 24.0, "P75": 30.0,  "P90": 34.0},
        "Wed": {"P25": 15.2,  "P50": 25.5, "P75": 36.8,  "P90": 38.7},
        "Thu": {"P25": 15.0,  "P50": 19.5, "P75": 28.8,  "P90": 42.7},
        "Fri": {"P25": 15.5,  "P50": 21.0, "P75": 25.0,  "P90": 26.7},
    },
    "Outbound DACH/HGM": {
        "Mon": {"P25": 7.5,   "P50": 13.0, "P75": 20.5,  "P90": 29.4},
        "Tue": {"P25": 9.0,   "P50": 14.0, "P75": 15.0,  "P90": 26.4},
        "Wed": {"P25": 7.2,   "P50": 17.0, "P75": 30.2,  "P90": 40.1},
        "Thu": {"P25": 6.0,   "P50": 11.5, "P75": 15.0,  "P90": 24.3},
        "Fri": {"P25": 10.0,  "P50": 19.0, "P75": 31.0,  "P90": 46.4},
    },
    "Outbound Other": {
        "Mon": {"P25": 4.8,   "P50": 15.5, "P75": 23.5,  "P90": 28.0},
        "Tue": {"P25": 10.5,  "P50": 20.0, "P75": 23.0,  "P90": 24.6},
        "Wed": {"P25": 12.2,  "P50": 16.5, "P75": 24.0,  "P90": 28.5},
        "Thu": {"P25": 6.5,   "P50": 19.0, "P75": 22.0,  "P90": 27.6},
        "Fri": {"P25": 8.5,   "P50": 18.0, "P75": 23.0,  "P90": 26.8},
    },
    "Stand Trailers FRBNL": {
        "Mon": {"P25": 3.5,   "P50": 5.5,  "P75": 6.5,   "P90": 10.0},
        "Tue": {"P25": 5.0,   "P50": 8.0,  "P75": 9.0,   "P90": 10.6},
        "Wed": {"P25": 6.2,   "P50": 8.0,  "P75": 9.8,   "P90": 11.0},
        "Thu": {"P25": 4.0,   "P50": 6.0,  "P75": 10.5,  "P90": 11.6},
        "Fri": {"P25": 5.0,   "P50": 6.0,  "P75": 10.0,  "P90": 12.6},
    },
    "Stand Trailers DACH/HGM": {
        "Mon": {"P25": 3.0,   "P50": 4.0,  "P75": 6.5,   "P90": 7.0},
        "Tue": {"P25": 3.0,   "P50": 4.0,  "P75": 6.0,   "P90": 8.0},
        "Wed": {"P25": 5.0,   "P50": 6.0,  "P75": 7.0,   "P90": 8.7},
        "Thu": {"P25": 2.0,   "P50": 4.0,  "P75": 7.5,   "P90": 8.0},
        "Fri": {"P25": 2.5,   "P50": 5.0,  "P75": 7.5,   "P90": 10.4},
    },
}


# ---------------------------------------------------------------------------
# Scenario builder
# ---------------------------------------------------------------------------

def _pick(flow: str, weekday: str, scenario: str) -> float:
    """Select the right percentile for a Peripass source flow given a scenario."""
    p = PERCENTILES[flow][weekday]

    frbnl_peak = scenario == "Std - FRBNL Peak"
    horizon_peak = scenario == "Std - Horizon Peak"
    high = scenario == "High"
    low = scenario == "Low"

    is_frbnl = flow in ("Outbound FRABNL", "Stand Trailers FRBNL")
    is_dach = flow in ("Outbound DACH/HGM", "Stand Trailers DACH/HGM", "Inbound DACH/HGM")

    if low:
        return p["P25"]
    if high:
        return p["P90"]
    # Std peaks
    if frbnl_peak:
        return p["P90"] if is_frbnl else p["P50"]
    if horizon_peak:
        return p["P90"] if is_dach else p["P50"]

    raise ValueError(f"Unknown scenario: {scenario!r}")


def daily_volumes(
    scenario: str,
    weekday: str,
    assumptions: Assumptions | None = None,
) -> Dict[str, float]:
    """Return daily volume (loads) for every matrix flow.

    Matrix flows:
        Inbound DACH/HGM, Inbound Kellogg, Production,
        Outbound FR, Outbound BNL, Outbound DACH/HGM,
        Other & Full Pallets,
        Stand Tr. DACH/HGM, Stand Tr. FRBNL, Stand Tr. Full Pallets
    """
    a = assumptions or Assumptions()

    frabnl = _pick("Outbound FRABNL", weekday, scenario)
    out_other = _pick("Outbound Other", weekday, scenario)

    return {
        "Inbound DACH/HGM":   _pick("Inbound DACH/HGM", weekday, scenario),
        "Inbound Kellogg":    _pick("Inbound Kellogg", weekday, scenario),
        "Production":         float(a.production_per_day),
        "Outbound FR":        frabnl * a.fr_share_of_frbnl,
        "Outbound BNL":       frabnl * a.bnl_share_of_frbnl,
        "Outbound DACH/HGM":  _pick("Outbound DACH/HGM", weekday, scenario),
        "Other & Full Pallets": out_other * (1 - a.stand_fp_share),
        "Stand Tr. DACH/HGM": _pick("Stand Trailers DACH/HGM", weekday, scenario),
        "Stand Tr. FRBNL":    _pick("Stand Trailers FRBNL", weekday, scenario),
        "Stand Tr. Full Pallets": out_other * a.stand_fp_share,
    }
