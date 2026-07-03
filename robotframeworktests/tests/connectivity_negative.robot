*** Settings ***
Documentation     Manta — negative-path test suite for BLE Audio connectivity.
...
...               This suite focuses exclusively on failure and edge-case
...               scenarios: invalid pairing attempts, timeouts, and unsafe
...               device states. It is a software simulation — it does NOT
...               test any real, physical device.
Resource          ../resources/keywords/ble_keywords.robot
Variables         ../resources/variables/variables.yaml


*** Test Cases ***
Pairing Fails With Invalid Device
    [Documentation]    Attempts to pair with an incompatible/unresponsive
    ...                 device. Pairing should fail in a controlled way
    ...                 rather than with undefined behavior.
    [Tags]    regression    pairing    negative
    Given Pairing Fails For Device    ${INVALID_DEVICE_NAME}
    Then Device Should Not Be Connected

Reconnect Timeout Exceeded
    [Documentation]    Signal does not return within the window defined
    ...                 by RECONNECT_TIMEOUT_SEC — the device should
    ...                 report a permanent connection loss instead of
    ...                 retrying indefinitely.
    [Tags]    regression    reconnect    negative
    Given Device Is Paired    ${DEVICE_NAME}
    When Signal Is Lost
    ${result}=    When Device Attempts Reconnect
    ...    ${DEVICE_NAME}    ${RECONNECT_TIMEOUT_EXCEEDED_SEC}    ${RECONNECT_TIMEOUT_SEC}
    Should Be Equal    ${result}    RECONNECT_TIMEOUT
    Then Device Should Not Be Connected

Pairing Blocked By Critically Low Battery
    [Documentation]    A device with a critically low battery should
    ...                 refuse to start a new pairing session, to avoid
    ...                 dying mid-handshake.
    [Tags]    regression    pairing    battery    negative
    Given Battery Level Is Set To    ${CRITICAL_BATTERY_LEVEL_PERCENT}
    ${result}=    Given Pairing Is Attempted With Low Battery
    ...    ${DEVICE_NAME}    ${MINIMUM_BATTERY_FOR_PAIRING_PERCENT}
    Should Be Equal    ${result}    BATTERY_TOO_LOW
    Then Device Should Not Be Connected

Audio Stream Does Not Start Without Pairing
    [Documentation]    Starting a stream without an active pairing should
    ...                 fail explicitly instead of silently doing nothing.
    [Tags]    regression    streaming    negative
    Then Device Should Not Be Connected
    ${result}=    Start Audio Stream
    Should Be Equal    ${result}    NO_DEVICE_CONNECTED
