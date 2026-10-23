#!/usr/bin/env python3
"""Hash blocklist words so the plain words never sit in this public repo.
Usage:  printf 'w example\\ns stem\\n' | python3 tools/hash_words.py >> data/profanity-hashes.txt
Each input line is "<mode> <word>": w = reject when a whole name token equals it, s = reject when it appears
anywhere inside the name (spaces removed). Output lines are "<mode> <sha256 of the lowercase word>".
The character-picker name check (app-preview/names.js, written by tools/build.py) uses these hashes."""
import hashlib, sys
for line in sys.stdin:
    line = line.strip()
    if not line or line.startswith("#"): continue
    mode, word = line.split(None, 1)
    if mode not in ("w", "s"): sys.exit(f"bad mode: {line!r}")
    print(mode, hashlib.sha256(word.strip().lower().encode()).hexdigest())
