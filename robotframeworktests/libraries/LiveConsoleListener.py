"""LiveConsoleListener

A Robot Framework listener (API v3) that prints each keyword as it
starts and finishes, with indentation showing the nesting level. This
is what actually drives the "live pipeline" feel of the Manta demo:
Robot Framework's own --console verbose mode only prints a summary per
test case, not per keyword, so this listener fills that gap by hooking
into the real execution events instead of guessing at timing.

Attach it with: robot --listener LiveConsoleListener.py ...
"""

import sys


class LiveConsoleListener:
    ROBOT_LISTENER_API_VERSION = 3

    def __init__(self) -> None:
        self.depth = 0

    def start_suite(self, data, result) -> None:
        print(f"\n=== SUITE: {data.name} ===", flush=True)

    def start_test(self, data, result) -> None:
        print(f"\n--- TEST: {data.name} ---", flush=True)
        self.depth = 0

    def start_keyword(self, data, result) -> None:
        indent = "  " * (self.depth + 1)
        args = ", ".join(str(arg) for arg in data.args) if data.args else ""
        suffix = f"({args})" if args else ""
        print(f"{indent}> {data.name} {suffix}".rstrip(), flush=True)
        self.depth += 1

    def end_keyword(self, data, result) -> None:
        self.depth = max(self.depth - 1, 0)
        indent = "  " * (self.depth + 1)
        print(f"{indent}< {result.status}", flush=True)

    def end_test(self, data, result) -> None:
        print(f"--- {data.name}: {result.status} ---", flush=True)

    def end_suite(self, data, result) -> None:
        print(f"=== {data.name}: {result.status} ===\n", flush=True)
