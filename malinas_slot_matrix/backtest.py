"""Backtest — would the offered slots have covered Peripass history?

For each clean historical day (FLAG == 0) we compare:
  offered/day (scenario daily volume)  vs  actual trucks that day

Coverage = fraction of days where offered >= actual.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List

from .config import SCENARIOS, WEEKDAYS, Assumptions
from .volume import daily_volumes

# ---------------------------------------------------------------------------
# Peripass history (daily trucks per flow, FLAG = 1 means outlier)
# Columns: date, weekday, IN_DACH, IN_KELL, OUT_FRABNL, OUT_DACH, OUT_OTHER,
#          ST_FRBNL, ST_DACH, [flags x7]
# ---------------------------------------------------------------------------

_RAW = [
    ("2026-01-29","Thu",1,0,0,0,0,0,0,  0,0,0,0,0,0,0),
    ("2026-02-23","Mon",0,0,0,0,5,0,0,  0,0,0,0,0,0,0),
    ("2026-02-24","Tue",0,1,1,0,0,0,0,  0,0,0,0,0,0,0),
    ("2026-02-25","Wed",0,1,0,0,4,0,0,  0,0,0,0,0,0,0),
    ("2026-02-26","Thu",0,0,0,0,1,0,0,  0,0,0,0,0,0,0),
    ("2026-02-27","Fri",0,0,2,0,2,0,0,  0,0,0,0,0,0,0),
    ("2026-03-02","Mon",15,19,10,6,7,2,3,  0,0,0,0,0,0,0),
    ("2026-03-03","Tue",11,26,18,15,9,8,4,  0,0,0,0,0,0,0),
    ("2026-03-04","Wed",13,28,20,6,9,5,5,  0,0,0,0,0,0,0),
    ("2026-03-05","Thu",7,26,21,6,19,4,3,  0,0,0,0,0,0,0),
    ("2026-03-06","Fri",10,23,19,12,28,13,5,  0,0,0,0,0,0,0),
    ("2026-03-09","Mon",14,19,13,14,18,4,4,  0,0,0,0,0,0,0),
    ("2026-03-10","Tue",12,28,31,15,10,4,3,  0,0,0,0,0,0,0),
    ("2026-03-11","Wed",5,30,12,17,13,7,5,  0,0,0,0,0,0,0),
    ("2026-03-12","Thu",10,25,17,18,14,11,8,  0,0,0,0,0,0,0),
    ("2026-03-13","Fri",11,16,20,29,21,16,6,  0,0,0,0,0,0,0),
    ("2026-03-16","Mon",13,21,21,19,10,10,5,  0,0,0,0,0,0,0),
    ("2026-03-17","Tue",8,31,22,41,13,5,8,  0,0,0,0,0,0,0),
    ("2026-03-18","Wed",11,19,25,22,24,8,7,  0,0,0,0,0,0,0),
    ("2026-03-19","Thu",15,16,25,15,28,9,5,  0,0,0,0,0,0,0),
    ("2026-03-20","Fri",6,18,27,22,24,10,8,  0,0,0,0,0,0,0),
    ("2026-03-23","Mon",13,21,21,21,25,6,26,  0,0,0,0,0,0,1),
    ("2026-03-24","Tue",4,14,37,16,23,8,3,  0,0,0,0,0,0,0),
    ("2026-03-25","Wed",14,32,33,33,25,10,7,  0,0,0,0,0,0,0),
    ("2026-03-26","Thu",7,14,21,11,22,9,9,  0,0,0,0,0,0,0),
    ("2026-03-27","Fri",7,26,14,49,25,5,14,  0,0,0,0,0,0,0),
    ("2026-03-30","Mon",15,16,23,20,23,8,7,  0,0,0,0,0,0,0),
    ("2026-03-31","Tue",18,22,27,9,25,10,6,  0,0,0,0,0,0,0),
    ("2026-04-01","Wed",19,20,38,6,18,8,9,  0,0,0,0,0,0,0),
    ("2026-04-02","Thu",16,20,64,12,27,16,7,  0,0,1,0,0,0,0),
    ("2026-04-03","Fri",14,19,25,3,18,6,1,  0,0,0,0,0,0,0),
    ("2026-04-06","Mon",1,1,0,0,0,0,0,  0,0,0,0,0,0,0),
    ("2026-04-07","Tue",22,12,31,11,22,9,3,  0,0,0,0,0,0,0),
    ("2026-04-08","Wed",15,14,26,11,21,17,7,  0,0,0,0,0,0,0),
    ("2026-04-09","Thu",16,20,30,7,18,4,8,  0,0,0,0,0,0,0),
    ("2026-04-10","Fri",21,23,22,11,15,2,4,  0,0,0,0,0,0,0),
    ("2026-04-13","Mon",16,18,24,27,13,11,7,  0,0,0,0,0,0,0),
    ("2026-04-14","Tue",23,14,24,13,23,8,4,  0,0,0,0,0,0,0),
    ("2026-04-15","Wed",15,24,38,38,12,9,10,  0,0,0,0,0,0,0),
    ("2026-04-16","Thu",16,16,43,27,21,11,4,  0,0,0,0,0,0,0),
    ("2026-04-17","Fri",6,14,26,21,19,6,8,  0,0,0,0,0,0,0),
    ("2026-04-20","Mon",13,21,35,13,22,6,4,  0,0,0,0,0,0,0),
    ("2026-04-21","Tue",15,16,21,15,20,9,8,  0,0,0,0,0,0,0),
    ("2026-04-22","Wed",20,19,39,22,30,8,8,  0,0,0,0,0,0,0),
    ("2026-04-23","Thu",19,17,18,15,22,6,4,  0,0,0,0,0,0,0),
    ("2026-04-24","Fri",17,13,17,44,11,10,7,  0,0,0,0,0,0,0),
    ("2026-04-27","Mon",20,27,34,31,22,5,5,  0,0,0,0,0,0,0),
    ("2026-04-28","Tue",13,25,29,66,20,13,11,  0,0,0,1,0,0,0),
    ("2026-04-29","Wed",14,26,31,42,24,11,7,  0,0,0,0,0,0,0),
    ("2026-04-30","Thu",9,23,42,33,20,10,6,  0,0,0,0,0,0,0),
    ("2026-05-01","Fri",1,2,2,6,0,0,0,  0,0,0,0,0,0,0),
    ("2026-05-04","Mon",18,18,32,35,30,10,16,  0,0,0,0,0,0,1),
    ("2026-05-05","Tue",7,16,27,54,24,6,5,  0,0,0,1,0,0,0),
    ("2026-05-06","Wed",19,17,11,3,11,4,0,  0,0,0,0,0,0,0),
    ("2026-05-07","Thu",21,16,15,6,8,4,1,  0,0,0,0,0,0,0),
    ("2026-05-08","Fri",11,16,15,9,6,5,1,  0,0,0,0,0,0,0),
    ("2026-05-11","Mon",18,18,25,9,4,5,3,  0,0,0,0,0,0,0),
    ("2026-05-12","Tue",13,23,17,3,8,5,4,  0,0,0,0,0,0,0),
    ("2026-05-13","Wed",14,26,14,11,14,6,5,  0,0,0,0,0,0,0),
    ("2026-05-14","Thu",4,3,7,4,5,0,0,  0,0,0,0,0,0,0),
    ("2026-05-15","Fri",13,21,25,15,6,5,5,  0,0,0,0,0,0,0),
    ("2026-05-18","Mon",9,24,23,9,4,6,3,  0,0,0,0,0,0,0),
    ("2026-05-19","Tue",8,23,21,9,11,5,4,  0,0,0,0,0,0,0),
    ("2026-05-20","Wed",8,25,19,17,15,7,5,  0,0,0,0,0,0,0),
    ("2026-05-21","Thu",4,18,15,13,1,6,3,  0,0,0,0,0,0,0),
    ("2026-05-22","Fri",6,14,22,19,13,6,5,  0,0,0,0,0,0,0),
    ("2026-05-25","Mon",0,2,1,3,1,0,0,  0,0,0,0,0,0,0),
    ("2026-05-26","Tue",18,28,21,14,17,7,6,  0,0,0,0,0,0,0),
    ("2026-05-27","Wed",25,24,112,126,97,42,26,  0,0,1,1,1,1,1),
    ("2026-05-28","Thu",28,46,100,250,127,32,34,  0,0,1,1,1,1,1),
    ("2026-05-29","Fri",24,17,29,33,22,6,7,  0,0,0,0,0,0,0),
    ("2026-06-01","Mon",18,13,26,12,26,5,7,  0,0,0,0,0,0,0),
    ("2026-06-02","Tue",16,19,36,29,32,11,3,  0,0,0,0,0,0,0),
    ("2026-06-03","Wed",15,22,60,41,44,11,3,  0,0,0,0,0,0,0),
    ("2026-06-04","Thu",10,22,57,49,40,12,8,  0,0,0,1,0,0,0),
    ("2026-06-05","Fri",22,17,74,48,48,12,12,  0,0,1,0,0,0,0),
    ("2026-06-08","Mon",20,27,38,67,45,6,9,  0,0,0,1,0,0,0),
]

# Flow names as they appear in the history vs the matrix
_HIST_FLOW_FLAGS = {
    "Inbound DACH/HGM":   (2, 9),
    "Inbound Kellogg":    (3, 10),
    "Outbound FRABNL":    (4, 11),
    "Outbound DACH/HGM":  (5, 12),
    "Outbound Other":     (6, 13),
    "Stand Tr. FRBNL":    (7, 14),
    "Stand Tr. DACH/HGM": (8, 15),
}


@dataclass
class FlowCoverage:
    flow: str
    offered_per_day: float
    n_clean_days: int
    n_covered: int
    day_coverage: float        # % of days offered >= actual
    mean_actual: float


def backtest(
    scenario: str,
    weekday: str,
    assumptions: Assumptions | None = None,
) -> List[FlowCoverage]:
    """Compare offered slots (daily) vs actual Peripass history for a scenario+weekday."""
    a = assumptions or Assumptions()
    vols = daily_volumes(scenario, weekday, a)

    # Matrix offers for source flows (recombine FR+BNL → FRABNL)
    offered = {
        "Inbound DACH/HGM":   vols["Inbound DACH/HGM"],
        "Inbound Kellogg":    vols["Inbound Kellogg"],
        "Outbound FRABNL":    vols["Outbound FR"] + vols["Outbound BNL"],
        "Outbound DACH/HGM":  vols["Outbound DACH/HGM"],
        "Outbound Other":     vols["Other & Full Pallets"] + vols["Stand Tr. Full Pallets"],
        "Stand Tr. FRBNL":    vols["Stand Tr. FRBNL"],
        "Stand Tr. DACH/HGM": vols["Stand Tr. DACH/HGM"],
    }

    # Filter history to this weekday and no flags on the flow being tested
    results = []
    for hist_flow, (val_col, flag_col) in _HIST_FLOW_FLAGS.items():
        clean_days = [r for r in _RAW if r[1] == weekday and r[flag_col] == 0]
        actuals = [r[val_col] for r in clean_days]
        if not actuals:
            continue
        n_covered = sum(1 for a_ in actuals if offered[hist_flow] >= a_)
        results.append(FlowCoverage(
            flow=hist_flow,
            offered_per_day=offered[hist_flow],
            n_clean_days=len(actuals),
            n_covered=n_covered,
            day_coverage=n_covered / len(actuals),
            mean_actual=sum(actuals) / len(actuals),
        ))
    return results
