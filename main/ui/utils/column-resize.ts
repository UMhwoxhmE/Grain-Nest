/**
 * §9.0.1 / phase-5w: drag-to-resize the parts-list columns.
 *
 * v1.1.1: widths are remembered across launches, along with the
 * parts-panel width (see saveLayout / loadLayout). The original concern —
 * a saved bad layout with no way out — is answered by the "Reset layout"
 * button (resetLayout), which returns everything to the natural auto layout.
 * Until a column is first dragged (or with nothing saved) the table keeps its
 * natural auto layout.
 *
 * On the first drag we "freeze" — measure the current rendered column widths
 * into the <colgroup>, add `.cols-frozen` (→ table-layout:fixed, so the <col>
 * widths become authoritative), and set the table's explicit width to their sum
 * so widening a column grows the table (horizontal scroll via #partscroll)
 * rather than squeezing its neighbours. Subsequent drags just adjust widths.
 *
 * Self-contained vanilla DOM: the grips live in the static <thead>, which the
 * Ractive parts view doesn't re-render (only the <tbody> {{#each}} updates).
 */

const MIN_COL_PX = 28;
const LAYOUT_KEY = "grainnest.layout.v1";

/** Remembered layout: parts-panel width and column widths, in px. */
interface SavedLayout {
  partsWidth?: number;
  cols?: number[];
}

/** Read the remembered layout (empty when none, or storage unavailable). */
export function loadLayout(): SavedLayout {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    return raw ? (JSON.parse(raw) as SavedLayout) : {};
  } catch {
    return {};
  }
}

/** Merge `change` into the remembered layout. */
export function saveLayout(change: SavedLayout): void {
  try {
    localStorage.setItem(
      LAYOUT_KEY,
      JSON.stringify({ ...loadLayout(), ...change }),
    );
  } catch {
    // Storage unavailable: the layout just isn't remembered.
  }
}

/** Set by setupPartsColumnResize: returns the table to auto layout. */
let unfreezeColumns: (() => void) | null = null;

/**
 * "Reset layout": forget the remembered widths and return the parts panel
 * and its columns to the original layout.
 */
export function resetLayout(): void {
  try {
    localStorage.removeItem(LAYOUT_KEY);
  } catch {
    // nothing remembered to clear
  }
  if (unfreezeColumns) unfreezeColumns();
  const parts = document.getElementById("parts");
  if (parts) parts.style.width = "";
  window.dispatchEvent(new Event("resize"));
}

/**
 * Attach drag-to-resize handles to the parts-list table. Idempotent.
 * @param tableId - id of the table element (default "partslist")
 */
export function setupPartsColumnResize(tableId = "partslist"): void {
  const table = document.getElementById(tableId) as HTMLTableElement | null;
  if (!table) return;
  if (table.dataset.colResize === "1") return; // already wired

  const cols = Array.from(
    table.querySelectorAll<HTMLTableColElement>("colgroup > col"),
  );
  const ths = Array.from(
    table.querySelectorAll<HTMLTableCellElement>("thead th"),
  );
  if (cols.length === 0 || cols.length !== ths.length) return;

  table.dataset.colResize = "1";

  const widths: number[] = new Array<number>(cols.length).fill(0);
  let frozen = false;

  const applyWidths = (): void => {
    cols.forEach((col, i) => {
      col.style.width = `${widths[i]}px`;
    });
    table.style.width = `${widths.reduce((a, b) => a + b, 0)}px`;
  };

  // Capture the current auto-layout widths and switch to fixed layout, so the
  // first drag starts from exactly the layout the user sees (no visual jump).
  const freeze = (): void => {
    if (frozen) return;
    ths.forEach((th, i) => {
      widths[i] = Math.max(
        MIN_COL_PX,
        Math.round(th.getBoundingClientRect().width),
      );
    });
    applyWidths();
    table.classList.add("cols-frozen");
    frozen = true;
  };

  unfreezeColumns = (): void => {
    cols.forEach((col) => (col.style.width = ""));
    table.style.width = "";
    table.classList.remove("cols-frozen");
    frozen = false;
  };

  // Restore remembered widths (only if they still match the columns).
  const saved = loadLayout().cols;
  if (saved && saved.length === cols.length && saved.every((w) => w > 0)) {
    saved.forEach((w, i) => (widths[i] = Math.max(MIN_COL_PX, w)));
    applyWidths();
    table.classList.add("cols-frozen");
    frozen = true;
  }

  ths.forEach((th, i) => {
    // v1.1.2: every column has a grip, the last one included (Grain
    // rule couldn't be widened when it was last). Widening grows the table;
    // #partscroll scrolls sideways.

    const grip = document.createElement("div");
    grip.className = "col-resizer";
    grip.title = "Drag to resize column";
    th.appendChild(grip);

    let startX = 0;
    let startW = 0;

    const onMove = (e: MouseEvent): void => {
      widths[i] = Math.max(MIN_COL_PX, startW + (e.clientX - startX));
      applyWidths();
    };
    const onUp = (): void => {
      grip.classList.remove("col-resizer-active");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      saveLayout({ cols: [...widths] });
    };

    grip.addEventListener("mousedown", (e: MouseEvent) => {
      e.preventDefault();
      // Don't let the drag start row-selection or the sidebar interact-resize.
      e.stopPropagation();
      freeze(); // first drag freezes the current (original) layout
      startX = e.clientX;
      startW = widths[i];
      grip.classList.add("col-resizer-active");
      document.body.style.cursor = "col-resize";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  });
}
