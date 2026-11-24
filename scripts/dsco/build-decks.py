"""Turn the DSCO lecture decks (.pptx) into web-ready slides — no LibreOffice needed.

Usage:
  python3 -I scripts/dsco/build-decks.py <folder with "Module N" subfolders>

Writes
  public/dsco/decks/<lecture>.json   positioned slide layout (text boxes, images, tables, shapes) for the browser
  public/dsco/slides/<lecture>/*.webp every image on the slides (EMF wrappers are unpacked to their bitmap)
  lib/dsco/syllabus.json             module -> lecture -> slide text, used by the tutor's prompt

Coordinates in the deck JSON are fractions of the slide width (x, w) and height (y, h);
font sizes are fractions of the slide height so the slide scales cleanly.
"""
import io, json, re, struct, sys, zipfile, posixpath
import xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
A, P, R = (f"{{{NS[k]}}}" for k in ("a", "p", "r"))
ROOT = Path(__file__).resolve().parents[2]

TITLES = {
    "1. Lecture 1_Logic gates_SOP_POS": "Logic gates, SOP & POS",
    "1A. Lecture 2_Lab_Introduction to Verilog": "Introduction to Verilog",
    "2. Lecture 3_KMap": "Karnaugh maps",
    "3. Lecture 4_KMapManipulation_Mulitlevel NAND and NOR": "K-map manipulation & multilevel NAND/NOR",
    "5. Lecture 7-12_ Arithmetic Circuits": "Arithmetic circuits",
    "6. Lecture 13-15_Multiplexers_Decoders_Encoders": "Multiplexers, decoders & encoders",
    "6A. Lecture 16-18_Verilog-Combinational ciruits": "Verilog for combinational circuits",
    "7. Lecture 19,20_Synchronous Sequential Circuits-FFs": "Flip-flops & sequential circuits",
    "8.Lecture 21_Registers, SR, Ripple, ud, ring and Johnson counters": "Registers, shift registers & ripple counters",
    "8A. Lecture 22,23 _Verilog-Sequential": "Verilog for sequential circuits",
    "9. Lecture 24,25_Design of Synchronous sequential circuit": "Designing synchronous sequential circuits",
    "10. Lecture 26-28_Synchronous counters": "Synchronous counters",
    "11. Lecture 29_ Instruction Set Architecture": "Instruction set architecture",
    "12. Lecture 30_Instruction Sequencing": "Instruction sequencing",
    "13. Lecture 31-33_ Addressing modes": "Addressing modes",
    "14. Lecture 34-36_Multiplication_Division": "Multiplication & division",
    "15. Lecture 37,38_Floating Point Representation": "Floating-point representation",
    "16. Lecture 39-41_Hardwired Control Unit": "Hardwired control unit",
    "17. Lecture 42-45_Microprogrammed Control Unit": "Microprogrammed control unit",
    "18. Lecture 46,47_Cache Memory": "Cache memory",
    "19. Lecture 48": "Memory & I/O organisation",
    "IO_Interrupts_Pipelining": "I/O, interrupts & pipelining",
    "SharedMemory_Cache Coherance": "Shared memory & cache coherence",
    "Vector Processing": "Vector processing",
}
MODULES = {
    1: "Logic gates, K-maps & Verilog", 2: "Arithmetic circuits", 3: "Combinational circuits",
    4: "Sequential circuits & counters", 5: "Instruction set architecture", 6: "Computer arithmetic",
    7: "Control unit design", 8: "Cache memory", 9: "I/O, pipelining & multiprocessors",
}
M9_ORDER = {"19. Lecture 48": 0, "IO_Interrupts_Pipelining": 1, "SharedMemory_Cache Coherance": 2, "Vector Processing": 3}

# Office default theme, used when a deck's theme colour can't be resolved.
DEFAULT_THEME = {"dk1": "000000", "lt1": "FFFFFF", "dk2": "44546A", "lt2": "E7E6E6", "accent1": "4472C4", "accent2": "ED7D31",
                 "accent3": "A5A5A5", "accent4": "FFC000", "accent5": "5B9BD5", "accent6": "70AD47", "hlink": "0563C1", "folHlink": "954F72"}
CLR_MAP = {"tx1": "dk1", "bg1": "lt1", "tx2": "dk2", "bg2": "lt2"}


def order_key(stem):
    m = re.match(r"(\d+)([A-Z]?)", stem)
    return (int(m.group(1)), m.group(2)) if m else (999, stem)


def rels_of(z, part):
    d, f = posixpath.split(part)
    path = posixpath.join(d, "_rels", f + ".rels")
    if path not in z.namelist():
        return {}
    out = {}
    for r in ET.fromstring(z.read(path)):
        tgt = r.get("Target")
        out[r.get("Id")] = (r.get("Type", "").rsplit("/", 1)[-1], tgt if r.get("TargetMode") == "External" else posixpath.normpath(posixpath.join(d, tgt)))
    return out


def emf_to_image(b):
    """The decks' EMFs each hold a single EMR_STRETCHDIBITS bitmap; unpack it."""
    off = 0
    while off + 8 <= len(b):
        t, sz = struct.unpack_from("<II", b, off)
        if sz < 8:
            break
        if t == 81:  # EMR_STRETCHDIBITS
            offBmi, cbBmi, offBits, cbBits = struct.unpack_from("<IIII", b, off + 48)
            bmi = b[off + offBmi: off + offBmi + cbBmi]
            bits = b[off + offBits: off + offBits + cbBits]
            header = b"BM" + struct.pack("<IHHI", 14 + len(bmi) + len(bits), 0, 0, 14 + len(bmi))
            return Image.open(io.BytesIO(header + bmi + bits))
        off += sz
    return None


# PowerPoint draws symbols from the Wingdings / Symbol fonts using private-use code points
# (U+F0xx) that browsers can't show. Map the ones these decks use (and the common ones) to Unicode.
WINGDINGS = {0xDF: "←", 0xE0: "→", 0xE1: "↑", 0xE2: "↓", 0xE7: "⬅", 0xE8: "➔", 0xE9: "⬆", 0xEA: "⬇", 0xF0: "⇨",
             0xD8: "➢", 0xA7: "▪", 0x6E: "■", 0x6F: "□", 0x71: "❑", 0x75: "◆", 0x76: "❖", 0xFC: "✓", 0xFB: "✗", 0x9F: "•", 0x4A: "☺"}
SYMBOL = {0xAE: "→", 0xAC: "←", 0xAD: "↑", 0xAF: "↓", 0xDE: "⇒", 0xDC: "⇐", 0xDB: "⇔", 0xAB: "↔", 0xB4: "×", 0xB8: "÷",
          0xA3: "≤", 0xB3: "≥", 0xB9: "≠", 0xBB: "≈", 0xB1: "±", 0xD7: "⋅", 0xB7: "•", 0xA5: "∞", 0xD6: "√", 0xE5: "∑",
          0x61: "α", 0x62: "β", 0x67: "γ", 0x64: "δ", 0x44: "Δ", 0x6C: "λ", 0x6D: "μ", 0x70: "π", 0x73: "σ", 0x53: "Σ", 0x57: "Ω", 0xF0: "",
          0xD8: "¬", 0xD9: "∧", 0xDA: "∨", 0xC5: "⊕", 0xC4: "⊗"}

def fix_symbols(text, face):
    def one(ch):
        cp = ord(ch)
        if not (0xF000 <= cp <= 0xF0FF):
            return ch
        low = cp - 0xF000
        f = (face or "").lower()
        if "symbol" in f:
            return SYMBOL.get(low, chr(low) if low >= 0x20 else "")
        return WINGDINGS.get(low, SYMBOL.get(low, "•"))
    return "".join(one(c) for c in text)


class Deck:
    def __init__(self, path, lecture_id):
        self.z = zipfile.ZipFile(path)
        self.id = lecture_id
        self.out_dir = ROOT / "public/dsco/slides" / lecture_id
        self.out_dir.mkdir(parents=True, exist_ok=True)
        self.media = {}
        pres = ET.fromstring(self.z.read("ppt/presentation.xml"))
        sz = pres.find(f"{P}sldSz")
        self.cx, self.cy = int(sz.get("cx")), int(sz.get("cy"))
        self.pres_rels = rels_of(self.z, "ppt/presentation.xml")
        self.slides = [self.pres_rels[s.get(f"{R}id")][1] for s in pres.iter(f"{P}sldId")]
        self.theme = dict(DEFAULT_THEME)
        theme_part = next((t for k, t in self.pres_rels.values() if k == "theme"), None)
        if theme_part is None:
            master = next((t for k, t in self.pres_rels.values() if k == "slideMaster"), None)
            if master:
                theme_part = next((t for k, t in rels_of(self.z, master).values() if k == "theme"), None)
        if theme_part and theme_part in self.z.namelist():
            cs = ET.fromstring(self.z.read(theme_part)).find(f".//{A}clrScheme")
            if cs is not None:
                for c in cs:
                    name = c.tag.split("}")[1]
                    v = c.find(f"{A}srgbClr")
                    s = c.find(f"{A}sysClr")
                    if v is not None:
                        self.theme[name] = v.get("val")
                    elif s is not None:
                        self.theme[name] = s.get("lastClr", "000000")
        self.layout_cache = {}

    # ---------- colours ----------
    def color(self, node):
        if node is None:
            return None
        for c in node:
            tag = c.tag.split("}")[1]
            val = None
            if tag == "srgbClr":
                val = c.get("val")
            elif tag == "schemeClr":
                k = c.get("val")
                val = self.theme.get(CLR_MAP.get(k, k))
            elif tag == "prstClr":
                val = {"black": "000000", "white": "FFFFFF", "red": "FF0000", "blue": "0000FF", "green": "008000", "yellow": "FFFF00"}.get(c.get("val"), "000000")
            elif tag == "sysClr":
                val = c.get("lastClr", "000000")
            if val:
                lum = c.find(f"{A}lumMod")
                lo = c.find(f"{A}lumOff")
                if lum is not None or lo is not None:
                    r, g, b = (int(val[i:i + 2], 16) for i in (0, 2, 4))
                    m = int(lum.get("val")) / 100000 if lum is not None else 1
                    o = int(lo.get("val")) / 100000 * 255 if lo is not None else 0
                    val = "".join(f"{max(0, min(255, int(ch * m + o))):02X}" for ch in (r, g, b))
                return "#" + val
        return None

    # ---------- media ----------
    def image(self, part):
        if part in self.media:
            return self.media[part]
        name = None
        try:
            raw = self.z.read(part)
            ext = part.rsplit(".", 1)[-1].lower()
            img = emf_to_image(raw) if ext == "emf" else (None if ext in ("wmf", "wdp", "svg") else Image.open(io.BytesIO(raw)))
            if img is not None:
                if img.mode not in ("RGB", "RGBA"):
                    img = img.convert("RGBA")
                if img.width > 1400:
                    img = img.resize((1400, round(img.height * 1400 / img.width)), Image.LANCZOS)
                name = f"{len(self.media) + 1}.webp"
                img.save(self.out_dir / name, "WEBP", quality=82, method=6)
        except Exception as e:  # noqa: BLE001
            print("  image skipped", part, e)
        self.media[part] = name and f"/dsco/slides/{self.id}/{name}"
        return self.media[part]

    # ---------- placeholders ----------
    def placeholders(self, part):
        if part in self.layout_cache:
            return self.layout_cache[part]
        out = {}
        root = ET.fromstring(self.z.read(part))
        for sp in root.iter(f"{P}sp"):
            ph = sp.find(f"{P}nvSpPr/{P}nvPr/{P}ph")
            xf = sp.find(f"{P}spPr/{A}xfrm")
            if ph is None or xf is None:
                continue
            box = self.xfrm(xf)
            typ = ph.get("type", "body")
            out.setdefault(("type", "title" if typ == "ctrTitle" else typ), box)
            if ph.get("idx"):
                out.setdefault(("idx", ph.get("idx")), box)
        self.layout_cache[part] = out
        return out

    def ph_box(self, slide_rels, ph):
        typ = ph.get("type", "body")
        typ = "title" if typ == "ctrTitle" else typ
        layout = next((t for k, t in slide_rels.values() if k == "slideLayout"), None)
        chain = []
        if layout:
            chain.append(layout)
            master = next((t for k, t in rels_of(self.z, layout).values() if k == "slideMaster"), None)
            if master:
                chain.append(master)
        for part in chain:
            phs = self.placeholders(part)
            if ph.get("idx") and ("idx", ph.get("idx")) in phs and part == layout:
                return phs[("idx", ph.get("idx"))]
            if ("type", typ) in phs:
                return phs[("type", typ)]
        return None

    def xfrm(self, xf):
        off, ext = xf.find(f"{A}off"), xf.find(f"{A}ext")
        if off is None or ext is None:
            return None
        return [int(off.get("x")), int(off.get("y")), int(ext.get("cx")), int(ext.get("cy"))]

    # ---------- slide ----------
    def slide(self, part):
        root = ET.fromstring(self.z.read(part))
        rels = rels_of(self.z, part)
        items, texts = [], []
        bg = root.find(f"{P}cSld/{P}bg/{P}bgPr/{A}solidFill")
        bgc = self.color(bg)

        def place(box, tf):
            x, y, w, h = box
            x, y = tf(x, y)
            x2, y2 = tf(box[0] + w, box[1] + h)
            return [round(x / self.cx, 4), round(y / self.cy, 4), round((x2 - x) / self.cx, 4), round((y2 - y) / self.cy, 4)]

        def walk(tree, tf):
            for node in tree:
                tag = node.tag.split("}")[1]
                if tag == "grpSp":
                    xf = node.find(f"{P}grpSpPr/{A}xfrm")
                    sub = tf
                    if xf is not None and xf.find(f"{A}chOff") is not None:
                        ox, oy, ex, ey = self.xfrm(xf)
                        co, ce = xf.find(f"{A}chOff"), xf.find(f"{A}chExt")
                        cx0, cy0, cex, cey = int(co.get("x")), int(co.get("y")), int(ce.get("cx")) or 1, int(ce.get("cy")) or 1
                        sub = (lambda ox, oy, ex, ey, cx0, cy0, cex, cey, tf: lambda x, y: tf(ox + (x - cx0) * ex / cex, oy + (y - cy0) * ey / cey))(ox, oy, ex, ey, cx0, cy0, cex, cey, tf)
                    walk(node, sub)
                elif tag == "pic":
                    blip = node.find(f".//{A}blip")
                    xf = node.find(f"{P}spPr/{A}xfrm")
                    if blip is None or xf is None:
                        continue
                    rid = blip.get(f"{R}embed")
                    if rid not in rels:
                        continue
                    src = self.image(rels[rid][1])
                    if not src:
                        continue
                    it = {"t": "img", "box": place(self.xfrm(xf), tf), "src": src}
                    sr = node.find(f".//{A}srcRect")
                    if sr is not None and any(sr.get(k) for k in "ltrb"):
                        it["crop"] = [int(sr.get(k, 0)) / 100000 for k in "ltrb"]
                    items.append(it)
                elif tag in ("sp", "cxnSp"):
                    sppr = node.find(f"{P}spPr")
                    xf = sppr.find(f"{A}xfrm") if sppr is not None else None
                    ph = node.find(f".//{P}nvPr/{P}ph")
                    box = self.xfrm(xf) if xf is not None else (self.ph_box(rels, ph) if ph is not None else None)
                    if not box:
                        continue
                    geom = sppr.find(f"{A}prstGeom") if sppr is not None else None
                    g = geom.get("prst") if geom is not None else "rect"
                    fill = self.color(sppr.find(f"{A}solidFill")) if sppr is not None else None
                    ln = sppr.find(f"{A}ln") if sppr is not None else None
                    line = None
                    if ln is not None and ln.find(f"{A}noFill") is None:
                        line = self.color(ln.find(f"{A}solidFill"))
                    if line is None:
                        style_ln = node.find(f"{P}style/{A}lnRef")
                        if style_ln is not None and int(style_ln.get("idx", "0")) > 0 and (ln is None or ln.find(f"{A}noFill") is None):
                            line = self.color(style_ln)
                    if fill is None:
                        style_fill = node.find(f"{P}style/{A}fillRef")
                        if style_fill is not None and int(style_fill.get("idx", "0")) > 0 and (sppr is None or sppr.find(f"{A}noFill") is None):
                            fill = self.color(style_fill)
                    b = place(box, tf)
                    if tag == "cxnSp" or g in ("line", "straightConnector1", "bentConnector3", "curvedConnector3"):
                        flipH = xf is not None and xf.get("flipH") == "1"
                        flipV = xf is not None and xf.get("flipV") == "1"
                        head = ln is not None and (ln.find(f"{A}tailEnd") is not None and ln.find(f"{A}tailEnd").get("type", "none") != "none")
                        items.append({"t": "line", "box": b, "flipH": flipH, "flipV": flipV, "color": line or "#000000", "head": head})
                        continue
                    if fill or line:
                        items.append({"t": "shape", "box": b, "geom": g, "fill": fill, "line": line})
                    tx = node.find(f"{P}txBody")
                    if tx is not None:
                        para = self.paragraphs(tx, ph)
                        if para:
                            items.append({"t": "text", "box": b, "paras": para, "anchor": (tx.find(f"{A}bodyPr").get("anchor") if tx.find(f"{A}bodyPr") is not None else None) or ("ctr" if ph is not None and ph.get("type") in ("ctrTitle",) else "t")})
                            texts.extend(" ".join(r["text"] for r in p["runs"]) for p in para)
                elif tag == "graphicFrame":
                    tbl = node.find(f".//{A}tbl")
                    xf = node.find(f"{P}xfrm")
                    if tbl is None or xf is None:
                        continue
                    rows = []
                    for tr in tbl.findall(f"{A}tr"):
                        row = []
                        for tc in tr.findall(f"{A}tc"):
                            if tc.get("hMerge") == "1" or tc.get("vMerge") == "1":
                                row.append(None)
                                continue
                            t = fix_symbols(" ".join("".join(x.text or "" for x in p.iter(f"{A}t")) for p in tc.iter(f"{A}p")).strip(), None)
                            row.append({"text": t, "span": int(tc.get("gridSpan", "1")), "rows": int(tc.get("rowSpan", "1")), "fill": self.color(tc.find(f"{A}tcPr/{A}solidFill"))})
                        rows.append(row)
                    items.append({"t": "table", "box": place(self.xfrm(xf), tf), "rows": rows})
                    texts.extend(" | ".join(c["text"] for c in r if c) for r in rows)

        walk(root.find(f"{P}cSld/{P}spTree"), lambda x, y: (x, y))
        return {"bg": bgc, "items": items}, "\n".join(t for t in texts if t.strip())

    def paragraphs(self, tx, ph):
        body = tx.find(f"{A}bodyPr")
        scale = 1.0
        if body is not None:
            na = body.find(f"{A}normAutofit")
            if na is not None and na.get("fontScale"):
                scale = int(na.get("fontScale")) / 100000
        typ = ph.get("type", "body") if ph is not None else None
        out = []
        for p in tx.findall(f"{A}p"):
            ppr = p.find(f"{A}pPr")
            lvl = int(ppr.get("lvl", "0")) if ppr is not None else 0
            runs = []
            for r in p:
                tag = r.tag.split("}")[1]
                if tag not in ("r", "fld", "br"):
                    continue
                if tag == "br":
                    runs.append({"text": "\n"})
                    continue
                t = "".join(x.text or "" for x in r.iter(f"{A}t"))
                if not t:
                    continue
                rpr = r.find(f"{A}rPr")
                face = None
                if rpr is not None:
                    for tag in ("sym", "latin"):
                        e = rpr.find(f"{A}{tag}")
                        if e is not None and e.get("typeface") and e.get("typeface").lower() in ("wingdings", "wingdings 2", "wingdings 3", "symbol"):
                            face = e.get("typeface")
                            break
                t = fix_symbols(t, face)
                run = {"text": t}
                if rpr is not None:
                    if rpr.get("sz"):
                        run["sz"] = int(rpr.get("sz")) / 100
                    if rpr.get("b") == "1":
                        run["b"] = 1
                    if rpr.get("i") == "1":
                        run["i"] = 1
                    if rpr.get("u") not in (None, "none"):
                        run["u"] = 1
                    if rpr.get("baseline"):
                        run["sup" if int(rpr.get("baseline")) > 0 else "sub"] = 1
                    c = self.color(rpr.find(f"{A}solidFill"))
                    if c:
                        run["c"] = c
                runs.append(run)
            if not any(r["text"].strip() for r in runs):
                if out:
                    out.append({"runs": [], "gap": 1})
                continue
            default = 40 if typ in ("title", "ctrTitle") else (28 - 4 * min(lvl, 3) if typ in ("body", None) and ph is not None else 18)
            for r in runs:
                r["sz"] = round(r.get("sz", default) * scale, 1)
            para = {"runs": runs}
            if lvl:
                para["lvl"] = lvl
            if ppr is not None and ppr.get("algn") in ("ctr", "r", "just"):
                para["align"] = ppr.get("algn")
            no_bullet = ppr is not None and ppr.find(f"{A}buNone") is not None
            has_bullet = ppr is not None and (ppr.find(f"{A}buChar") is not None or ppr.find(f"{A}buAutoNum") is not None)
            if has_bullet or (ph is not None and typ in ("body", "obj") and not no_bullet) or (ph is not None and ph.get("type") is None and ph.get("idx") and not no_bullet):
                para["bullet"] = 1
            if typ in ("title", "ctrTitle"):
                para["title"] = 1
            out.append(para)
        while out and out[-1].get("gap"):
            out.pop()
        return out


def main(src):
    src = Path(src)
    modules = []
    (ROOT / "public/dsco/decks").mkdir(parents=True, exist_ok=True)
    for n in range(1, 10):
        decks = sorted([p for p in (src / f"Module {n}").glob("*.pptx") if not p.name.startswith("~$")], key=lambda p: order_key(p.stem))
        if n == 9:
            decks.sort(key=lambda p: M9_ORDER.get(p.stem, 9))
        lectures = []
        for i, path in enumerate(decks, 1):
            lid = f"m{n}-l{i}"
            deck = Deck(path, lid)
            slides, texts = [], []
            for k, part in enumerate(deck.slides, 1):
                layout, text = deck.slide(part)
                slides.append(layout)
                texts.append({"n": k, "text": text})
            title = TITLES.get(path.stem, path.stem)
            (ROOT / f"public/dsco/decks/{lid}.json").write_text(json.dumps({"id": lid, "title": title, "aspect": round(deck.cy / deck.cx, 4), "wpt": round(deck.cx / 12700), "slides": slides}, separators=(",", ":")))
            lectures.append({"id": lid, "title": title, "source": path.name, "slides": texts})
            print(lid, title, len(slides), "slides", len([m for m in deck.media.values() if m]), "images")
        modules.append({"number": n, "title": MODULES[n], "lectures": lectures})
    (ROOT / "lib/dsco/syllabus.json").write_text(json.dumps({"subject": "CSS 2104", "name": "Digital Systems & Computer Organization", "modules": modules}, ensure_ascii=False, indent=1))


main(sys.argv[1])
