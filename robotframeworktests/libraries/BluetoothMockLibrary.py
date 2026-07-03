"""BluetoothMockLibrary

Mock Robot Framework library simulating the low-level behavior of a
BLE Audio device (e.g. a hearing-aid-style device).

IMPORTANT: this is entirely a software simulation. It does not use any
real Bluetooth library (such as bleak/pybluez) and does not connect to
any physical hardware — there is no access to any vendor's documentation
or SDK. Device state is held in plain instance attributes, and the
delays (time.sleep) exist purely so the live log in the browser reads
at the pace of a real CI pipeline.
"""

import random
import time
from typing import Optional


class BluetoothMockLibrary:
    """Mocked class representing the state of a single BLE Audio device."""

    def __init__(self) -> None:
        self.connected_device: Optional[str] = None
        self.battery_level_percent: int = 100
        self.power_save_mode: bool = False
        self.reconnect_attempts: int = 0
        self.left_ear_setting: Optional[str] = None
        self.right_ear_setting: Optional[str] = None
        self.right_ear_connected: bool = True
        self.joined_broadcast: Optional[str] = None
        self.fitting_mode_active: bool = False

    def randomly_fail(self, fail_chance_percent: int) -> bool:
        """Randomly reports a failure with the given probability.

        Used deliberately on a couple of otherwise-passing test cases so
        the live demo occasionally shows a real failing run, like a
        flaky test in an actual CI pipeline — not a bug in the mock.

        Args:
            fail_chance_percent: probability (0-100) that this call
                reports a failure (int).

        Returns:
            bool: True if this call should simulate a failure.
        """
        return random.randint(1, 100) <= fail_chance_percent

    def pair_device(self, device_name: str, should_succeed: bool = True) -> str:
        """Simulates the BLE pairing process.

        Args:
            device_name: name of the device being paired with.
            should_succeed: whether the simulation should end in success
                (True) or a pairing failure (False) — used in negative tests.

        Returns:
            str: "PAIRED" on success, "PAIRING_FAILED" on failure.
        """
        time.sleep(1.2)
        if not should_succeed:
            self.connected_device = None
            return "PAIRING_FAILED"
        self.connected_device = device_name
        return "PAIRED"

    def pair_device_with_battery_check(self, device_name: str, minimum_battery_percent: int) -> str:
        """Simulates pairing while enforcing a minimum battery level.

        Real hearing-aid-style devices commonly refuse to start a new BLE
        session below a safety threshold, to avoid dying mid-pairing.

        Args:
            device_name: name of the device being paired with.
            minimum_battery_percent: minimum battery percent required to
                allow pairing (int).

        Returns:
            str: "PAIRED" if battery is sufficient, "BATTERY_TOO_LOW"
                otherwise.
        """
        time.sleep(1.0)
        if self.battery_level_percent < minimum_battery_percent:
            self.connected_device = None
            return "BATTERY_TOO_LOW"
        self.connected_device = device_name
        return "PAIRED"

    def get_connected_device(self) -> Optional[str]:
        """Returns the name of the currently connected device (str) or None."""
        return self.connected_device

    def start_audio_stream(self) -> str:
        """Simulates starting an audio stream on the paired device.

        Returns:
            str: "STREAMING" if a device is connected,
                "NO_DEVICE_CONNECTED" otherwise.
        """
        time.sleep(0.6)
        if self.connected_device is None:
            return "NO_DEVICE_CONNECTED"
        return "STREAMING"

    def simulate_signal_loss(self) -> None:
        """Simulates a sudden BLE signal loss — the device becomes disconnected."""
        time.sleep(0.5)
        self.connected_device = None

    def reconnect(self, device_name: str, wait_seconds: int, timeout_seconds: int) -> str:
        """Simulates an automatic reconnect attempt after signal loss.

        Args:
            device_name: name of the device we are trying to reconnect to.
            wait_seconds: simulated duration of the signal outage (int, seconds).
            timeout_seconds: maximum allowed time for reconnecting (int, seconds).

        Returns:
            str: "RECONNECTED" if wait_seconds <= timeout_seconds,
                "RECONNECT_TIMEOUT" otherwise.
        """
        time.sleep(min(wait_seconds, 3))
        self.reconnect_attempts += 1
        if wait_seconds <= timeout_seconds:
            self.connected_device = device_name
            return "RECONNECTED"
        return "RECONNECT_TIMEOUT"

    def get_reconnect_attempts(self) -> int:
        """Returns how many reconnect attempts have been made so far (int)."""
        return self.reconnect_attempts

    def simulate_repeated_signal_drops(self, device_name: str, drop_count: int, timeout_seconds: int) -> int:
        """Simulates several consecutive signal-loss-and-reconnect cycles.

        Used to check that a device keeps recovering reliably under
        repeated interference, rather than degrading after the first drop.

        Args:
            device_name: name of the device being reconnected each cycle.
            drop_count: number of signal-loss cycles to simulate (int).
            timeout_seconds: reconnect timeout applied on every cycle (int).

        Returns:
            int: number of cycles that successfully reconnected.
        """
        successful_cycles = 0
        for _ in range(drop_count):
            self.simulate_signal_loss()
            result = self.reconnect(device_name, wait_seconds=1, timeout_seconds=timeout_seconds)
            if result == "RECONNECTED":
                successful_cycles += 1
        return successful_cycles

    def switch_active_device(self, from_device: str, to_device: str) -> str:
        """Simulates switching the active audio stream to another paired device.

        Args:
            from_device: name of the currently active device.
            to_device: name of the device to switch the stream to.

        Returns:
            str: "SWITCHED" after a successful switch.
        """
        time.sleep(0.9)
        self.connected_device = to_device
        return "SWITCHED"

    def set_battery_level(self, level_percent: int) -> None:
        """Sets the simulated battery charge level.

        Args:
            level_percent: battery level in percent (int, 0-100).
        """
        self.battery_level_percent = level_percent

    def check_battery_status(self, threshold_percent: int) -> str:
        """Checks the battery level against a threshold and updates power-save mode.

        Args:
            threshold_percent: percentage threshold below which power-save
                mode is enabled (int).

        Returns:
            str: "POWER_SAVE_MODE" if battery is below the threshold,
                "NORMAL_MODE" otherwise.
        """
        time.sleep(0.4)
        if self.battery_level_percent < threshold_percent:
            self.power_save_mode = True
            return "POWER_SAVE_MODE"
        self.power_save_mode = False
        return "NORMAL_MODE"

    def measure_stream_stability(self, sample_count: int) -> int:
        """Simulates sampling audio stream stability over a short window.

        Each sample represents a health check on the active stream; a
        connected device is expected to pass every sample.

        Args:
            sample_count: number of stability samples to take (int).

        Returns:
            int: number of samples that reported a stable stream.
        """
        stable_samples = 0
        for _ in range(sample_count):
            time.sleep(0.2)
            if self.connected_device is not None:
                stable_samples += 1
        return stable_samples

    def measure_round_trip_latency_ms(self, codec_quality: str) -> int:
        """Simulates measuring end-to-end audio latency for a given codec.

        End-to-end latency is the total time from a sound entering the
        phone's microphone/output to it reaching the wearer's ear through
        the hearing aid's speaker. Unlike regular headphones, a hearing
        aid wearer also hears live, un-delayed sound directly through/
        around the device, so this delayed copy must stay under a tight
        budget or the two copies audibly clash (comb filtering / an
        echo-like, "metallic" sound on speech).

        Args:
            codec_quality: simulated codec/connection quality — one of
                "optimal", "degraded" (higher-latency fallback codec or
                weak radio link).

        Returns:
            int: simulated round-trip latency in milliseconds.
        """
        time.sleep(0.5)
        return 18 if codec_quality == "optimal" else 45

    def set_ear_setting(self, ear: str, setting: str) -> None:
        """Simulates changing a program/volume setting on one ear.

        Args:
            ear: which device the change originates from, "left" or "right".
            setting: the new setting value (e.g. a program name or volume level).
        """
        time.sleep(0.3)
        if ear == "left":
            self.left_ear_setting = setting
        else:
            self.right_ear_setting = setting

    def sync_ear_to_ear(self) -> str:
        """Simulates propagating the most recent setting to the other ear.

        Paired hearing aids must apply a volume/program change on both
        ears together, near-instantly — otherwise the wearer briefly
        hears an asymmetric (louder/quieter, or different program) mix
        between their two ears, which is disorienting.

        Returns:
            str: "SYNCED" if both ears now match and the right ear is
                connected, "DEGRADED_MONO" if the right ear is
                disconnected and could not receive the sync.
        """
        time.sleep(0.2)
        if not self.right_ear_connected:
            return "DEGRADED_MONO"
        self.right_ear_setting = self.left_ear_setting
        return "SYNCED"

    def disconnect_right_ear(self) -> None:
        """Simulates the right-ear device losing its connection."""
        time.sleep(0.2)
        self.right_ear_connected = False

    def join_broadcast_stream(self, broadcast_name: str, should_succeed: bool = True) -> str:
        """Simulates joining a public Auracast broadcast audio stream.

        Auracast (part of Bluetooth LE Audio) lets a hearing aid tune
        into a public one-to-many audio broadcast, like a radio — e.g.
        an announcement system at an airport or a TV feed in a public
        space — without pairing 1:1 with the source, unlike a normal
        phone connection.

        Args:
            broadcast_name: name/identifier of the broadcast to join.
            should_succeed: whether the join should succeed — used to
                simulate a broadcast that is out of range or encrypted
                without the right broadcast code.

        Returns:
            str: "BROADCAST_JOINED" or "BROADCAST_JOIN_FAILED".
        """
        time.sleep(0.8)
        if not should_succeed:
            self.joined_broadcast = None
            return "BROADCAST_JOIN_FAILED"
        self.joined_broadcast = broadcast_name
        return "BROADCAST_JOINED"

    def simulate_broadcast_signal_loss(self) -> str:
        """Simulates losing the currently joined Auracast broadcast signal.

        This is a different failure mode than losing a normal phone
        pairing: there is no single source to "reconnect" to — the
        device must either re-scan for the same broadcast or fall back
        to its last unicast (phone) connection.

        Returns:
            str: "BROADCAST_LOST".
        """
        time.sleep(0.3)
        self.joined_broadcast = None
        return "BROADCAST_LOST"

    def enter_fitting_mode(self, requested_by: str) -> str:
        """Simulates a clinician's fitting software opening a privileged session.

        A hearing aid exposes two different BLE access levels: a
        consumer app (volume, program switching) and a clinical fitting
        tool used by an audiologist to write audiogram-derived gain
        settings. These must be kept separate so a consumer app can
        never accidentally (or maliciously) rewrite clinical settings.

        Args:
            requested_by: who is requesting the session, "clinician_tool"
                or "consumer_app".

        Returns:
            str: "FITTING_MODE_ACTIVE" if requested by the clinician
                tool, "ACCESS_DENIED" otherwise.
        """
        time.sleep(0.4)
        if requested_by != "clinician_tool":
            return "ACCESS_DENIED"
        self.fitting_mode_active = True
        return "FITTING_MODE_ACTIVE"

    def write_clinical_setting(self, requested_by: str) -> str:
        """Simulates writing a clinical (audiogram-derived) setting over BLE.

        Args:
            requested_by: who is attempting the write, "clinician_tool"
                or "consumer_app".

        Returns:
            str: "WRITE_ACCEPTED" if fitting mode is active and the
                request comes from the clinician tool, "WRITE_REJECTED"
                otherwise.
        """
        time.sleep(0.3)
        if self.fitting_mode_active and requested_by == "clinician_tool":
            return "WRITE_ACCEPTED"
        return "WRITE_REJECTED"
