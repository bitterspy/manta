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

import time
from typing import Optional


class BluetoothMockLibrary:
    """Mocked class representing the state of a single BLE Audio device."""

    def __init__(self) -> None:
        self.connected_device: Optional[str] = None
        self.battery_level_percent: int = 100
        self.power_save_mode: bool = False

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
        if wait_seconds <= timeout_seconds:
            self.connected_device = device_name
            return "RECONNECTED"
        return "RECONNECT_TIMEOUT"

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
