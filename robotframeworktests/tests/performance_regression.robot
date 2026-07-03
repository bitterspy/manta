*** Settings ***
Documentation     Manta — performance/regression test suite for BLE Audio connectivity.
...
...               This suite extends coverage beyond the basic pairing
...               flow: repeated interference recovery and stream
...               stability under sustained use. It is a software
...               simulation — it does NOT test any real, physical device.
Resource          ../keywords/ble_keywords.robot
Variables         ../variables/variables.yaml


*** Test Cases ***
Device Recovers From Repeated Signal Drops
    [Documentation]    The device experiences several consecutive
    ...                 signal-loss events (e.g. intermittent interference)
    ...                 and should recover the connection every time,
    ...                 not just after the first drop. Includes a small
    ...                 random chance of failure to simulate real-world
    ...                 CI flakiness.
    [Tags]    regression    reconnect    stability    flaky-eligible
    Given Device Is Paired    ${DEVICE_NAME}
    ${successful_cycles}=    When Signal Drops Repeatedly
    ...    ${DEVICE_NAME}    ${SIGNAL_DROP_CYCLES}    ${RECONNECT_TIMEOUT_SEC}
    Should Be Equal As Integers    ${successful_cycles}    ${SIGNAL_DROP_CYCLES}
    Then Device Should Be Connected    ${DEVICE_NAME}
    Then This Test May Randomly Fail    ${FLAKY_FAIL_CHANCE_PERCENT}

Reconnect Attempts Are Tracked Accurately
    [Documentation]    Every reconnect attempt should be counted, so
    ...                 connectivity health can be monitored over time
    ...                 instead of only checking the final state.
    [Tags]    regression    reconnect    monitoring
    Given Device Is Paired    ${DEVICE_NAME}
    When Signal Drops Repeatedly    ${DEVICE_NAME}    ${SIGNAL_DROP_CYCLES}    ${RECONNECT_TIMEOUT_SEC}
    Then Reconnect Attempts Should Be    ${SIGNAL_DROP_CYCLES}

Audio Stream Stays Stable Under Sustained Use
    [Documentation]    Once paired and streaming, the connection should
    ...                 remain stable across repeated health checks,
    ...                 simulating continuous playback over time.
    ...                 Includes a small random chance of failure to
    ...                 simulate real-world CI flakiness.
    [Tags]    regression    streaming    stability    flaky-eligible
    Given Device Is Paired    ${DEVICE_NAME}
    When Audio Stream Is Started
    Then Stream Should Stay Stable For Samples    ${STREAM_STABILITY_SAMPLE_COUNT}
    Then This Test May Randomly Fail    ${FLAKY_FAIL_CHANCE_PERCENT}
