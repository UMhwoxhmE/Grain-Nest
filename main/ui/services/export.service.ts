/**
 * Export Service
 * Handles SVG/DXF/JSON export functionality for nesting results
 * Manages file save dialogs, format conversion, and file writing
 */

import type {
  UIConfig,
  DeepNestInstance,
  SelectableNestingResult,
  Part,
  SvgParserInstance,
} from "../types/index.js";
import { DEFAULT_CONVERSION_SERVER } from "../types/index.js";
import { message } from "../utils/ui-helpers.js";
import { foldReflectionTransform } from "../utils/dom-utils.js";
import { toSvgUnits } from "../utils/conversion.js";

/**
 * File filter options for the save dialog
 */
interface FileFilter {
  name: string;
  extensions: string[];
}

/**
 * Save dialog options
 */
interface SaveDialogOptions {
  title: string;
  filters: FileFilter[];
}

/**
 * Dialog interface for Electron's dialog module
 */
interface ElectronDialog {
  showSaveDialogSync(options: SaveDialogOptions): string | undefined;
}

/**
 * Remote interface for Electron's remote module
 */
interface ElectronRemote {
  getGlobal(name: string): string | undefined;
}

/**
 * File system interface for Node.js fs module
 */
interface FileSystem {
  writeFileSync(path: string, data: string): void;
}

/**
 * Axios-like HTTP client interface
 */
interface HttpClient {
  post(
    url: string,
    data: Buffer,
    options: { headers: Record<string, string>; responseType: string },
  ): Promise<{ data: string }>;
}

/**
 * FormData-like interface for file upload
 */
interface FormDataLike {
  append(
    name: string,
    value: Buffer | string,
    options?: { filename?: string; contentType?: string },
  ): void;
  getBuffer(): Buffer;
  getHeaders(): Record<string, string>;
}

/**
 * FormData constructor interface
 */
interface FormDataConstructor {
  new (): FormDataLike;
}

/**
 * Config getter interface
 */
interface ConfigGetter {
  getSync<K extends keyof UIConfig>(
    key?: K,
  ): K extends keyof UIConfig ? UIConfig[K] : UIConfig;
}

/**
 * Placement within a sheet (matches index.d.ts SheetPlacement)
 */
interface PartPlacement {
  id: number;
  filename: string;
  source: number;
  x: number;
  y: number;
  rotation: number;
}

/**
 * Sheet with placements (matches NestingResult.placements structure)
 */
interface SheetGroup {
  sheet: number;
  sheetid: number;
  sheetplacements: PartPlacement[];
}

/**
 * Export button element interface
 */
interface ExportButtonElement extends HTMLElement {
  className: string;
}

/**
 * Export options for SVG generation
 */
export interface ExportOptions {
  /** Whether this export is for DXF conversion (affects scaling) */
  forDxfConversion?: boolean;
}

/**
 * Export file formats
 */
export type ExportFormat = "svg" | "dxf" | "json" | "cutlist";

/**
 * File filters for export dialogs
 */
const SVG_FILE_FILTERS: FileFilter[] = [{ name: "SVG", extensions: ["svg"] }];

const DXF_FILE_FILTERS: FileFilter[] = [
  { name: "DXF/DWG", extensions: ["dxf", "dwg"] },
];

const CUTLIST_FILE_FILTERS: FileFilter[] = [
  { name: "Text", extensions: ["txt"] },
];

/**
 * Export Service class
 * Handles export operations for nesting results to various formats
 * Follows the pattern from main/deepnest.js ES6 class structure
 */
export class ExportService {
  /** Electron dialog for file save dialogs */
  private dialog: ElectronDialog | null = null;

  /** Electron remote for accessing global variables */
  private remote: ElectronRemote | null = null;

  /** Node.js file system module */
  private fs: FileSystem | null = null;

  /** HTTP client for conversion requests */
  private httpClient: HttpClient | null = null;

  /** FormData constructor for file upload */
  private FormData: FormDataConstructor | null = null;

  /** Configuration getter */
  private config: ConfigGetter | null = null;

  /** DeepNest instance for accessing parts and nests */
  private deepNest: DeepNestInstance | null = null;

  /** SvgParser instance for line merging operations */
  private svgParser: SvgParserInstance | null = null;

  /** Export button element for spinner state */
  private exportButton: ExportButtonElement | null = null;

  /** Flag to track if export is busy */
  private isExporting = false;

  /**
   * Create a new ExportService instance
   * Dependencies are injected for testability
   */
  constructor(options?: {
    dialog?: ElectronDialog;
    remote?: ElectronRemote;
    fs?: FileSystem;
    httpClient?: HttpClient;
    FormData?: FormDataConstructor;
    config?: ConfigGetter;
    deepNest?: DeepNestInstance;
    svgParser?: SvgParserInstance;
    exportButton?: ExportButtonElement;
  }) {
    if (options) {
      this.dialog = options.dialog || null;
      this.remote = options.remote || null;
      this.fs = options.fs || null;
      this.httpClient = options.httpClient || null;
      this.FormData = options.FormData || null;
      this.config = options.config || null;
      this.deepNest = options.deepNest || null;
      this.svgParser = options.svgParser || null;
      this.exportButton = options.exportButton || null;
    }
  }

  /**
   * Set the dialog module for file save dialogs
   * @param dialog - Electron dialog module
   */
  setDialog(dialog: ElectronDialog): void {
    this.dialog = dialog;
  }

  /**
   * Set the remote module for accessing globals
   * @param remote - Electron remote module
   */
  setRemote(remote: ElectronRemote): void {
    this.remote = remote;
  }

  /**
   * Set the file system module
   * @param fs - Node.js fs module
   */
  setFileSystem(fs: FileSystem): void {
    this.fs = fs;
  }

  /**
   * Set the HTTP client for conversion requests
   * @param httpClient - HTTP client (e.g., axios)
   */
  setHttpClient(httpClient: HttpClient): void {
    this.httpClient = httpClient;
  }

  /**
   * Set the FormData constructor
   * @param FormData - FormData constructor
   */
  setFormDataConstructor(FormData: FormDataConstructor): void {
    this.FormData = FormData;
  }

  /**
   * Set the configuration getter
   * @param config - Configuration object with getSync method
   */
  setConfig(config: ConfigGetter): void {
    this.config = config;
  }

  /**
   * Set the DeepNest instance
   * @param deepNest - DeepNest instance for accessing parts and nests
   */
  setDeepNest(deepNest: DeepNestInstance): void {
    this.deepNest = deepNest;
  }

  /**
   * Set the SvgParser instance for line merging operations
   * @param svgParser - SvgParser instance
   */
  setSvgParser(svgParser: SvgParserInstance): void {
    this.svgParser = svgParser;
  }

  /**
   * Set the export button element for spinner state
   * @param button - Export button element
   */
  setExportButton(button: ExportButtonElement): void {
    this.exportButton = button;
  }

  /**
   * Get the conversion server URL from config or use default
   * @returns Conversion server URL
   */
  private getConversionServerUrl(): string {
    if (!this.config) {
      return DEFAULT_CONVERSION_SERVER;
    }

    const configUrl = this.config.getSync("conversionServer");
    return configUrl || DEFAULT_CONVERSION_SERVER;
  }

  /**
   * Get the currently selected nesting result
   * @returns Selected nesting result or null if none selected
   */
  private getSelectedNest(): SelectableNestingResult | null {
    if (!this.deepNest) {
      return null;
    }

    const selected = this.deepNest.nests.filter((n) => n.selected);
    if (selected.length === 0) {
      return null;
    }

    return selected[selected.length - 1];
  }

  /**
   * Show the export button as loading
   */
  private setExportLoading(loading: boolean): void {
    if (this.exportButton) {
      if (loading) {
        this.exportButton.className = "button export spinner";
      } else {
        this.exportButton.className = "button export";
      }
    }
  }

  /**
   * Export the selected nest result to JSON file
   * Saves to the NEST_DIRECTORY as exports.json
   * @returns True if export was successful
   */
  exportToJson(): boolean {
    if (!this.remote || !this.fs || !this.deepNest) {
      return false;
    }

    const nestDirectory = this.remote.getGlobal("NEST_DIRECTORY");
    if (!nestDirectory) {
      return false;
    }

    const filePath = nestDirectory + "exports.json";

    const selected = this.getSelectedNest();
    if (!selected) {
      return false;
    }

    const fileData = JSON.stringify(selected);
    this.fs.writeFileSync(filePath, fileData);

    return true;
  }

  /**
   * §9.3.7: show save dialog and write a plain-text cut-list summary
   * (pieces with counts + per-sheet stats + total fabric length) for
   * the currently-selected nest. Plain text so it's universally
   * openable and printable.
   */
  exportToCutList(): boolean {
    if (!this.dialog || !this.fs || !this.deepNest) {
      message("Export dependencies not available", true);
      return false;
    }
    const selected = this.getSelectedNest();
    if (!selected) {
      message("Select a nest result before exporting the cut list.", true);
      return false;
    }
    let fileName = this.dialog.showSaveDialogSync({
      title: "Export Grain-Nest cut list",
      filters: CUTLIST_FILE_FILTERS,
    });
    if (fileName === undefined) return false;
    if (!fileName.toLowerCase().endsWith(".txt")) fileName += ".txt";
    const text = this.buildCutListText(selected);
    this.fs.writeFileSync(fileName, text);
    return true;
  }

  /**
   * §9.3.7: build the plain-text cut-list summary. Pure function over
   * the nest result + current deepNest.parts + current units config.
   * No side effects.
   */
  buildCutListText(nestResult: SelectableNestingResult): string {
    if (!this.deepNest || !this.config) {
      return "";
    }
    const parts = this.deepNest.parts;
    const cfg = this.config.getSync() as unknown as UIConfig;
    const units = cfg.units;
    const scale = cfg.scale || 72;

    // Convert SVG units → user units (mm or inch). scale = SVG units
    // per inch, so dividing by scale gives inches; *25.4 for mm.
    const toUserUnits = (svgUnits: number): number =>
      units === "mm" ? (svgUnits / scale) * 25.4 : svgUnits / scale;

    // Format helper: mm shown to 0 decimals, inch to 1.
    const fmtLen = (svgUnits: number): string => {
      const v = toUserUnits(svgUnits);
      if (units === "mm") {
        // For metric, prefer m for anything ≥1000mm so a long bolt
        // doesn't read "3450 mm".
        if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(2)} m`;
        return `${v.toFixed(0)} mm`;
      }
      return `${v.toFixed(1)} in`;
    };

    // ---- Pieces section: group placements by filename, count
    // total and how many are mirrored (either part.mirror=true OR
    // it's a mirror-copy part). Sheets excluded.
    const pieceGroups = new Map<string, { total: number; mirrored: number }>();
    const sheetGroups = nestResult.placements;
    for (const sg of sheetGroups) {
      for (const placement of sg.sheetplacements) {
        const part = parts[placement.source];
        if (!part || part.sheet) continue;
        // §9.3.12: itemise by piece name when set (front, back, …) so
        // multiple pieces from one SVG don't merge under the filename.
        const name =
          part.name || part.filename || `(piece ${placement.source + 1})`;
        const entry = pieceGroups.get(name) ?? {
          total: 0,
          mirrored: 0,
        };
        entry.total += 1;
        if (part.mirror || part.isMirrorCopy) entry.mirrored += 1;
        pieceGroups.set(name, entry);
      }
    }

    // §9.3.10: pick the length axis from the project's warp direction.
    // Warp horizontal (default) → length is the horizontal extent;
    // warp vertical → length is the vertical extent. The OTHER axis
    // is the bolt-width direction.
    const isWarpHorizontal = this.deepNest.warpDirection !== "vertical";

    // ---- Per-sheet stats. For each sheet, compute the bounding box
    // extent of placed pieces along the length axis ("length used").
    // §9.0.1 R6-A: the EXACT rotation-aware placed bounds (shared
    // DeepNest.placedBounds), measured from the sheet's own origin. The old
    // unrotated `p.x + bounds.width` shortcut disagreed with the nest-view
    // stat and with reality (testing round 6) — and the clamp below used to
    // mask the overshoot ("160.0 of 160.0").
    const sheetStats = sheetGroups.map((sg, i) => {
      const sheetPart = parts[sg.sheet];
      const sheetW = sheetPart ? sheetPart.bounds.width : 0;
      const sheetH = sheetPart ? sheetPart.bounds.height : 0;
      const lengthSpec = isWarpHorizontal ? sheetW : sheetH;
      const boltWidthSpec = isWarpHorizontal ? sheetH : sheetW;
      const sheetOrigin = sheetPart
        ? isWarpHorizontal
          ? sheetPart.bounds.x
          : sheetPart.bounds.y
        : 0;
      let lengthUsed = 0;
      for (const p of sg.sheetplacements) {
        const part = parts[p.source];
        if (!part || part.sheet) continue;
        const pb = this.deepNest!.placedBounds(part, p);
        if (!pb) continue;
        const placedEnd = isWarpHorizontal
          ? pb.x + pb.width - sheetOrigin
          : pb.y + pb.height - sheetOrigin;
        if (placedEnd > lengthUsed) lengthUsed = placedEnd;
      }
      // Don't allow length-used to overshoot the sheet (rounding
      // safety — placement coords are sometimes slightly off the
      // last pixel).
      if (lengthUsed > lengthSpec) lengthUsed = lengthSpec;
      return {
        index: i + 1,
        boltWidthSvg: boltWidthSpec,
        lengthSpecSvg: lengthSpec,
        lengthUsedSvg: lengthUsed,
        utilisation: nestResult.utilisation, // shared across the nest;
        // per-sheet utilisation isn't tracked separately yet
        piecesPlaced: sg.sheetplacements.filter((p) => !parts[p.source]?.sheet)
          .length,
      };
    });

    const lines: string[] = [];
    lines.push("Grain-Nest cut list");
    lines.push(
      `Generated: ${new Date().toISOString().replace("T", " ").substring(0, 19)}`,
    );
    lines.push("=".repeat(42));
    lines.push("");
    lines.push("PIECES");
    if (pieceGroups.size === 0) {
      lines.push("  (none placed)");
    } else {
      // Sort by filename for stable output.
      const sorted = Array.from(pieceGroups.entries()).sort((a, b) =>
        a[0].localeCompare(b[0]),
      );
      // §9.3.7 (testing round 2): list mirrored pieces on their own
      // line rather than as a "(N mirrored)" suffix — clearer when
      // checking off a cut layout. e.g. a piece cut 2 + 1 reversed reads
      //   sleeve.svg                    ×2
      //   sleeve.svg (mirrored)         ×1
      for (const [name, info] of sorted) {
        const normal = info.total - info.mirrored;
        if (normal > 0) {
          lines.push(`  ${name.padEnd(30)}×${normal}`);
        }
        if (info.mirrored > 0) {
          lines.push(`  ${`${name} (mirrored)`.padEnd(30)}×${info.mirrored}`);
        }
      }
    }
    lines.push("");

    for (const s of sheetStats) {
      // Always display "bolt-width × length-specified" regardless of
      // warp direction — the order tracks the physical fabric (bolt
      // width is the fixed manufactured dimension; length is what
      // you're buying yardage of).
      lines.push(
        `SHEET ${s.index} of ${sheetStats.length}  ` +
          `(${fmtLen(s.boltWidthSvg)} wide × ${fmtLen(s.lengthSpecSvg)} long fabric)`,
      );
      lines.push(`  Pieces placed:   ${s.piecesPlaced}`);
      lines.push(
        `  Length used:     ${fmtLen(s.lengthUsedSvg)}  ` +
          `(of ${fmtLen(s.lengthSpecSvg)} specified)`,
      );
      // §9.0.1 R6-A: utilisation arrives already ×100 from the nest worker
      // (background.js stores e.g. 71.51, the nest view prints it raw); the
      // old `* 100` here printed "7151%" (testing round 6).
      lines.push(`  Utilisation:     ${s.utilisation.toFixed(2)}%`);
      lines.push("");
    }

    lines.push("TOTAL FABRIC NEEDED");
    let totalLengthSvg = 0;
    for (const s of sheetStats) {
      const areaUnits =
        units === "mm"
          ? ((s.boltWidthSvg / scale) *
              25.4 *
              ((s.lengthUsedSvg / scale) * 25.4)) /
            1_000_000 // mm² → m²
          : ((s.boltWidthSvg / scale) * (s.lengthUsedSvg / scale)) / 144; // in² → ft²
      const areaUnit = units === "mm" ? "m²" : "ft²";
      lines.push(
        `  Sheet ${s.index}: ${fmtLen(s.boltWidthSvg)} wide × ` +
          `${fmtLen(s.lengthUsedSvg)} long = ${areaUnits.toFixed(2)} ${areaUnit}`,
      );
      totalLengthSvg += s.lengthUsedSvg;
    }
    lines.push("");
    if (sheetStats.length > 1) {
      lines.push(
        `  Total length to buy (across all sheets): ${fmtLen(totalLengthSvg)}`,
      );
    } else if (sheetStats.length === 1) {
      lines.push(`  Total length to buy: ${fmtLen(totalLengthSvg)}`);
    }
    lines.push("");
    return lines.join("\n");
  }

  /**
   * Show save dialog and export to SVG
   * @returns True if export was successful
   */
  exportToSvg(): boolean {
    if (!this.dialog || !this.fs) {
      message("Export dependencies not available", true);
      return false;
    }

    let fileName = this.dialog.showSaveDialogSync({
      title: "Export deepnest SVG",
      filters: SVG_FILE_FILTERS,
    });

    if (fileName === undefined) {
      return false;
    }

    // Ensure .svg extension
    if (!fileName.toLowerCase().endsWith(".svg")) {
      fileName = fileName + ".svg";
    }

    const selected = this.getSelectedNest();
    if (!selected) {
      return false;
    }

    const svgContent = this.generateSvgExport(selected);
    this.fs.writeFileSync(fileName, svgContent);

    return true;
  }

  /**
   * Show save dialog and export to DXF via conversion server
   * @returns Promise that resolves to true if export was successful
   */
  async exportToDxf(): Promise<boolean> {
    if (!this.dialog || !this.fs || !this.httpClient || !this.FormData) {
      message("Export dependencies not available", true);
      return false;
    }

    let fileName = this.dialog.showSaveDialogSync({
      title: "Export deepnest DXF",
      filters: DXF_FILE_FILTERS,
    });

    if (fileName === undefined) {
      return false;
    }

    // Ensure .dxf or .dwg extension
    if (
      !fileName.toLowerCase().endsWith(".dxf") &&
      !fileName.toLowerCase().endsWith(".dwg")
    ) {
      fileName = fileName + ".dxf";
    }

    const selected = this.getSelectedNest();
    if (!selected) {
      return false;
    }

    const url = this.getConversionServerUrl();
    this.setExportLoading(true);

    try {
      // Generate SVG with DXF scaling
      const svgContent = this.generateSvgExport(selected, {
        forDxfConversion: true,
      });

      const formData = new this.FormData();
      formData.append("fileUpload", Buffer.from(svgContent), {
        filename: "deepnest.svg",
        contentType: "image/svg+xml",
      });
      formData.append("format", "dxf");

      const response = await this.httpClient.post(url, formData.getBuffer(), {
        headers: formData.getHeaders(),
        responseType: "text",
      });

      const body = response.data;

      // Check for error responses
      if (body.substring(0, 5) === "error") {
        message(body, true);
        return false;
      }

      if (body.includes('"error"') && body.includes('"error_id"')) {
        const jsonErr = JSON.parse(body) as { error_id: string };
        message(
          `There was an Error while converting: ${jsonErr.error_id}<br>Please use this code to open an issue on github.com/deepnest-next/deepnest`,
          true,
        );
        return false;
      }

      this.fs.writeFileSync(fileName, body);
      return true;
    } catch (err) {
      const error = err as { response?: { data: string }; message: string };
      const errorData = error.response?.data || error.message;

      if (
        typeof errorData === "string" &&
        errorData.includes('"error"') &&
        errorData.includes('"error_id"')
      ) {
        const jsonErr = JSON.parse(errorData) as { error_id: string };
        message(
          `There was an Error while converting: ${jsonErr.error_id}<br>Please use this code to open an issue on github.com/deepnest-next/deepnest`,
          true,
        );
      } else {
        message(
          `Could not contact file conversion server: ${JSON.stringify(err)}<br>Please use this code to open an issue on github.com/deepnest-next/deepnest`,
          true,
        );
      }
      return false;
    } finally {
      this.setExportLoading(false);
    }
  }

  /**
   * Generate SVG content from a nesting result
   * Core function that builds the SVG document from placements
   * @param nestResult - The nesting result to export
   * @param options - Export options
   * @returns SVG content as string
   */
  generateSvgExport(
    nestResult: SelectableNestingResult,
    options: ExportOptions = {},
  ): string {
    if (!this.deepNest || !this.config) {
      throw new Error("DeepNest or config not available");
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    let svgWidth = 0;
    let svgHeight = 0;
    let sheetNumber = 0;

    // §9.3.9: sew lines are collected here during the placement loop and
    // drawn after applyLineMerging (see below), so they bypass the
    // flatten/split/merge/recolor pass that would otherwise strip their
    // style and force them black + solid.
    const sewJobs: Array<{
      part: Part;
      placement: { x: number; y: number; rotation: number; id: number | string };
      offsetX: number;
      offsetY: number;
    }> = [];

    const parts = this.deepNest.parts;
    const exportWithSheetBoundaries = !!this.config.getSync(
      "exportWithSheetBoundboarders",
    );
    const exportWithSheetsSpace = !!this.config.getSync(
      "exportWithSheetsSpace",
    );
    const exportWithSheetsSpaceValue =
      this.config.getSync("exportWithSheetsSpaceValue") || 0;

    // Process each sheet placement
    (nestResult.placements as SheetGroup[]).forEach((s) => {
      sheetNumber++;

      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      svg.appendChild(group);

      // Add sheet boundary if configured
      if (exportWithSheetBoundaries) {
        this.addSheetBoundary(group, parts[s.sheet]);
      }

      const sheetBounds = parts[s.sheet].bounds;

      // Position the group
      group.setAttribute(
        "transform",
        `translate(${-sheetBounds.x} ${svgHeight - sheetBounds.y})`,
      );

      // Track maximum width
      if (svgWidth < sheetBounds.width) {
        svgWidth = sheetBounds.width;
      }

      // Add each part placement
      s.sheetplacements.forEach((p) => {
        const part = parts[p.source];
        const partGroup = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "g",
        );

        // Clone the given SVG elements from the part into a parent.
        const appendElements = (
          parent: Element,
          elements: SVGElement[],
        ): void => {
          elements.forEach((e) => {
            const node = e.cloneNode(false) as Element;

            // Handle image elements with relative paths
            if (node.tagName === "image") {
              const relPath = node.getAttribute("data-href");
              if (relPath) {
                node.setAttribute("href", relPath);
              }
              node.removeAttribute("data-href");
            }

            parent.appendChild(node);
          });
        };

        // §9.3.2 b3 / phase-5y: a cut-on-fold piece draws its visible cut
        // OUTLINE separately, from the seamless doubled polygontree
        // (appendFoldOutline, below) — so the fold edge no longer renders as
        // an internal seam where the two halves used to meet. The partGroup
        // then carries only the piece's interior MARKS (drill dots, notches,
        // grain): every svgelement EXCEPT the root outline, which getParts
        // pushes first. They're drawn once here and once reflected so the
        // marks land on both halves. Non-fold pieces are unchanged — their
        // full svgelements (outline included) are drawn as before.
        const isFold = !!(part.cutOnFold && part.foldLine);
        const bodyElements = isFold
          ? part.svgelements.slice(1)
          : part.svgelements;
        appendElements(partGroup, bodyElements);

        if (isFold && part.foldLine) {
          const foldGroup = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g",
          );
          foldGroup.setAttribute(
            "transform",
            foldReflectionTransform(part.foldLine),
          );
          appendElements(foldGroup, bodyElements);
          partGroup.appendChild(foldGroup);
        }

        group.appendChild(partGroup);

        // Position and rotate the part. SVG transforms compose
        // right-to-left, so the rightmost transform applies first in
        // the piece's local frame: mirror first (if any), then rotate,
        // then translate to the sheet position.
        // §9.3.2: when part.mirror is true, append a `scale(-1, 1)`
        // about the bounds-centre vertical axis as the last (innermost)
        // transform.
        let transform = `translate(${p.x} ${p.y}) rotate(${p.rotation})`;
        if (part.mirror) {
          const cx = part.bounds.x + part.bounds.width / 2;
          transform += ` translate(${2 * cx} 0) scale(-1 1)`;
        }
        partGroup.setAttribute("transform", transform);
        partGroup.setAttribute("id", String(p.id));

        // §9.3.2 b3 / phase-5y: draw the seamless doubled cut outline for a
        // cut-on-fold piece from its baked polygontree (already fold- AND
        // mirror-baked, exactly like the sew line below), positioned by the
        // placement translate+rotate only — never the render-time mirror /
        // fold reflection partGroup gets. This is the single unioned outline
        // that replaces the two halves meeting at the fold seam.
        if (isFold) {
          this.appendFoldOutline(group, part, p);
        }

        // §9.3.9: record this piece's sew line; it's drawn after
        // line-merging (below). polygontree is already mirror/fold-baked,
        // so it needs only the sheet offset + the placement translate+
        // rotate, never the mirror/fold transforms applied to partGroup.
        sewJobs.push({
          part,
          placement: p,
          offsetX: -sheetBounds.x,
          offsetY: svgHeight - sheetBounds.y,
        });
      });

      // Update height for next sheet
      svgHeight += sheetBounds.height;

      // Add spacing between sheets (except after last sheet)
      if (
        exportWithSheetsSpace &&
        sheetNumber < (nestResult.placements as SheetGroup[]).length
      ) {
        svgHeight += exportWithSheetsSpaceValue;
      }
    });

    // §9.3.8: append the calibration box (and its label) if enabled.
    // Returns the new extents the SVG must accommodate so the box
    // doesn't get clipped by applyDimensions's viewBox computation.
    const boxExtents = this.appendCalibrationBox(svg);
    if (boxExtents.right > svgWidth) svgWidth = boxExtents.right;
    if (boxExtents.bottom > svgHeight) svgHeight = boxExtents.bottom;

    // Calculate final dimensions with scaling
    this.applyDimensions(svg, svgWidth, svgHeight, options);

    // Apply line merging if configured
    this.applyLineMerging(svg, nestResult);

    // §9.3.9: draw sew lines now — AFTER line-merging — so they bypass its
    // flatten/split/merge/recolor pass (which strips group styles and forces
    // every path black + solid). Positioned by sheet offset + placement,
    // matching where each piece was drawn.
    sewJobs.forEach((job) => {
      this.appendSewLineLayer(
        svg,
        job.part,
        job.placement,
        job.offsetX,
        job.offsetY,
      );
    });

    // §9.3.12 / phase-5v: draw piece-name labels last (after line-merging, like
    // the sew lines) so the text isn't swept into the recolor/merge pass.
    // Reuses the per-placement jobs collected during the placement loop.
    sewJobs.forEach((job) => {
      this.appendPieceNameLabel(
        svg,
        job.part,
        job.placement,
        job.offsetX,
        job.offsetY,
      );
    });

    return new XMLSerializer().serializeToString(svg);
  }

  /**
   * §9.3.2 b3 / phase-5y: draw a cut-on-fold piece's seamless doubled cut
   * outline from its baked `polygontree` (the half reflected across the fold
   * line and unioned — see deepnest.js foldPart). Drawing the union as a
   * single path means the fold edge, now interior to the doubled shape, is
   * never stroked: the export shows the one "open-out" outline you actually
   * cut, not two half-outlines meeting at a seam.
   *
   * Coordinate frame matches appendSewLineLayer: `polygontree` is already
   * fold- AND mirror-baked, so the group composes only the placement
   * translate+rotate (its parent per-sheet group supplies the sheet offset),
   * never the render-time `scale(-1 1)` / fold reflection the svgelements
   * partGroup gets. Appended before applyLineMerging, so when merging is on it
   * is flattened/recoloured into the cut lines like every other outline; the
   * explicit style only takes effect when merging is off.
   */
  private appendFoldOutline(
    parent: Element,
    part: Part,
    placement: { x: number; y: number; rotation: number },
  ): void {
    if (!part.polygontree || part.polygontree.length < 3) return;

    const style = "fill:none;stroke:#000000;stroke-width:1";
    const group = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    group.setAttribute("class", "grainnest-foldoutline");

    const appendRing = (ring: { x: number; y: number }[]): void => {
      if (!ring || ring.length < 3) return;
      let d = `M ${ring[0].x} ${ring[0].y}`;
      for (let i = 1; i < ring.length; i++) {
        d += ` L ${ring[i].x} ${ring[i].y}`;
      }
      d += " Z";
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute("d", d);
      path.setAttribute("style", style);
      group.appendChild(path);
    };

    // Outer ring plus any genuine holes. (For a non-sheet dressmaking piece
    // phase-5u already empties polygontree.children, so this is normally just
    // the one outer ring — but draw children defensively if present.)
    appendRing(part.polygontree);
    (part.polygontree.children || []).forEach(appendRing);

    group.setAttribute(
      "transform",
      `translate(${placement.x} ${placement.y}) rotate(${placement.rotation})`,
    );
    parent.appendChild(group);
  }

  /**
   * §9.3.9: draw a piece's sew line (seam allowance) onto `svgRoot` as its
   * own dashed layer — the nesting polygon (`polygontree`) inset inward by
   * the allowance. Called AFTER applyLineMerging, so it sidesteps the
   * flatten/split/merge/recolor pass that would strip its style (the cut
   * lines and grain marks have already been merged/recoloured by then).
   *
   * Coordinate frame: `polygontree` is in the piece's baked frame — already
   * mirrored for mirrored pieces and already doubled for cut-on-fold — so
   * the sew group composes only the sheet offset and the placement
   * translate+rotate, never the `scale(-1 1)` mirror / fold reflection the
   * `svgelements` partGroup gets. That reproduces exactly where the polygon
   * was nested, which is where the cut outline lands too.
   */
  private appendSewLineLayer(
    svgRoot: Element,
    part: Part,
    placement: { x: number; y: number; rotation: number; id: number | string },
    offsetX: number,
    offsetY: number,
  ): void {
    if (!this.deepNest || !this.config) return;
    const mm = part.seamAllowance;
    if (!mm || mm <= 0 || !part.polygontree) return;

    const scale = Number(this.config.getSync("scale")) || 72;
    const svgUnits = toSvgUnits(mm, scale, "mm");
    if (!(svgUnits > 0)) return;

    // Negative offset insets the polygon toward its interior.
    const insets = this.deepNest.polygonOffset(part.polygontree, -svgUnits);
    if (!insets || insets.length === 0) {
      console.warn(
        `[grainnest] sew line: ${mm}mm allowance collapses piece ` +
          `${String(placement.id)} — skipped`,
      );
      return;
    }

    const sewStyle =
      "fill:none;stroke:#d6336c;stroke-width:1;stroke-dasharray:6 3";
    const sewGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    sewGroup.setAttribute("class", "grainnest-sewline");
    sewGroup.setAttribute("data-grainnest-sewline", "1");
    sewGroup.setAttribute("id", `sew-${String(placement.id)}`);
    sewGroup.setAttribute("style", sewStyle);

    insets.forEach((ring) => {
      if (!ring || ring.length < 3) return;
      let d = `M ${ring[0].x} ${ring[0].y}`;
      for (let i = 1; i < ring.length; i++) {
        d += ` L ${ring[i].x} ${ring[i].y}`;
      }
      d += " Z";
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute("d", d);
      path.setAttribute("style", sewStyle);
      sewGroup.appendChild(path);
    });

    sewGroup.setAttribute(
      "transform",
      `translate(${offsetX} ${offsetY}) translate(${placement.x} ${placement.y}) rotate(${placement.rotation})`,
    );
    svgRoot.appendChild(sewGroup);
  }

  /**
   * §9.3.12 / phase-5v: draw a placed piece's name as an upright `<text>`
   * centred on the piece, so the exported nest is self-labelling (testing round
   * 5). Called AFTER applyLineMerging, like the sew line, so it sidesteps the
   * flatten/recolor pass.
   *
   * Position: the centre of `part.bounds` (the mirror/fold-baked polygon
   * bounds) transformed to sheet coordinates by the same offset + placement
   * translate+rotate the sew line uses — but we compute the final point and
   * leave the text unrotated, so it reads upright on pieces nested at any angle.
   * Name = `part.name` (+ " (mirrored)" for a mirrored piece, matching the
   * cut-list). Unnamed pieces get no label.
   */
  private appendPieceNameLabel(
    svgRoot: Element,
    part: Part,
    placement: { x: number; y: number; rotation: number; id: number | string },
    offsetX: number,
    offsetY: number,
  ): void {
    if (!part.polygontree || !part.bounds) return;
    let label = (part.name || "").trim();
    if (!label) return;
    if (part.mirror || part.isMirrorCopy) label += " (mirrored)";

    const cx = part.bounds.x + part.bounds.width / 2;
    const cy = part.bounds.y + part.bounds.height / 2;
    const rad = (placement.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const x = offsetX + placement.x + cx * cos - cy * sin;
    const y = offsetY + placement.y + cx * sin + cy * cos;

    // Readable but not overwhelming: proportional to the piece, clamped.
    const fontSize = Math.max(
      24,
      Math.min(60, Math.min(part.bounds.width, part.bounds.height) * 0.15),
    );

    const text = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    text.setAttribute("x", String(x));
    text.setAttribute("y", String(y));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("class", "grainnest-piecename");
    text.setAttribute("data-grainnest-piecename", "1");
    // White halo (paint-order:stroke) keeps the black text legible over the
    // piece's hatching and grain marks.
    text.setAttribute(
      "style",
      `font-family:sans-serif;font-size:${fontSize}px;fill:#111111;` +
        `paint-order:stroke;stroke:#ffffff;stroke-width:${fontSize * 0.12};` +
        `stroke-linejoin:round`,
    );
    text.textContent = label;
    svgRoot.appendChild(text);
  }

  /**
   * §9.3.8: append a calibration rectangle (and a one-line label) to
   * the export SVG so the user can verify print/projection scale with
   * a ruler. Reads `exportScalingBox` and `exportScalingBoxSizeInches`
   * from config; no-op when the toggle is off.
   *
   * Returns the bottom-right SVG-unit corner of whatever was added so
   * the caller can grow the export viewBox to include it. Returns
   * {right:0, bottom:0} if nothing was added.
   *
   * Box position: top-left of the export viewport with a half-inch
   * margin. Fixed position keeps v1 simple; configurable position
   * would need a UI control and isn't worth the complexity yet.
   */
  private appendCalibrationBox(svg: SVGElement): {
    right: number;
    bottom: number;
  } {
    if (!this.config) return { right: 0, bottom: 0 };
    const enabled = !!this.config.getSync("exportScalingBox");
    if (!enabled) return { right: 0, bottom: 0 };

    // Pull scale = SVG units per inch (whatever the user has it set
    // to). Default 72 means a 4-inch box is 288 SVG units wide.
    const cfg = this.config.getSync() as unknown as UIConfig;
    const scale = cfg.scale || 72;
    const sizeIn = cfg.exportScalingBoxSizeInches || 4;
    const sizeSvg = scale * sizeIn;
    const marginSvg = scale * 0.5;
    const labelHeightSvg = scale * 0.2;

    // Box: stroked rect at (margin, margin). No fill so it doesn't
    // print solid ink and obscure anything if it overlaps a piece.
    // `vector-effect="non-scaling-stroke"` keeps the stroke at its
    // configured pixel width regardless of viewer zoom — without it,
    // a 0.72-SVG-unit stroke disappears in any browser preview that
    // fits-to-page (reported 2026-05-19 round-1 testing). Stroke is
    // also bumped from scale*0.01 to scale*0.02 so even printing
    // pipelines that drop vector-effect still produce a visible box.
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(marginSvg));
    rect.setAttribute("y", String(marginSvg));
    rect.setAttribute("width", String(sizeSvg));
    rect.setAttribute("height", String(sizeSvg));
    rect.setAttribute("fill", "none");
    rect.setAttribute("stroke", "#000");
    rect.setAttribute("stroke-width", String(scale * 0.02));
    rect.setAttribute("vector-effect", "non-scaling-stroke");
    svg.appendChild(rect);

    // Label below the box. Always in inches (the unit the size is
    // measured in) so the printed reference number always matches
    // the actual box even if the user's display units differ.
    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    label.setAttribute("x", String(marginSvg));
    label.setAttribute(
      "y",
      String(marginSvg + sizeSvg + labelHeightSvg + scale * 0.05),
    );
    label.setAttribute("font-size", String(labelHeightSvg));
    label.setAttribute("font-family", "sans-serif");
    label.setAttribute("fill", "#000");
    label.textContent = `${sizeIn}in calibration — measure to check scale`;
    svg.appendChild(label);

    return {
      right: marginSvg + sizeSvg,
      bottom: marginSvg + sizeSvg + labelHeightSvg * 2,
    };
  }

  /**
   * Add sheet boundary to a group
   * @param group - SVG group element
   * @param sheetPart - Part representing the sheet
   */
  private addSheetBoundary(group: SVGGElement, sheetPart: Part): void {
    sheetPart.svgelements.forEach((e) => {
      const node = e.cloneNode(false) as SVGElement;
      node.setAttribute("stroke", "#00ff00");
      node.setAttribute("fill", "none");
      group.appendChild(node);
    });
  }

  /**
   * Apply dimensions and viewBox to the SVG element
   * @param svg - SVG element
   * @param width - Content width in SVG units
   * @param height - Content height in SVG units
   * @param options - Export options
   */
  private applyDimensions(
    svg: SVGSVGElement,
    width: number,
    height: number,
    options: ExportOptions,
  ): void {
    if (!this.config) {
      return;
    }

    let scale = this.config.getSync("scale");

    // Apply DXF export scale if converting to DXF
    if (options.forDxfConversion) {
      const dxfExportScale = Number(this.config.getSync("dxfExportScale")) || 1;
      scale /= dxfExportScale;
    }

    // Convert scale based on units
    const units = this.config.getSync("units");
    if (units === "mm") {
      scale /= 25.4;
    }

    // Set dimensions with unit suffix
    const unitSuffix = units === "inch" ? "in" : "mm";
    svg.setAttribute("width", `${width / scale}${unitSuffix}`);
    svg.setAttribute("height", `${height / scale}${unitSuffix}`);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  /**
   * Apply line merging optimization if configured
   * @param svg - SVG element
   * @param nestResult - Nesting result with merged length info
   */
  private applyLineMerging(
    svg: SVGSVGElement,
    nestResult: SelectableNestingResult,
  ): void {
    if (!this.config || !this.svgParser) {
      return;
    }

    const mergeLines = this.config.getSync("mergeLines");
    const mergedLength = (nestResult as unknown as { mergedLength?: number })
      .mergedLength;

    if (mergeLines && mergedLength && mergedLength > 0) {
      const curveTolerance = this.config.getSync("curveTolerance");

      // Apply SVG processing for line optimization
      this.svgParser.applyTransform(svg);
      this.svgParser.flatten(svg);
      this.svgParser.splitLines(svg);
      this.svgParser.mergeOverlap(svg, 0.1 * curveTolerance);
      this.svgParser.mergeLines(svg);

      // Set stroke and fill for all non-group, non-image elements
      const elements = Array.prototype.slice.call(svg.children) as Element[];
      elements.forEach((e) => {
        if (e.tagName !== "g" && e.tagName !== "image") {
          e.setAttribute("fill", "none");
          e.setAttribute("stroke", "#000000");
        }
      });
    }
  }

  /**
   * Export to the specified format
   * @param format - Export format (svg, dxf, or json)
   * @returns Promise that resolves to true if export was successful
   */
  async export(format: ExportFormat): Promise<boolean> {
    if (this.isExporting) {
      return false;
    }

    this.isExporting = true;

    try {
      switch (format) {
        case "svg":
          return this.exportToSvg();
        case "dxf":
          return await this.exportToDxf();
        case "json":
          return this.exportToJson();
        case "cutlist":
          return this.exportToCutList();
        default:
          message(`Unsupported export format: ${format}`, true);
          return false;
      }
    } finally {
      this.isExporting = false;
    }
  }

  /**
   * Check if export is currently in progress
   * @returns True if exporting
   */
  isExportInProgress(): boolean {
    return this.isExporting;
  }

  /**
   * Check if there is a selected nest result available for export
   * @returns True if a nest result is selected
   */
  hasSelectedNest(): boolean {
    return this.getSelectedNest() !== null;
  }

  /**
   * Get supported export formats
   * @returns Array of supported format strings
   */
  static getSupportedFormats(): ExportFormat[] {
    return ["svg", "dxf", "json", "cutlist"];
  }

  /**
   * Get file filters for a specific format
   * @param format - Export format
   * @returns Array of file filters
   */
  static getFileFilters(format: ExportFormat): FileFilter[] {
    switch (format) {
      case "svg":
        return [...SVG_FILE_FILTERS];
      case "dxf":
        return [...DXF_FILE_FILTERS];
      case "cutlist":
        return [...CUTLIST_FILE_FILTERS];
      default:
        return [];
    }
  }

  /**
   * Create and return a new ExportService instance
   * @param options - Optional configuration options
   * @returns New ExportService instance
   */
  static create(
    options?: ConstructorParameters<typeof ExportService>[0],
  ): ExportService {
    return new ExportService(options);
  }
}

/**
 * Factory function to create an export service
 * @param options - Optional configuration options
 * @returns New ExportService instance
 */
export function createExportService(
  options?: ConstructorParameters<typeof ExportService>[0],
): ExportService {
  return ExportService.create(options);
}
