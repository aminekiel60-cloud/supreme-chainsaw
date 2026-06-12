"""Command-line interface for the Malinas slot matrix engine."""

from __future__ import annotations
import argparse
import sys

from .config import SCENARIOS, WEEKDAYS, Assumptions
from .engine import compute_matrix, peak_utilisation, sweep_all
from .backtest import backtest
from .report import (
    print_matrix, print_utilisation, print_backtest,
    print_sweep, sweep_to_csv,
)


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="malinas-slots",
        description="Malinas DC (Mechelen) — Dock Slot Matrix Engine · Kellanova / GXO",
    )
    sub = p.add_subparsers(dest="command", required=True)

    # ── matrix ──────────────────────────────────────────────────────────────
    mx = sub.add_parser("matrix", help="Print slot matrix for a scenario + weekday")
    mx.add_argument(
        "scenario",
        choices=SCENARIOS,
        metavar="SCENARIO",
        help=f"One of: {', '.join(SCENARIOS)}",
    )
    mx.add_argument(
        "weekday",
        choices=WEEKDAYS,
        metavar="WEEKDAY",
        help=f"One of: {', '.join(WEEKDAYS)}",
    )
    mx.add_argument("--util", action="store_true", help="Also show dock utilisation")
    mx.add_argument("--backtest", action="store_true", dest="bt", help="Also run backtest")

    # ── backtest ─────────────────────────────────────────────────────────────
    bt = sub.add_parser("backtest", help="Backtest slot coverage against Peripass history")
    bt.add_argument("scenario", choices=SCENARIOS, metavar="SCENARIO")
    bt.add_argument("weekday", choices=WEEKDAYS, metavar="WEEKDAY")

    # ── sweep ────────────────────────────────────────────────────────────────
    sw = sub.add_parser("sweep", help="Run all scenario × weekday combinations")
    sw.add_argument("--csv", action="store_true", help="Output as CSV")

    return p


def main(argv=None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    a = Assumptions()

    if args.command == "matrix":
        matrix, vols = compute_matrix(args.scenario, args.weekday, a)
        print_matrix(matrix, args.scenario, args.weekday, vols)
        if args.util:
            print_utilisation(peak_utilisation(matrix, a))
        if args.bt:
            print_backtest(backtest(args.scenario, args.weekday, a))

    elif args.command == "backtest":
        coverages = backtest(args.scenario, args.weekday, a)
        print_backtest(coverages)

    elif args.command == "sweep":
        rows = sweep_all(a)
        if args.csv:
            sweep_to_csv(rows)
        else:
            print_sweep(rows)

    return 0


if __name__ == "__main__":
    sys.exit(main())
