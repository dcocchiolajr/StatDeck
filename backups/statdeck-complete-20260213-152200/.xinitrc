#!/bin/bash
xset -dpms
xset s off
xset s noblank

openbox &

while true; do
    chromium --kiosk --disable-infobars --noerrdialogs http://localhost:8000
    sleep 5
done
