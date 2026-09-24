# Word list

The ranked server validates words against `words.txt` in this folder.

Run from the repository root:

```bash
npm run words:setup
```

That command downloads the public-domain ENABLE word-game lexicon, keeps alphabetic words from 3 through 16 letters, applies `words-allow.txt` and `words-block.txt`, and writes the final server dictionary here.

`words-dev.txt` is only the small fallback list used when a full dictionary has not been installed yet.

To use another lexicon later, replace `words.txt` with a newline-delimited list or set `WORD_LIST_PATH` to another file. This is useful if the project later licenses an official tournament lexicon.
