"""LiveConsoleListener

A Robot Framework listener (API v3) that prints each keyword as it
starts and finishes, with indentation showing the nesting level. This
is what actually drives the "live pipeline" feel of the Manta demo:
Robot Framework's own --console verbose mode only prints a summary per
test case, not per keyword, so this listener fills that gap by hooking
into the real execution events instead of guessing at timing.

Attach it with: robot --listener LiveConsoleListener.py ...
"""


class LiveConsoleListener:
    # Declares this class as a v3 listener, so Robot Framework calls the
    # start_*/end_* hooks below with (data, result) objects instead of the
    # older, less structured v2 argument style.
    ROBOT_LISTENER_API_VERSION = 3

    def __init__(self) -> None:
        # Tracks how deeply nested the currently executing keyword is, so
        # each printed line can be indented to show call structure.
        self.depth = 0

    def start_suite(self, data, result) -> None:
        # Called once when a test suite (a .robot file) begins running.
        print(f"\n=== SUITE: {data.name} ===", flush=True)

    def start_test(self, data, result) -> None:
        # Called once per test case, right before its first keyword runs.
        # Resets the indentation depth so each test starts at level 0.
        print(f"\n--- TEST: {data.name} ---", flush=True)
        self.depth = 0

    def start_keyword(self, data, result) -> None:
        # Called every time any keyword (high-level or low-level) starts
        # executing, including keywords called from within other keywords.
        # Prints the keyword name and its arguments, then increases the
        # indentation depth for anything it calls internally.
        indent = "  " * (self.depth + 1)
        args = ", ".join(str(arg) for arg in data.args) if data.args else ""
        suffix = f"({args})" if args else ""
        print(f"{indent}> {data.name} {suffix}".rstrip(), flush=True)
        self.depth += 1

    def end_keyword(self, data, result) -> None:
        # Called when a keyword finishes. Restores the indentation depth
        # to its level before this keyword started, then prints whether it
        # passed or failed.
        self.depth = max(self.depth - 1, 0)
        indent = "  " * (self.depth + 1)
        print(f"{indent}< {result.status}", flush=True)

    def end_test(self, data, result) -> None:
        # Called once per test case, after its last keyword has finished,
        # with the test's overall PASS/FAIL status.
        print(f"--- {data.name}: {result.status} ---", flush=True)

    def end_suite(self, data, result) -> None:
        # Called once when the whole suite finishes, with its overall
        # PASS/FAIL status (FAIL if any test case in it failed).
        print(f"=== {data.name}: {result.status} ===\n", flush=True)
