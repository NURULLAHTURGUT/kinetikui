#!/usr/bin/env bash
# Release-build measurements on Android (emulator or device). For each component: cold start,
# settle, count frames drawn in 5 s with no input (idle cost), then drive a
# fixed gesture script and record gfxinfo percentiles and total PSS.
# Usage: ADB=path/to/adb OUT=perf.tsv scripts/perf/measure-android.sh name [name...]
# Needs a release build of apps/playground installed (debug builds add large
# dev-tool overhead). Then: pnpm tsx scripts/perf/record.ts perf.tsv "<device>" emulator|device
# Columns: name idleFrames frames janky% p50 p90 p99 pssKB
ADB=${ADB:-adb}
PKG=dev.kinetik.playground
OUT=${OUT:-perf.tsv}
export MSYS_NO_PATHCONV=1

field() { echo "$1" | grep -m1 "$2" | awk -F': ' '{print $2}' | awk '{print $1}' | tr -d '\r'; }

for name in "$@"; do
  $ADB shell am force-stop $PKG
  $ADB shell am start -a android.intent.action.VIEW -d "kinetik-playground://c/$name" $PKG > /dev/null
  sleep 6
  $ADB shell dumpsys gfxinfo $PKG reset > /dev/null
  sleep 5
  idle=$(field "$($ADB shell dumpsys gfxinfo $PKG)" "Total frames rendered")
  $ADB shell dumpsys gfxinfo $PKG reset > /dev/null
  for i in 1 2; do
    $ADB shell input swipe 200 900 880 900 600
    $ADB shell input swipe 880 700 200 1100 600
    $ADB shell input tap 540 900
    sleep 0.6
    $ADB shell input swipe 540 600 540 1300 500
    $ADB shell input swipe 540 1300 540 600 500
    $ADB shell input tap 300 1200
    sleep 0.6
    $ADB shell input swipe 540 800 540 800 1500
  done
  sleep 1.5
  g=$($ADB shell dumpsys gfxinfo $PKG)
  janky=$(echo "$g" | grep -m1 "^Janky frames:" | sed -E 's/.*\(([0-9.]+)%\).*/\1/' | tr -d '\r')
  pss=$($ADB shell dumpsys meminfo $PKG | grep -m1 "TOTAL PSS" | awk '{print $3}' | tr -d '\r')
  printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" "$name" "$idle" "$(field "$g" "Total frames rendered")" "$janky" \
    "$(field "$g" "50th percentile")" "$(field "$g" "90th percentile")" "$(field "$g" "99th percentile")" "$pss" | tee -a $OUT
done
