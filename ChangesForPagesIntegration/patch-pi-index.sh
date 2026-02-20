#!/bin/bash
# patch-pi-index.sh — adds page-transitions.css link to Pi index.html
# SCP'd to Pi then run via SSH

INDEX=~/StatDeck/frontend/index.html

if grep -q "page-transitions.css" "$INDEX"; then
    echo "ALREADY_LINKED"
    exit 0
fi

# Try to insert after touch-animations.css
if grep -q "touch-animations.css" "$INDEX"; then
    sed -i '/touch-animations.css/a\    <link rel="stylesheet" href="styles/page-transitions.css">' "$INDEX"
    echo "INSERTED_AFTER_TOUCH_ANIMATIONS"
    exit 0
fi

# Fallback: insert before </head>
sed -i '/<\/head>/i\    <link rel="stylesheet" href="styles/page-transitions.css">' "$INDEX"
echo "INSERTED_BEFORE_HEAD"
