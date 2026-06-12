"""Assumptions & levers — mirrors the Assumptions sheet.

All editable values live here; the engine reads nothing else.
"""

from dataclasses import dataclass, field


@dataclass
class Assumptions:
    # Booking cadence
    slot_length_min: int = 30
    operating_window_h: int = 24

    # Outbound goal (loads/day)
    outbound_target: int = 139
    frbnl_target: int = 57
    horizon_target: int = 57
    ico_other_target: int = 25

    # Flow splits
    fr_share_of_frbnl: float = 0.60   # 60 % FR, 40 % BNL
    bnl_share_of_frbnl: float = 0.40

    # No-show rates (reference only, not used in slot sizing)
    noshow_frbnl_stand: float = 0.077
    noshow_dach_stand: float = 0.12

    # Stand-trailer share of Other/FP flow
    stand_fp_share: float = 0.10

    # Production (fixed planning rate)
    production_per_day: int = 30

    # Dock time-at-dock (minutes, Peripass medians)
    time_live_load_min: int = 112
    time_stand_drop_min: int = 27
    time_inbound_min: int = 65


# Dock layout — Units and door counts
DOCK_UNITS = {
    "Domestic (U1+U2)": {"docks": 21, "serves": ["Outbound FR", "Outbound BNL"]},
    "Horizon (U4)":     {"docks": 10, "serves": ["Outbound DACH/HGM"]},
    "Overflow (U3)":    {"docks": 13, "serves": ["Other & Full Pallets"]},
    "Inbound":          {"docks": 4,  "serves": ["Inbound DACH/HGM", "Inbound Kellogg"]},
}

WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]

SCENARIOS = ["Low", "Std - FRBNL Peak", "Std - Horizon Peak", "High"]

FLOWS = [
    "Inbound DACH/HGM",
    "Inbound Kellogg",
    "Production",
    "Outbound FR",
    "Outbound BNL",
    "Outbound DACH/HGM",
    "Other & Full Pallets",
    "Stand Tr. DACH/HGM",
    "Stand Tr. FRBNL",
    "Stand Tr. Full Pallets",
]
