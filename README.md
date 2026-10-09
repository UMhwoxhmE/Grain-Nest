# Grain-Nest

Pattern nesting for dressmaking. Grain-Nest takes the pieces of a sewing
pattern (as an SVG file) and lays them out on fabric as tightly as it can,
keeping every piece on its grain line.

It's a Mac app (Apple Silicon), built on the open-source
[deepnest-next](https://github.com/deepnest-next/deepnest) nesting engine.

## What it does

- **Grain lines.** Finds each piece's grain line when you import (Seamly2D
  `class="grainline"`, Inkscape layers or ids containing `grain`), or you
  mark it by hand with two clicks. Each piece gets a grain rule: on grain,
  grain or flipped, bias, free or a custom tolerance.
- **Cut on fold** along the grain line drawn on the fold edge, or click
  **Mark fold** and then the fold edge in the preview.
- **Dressmaking pieces.** Cut on fold, mirrored pieces (in place or as a
  copy), a top end for each piece, nap (one-way fabric), and seam
  allowances with sew lines. Woven and knit projects have their own
  default seam allowance.
- **Fabrics and sheets.** Name each sheet and say which fabric it is for
  (main, lining, interfacing, fused…). **Nest for** picks the pieces for
  one fabric from the cut codes in their names (e.g. `C2M` = cut 2 main).
- **Results.** A list of the best layouts so far, sorted by fabric used.
  The SVG export is laid out like your pattern file — a layer per sheet,
  a named group per piece with its cutting, sew and grain lines and its
  name — with line colours and width from Settings, a sheet border and a
  calibration square, ready for projector cutting (e.g. Pattern
  Projector). There's a cut list too.
- **Projects.** Save and reopen everything as a `.gnp` file.

There's a full walkthrough in [docs/USAGE.md](docs/USAGE.md), and an
example pattern with its exported nest in [examples/](examples/).

## Install

Download `grain-nest-v<version>-macos-arm64.dmg` from the latest
[release](https://github.com/UMhwoxhmE/Grain-Nest/releases/latest), open it
and drag **Grain-Nest** onto **Applications**. The app isn't signed by
Apple, so the first time macOS may refuse to open it: right-click the app
→ **Open**, or **System Settings → Privacy & Security → Open Anyway**.

When a new version comes out, Grain-Nest says so when it starts.

## Build from source

See [BUILD.md](BUILD.md). In short, with Node.js 20+:

```sh
npm install
npm run build
npm start
```

`npm run dist` on a Mac makes `Grain-Nest.app`; `npm test` runs the
Playwright tests.

## Built on

Grain-Nest is a fork of
[deepnest-next](https://github.com/deepnest-next/deepnest), which grew out
of Jack Qiao's [SVGnest](https://github.com/Jack000/SVGnest) and
[Deepnest](https://github.com/Jack000/Deepnest) (via the Dogthemachine and
cmidgley forks). The nesting engine — the no-fit-polygon solver, the
genetic algorithm and the SVG import — comes from those projects;
Grain-Nest adds the grain and dressmaking features above.

## Licence

Open source, with the licences of the projects it's built on: mostly MIT,
with one module under the GNU GPL v3 and the geometry libraries under the
Boost Software License. See [LICENSE](LICENSE) and
[LICENSES.md](LICENSES.md).
