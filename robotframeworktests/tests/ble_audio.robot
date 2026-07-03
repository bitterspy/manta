*** Settings ***
Documentation     Manta — mock/demo test suite for BLE Audio connectivity.
...
...               This suite is a software simulation inspired by the
...               Test Automation Engineer role. It does NOT test any
...               real, physical device — there is no access to any
...               specific vendor's hardware or SDK. All BLE logic is
...               mocked in BluetoothMockLibrary.py.
Resource          ../resources/keywords/ble_keywords.robot
Variables         ../resources/variables/variables.yaml


*** Test Cases ***
Successful BLE Audio Pairing
    [Documentation]    Basic happy path: a BLE Audio device pairs
    ...                 successfully with a phone — without successful
    ...                 pairing no other scenario matters.
    [Tags]    smoke    pairing
    Given Device Is Paired    ${DEVICE_NAME}
    Then Device Should Be Connected    ${DEVICE_NAME}

Audio Stream Starts After Pairing
    [Documentation]    After successful pairing, the audio stream
    ...                 should start without any extra user interaction.
    ...                 Includes a small random chance of failure to
    ...                 simulate real-world CI flakiness.
    [Tags]    smoke    streaming    flaky-eligible
    Given Device Is Paired    ${DEVICE_NAME}
    When Audio Stream Is Started
    Then This Test May Randomly Fail    ${FLAKY_FAIL_CHANCE_PERCENT}

Reconnect After Signal Loss
    [Documentation]    The device loses signal (e.g. the phone moves out
    ...                 of range) and should automatically recover the
    ...                 connection within a reasonable time.
    [Tags]    regression    reconnect
    Given Device Is Paired    ${DEVICE_NAME}
    When Signal Is Lost
    Then Device Should Not Be Connected
    ${result}=    When Device Attempts Reconnect
    ...    ${DEVICE_NAME}    ${RECONNECT_TIMEOUT_SEC}    ${RECONNECT_TIMEOUT_SEC}
    Should Be Equal    ${result}    RECONNECTED
    Then Device Should Be Connected    ${DEVICE_NAME}

Multi-Device Switching
    [Documentation]    The device is paired with multiple audio sources
    ...                 (e.g. phone and TV) and should support smoothly
    ...                 switching the active stream between them.
    ...                 Includes a small random chance of failure to
    ...                 simulate real-world CI flakiness.
    [Tags]    regression    multidevice    flaky-eligible
    Given Device Is Paired    ${DEVICE_NAME}
    When Active Device Is Switched    ${DEVICE_NAME}    ${SECONDARY_DEVICE_NAME}
    Then Device Should Be Connected    ${SECONDARY_DEVICE_NAME}
    Then This Test May Randomly Fail    ${FLAKY_FAIL_CHANCE_PERCENT}

Low Battery Fallback
    [Documentation]    When the battery level drops below the threshold,
    ...                 the device should enter power-save mode to
    ...                 extend its runtime.
    [Tags]    regression    battery
    Given Battery Level Is Set To    ${LOW_BATTERY_LEVEL_PERCENT}
    Then Device Should Enter Power Save Mode    ${LOW_BATTERY_THRESHOLD_PERCENT}

Battery Above Threshold Stays In Normal Mode
    [Documentation]    Control case for the battery test: at a high
    ...                 charge level the device should NOT enter
    ...                 power-save mode.
    [Tags]    regression    battery
    Given Battery Level Is Set To    ${FULL_BATTERY_LEVEL_PERCENT}
    Then Device Should Stay In Normal Mode    ${LOW_BATTERY_THRESHOLD_PERCENT}
