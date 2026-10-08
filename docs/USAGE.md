# Grain-Nest — usage guide

This is a guide for using **Grain-Nest** to lay out pattern pieces on
fabric. It assumes you've used **deepnest-next** (or the original
**Deepnest**) before — if you haven't, it might be worth opening one
of those first to get a feel for the basic nesting workflow, since
Grain-Nest is the same engine with grain-direction rules added.

If you haven't seen the parent project, the very short version is:

- You import an SVG of all the pattern pieces you want to cut.
- You define a "sheet" — the fabric area you've got to cut from.
- The app rearranges the pieces to fit the sheet using as little fabric
  as possible.

Grain-Nest's job on top of that is to make sure each piece's grain line
ends up parallel to the fabric warp.

## Opening the Mac app the first time

`Grain-Nest.app` (the disk image attached to each release on GitHub) is
**unsigned** — it hasn't been registered with Apple, because that costs
a yearly fee and this is a personal-use app. So the first time you open
it, macOS will say it can't check the app for malicious software and
won't open it on a plain double-click. You only have to get past this
once; after that it opens normally.

1. Download the **.dmg** from the release and double-click it. A window
   opens showing **Grain-Nest** next to an **Applications** folder: drag
   Grain-Nest onto Applications (choose **Replace** when updating), then
   eject the disk image. Keeping one Grain-Nest in Applications means
   your Dock icon keeps working after every update.
2. In Applications, **right-click** (or Control-click) **Grain-Nest** and
   choose **Open**. In the box that appears, click **Open** again.
3. If there's no **Open** button (newer macOS versions, Sequoia and
   later, removed it): click **Done**, then open **System Settings →
   Privacy & Security**, scroll down to the line saying *"Grain-Nest"
   was blocked*, click **Open Anyway**, and confirm with your password
   or Touch ID.

If macOS instead says the app **"is damaged and can't be opened"**,
open Terminal and run `xattr -cr /Applications/Grain-Nest.app`, then
try step 2 again. (That clears the "downloaded from the internet" tag
macOS put on it.)

## Quick start

1. **Launch the app** — double-click `Grain-Nest.app` (the very first
   time, see [Opening the Mac app the first time](#opening-the-mac-app-the-first-time)),
   or use the launcher described in the [README](../README.md).
2. Click **Import** at the top-left and pick an SVG of your pattern
   pieces. Seamly2D exports work directly.
3. Look at the **Grain rule** column in the parts list. For each piece,
   it should say one of:
    - **Lock to grain** — Grain-Nest detected a grain line in the SVG
      and knows the angle. You don't have to do anything; the piece
      will be placed with its grain horizontal.
    - **Free** — no grain line was detected. If the piece doesn't
      really have a grain (e.g. a small applique), leave it as
      **Free**. If it does, click **Mark grain** next to the dropdown
      and follow the on-screen instructions to define the grain by
      clicking two points.
4. Add a sheet. Use **Add Sheet** to enter dimensions of the fabric
   piece you're cutting from (in inches or mm — switch units in
   Settings if you need). Or import a separate SVG with just an
   outline and tick its **Sheet** box.
5. Click **Start nest**. Watch the GA improve the layout for as long
   as you like (a minute is usually plenty for a small pattern). Click
   **Stop nest** when you're happy.
6. Click **Export** → **SVG file** to save the cut layout (or **Cut list**
   for a text list of pieces and fabric length).

## Grain rules in detail

The dropdown next to each piece is what turns Grain-Nest into a
dressmaking tool rather than a generic CNC nester:

| Rule | What it means | When to use |
|---|---|---|
| **Lock to grain** | The piece will only be placed with its grain line parallel to fabric warp. | Default for most pieces — the pattern designer chose the grain direction for a reason. |
| **Grain or flipped** | Grain parallel to warp **or** rotated 180°. | Plain weaves with no nap, or when you want the engine more freedom to pack. |
| **Bias** | The piece is placed at 45° or 135° to the warp. | Bias-cut pieces (collars, bindings, some skirts). |
| **Free** | Any rotation. Same as the original deepnest behaviour. | Pieces with no real grain — small applique shapes, internal facings, etc. |
| **Custom tolerance** | Grain ±3°. | When the fabric is forgiving and you want the engine slight wiggle room to pack better. |

Detected grain lines and manually-marked ones behave identically once
they're set. The only difference is provenance.

## Marking a grain line manually

If a piece imported as **Free** but you want it locked to a grain
direction:

1. Click the **Mark grain** link next to the piece's dropdown.
2. A blue banner appears at the top of the window. The next two clicks
   on the canvas define the grain line.
3. Click two points along the grain direction: **the bottom end first,
   then the top end** (towards the top of the piece). That tells
   Grain-Nest which way up the piece goes as well as its angle — exact
   position doesn't matter.
   - **Hold Shift while clicking the second point** to snap the angle
     to the nearest of 0° / 45° / 90° / 135°. This is the easy way to
     get an exactly horizontal, vertical, or 45° grain without
     chasing the cursor.
4. The dropdown switches to **Lock to grain** and a dashed cyan line
   appears on the piece showing what was recorded.
5. If you mis-clicked, the link relabels to **Re-mark** — click it
   and click two new points to overwrite.
6. Press **Esc** at any point to cancel without changing anything.

## Which way up each piece goes (Flip top)

Pattern PDFs turn pieces every which way to fit the paper — some upside
down, some sideways, some at odd angles. A grain line alone doesn't say
which end of the piece is the top, so Grain-Nest has to guess.

The picture of each piece in the parts list shows it **standing
upright**, with its grain line running up and down and an **orange
arrow pointing at the top**. Go down the list once and look for any
piece that's upside down (neckline or sleeve cap at the bottom, and so
on), and click **Flip top** next to it. The picture turns over; that's
all there is to it. Odd angles (30°, 45°…) are handled for you — Flip top
only ever swaps top and bottom.

In the nest, **Lock to grain** lays every piece with its top towards the
**left** — the start of your fabric — so all pieces point the same way,
as if you'd turned them by hand before importing. (**Grain or flipped**
still lets a piece go either way when that saves fabric.)

- To flip several pieces at once, select them and click **Flip top** in
  the **Apply to selected** bar.
- A **mirror copy** keeps the same top as its original.
- Your flips are saved with the project (**Save project**), so you only
  do this once per pattern.
- Pieces without a grain line have no Flip top link — mark their grain
  first (bottom end, then top end, see above).

## Working with napped or directional fabrics

Some fabrics look different depending on which way you cut the
pieces:

- **Napped fabrics** (velvet, corduroy, brushed flannel, suede)
  catch light differently along the nap direction. Cut a piece
  upside-down and it'll show as a different shade in the finished
  garment.
- **Directional prints** (a floral whose flowers all point up, a
  print of rain falling) need every piece oriented the same way
  down the bolt, otherwise some flowers face up and others face
  down in the finished garment.

For these fabrics, tick the **Nap (directional)** checkbox at the
top of the parts panel before starting the nest. While the box is
ticked:

- Every piece is locked to grain at 0° **only** — the 180° flip
  that **Grain or flipped** and **Free** would normally allow is
  suppressed, so no piece can end up rotated end-for-end against
  the nap.
- Bias-cut pieces all use the same bias direction (+45°), not both
  diagonals.

When you save a project, the nap state is saved with it. Open the
project later and the box ticks itself back on automatically. For
ordinary plain weaves without nap, leave the box unchecked —
otherwise you'll lose some of the engine's flexibility to pack
pieces efficiently.

> Bias pieces under nap all use **+45°** by design — −45° isn't
> needed in practice, so there is no per-piece toggle. If you ever do need the opposite diagonal on
> one piece, **Mirror copy** it: the mirror flips bias direction.

## Adding a sheet with a preset fabric width

Click the **+** button at the bottom left of the parts list. The **Add a
sheet** box pops up in the middle of the window. Give the sheet a **Name**
and pick its **Fabric** (both optional, and editable later in the parts
list — see *Choosing which pieces go into a nest*). The **Preset width**
dropdown lists the most common usable bolt widths:

- 90 cm — interfacing and fused (picking **Interfacing** or **Fused** as
  the sheet's Fabric fills this in for you)
- 109 cm
- 137 cm
- 147 cm
- 157 cm
- 177 cm

(These are *usable* widths — i.e. the selvedge edge is already
excluded.)

Pick one and Grain-Nest fills in the **height** field automatically —
that's the bolt width (the fixed measurement off the roll). You fill
in the **width** with how much fabric length you want to try, then
click **Add**.

If your fabric isn't on the list, just type both numbers in by hand
and leave the dropdown at "(no preset)".

## How Grain-Nest reads the sheet

Grain-Nest treats your sheet as a length of fabric off the roll laid
out left-to-right: the **width** (horizontal) is the fabric length
you'd buy, and the **height** (vertical) is the bolt width (the fixed
measurement off the roll). Pieces set to **Lock to grain** are placed
grain-horizontal, parallel to that length — so the Cut list's "length
used" is the figure you take to the fabric shop.

(Earlier builds had a **Warp** dropdown to swap these two axes. It was
removed in favour of always laying fabric out this way — in practice
that's how you buy it, and the option caused more confusion than it
solved.)

## Checking the scale of a printed nest

Every SVG export now includes a small calibration square in the
top-left corner — a 4-inch box by default. After you print the nest
(or project it onto fabric), measure that box with a ruler:

- If it measures 4 inches: the print/projection is at the right
  scale and the rest of the pieces are too.
- If it's bigger or smaller: your printer's "fit to page" setting
  is on, or your projector hasn't been calibrated. Fix the scale
  setting and re-print/re-project rather than cut from the
  miscalibrated copy.

The box is on by default. To turn it off, or change its size, use
**Settings → Export → Calibration square**.

## Finding the minimum fabric length you need

Once a nest has run and you've picked a result, the nest-info bar
at the top of the nest view shows a **min fabric length** stat
alongside utilisation and sheets used. That number is the actual
fabric length the placed pieces consumed — i.e. the minimum length
you'd need to buy.

If you started with a generous sheet (say 5 m of fabric for a
project that only needed 2.65 m), the rest is wasted in the nest
result. To shrink the sheets down to the minimum, click **Trim
sheets** in the top-nav. The sheet rectangles in the parts table
visibly shrink, and the nest results clear. Click **Start nest**
to re-run at the trimmed sizes — utilisation should jump.

The trim button also tells you how many sheets it touched. If you
nested with multiple sheets, each gets trimmed independently to
its own min length.

## Exporting a cut list

Beyond the SVG of the nest itself, you can save a plain-text summary
of the cut: piece names with how many of each — mirrored copies are
listed on their own `(mirrored)` line — plus per-sheet stats and the
total fabric length you need to buy.

Piece names come from the **Name** column (see *Naming your pieces*
above); any piece you haven't named falls back to its filename, so an
SVG holding several un-named pieces will list them together under one
filename until you name them apart.

Click **Export → Cut list (text)** from the nest screen. Pick a
filename, save. Open the .txt in any editor — readable as-is, or
print it out so you've got the totals in your hand at the fabric
shop.

The "length used" per sheet is calculated from the actual placed
pieces, not the full sheet you defined — so if you specified 3m of
fabric but the nest only needed 2.65m, the cut list reports 2.65m
as the buy-this length.

## Saving and reopening a project

After you've imported pattern pieces, marked grains, set rules, and
maybe added sheets, you don't need to redo any of that next time.
Two buttons at the top of the parts panel handle saving and loading:

- **Save project** — opens a save dialog. Pick a folder and filename
  (defaults to `grain-nest-project.gnp`). The file extension is
  `.gnp` (Grain-Nest Project) — keep it as-is so Grain-Nest
  recognises the file later.
- **Open project** — opens a file picker. Choose any `.gnp` file. The
  current workspace is cleared and the saved one loaded in its
  place. Parts come back with their grain rules, manual grain
  markings, mirror states, and sheets all intact. Any nest results
  from before saving also come back, although re-running the nest is
  usually faster than restoring stale results if you've changed
  anything.

The `.gnp` file is **self-contained** — it embeds the full content of
every imported SVG. You can move the file between machines or share
it without also having to ship the original Seamly2D source files. If
you later edit the original SVG and want those changes in the
project, just re-import that one piece (the project file's copy
won't auto-update).

A few small things that **aren't yet** in the saved file: which tab
was active, the zoom level on each import, dark-mode toggle, which
nest was selected. The next time we touch this feature we can fold
any of these in if it would actually save you clicks.

## Mirroring a piece

Two small **Mirror** links sit next to each piece's **Grain rule**
dropdown.

- **Mirror** — flips the piece left-to-right in place (the standard
  "cut 1 reversed" interpretation). The thumbnail flips immediately
  and the dropdown link relabels to **Unmirror**, so you can undo
  with the same button. If the piece had a grain direction, the grain
  is mirrored along with the geometry, so **Lock to grain** still
  works correctly after a flip.
- **Mirror copy** — leaves the original alone and adds a new row to
  the parts table whose contents are the mirror image of the
  original. Quantity defaults to 1; edit it like any other piece.
  This is the typical "cut 1, cut 1 reversed" workflow.

The basic Mirror buttons don't double a piece for **cutting on the
fold** — that has its own control and its own section just below.

## Cut on the fold

**Cutting on the fold** is the technique where the pattern stores only
*half* of a symmetric piece. You lay that half with its straight fold
edge against a fold in the doubled-over fabric, cut around it, and
unfold to get the whole piece — a front bodice, say, that's the same on
the left and the right. The pattern holds half; the fabric you actually
cut is the full doubled shape.

That matters for nesting: Grain-Nest has to lay out the **whole doubled
piece**, not the half, or it would under-estimate the fabric you need.

To mark a piece as cut-on-fold:

1. In the parts list, click the **Cut on fold** link in the piece's row.
   It sits in the **Grain rule** cell next to the **Mirror** links.
2. The thumbnail doubles straight away: the half is reflected across its
   fold edge and joined to its mirror image to make the full piece. The
   link relabels to **Unfold**, so you undo it with the same click.
3. Nest as usual. Grain-Nest places the full doubled piece — so the
   fabric length it reports already accounts for the whole thing.

**Where the fold edge comes from.** By default Grain-Nest folds the
piece across its **grain line** — on a cut-on-fold piece the fold edge
and the grain line are normally the same straight edge, so folding
across the grain gives the right result. For that to work, the grain
has to be a straight line drawn *on* the fold edge (see the limits
below).

A few things to know (this is a first version):

- **The exported cut still shows the fold edge as a line.** In the SVG
  export the doubled piece is drawn as its two halves meeting at the
  fold, so the fold edge appears as a seam line down the centre. On a
  real cut-on-fold you **don't** cut the fold — so read that centre line
  as the fold itself, not a cutting line. Redrawing the doubled piece as
  one clean outline with no fold line is a planned improvement.
- **The grain line must be a straight line on the fold edge.** If the
  grain is a curve, or was marked by hand (a manual mark is drawn
  through the centre of the piece, not along an edge), Grain-Nest folds
  across the wrong line and the piece doubles the wrong way. Making the
  fold snap to a real edge however the grain is drawn is part of the
  same follow-up.
- **It's saved with the project.** The cut-on-fold state and the fold
  line are stored in the `.gnp` file, so a folded piece comes back
  folded when you reopen the project.

## Naming your pieces

The parts table has a **Name** column. When you import an SVG that was
labelled in Inkscape (Object Properties → Label, or a layer/group name),
Grain-Nest tries to fill the name in for you. Where it can't, the cell is
blank with the filename shown faintly behind it — just click and type a
name (front, back, sleeve, …).

Why it's worth doing: the **cut list** groups pieces by name, so naming
them turns the export into an itemised checklist — handy for confirming
you've got every piece before cutting. Names are saved with the project,
and a mirrored copy keeps its name (shown as "name (mirrored)" in the cut
list).

## Deleting pieces

Select the rows and click the bin button at the bottom left of the parts
list (or press Delete). Grain-Nest asks first, listing what will go.
Pressing Backspace or Delete while typing in a box (a name, quantity or
seam) never deletes rows.

## Arranging the parts list

- **Column widths:** drag the thin grip at the right edge of any column
  heading (the last one too). Boxes in the column (quantity, seam) shrink
  and grow with it.
- **Actions column:** each piece's **Flip top**, **Mirror**, **Mirror
  copy** and **Cut on fold** buttons sit in the last column. Clicking them
  (or any box or drop-down in a row) doesn't select the row — click
  elsewhere on the row to select it.
- **Panel width:** drag the right edge of the parts list to make it wider
  or narrower than the picture panel beside it.
- Grain-Nest **remembers** both the next time you open it. To go back to
  the original layout, click **Reset layout** at the bottom right of the
  parts list.

## Applying a change to several pieces at once

Below the parts table is a toolbar with an **Apply to selected** section. Select the rows you
want (click them, or use **Select all**), then:

- Pick a **grain rule** from the dropdown to set it on every selected
  piece at once — e.g. set a whole pattern to **Lock to grain** in one go.
- Click **Flip top** to turn the selected pieces end-to-end (see *Which
  way up each piece goes*).
- Click **Mirror** / **Unmirror** to flip the selected pieces together.
- Type a number and click **Set qty** to set the quantity on all of them.

After each of these, the pieces you changed are **unselected**, so the next
action can't catch them by mistake.

If nothing is selected, the bar will tell you to select some pieces first.

## Choosing which pieces go into a nest

Import every piece once, then choose what goes into each nest — main
fabric, lining, ribbing, interfacing — without deleting anything.

- **Nest column**: untick a piece to leave it out of the next nest. It
  stays in the list, greyed out; tick it again to bring it back.
- **Nest for** (top bar): picks the pieces for one fabric from the cut
  codes in their names (`C2M` = cut 2 main, `C1L` = cut 1 lining, `C2I` =
  interfacing, `C1R` = ribbing, `…OF` = on the fold):
  - **Main fabric** — pieces with a main (M) code, except fused ones.
  - **Fused (main + interfacing)** — pieces with the same number of main
    and interfacing (e.g. `C2M C2I`), for cutting from a bulk-fused block.
  - **Interfacing** — pieces with fewer interfacing than main (e.g.
    `C2M C1I`), interfacing-only pieces, and `INT` pieces.
  - **Lining** / **Ribbing** — pieces with an L / R code.
  - **All pieces** — everything, including pieces without codes.
  After picking, you can still tick or untick pieces by hand.
- **Hide excluded / Show excluded**: hides the unticked pieces so the list
  shows exactly what will be nested — handy for checking every mirror copy
  and fold piece is there.
- **Include / Exclude** (Apply to selected): tick or untick several pieces
  at once.

**Sheets for each fabric.** Each sheet (piece of fabric) has a **name**, a
**Fabric** drop-down (in the *Grain rule / Fabric* column: Main fabric,
Fused, Interfacing, Lining, Ribbing) and its own **Nest** tick box. When
you pick a job in **Nest for**, every sheet whose Fabric is that job is
ticked and the others are unticked — so the lining pieces nest on your
lining sheets only. One fabric can have several sheets (e.g. two lining
remnants); they're all ticked. If no sheet is set to that fabric, the
sheet ticks are left as they were and Grain-Nest tells you. **All pieces**
never changes the sheet ticks. Start nest won't run with every sheet
unticked.

Your ticks, the "Nest for" choice, and each sheet's name and fabric are
saved with the project. A mirror copy starts with the same tick as the
piece it was copied from.

## Sew lines (seam allowance)

A **sew line** is the line you stitch along, set in from the cut edge by the
**seam allowance** (the margin of fabric taken up inside the seam). Grain-Nest
can draw this line inside each piece on the exported layout, so the print or
projection shows where to stitch as well as where to cut.

1. In the parts list, type a value into the **Seam (mm)** box on a piece's
   row — e.g. `15` for a 1.5 cm allowance. Leave it blank (or `0`) for no sew
   line on that piece.
2. To set the same allowance on many pieces at once, select the rows and use
   the **Seam mm** box and **Set seam** button in the **Apply to selected**
   bar.
3. Nest as usual and **Export → SVG**. Each piece with an allowance gets a
   dashed magenta sew line drawn inside its cut outline, that far in.

New pieces get a default allowance: **12 mm for a woven project, 10 mm for
a knit** — pick **Woven** or **Knit** in the top bar (it's saved with the
project). Switching updates every piece still on the old default and leaves
any you've set by hand. Change the two defaults in **Settings → Seam
allowance**.

Notes:

- The allowance is entered in **millimetres** and is saved with the project,
  so it comes back when you reopen.
- It's **per piece**, so you can give a hem a wider allowance than the side
  seams.
- Notches and grain/fold marks are ignored — the sew line follows the piece's
  cut outline only.
- It currently insets *inward*, assuming the outline you drew is the
  **cutting** line. If you draw your patterns at the **stitching** line
  instead, an outward option may be added later.
- The sew line appears in the **exported** SVG, not (yet) in the on-screen
  parts thumbnail or nest preview.

## Common things that go wrong

- **The dashed grain line looks slightly off after marking.** That's
  fine — what's stored is the *angle*, drawn through the centre of the
  piece for visualization. The engine cares about the angle, not the
  drawn position. If the angle looks wrong, click Re-mark.
- **A piece comes in as Free and shouldn't.** Either the grain line in
  the SVG didn't match any of the patterns Grain-Nest looks for
  (Seamly2D's grainline class, an Inkscape grain layer, an `id`
  containing "grain"), or there isn't one at all. Use Mark grain.
- **Nest output looks worse than free-rotation.** That's expected.
  Constraining grain reduces the engine's options, so utilization
  typically drops 5–10% vs. unconstrained. That's the cost of cutting
  fabric correctly.
- **Some pieces are placed but rotated wrong.** Check the dropdown —
  if it says **Bias** or **Grain or flipped** that explains it.

## Known issue — detected grain doesn't always auto-lock

When you import an SVG with a grain line that Grain-Nest recognises,
two things should happen:

1. A dashed cyan line gets drawn on the piece — the **visual cue**.
   This is working.
2. The **Grain rule** column for that piece shows **Lock to grain**
   — this is the bit that's still flaky.

**Watch out for**: a dashed cyan line on a piece *but* the dropdown
still saying **Free**. That means the visual is misleading — the
piece will *not* be constrained when you start the nest, so it'll
rotate freely and you'll end up cutting against the grain. For a
fabric with nap (velvet, corduroy) or a directional weave, that
would ruin the cut.

**Workaround** (5 seconds per piece): click **Mark grain** next to
the affected row, then click any two points roughly along the
visible dashed line. The dropdown flips to **Lock to grain** and the
piece nests correctly. Manual marking is independent of detection
and is reliable.

**What's been fixed and what hasn't.** As of Phase 5f, the fix
covers the most common case (grain lines exported by Inkscape as
`<path>` elements, and the same for `<polyline>` / `<polygon>`).
The simpler `<line>` case may
still be affected — if you hit it, set `deepnest_debug=1` before
launching to capture diagnostic information that helps us pinpoint
the cause. (In Terminal: `deepnest_debug=1 npm start`.)

## Settings

The **Settings** page (gear icon) has:

- **Nesting** — display units; **space between pieces**; **packing
  style** (*Gravity* pushes pieces towards one end and usually uses the
  least fabric length).
- **Seam allowance** — the woven and knit defaults (above).
- **Export** — draw the **sheet border** (on by default — handy for
  lining up a projector); a **gap between sheets** when a nest uses
  several; the **calibration square** and its size.
- **Advanced** (folded away) — curve and endpoint tolerances, rotations
  for *Free* pieces, the scale for SVG files without units, and two
  tuning knobs for the layout search. You shouldn't normally need these.

Grain-Nest imports **SVG files only**.

## Things this version doesn't do (yet)

- **Pattern matching** (stripes / plaids).
- **Long piece names** can spill over small pieces in the exported SVG.
- **Tighter nests.** The layout search could sometimes pack pieces more
  tightly; the "best nests so far" list (least fabric first) helps you
  pick the tightest one meanwhile.
- **Grain lines in the export.** The exported SVG includes the dashed
  grain lines as decoration; an option to leave them out would tidy the
  output.
- **Grain tolerance setting.** The "Custom tolerance" rule is fixed at
  ±3°.

## Where else to look

- [README](../README.md) — overview, install and building from source.
