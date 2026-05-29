#!/usr/bin/env python3
"""Generate Hermes Panel app icons from a deterministic SVG source.

The output intentionally mirrors the user's reference: glossy blue rounded
app tile, white horse mark, and small-size variants for Tauri/PWA packaging.
Only macOS built-in tooling is required (`sips` and `iconutil`).
"""

from __future__ import annotations

import os
import shutil
import struct
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DESKTOP_ICONS = ROOT / "packages/panel-desktop/src-tauri/icons"
WEB_ICONS = ROOT / "packages/panel-web/public/icons"
KIT = ROOT / "packages/panel-web/public/icons/hermes-panel"
SOURCE_DIR = ROOT / "packages/panel-web/public/icons/source"
TMP = ROOT / ".tmp/hermes-panel-icons"


def run(cmd: list[str]) -> None:
  subprocess.run(cmd, check=True)


def ensure_dirs() -> None:
  for path in [DESKTOP_ICONS, WEB_ICONS, KIT, SOURCE_DIR, TMP]:
    path.mkdir(parents=True, exist_ok=True)
  (DESKTOP_ICONS / "ios").mkdir(parents=True, exist_ok=True)


def horse_mark(fill: str = "#fff", stroke: str | None = None, line: bool = False) -> str:
  if line:
    style = f'fill="none" stroke="{stroke or fill}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"'
    return f"""
      <g {style}>
        <path d="M274 468c22-112 74-195 157-220 59-18 122 2 171 47 34 31 52 72 81 111 34-25 76-28 116-7 48 25 75 76 70 142-2 24-18 42-40 42-24 0-36-18-36-42 0-39-17-70-49-79-25-7-48 1-70 25"/>
        <path d="M356 406c47 63 112 100 200 101 70 1 130-20 177-58"/>
        <path d="M411 530c-45 35-65 61-82 103"/>
        <path d="M496 532v125"/>
        <path d="M661 523c19 42 49 78 92 111"/>
        <path d="M744 513c38 39 60 78 67 122"/>
        <path d="M313 309c-27-38-43-72-35-102 43 18 78 46 105 85"/>
        <path d="M310 305c-46 13-77 51-89 112"/>
      </g>
    """
  shadow = 'filter="url(#markShadow)"' if fill == "#fff" else ""
  return f"""
    <g {shadow}>
      <path d="M706 445c36-76 102-104 155-70 45 29 58 87 34 151" fill="none" stroke="{fill}" stroke-width="72" stroke-linecap="round" stroke-linejoin="round"/>
      <g fill="{fill}">
        <ellipse cx="548" cy="500" rx="226" ry="92" transform="rotate(-4 548 500)" />
        <path d="M398 470c-2-76-31-132-91-170-21-13-28-40-15-59 14-21 44-15 78 7 68 43 111 104 137 185 10 31-108 68-109 37z" />
        <path d="M309 251c-24-31-38-62-31-92 42 12 76 39 102 77 13 20-44 47-71 15z" />
        <path d="M300 284c-51 6-87 43-105 104-9 30 6 55 35 61 27 5 48-10 56-38 10-33 29-55 56-66 26-11-4-65-42-61z" />
        <path d="M384 546c-42 28-69 63-79 105-7 28 12 53 39 58 24 4 44-9 53-34 9-26 29-49 60-69 22-14 29-42 15-62-18-24-58-18-88 2z" />
        <path d="M478 534v137c0 30 20 50 48 50s48-20 48-50V530c0-28-20-46-48-46s-48 19-48 50z" />
        <path d="M651 530c24 53 56 94 96 126 24 20 55 15 70-9 14-22 7-48-16-68-31-26-55-57-72-96-13-30-43-41-68-29-24 12-33 44-10 76z" />
        <path d="M735 518c35 35 56 73 63 117 5 30 27 47 55 43 27-4 44-28 39-57-10-59-41-112-90-158-23-21-55-22-75-1-20 21-14 37 8 56z" />
      </g>
    </g>
  """


def svg_defs() -> str:
  return """
    <defs>
      <linearGradient id="blue" x1="252" y1="120" x2="820" y2="914" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#8bd0ff"/>
        <stop offset=".48" stop-color="#3d9cff"/>
        <stop offset="1" stop-color="#0f6ff1"/>
      </linearGradient>
      <linearGradient id="blueDeep" x1="220" y1="120" x2="820" y2="900" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#25395f"/>
        <stop offset=".55" stop-color="#10244a"/>
        <stop offset="1" stop-color="#07152d"/>
      </linearGradient>
      <linearGradient id="blueFlat" x1="180" y1="120" x2="844" y2="904" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#2f95ff"/>
        <stop offset="1" stop-color="#0969f2"/>
      </linearGradient>
      <filter id="tileShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="28" stdDeviation="34" flood-color="#0f4ea8" flood-opacity=".20"/>
      </filter>
      <filter id="markShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="14" stdDeviation="15" flood-color="#07499d" flood-opacity=".35"/>
        <feDropShadow dx="0" dy="-5" stdDeviation="9" flood-color="#ffffff" flood-opacity=".72"/>
      </filter>
      <filter id="innerGloss" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="2"/>
      </filter>
    </defs>
  """


def app_svg(kind: str) -> str:
  if kind == "dark":
    tile = '<rect x="118" y="118" width="788" height="788" rx="174" fill="url(#blueDeep)" filter="url(#tileShadow)"/>'
    ring = '<rect x="126" y="126" width="772" height="772" rx="166" fill="none" stroke="#ffffff" stroke-opacity=".08" stroke-width="10"/>'
    mark = horse_mark("#fff")
  elif kind == "contrast":
    tile = '<rect x="118" y="118" width="788" height="788" rx="174" fill="#0757ff" filter="url(#tileShadow)"/>'
    ring = '<rect x="126" y="126" width="772" height="772" rx="166" fill="none" stroke="#bdddff" stroke-opacity=".5" stroke-width="10"/>'
    mark = horse_mark("#fff")
  elif kind == "round":
    tile = '<circle cx="512" cy="512" r="394" fill="url(#blue)" filter="url(#tileShadow)"/>'
    ring = '<circle cx="512" cy="512" r="382" fill="none" stroke="#ffffff" stroke-opacity=".22" stroke-width="10"/>'
    mark = horse_mark("#fff")
  elif kind == "solid":
    tile = '<rect x="118" y="118" width="788" height="788" rx="154" fill="url(#blueFlat)"/>'
    ring = '<rect x="126" y="126" width="772" height="772" rx="146" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="8"/>'
    mark = horse_mark("#fff")
  elif kind == "line":
    tile = '<rect x="118" y="118" width="788" height="788" rx="154" fill="#ffffff" stroke="#1677ff" stroke-width="18"/>'
    ring = ""
    mark = horse_mark(stroke="#1677ff", line=True)
  else:
    tile = '<rect x="118" y="118" width="788" height="788" rx="174" fill="url(#blue)" filter="url(#tileShadow)"/>'
    ring = '<rect x="128" y="128" width="768" height="768" rx="164" fill="none" stroke="#ffffff" stroke-opacity=".25" stroke-width="9"/>'
    mark = horse_mark("#fff")
  gloss = ""
  if kind not in {"solid", "line"}:
    gloss = '<path d="M184 285c0-67 54-121 121-121h414c70 0 127 57 127 127v21c-111-40-231-52-360-36-133 17-235 13-302-4z" fill="#fff" opacity=".20" filter="url(#innerGloss)"/>'
  return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    {svg_defs()}
    <rect width="1024" height="1024" fill="none"/>
    {tile}
    {gloss}
    {ring}
    <g transform="translate(112 126) scale(.78)">{mark}</g>
  </svg>"""


def write_svg_assets() -> dict[str, Path]:
  variants = {
    "standard": "Hermes Panel standard icon",
    "dark": "Hermes Panel dark icon",
    "contrast": "Hermes Panel high contrast icon",
    "round": "Hermes Panel round icon",
    "solid": "Hermes Panel solid icon",
    "line": "Hermes Panel line icon",
  }
  out: dict[str, Path] = {}
  for name in variants:
    path = SOURCE_DIR / f"hermes-panel-{name}.svg"
    path.write_text(app_svg(name), encoding="utf-8")
    out[name] = path
  return out


def svg_to_png(svg: Path, png: Path) -> None:
  run(["sips", "-s", "format", "png", str(svg), "--out", str(png)])


def scale_png(src: Path, size: int, dst: Path) -> None:
  dst.parent.mkdir(parents=True, exist_ok=True)
  run(["sips", "-z", str(size), str(size), str(src), "--out", str(dst)])


def make_icns(base: Path) -> Path:
  iconset = TMP / "HermesPanel.iconset"
  if iconset.exists():
    shutil.rmtree(iconset)
  iconset.mkdir(parents=True)
  mapping = {
    "icon_16x16.png": 16,
    "icon_16x16@2x.png": 32,
    "icon_32x32.png": 32,
    "icon_32x32@2x.png": 64,
    "icon_128x128.png": 128,
    "icon_128x128@2x.png": 256,
    "icon_256x256.png": 256,
    "icon_256x256@2x.png": 512,
    "icon_512x512.png": 512,
    "icon_512x512@2x.png": 1024,
  }
  for filename, size in mapping.items():
    scale_png(base, size, iconset / filename)
  icns = DESKTOP_ICONS / "icon.icns"
  run(["iconutil", "-c", "icns", str(iconset), "-o", str(icns)])
  return icns


def make_ico(pngs: list[Path], dst: Path) -> None:
  entries: list[tuple[int, int, bytes]] = []
  for png in pngs:
    size = int(png.stem.split("x")[0])
    data = png.read_bytes()
    entries.append((size, size, data))
  header = struct.pack("<HHH", 0, 1, len(entries))
  offset = 6 + 16 * len(entries)
  directory = bytearray()
  payload = bytearray()
  for width, height, data in entries:
    directory.extend(struct.pack(
      "<BBBBHHII",
      0 if width >= 256 else width,
      0 if height >= 256 else height,
      0,
      0,
      1,
      32,
      len(data),
      offset,
    ))
    payload.extend(data)
    offset += len(data)
  dst.write_bytes(header + directory + payload)


def zip_kit() -> Path:
  archive = KIT / "hermes-panel-icon-kit.zip"
  if archive.exists():
    archive.unlink()
  run(["zip", "-qr", str(archive), "."],)
  return archive


def main() -> None:
  ensure_dirs()
  svg_paths = write_svg_assets()

  rendered: dict[str, Path] = {}
  for name, svg in svg_paths.items():
    png = KIT / f"hermes-panel-{name}-1024.png"
    svg_to_png(svg, png)
    rendered[name] = png

  standard = rendered["standard"]
  size_names = [1024, 512, 256, 128, 64, 48, 32, 16]
  for size in size_names:
    scale_png(standard, size, KIT / f"hermes-panel-{size}.png")

  # PWA / browser icons.
  for size in [16, 32, 48, 192, 512, 1024]:
    scale_png(standard, size, WEB_ICONS / f"icon-{size}.png")
  shutil.copy2(WEB_ICONS / "icon-32.png", WEB_ICONS / "favicon-32.png")
  shutil.copy2(WEB_ICONS / "icon-16.png", WEB_ICONS / "favicon-16.png")
  scale_png(standard, 180, WEB_ICONS / "apple-touch-icon.png")

  # Tauri desktop icons.
  shutil.copy2(standard, DESKTOP_ICONS / "icon.png")
  scale_png(standard, 32, DESKTOP_ICONS / "32x32.png")
  scale_png(standard, 128, DESKTOP_ICONS / "128x128.png")
  scale_png(standard, 256, DESKTOP_ICONS / "128x128@2x.png")

  windows_sizes = {
    "Square30x30Logo.png": 30,
    "Square44x44Logo.png": 44,
    "StoreLogo.png": 50,
    "Square71x71Logo.png": 71,
    "Square89x89Logo.png": 89,
    "Square107x107Logo.png": 107,
    "Square142x142Logo.png": 142,
    "Square150x150Logo.png": 150,
    "Square284x284Logo.png": 284,
    "Square310x310Logo.png": 310,
  }
  for filename, size in windows_sizes.items():
    scale_png(standard, size, DESKTOP_ICONS / filename)

  ios_sizes = {
    "AppIcon-20x20@1x.png": 20,
    "AppIcon-20x20@2x.png": 40,
    "AppIcon-20x20@2x-1.png": 40,
    "AppIcon-20x20@3x.png": 60,
    "AppIcon-29x29@1x.png": 29,
    "AppIcon-29x29@2x.png": 58,
    "AppIcon-29x29@2x-1.png": 58,
    "AppIcon-29x29@3x.png": 87,
    "AppIcon-40x40@1x.png": 40,
    "AppIcon-40x40@2x.png": 80,
    "AppIcon-40x40@2x-1.png": 80,
    "AppIcon-40x40@3x.png": 120,
    "AppIcon-60x60@2x.png": 120,
    "AppIcon-60x60@3x.png": 180,
    "AppIcon-76x76@1x.png": 76,
    "AppIcon-76x76@2x.png": 152,
    "AppIcon-83.5x83.5@2x.png": 167,
    "AppIcon-512@2x.png": 1024,
  }
  for filename, size in ios_sizes.items():
    scale_png(standard, size, DESKTOP_ICONS / "ios" / filename)

  icon_sizes = []
  for size in [16, 32, 48, 64, 128, 256]:
    path = TMP / f"{size}x{size}.png"
    scale_png(standard, size, path)
    icon_sizes.append(path)
  make_ico(icon_sizes, DESKTOP_ICONS / "icon.ico")
  make_icns(standard)

  # Keep download-friendly copies.
  shutil.copy2(DESKTOP_ICONS / "icon.icns", KIT / "hermes-panel-icon.icns")
  shutil.copy2(DESKTOP_ICONS / "icon.ico", KIT / "hermes-panel-icon.ico")

  cwd = os.getcwd()
  os.chdir(KIT)
  try:
    zip_kit()
  finally:
    os.chdir(cwd)

  print(f"Generated Hermes Panel icons in {KIT}")


if __name__ == "__main__":
  main()
