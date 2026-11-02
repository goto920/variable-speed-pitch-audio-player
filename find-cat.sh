#!/bin/bash

find package.json README.md public src -type f \( -name "*.js" -o -name "*.json" -o -name "*.html" -o -name "*.css" -o -name "*.md" \) \
  ! -name "package-lock.json" \
  ! -name "*.test.js" \
  ! -name "*-INST" \
  -exec sh -c 'echo -e "\n\n--- START OF FILE $1 ---\n"; cat "$1"' _ {} \; > legacy_code.txt
