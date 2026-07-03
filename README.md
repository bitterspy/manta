# Manta

A public live-demo site that runs a mock Robot Framework test suite for
simulated BLE Audio connectivity scenarios (pairing, reconnect, multi-device
switching, low-battery fallback) and streams the output to the browser in
real time, similar to a CI pipeline log.

This project was built as a portfolio demo showcasing test automation
skills. It does **not** test any real hardware — all Bluetooth behavior is
fully simulated in software.

This repository was built with the assistance of AI (Claude).

## How it works

1. A visitor clicks **Run Tests** on the site.
2. The backend spawns Robot Framework as a subprocess against the test suite
   in `robotframeworktests/tests/`.
3. Its stdout/stderr is streamed live to the browser over a WebSocket
   connection.
4. Once the run finishes, the generated `report.html` / `log.html` (native
   Robot Framework output) becomes available to view.
5. A **Code** tab lets visitors inspect the test suite source directly in the
   browser.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Plain HTML/CSS/JS (no framework, no build step) |
| Backend | Node.js + Express + `ws` (WebSocket) |
| Test automation | Robot Framework + Python |
| Process manager | PM2 |
| Hosting | mikr.us |

## Project structure

```
Manta/
├── backend/            Express + WebSocket server
├── frontend/            Static site (Demo / Code tabs)
├── robotframeworktests/
│   ├── tests/
│   │   ├── ble_audio.robot                  Core connectivity suite
│   │   ├── connectivity_negative.robot      Negative-path suite
│   │   └── performance_regression.robot     Performance/regression suite
│   ├── keywords/ble_keywords.robot      High-level keywords
│   ├── libraries/BluetoothMockLibrary.py  Mock BLE device
│   ├── variables/variables.yaml         Test constants
│   └── resources/                       Extra assets (scripts, images, etc.)
├── Logs/                Generated Robot Framework reports (gitignored)
└── requirements.txt      Python dependencies
```

## Running locally

```bash
pip install -r requirements.txt
cd backend
npm install
npm start
```

Then open `http://localhost:44591`.

## Author

Wojciech Spycha&#322;a
