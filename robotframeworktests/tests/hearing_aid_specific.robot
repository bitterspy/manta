*** Settings ***
Documentation     Manta — hearing-aid-specific connectivity test suite.
...
...               These scenarios go beyond generic Bluetooth audio
...               testing (the kind you'd do for regular wireless
...               headphones) and cover engineering concerns unique to
...               hearing aids as body-worn, binaural, often
...               medically-regulated devices. It is a software
...               simulation — it does NOT test any real, physical
...               device. See each test's [Documentation] for a plain
...               explanation of why that scenario matters.
Resource          ../keywords/ble_keywords.robot
Variables         ../variables/variables.yaml


*** Test Cases ***
Round-Trip Latency Stays Under The Comb-Filtering Budget
    [Documentation]    With an optimal codec/link, end-to-end audio
    ...                 latency must stay under the budget where a
    ...                 wearer's live-heard sound and the wirelessly
    ...                 streamed copy would start to audibly clash.
    [Tags]    smoke    latency    hearing-aid-specific
    Then Round-Trip Latency Should Be Under Budget    ${OPTIMAL_CODEC_QUALITY}    ${MAX_LATENCY_BUDGET_MS}

Degraded Codec Breaches The Latency Budget
    [Documentation]    Negative/control scenario: a degraded codec or
    ...                 weak link should be caught as exceeding the
    ...                 latency budget, proving the check actually
    ...                 discriminates good from bad conditions instead
    ...                 of always passing.
    [Tags]    regression    latency    hearing-aid-specific    negative
    Run Keyword And Expect Error    STARTS: Latency
    ...    Then Round-Trip Latency Should Be Under Budget    ${DEGRADED_CODEC_QUALITY}    ${MAX_LATENCY_BUDGET_MS}

Ear-To-Ear Sync Propagates A Setting Change
    [Documentation]    Changing a program/volume setting on the left ear
    ...                 should propagate to the right ear so both ears
    ...                 change together, avoiding a brief asymmetric
    ...                 (louder/quieter, or different program) listening
    ...                 experience between ears.
    [Tags]    smoke    binaural    hearing-aid-specific
    Given Left Ear Setting Is Changed To    quiet_restaurant
    ${sync_result}=    When Setting Is Synced To Other Ear
    Then Ears Should Be In Sync    ${sync_result}

Ear-To-Ear Sync Falls Back To Mono When One Ear Disconnects
    [Documentation]    When the right ear is unreachable, the sync
    ...                 attempt should report a graceful degraded-mono
    ...                 fallback instead of failing silently or
    ...                 crashing — the wearer keeps hearing through the
    ...                 connected ear rather than losing audio entirely.
    [Tags]    regression    binaural    hearing-aid-specific
    Given Left Ear Setting Is Changed To    quiet_restaurant
    When Right Ear Loses Connection
    ${sync_result}=    When Setting Is Synced To Other Ear
    Then Device Should Fall Back To Degraded Mono    ${sync_result}

Device Joins A Public Auracast Broadcast
    [Documentation]    The device can tune into a public Auracast
    ...                 broadcast (e.g. an announcement system) the same
    ...                 way a radio tunes into a station — without
    ...                 pairing 1:1 with a single source, unlike a
    ...                 normal phone connection.
    [Tags]    smoke    auracast    hearing-aid-specific
    ${result}=    Given Device Attempts To Join Broadcast    ${BROADCAST_NAME}
    Should Be Equal    ${result}    BROADCAST_JOINED

Broadcast Join Fails For An Out-Of-Range Broadcast
    [Documentation]    Negative scenario: joining an out-of-range or
    ...                 incorrectly-keyed broadcast should fail in a
    ...                 controlled way rather than with undefined
    ...                 behavior.
    [Tags]    regression    auracast    hearing-aid-specific    negative
    ${result}=    Given Device Attempts To Join Broadcast    ${BROADCAST_NAME}    should_succeed=${FALSE}
    Should Be Equal    ${result}    BROADCAST_JOIN_FAILED

Broadcast Signal Loss Is Reported Distinctly From Pairing Loss
    [Documentation]    Losing an Auracast broadcast is a different
    ...                 failure mode than losing a phone pairing —
    ...                 there is no single peer to reconnect to, so the
    ...                 device must report it distinctly rather than
    ...                 reusing the normal disconnect handling.
    [Tags]    regression    auracast    hearing-aid-specific
    Given Device Attempts To Join Broadcast    ${BROADCAST_NAME}
    ${result}=    When Broadcast Signal Is Lost
    Should Be Equal    ${result}    BROADCAST_LOST

Clinician Tool Can Enter Fitting Mode And Write Clinical Settings
    [Documentation]    The privileged clinical fitting session (used by
    ...                 an audiologist to program audiogram-derived
    ...                 settings) should be available to the clinician
    ...                 tool and allow writing clinical settings once
    ...                 active.
    [Tags]    smoke    fitting-access    hearing-aid-specific
    ${mode_result}=    Given Fitting Mode Is Requested By    ${CLINICIAN_TOOL_IDENTITY}
    Should Be Equal    ${mode_result}    FITTING_MODE_ACTIVE
    ${write_result}=    When Clinical Setting Write Is Attempted By    ${CLINICIAN_TOOL_IDENTITY}
    Should Be Equal    ${write_result}    WRITE_ACCEPTED

Consumer App Cannot Access Fitting Mode Or Write Clinical Settings
    [Documentation]    Security/access-control scenario specific to a
    ...                 regulated medical device: the consumer companion
    ...                 app must never be able to open the clinical
    ...                 fitting session or write audiogram-derived
    ...                 settings, even if it tries.
    [Tags]    regression    fitting-access    hearing-aid-specific    negative
    ${mode_result}=    Given Fitting Mode Is Requested By    ${CONSUMER_APP_IDENTITY}
    Should Be Equal    ${mode_result}    ACCESS_DENIED
    ${write_result}=    When Clinical Setting Write Is Attempted By    ${CONSUMER_APP_IDENTITY}
    Should Be Equal    ${write_result}    WRITE_REJECTED
