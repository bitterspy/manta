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
    [Arguments]    ${device_name}
    ${result}=    Pair Device    ${device_name}
    Should Be Equal    ${result}    PAIRED

Given Pairing Fails For Device
    [Documentation]    Attempts to pair the mocked device in a mode that
    ...                 deliberately ends in a pairing failure
    ...                 (negative scenario).
    [Arguments]    ${device_name}
    ${result}=    Pair Device    ${device_name}    should_succeed=${FALSE}
    Should Be Equal    ${result}    PAIRING_FAILED

When Audio Stream Is Started
    [Documentation]    Starts an audio stream on the currently paired
    ...                 device and verifies that streaming began.
    ${result}=    Start Audio Stream
    Should Be Equal    ${result}    STREAMING

When Signal Is Lost
    [Documentation]    Simulates a sudden BLE signal loss for the
    ...                 currently connected device.
    Simulate Signal Loss

When Device Attempts Reconnect
    [Documentation]    Attempts to restore the connection after signal
    ...                 loss, given a simulated outage duration and a
    ...                 timeout limit.
    [Arguments]    ${device_name}    ${wait_seconds}    ${timeout_seconds}
    ${result}=    Reconnect    ${device_name}    ${wait_seconds}    ${timeout_seconds}
    RETURN    ${result}

When Active Device Is Switched
    [Documentation]    Switches the active audio stream from one paired
    ...                 device to another.
    [Arguments]    ${from_device}    ${to_device}
    ${result}=    Switch Active Device    ${from_device}    ${to_device}
    Should Be Equal    ${result}    SWITCHED

Given Battery Level Is Set To
    [Documentation]    Sets the device's simulated battery level.
    [Arguments]    ${level_percent}
    Set Battery Level    ${level_percent}

Then Device Should Enter Power Save Mode
    [Documentation]    Verifies that at the current battery level the
    ...                 device enters power-save mode.
    [Arguments]    ${threshold_percent}
    ${result}=    Check Battery Status    ${threshold_percent}
    Should Be Equal    ${result}    POWER_SAVE_MODE

Then Device Should Stay In Normal Mode
    [Documentation]    Verifies that at the current battery level the
    ...                 device stays in normal mode.
    [Arguments]    ${threshold_percent}
    ${result}=    Check Battery Status    ${threshold_percent}
    Should Be Equal    ${result}    NORMAL_MODE

Then Device Should Be Connected
    [Documentation]    Verifies that the given device is currently
    ...                 connected.
    [Arguments]    ${device_name}
    ${connected}=    Get Connected Device
    Should Be Equal    ${connected}    ${device_name}

Then Device Should Not Be Connected
    [Documentation]    Verifies that no device is currently connected.
    ${connected}=    Get Connected Device
    Should Be Equal    ${connected}    ${NONE}

Given Pairing Is Attempted With Low Battery
    [Documentation]    Attempts to pair the mocked device while the
    ...                 battery is below the required minimum.
    ...                 (negative scenario).
    [Arguments]    ${device_name}    ${minimum_battery_percent}
    ${result}=    Pair Device With Battery Check    ${device_name}    ${minimum_battery_percent}
    RETURN    ${result}

When Signal Drops Repeatedly
    [Documentation]    Simulates several consecutive signal-loss-and-reconnect
    ...                 cycles and returns how many cycles recovered
    ...                 successfully.
    [Arguments]    ${device_name}    ${drop_count}    ${timeout_seconds}
    ${successful_cycles}=    Simulate Repeated Signal Drops
    ...    ${device_name}    ${drop_count}    ${timeout_seconds}
    RETURN    ${successful_cycles}

Then Reconnect Attempts Should Be
    [Documentation]    Verifies the total number of reconnect attempts
    ...                 made so far by the mocked device.
    [Arguments]    ${expected_attempts}
    ${attempts}=    Get Reconnect Attempts
    Should Be Equal As Integers    ${attempts}    ${expected_attempts}

Then Stream Should Stay Stable For Samples
    [Documentation]    Samples the active stream a given number of times
    ...                 and verifies every sample reported a stable
    ...                 connection.
    [Arguments]    ${sample_count}
    ${stable_samples}=    Measure Stream Stability    ${sample_count}
    Should Be Equal As Integers    ${stable_samples}    ${sample_count}

Then This Test May Randomly Fail
    [Documentation]    Deliberately introduces a small, configurable chance
    ...                 of failure on an otherwise-passing test, so the
    ...                 live demo occasionally shows a real failing run —
    ...                 similar to a flaky test in a real CI pipeline.
    [Arguments]    ${fail_chance_percent}
    ${should_fail}=    Randomly Fail    ${fail_chance_percent}
    Should Not Be True    ${should_fail}
    ...    msg=Simulated flaky failure (${fail_chance_percent}% chance) — this is expected occasionally, not a bug.
