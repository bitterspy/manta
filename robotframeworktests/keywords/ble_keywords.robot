*** Settings ***
Documentation     High-level keywords for the BLE Audio test suite.
...               Each keyword wraps one or more calls into
...               BluetoothMockLibrary, so the .robot files with test
...               cases read like scenarios instead of low-level API
...               calls.
Library           ../libraries/BluetoothMockLibrary.py


*** Keywords ***
Given Device Is Paired
    [Documentation]    Pairs the mocked BLE device with the given name
    ...                 and verifies that pairing succeeded.
    ...
    ...                 Args:
    ...                     device_name (str): name of the device to pair with.
    [Arguments]    ${device_name}
    ${result}=    Pair Device    ${device_name}
    Should Be Equal    ${result}    PAIRED

Given Pairing Fails For Device
    [Documentation]    Attempts to pair the mocked device in a mode that
    ...                 deliberately ends in a pairing failure
    ...                 (negative scenario).
    ...
    ...                 Args:
    ...                     device_name (str): name of the device the pairing attempt targets.
    [Arguments]    ${device_name}
    ${result}=    Pair Device    ${device_name}    should_succeed=${FALSE}
    Should Be Equal    ${result}    PAIRING_FAILED

When Audio Stream Is Started
    [Documentation]    Starts an audio stream on the currently paired
    ...                 device and verifies that streaming began.
    ...
    ...                 Args: none.
    ${result}=    Start Audio Stream
    Should Be Equal    ${result}    STREAMING

When Signal Is Lost
    [Documentation]    Simulates a sudden BLE signal loss for the
    ...                 currently connected device.
    ...
    ...                 Args: none.
    Simulate Signal Loss

When Device Attempts Reconnect
    [Documentation]    Attempts to restore the connection after signal
    ...                 loss, given a simulated outage duration and a
    ...                 timeout limit.
    ...
    ...                 Args:
    ...                     device_name (str): name of the device to reconnect to.
    ...                     wait_seconds (int): simulated duration of the signal outage, in seconds.
    ...                     timeout_seconds (int): maximum time allowed for reconnecting, in seconds.
    ...
    ...                 Returns:
    ...                     str: "RECONNECTED" or "RECONNECT_TIMEOUT".
    [Arguments]    ${device_name}    ${wait_seconds}    ${timeout_seconds}
    ${result}=    Reconnect    ${device_name}    ${wait_seconds}    ${timeout_seconds}
    RETURN    ${result}

When Active Device Is Switched
    [Documentation]    Switches the active audio stream from one paired
    ...                 device to another.
    ...
    ...                 Args:
    ...                     from_device (str): name of the currently active device.
    ...                     to_device (str): name of the device to switch the stream to.
    [Arguments]    ${from_device}    ${to_device}
    ${result}=    Switch Active Device    ${from_device}    ${to_device}
    Should Be Equal    ${result}    SWITCHED

Given Battery Level Is Set To
    [Documentation]    Sets the device's simulated battery level.
    ...
    ...                 Args:
    ...                     level_percent (int): battery level to set, in percent (0-100).
    [Arguments]    ${level_percent}
    Set Battery Level    ${level_percent}

Then Device Should Enter Power Save Mode
    [Documentation]    Verifies that at the current battery level the
    ...                 device enters power-save mode.
    ...
    ...                 Args:
    ...                     threshold_percent (int): battery percentage threshold to check against.
    [Arguments]    ${threshold_percent}
    ${result}=    Check Battery Status    ${threshold_percent}
    Should Be Equal    ${result}    POWER_SAVE_MODE

Then Device Should Stay In Normal Mode
    [Documentation]    Verifies that at the current battery level the
    ...                 device stays in normal mode.
    ...
    ...                 Args:
    ...                     threshold_percent (int): battery percentage threshold to check against.
    [Arguments]    ${threshold_percent}
    ${result}=    Check Battery Status    ${threshold_percent}
    Should Be Equal    ${result}    NORMAL_MODE

Then Device Should Be Connected
    [Documentation]    Verifies that the given device is currently
    ...                 connected.
    ...
    ...                 Args:
    ...                     device_name (str): name of the device expected to be connected.
    [Arguments]    ${device_name}
    ${connected}=    Get Connected Device
    Should Be Equal    ${connected}    ${device_name}

Then Device Should Not Be Connected
    [Documentation]    Verifies that no device is currently connected.
    ...
    ...                 Args: none.
    ${connected}=    Get Connected Device
    Should Be Equal    ${connected}    ${NONE}

Given Pairing Is Attempted With Low Battery
    [Documentation]    Attempts to pair the mocked device while the
    ...                 battery is below the required minimum.
    ...                 (negative scenario).
    ...
    ...                 Args:
    ...                     device_name (str): name of the device being paired with.
    ...                     minimum_battery_percent (int): minimum battery percent required to allow pairing.
    ...
    ...                 Returns:
    ...                     str: "PAIRED" or "BATTERY_TOO_LOW".
    [Arguments]    ${device_name}    ${minimum_battery_percent}
    ${result}=    Pair Device With Battery Check    ${device_name}    ${minimum_battery_percent}
    RETURN    ${result}

When Signal Drops Repeatedly
    [Documentation]    Simulates several consecutive signal-loss-and-reconnect
    ...                 cycles and returns how many cycles recovered
    ...                 successfully.
    ...
    ...                 Args:
    ...                     device_name (str): name of the device being reconnected each cycle.
    ...                     drop_count (int): number of signal-loss cycles to simulate.
    ...                     timeout_seconds (int): reconnect timeout applied on every cycle, in seconds.
    ...
    ...                 Returns:
    ...                     int: number of cycles that successfully reconnected.
    [Arguments]    ${device_name}    ${drop_count}    ${timeout_seconds}
    ${successful_cycles}=    Simulate Repeated Signal Drops
    ...    ${device_name}    ${drop_count}    ${timeout_seconds}
    RETURN    ${successful_cycles}

Then Reconnect Attempts Should Be
    [Documentation]    Verifies the total number of reconnect attempts
    ...                 made so far by the mocked device.
    ...
    ...                 Args:
    ...                     expected_attempts (int): expected total number of reconnect attempts.
    [Arguments]    ${expected_attempts}
    ${attempts}=    Get Reconnect Attempts
    Should Be Equal As Integers    ${attempts}    ${expected_attempts}

Then Stream Should Stay Stable For Samples
    [Documentation]    Samples the active stream a given number of times
    ...                 and verifies every sample reported a stable
    ...                 connection.
    ...
    ...                 Args:
    ...                     sample_count (int): number of stability samples to take.
    [Arguments]    ${sample_count}
    ${stable_samples}=    Measure Stream Stability    ${sample_count}
    Should Be Equal As Integers    ${stable_samples}    ${sample_count}

Then This Test May Randomly Fail
    [Documentation]    Deliberately introduces a small, configurable chance
    ...                 of failure on an otherwise-passing test, so the
    ...                 live demo occasionally shows a real failing run —
    ...                 similar to a flaky test in a real CI pipeline.
    ...
    ...                 Args:
    ...                     fail_chance_percent (int): probability (0-100) that this call fails.
    [Arguments]    ${fail_chance_percent}
    ${should_fail}=    Randomly Fail    ${fail_chance_percent}
    Should Not Be True    ${should_fail}
    ...    msg=Simulated flaky failure (${fail_chance_percent}% chance) — this is expected occasionally, not a bug.

Then Round-Trip Latency Should Be Under Budget
    [Documentation]    Verifies that the measured end-to-end audio
    ...                 latency for a given codec/link quality stays
    ...                 under the maximum tolerable delay.
    ...
    ...                 Why this matters: a hearing aid wearer hears
    ...                 live sound directly (through/around the device)
    ...                 at the same time as the delayed, wirelessly
    ...                 streamed copy. If the wireless copy arrives too
    ...                 late, the two copies audibly clash — speech
    ...                 starts to sound metallic/echoey (comb filtering).
    ...                 Regular Bluetooth headphones don't have this
    ...                 problem because the wearer only hears the
    ...                 streamed copy, never a live "reference" version
    ...                 at the same time.
    ...
    ...                 Args:
    ...                     codec_quality (str): "optimal" or "degraded" — which
    ...                         simulated codec/link quality to measure.
    ...                     max_latency_ms (int): maximum acceptable round-trip
    ...                         latency, in milliseconds.
    [Arguments]    ${codec_quality}    ${max_latency_ms}
    ${latency_ms}=    Measure Round Trip Latency Ms    ${codec_quality}
    Should Be True    ${latency_ms} <= ${max_latency_ms}
    ...    msg=Latency ${latency_ms}ms exceeds the ${max_latency_ms}ms budget for audible comb-filtering-free listening.

Given Left Ear Setting Is Changed To
    [Documentation]    Changes a program/volume setting on the left-ear
    ...                 device, as if the wearer adjusted it via the
    ...                 companion app or a physical button.
    ...
    ...                 Args:
    ...                     setting (str): the new setting value (e.g. a program
    ...                         name or volume level).
    [Arguments]    ${setting}
    Set Ear Setting    left    ${setting}

When Setting Is Synced To Other Ear
    [Documentation]    Propagates the left ear's most recent setting to
    ...                 the right ear, as real binaural hearing aids do
    ...                 automatically so both ears change together.
    ...
    ...                 Why this matters: if one ear applies a volume or
    ...                 program change before the other, the wearer
    ...                 briefly hears an asymmetric, disorienting mix —
    ...                 louder in one ear than the other, or two
    ...                 different noise-reduction programs active at
    ...                 once. This has no equivalent in single-earbud or
    ...                 even most true-wireless earbud connectivity
    ...                 testing.
    ...
    ...                 Args: none.
    ${result}=    Sync Ear To Ear
    RETURN    ${result}

When Right Ear Loses Connection
    [Documentation]    Simulates the right-ear device disconnecting
    ...                 (e.g. out of range, low battery shutdown),
    ...                 independently of the left ear.
    ...
    ...                 Args: none.
    Disconnect Right Ear

Then Ears Should Be In Sync
    [Documentation]    Verifies that propagating a setting to the other
    ...                 ear succeeded (both ears now match).
    ...
    ...                 Args:
    ...                     sync_result (str): the return value from
    ...                         "When Setting Is Synced To Other Ear".
    [Arguments]    ${sync_result}
    Should Be Equal    ${sync_result}    SYNCED

Then Device Should Fall Back To Degraded Mono
    [Documentation]    Verifies that when the other ear cannot be
    ...                 reached, the device reports a graceful mono
    ...                 fallback instead of failing silently or
    ...                 crashing the sync attempt.
    ...
    ...                 Args:
    ...                     sync_result (str): the return value from
    ...                         "When Setting Is Synced To Other Ear".
    [Arguments]    ${sync_result}
    Should Be Equal    ${sync_result}    DEGRADED_MONO

Given Device Attempts To Join Broadcast
    [Documentation]    Attempts to join a public Auracast broadcast
    ...                 audio stream, such as an announcement system or
    ...                 assistive-listening feed in a public venue.
    ...
    ...                 Why this matters: Auracast (part of Bluetooth LE
    ...                 Audio) is a one-to-many broadcast a hearing aid
    ...                 can tune into like a radio station, with no 1:1
    ...                 pairing to the source — a connectivity mode with
    ...                 no equivalent in typical consumer headphone
    ...                 pairing.
    ...
    ...                 Args:
    ...                     broadcast_name (str): name/identifier of the broadcast.
    ...                     should_succeed (bool): whether the join should succeed —
    ...                         use ${FALSE} to simulate an out-of-range or
    ...                         incorrectly-keyed broadcast (negative scenario).
    [Arguments]    ${broadcast_name}    ${should_succeed}=${TRUE}
    ${result}=    Join Broadcast Stream    ${broadcast_name}    ${should_succeed}
    RETURN    ${result}

When Broadcast Signal Is Lost
    [Documentation]    Simulates losing the currently joined Auracast
    ...                 broadcast. Unlike losing a normal phone
    ...                 connection, there is no single peer to
    ...                 "reconnect" to — the device must re-scan for the
    ...                 broadcast or fall back to its last phone
    ...                 connection.
    ...
    ...                 Args: none.
    ${result}=    Simulate Broadcast Signal Loss
    RETURN    ${result}

Given Fitting Mode Is Requested By
    [Documentation]    Requests a privileged "fitting mode" session,
    ...                 used by clinical software to program
    ...                 audiogram-derived settings — distinct from the
    ...                 consumer companion app.
    ...
    ...                 Why this matters: a consumer app must never be
    ...                 able to open or use the same privileged access
    ...                 as the clinician's fitting tool. Verifying this
    ...                 boundary is a connectivity/access-control test
    ...                 specific to a regulated medical device, not
    ...                 something generic Bluetooth audio testing covers.
    ...
    ...                 Args:
    ...                     requested_by (str): "clinician_tool" or "consumer_app".
    [Arguments]    ${requested_by}
    ${result}=    Enter Fitting Mode    ${requested_by}
    RETURN    ${result}

When Clinical Setting Write Is Attempted By
    [Documentation]    Attempts to write a clinical (audiogram-derived)
    ...                 setting, as the fitting software would after a
    ...                 hearing test.
    ...
    ...                 Args:
    ...                     requested_by (str): "clinician_tool" or "consumer_app".
    [Arguments]    ${requested_by}
    ${result}=    Write Clinical Setting    ${requested_by}
    RETURN    ${result}
