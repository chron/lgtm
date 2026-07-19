# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow>=11.0.0"]
# ///
"""Reproducible export and QA pipeline for LGTM character artwork."""

from __future__ import annotations

import argparse
import json
import math
import os
from pathlib import Path
import subprocess
import sys
from typing import Any

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
ASSET_DIR = ROOT / "assets" / "characters"
WEBP_DIR = ASSET_DIR / "webp"
QA_DIR = ASSET_DIR / "qa"
MANIFEST_PATH = ASSET_DIR / "art-manifest.json"
CHROMA_HELPER = (
    Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    / "skills"
    / ".system"
    / "imagegen"
    / "scripts"
    / "remove_chroma_key.py"
)


def load_manifest() -> dict[str, Any]:
    with MANIFEST_PATH.open() as source:
        manifest = json.load(source)
    if manifest.get("schemaVersion") != 1:
        raise ValueError("Unsupported art manifest schema")
    return manifest


def entry_for(manifest: dict[str, Any], character: str, mood: str) -> dict[str, Any]:
    try:
        return manifest["characters"][character]["moods"][mood]
    except KeyError as error:
        raise ValueError(f"Unknown character/mood: {character}/{mood}") from error


def paths_for(entry: dict[str, Any]) -> tuple[Path, Path, Path]:
    stem = entry["stem"]
    return (
        ASSET_DIR / f"{stem}-chroma.png",
        ASSET_DIR / f"{stem}.png",
        WEBP_DIR / f"{stem}.webp",
    )


def process_asset(manifest: dict[str, Any], character: str, mood: str) -> None:
    entry = entry_for(manifest, character, mood)
    chroma_path, master_path, webp_path = paths_for(entry)
    if not chroma_path.exists():
        raise FileNotFoundError(f"Missing chroma source: {chroma_path.relative_to(ROOT)}")
    if not CHROMA_HELPER.exists():
        raise FileNotFoundError(f"Missing installed chroma helper: {CHROMA_HELPER}")

    WEBP_DIR.mkdir(parents=True, exist_ok=True)
    command = [
        sys.executable,
        str(CHROMA_HELPER),
        "--input",
        str(chroma_path),
        "--out",
        str(master_path),
        "--auto-key",
        "border",
        "--soft-matte",
        "--transparent-threshold",
        "12",
        "--opaque-threshold",
        "220",
        "--despill",
        "--force",
    ]
    subprocess.run(command, check=True)

    with Image.open(master_path) as source:
        master = source.convert("RGBA")
        master.save(
            webp_path,
            "WEBP",
            quality=84,
            method=6,
            exact=True,
        )

    report = validate_asset(manifest, character, mood)
    if report["errors"]:
        raise RuntimeError(
            f"Validation failed for {character}/{mood}: " + "; ".join(report["errors"])
        )
    print(f"processed {character}/{mood} -> {master_path.relative_to(ROOT)}")


def key_dominance(rgb: tuple[int, int, int], key: str) -> int:
    red, green, blue = rgb
    if key == "#00FF00":
        return green - max(red, blue)
    if key == "#FF00FF":
        return min(red, blue) - green
    if key == "#0000FF":
        return blue - max(red, green)
    raise ValueError(f"Unsupported chroma key: {key}")


def validate_focal_data(character: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    required_roles = {"selection", "dock", "card", "token", "cutin"}
    roles = character.get("focalByRole", {})
    missing = required_roles - set(roles)
    if missing:
        errors.append(f"missing focal roles: {', '.join(sorted(missing))}")
    for role, focal in roles.items():
        x = focal.get("x")
        y = focal.get("y")
        scale = focal.get("scale")
        if not isinstance(x, (int, float)) or not 0 <= x <= 1:
            errors.append(f"{role}.x must be between 0 and 1")
        if not isinstance(y, (int, float)) or not 0 <= y <= 1:
            errors.append(f"{role}.y must be between 0 and 1")
        if not isinstance(scale, (int, float)) or not 0.5 <= scale <= 3:
            errors.append(f"{role}.scale must be between 0.5 and 3")
    return errors


def validate_asset(
    manifest: dict[str, Any], character_id: str, mood: str
) -> dict[str, Any]:
    character = manifest["characters"][character_id]
    entry = entry_for(manifest, character_id, mood)
    _, master_path, webp_path = paths_for(entry)
    errors = validate_focal_data(character)
    metrics: dict[str, Any] = {}

    if not master_path.exists():
        errors.append("transparent PNG master is missing")
        return {"character": character_id, "mood": mood, "metrics": metrics, "errors": errors}
    if not webp_path.exists():
        errors.append("optimized WebP is missing")

    with Image.open(master_path) as source:
        image = source.convert("RGBA")
        width, height = image.size
        alpha = image.getchannel("A")
        bbox = alpha.getbbox()
        pixels = image.load()
        corner_alpha = [
            pixels[0, 0][3],
            pixels[width - 1, 0][3],
            pixels[0, height - 1][3],
            pixels[width - 1, height - 1][3],
        ]
        mean_alpha = sum(alpha.get_flattened_data()) / (255 * width * height)
        semi_transparent = 0
        residual_key = 0
        key = entry.get("key", "#00FF00").upper()
        for red, green, blue, pixel_alpha in image.get_flattened_data():
            if 0 < pixel_alpha < 250:
                semi_transparent += 1
                if key_dominance((red, green, blue), key) >= 16:
                    residual_key += 1
        residual_ratio = residual_key / semi_transparent if semi_transparent else 0

        metrics.update(
            {
                "dimensions": [width, height],
                "mode": "RGBA",
                "cornerAlpha": corner_alpha,
                "subjectBounds": list(bbox) if bbox else None,
                "alphaCoverage": round(mean_alpha, 4),
                "semiTransparentPixels": semi_transparent,
                "residualKeyEdgeRatio": round(residual_ratio, 6),
                "pngBytes": master_path.stat().st_size,
                "webpBytes": webp_path.stat().st_size if webp_path.exists() else None,
            }
        )

        if width < 900 or height < 1500:
            errors.append("master is smaller than the 900x1500 portrait floor")
        if any(value > 4 for value in corner_alpha):
            errors.append("one or more canvas corners are not transparent")
        if not bbox:
            errors.append("master contains no visible subject")
        else:
            left, top, right, _bottom = bbox
            if min(left, top, width - right) < 4:
                errors.append("subject lacks safe padding on the top or sides")
        if not 0.18 <= mean_alpha <= 0.88:
            errors.append("visible subject coverage is outside the expected range")
        if residual_ratio > 0.01:
            errors.append("more than 1% of soft-edge pixels retain key-color dominance")

    if webp_path.exists():
        with Image.open(webp_path) as webp:
            if "A" not in webp.getbands():
                errors.append("WebP output has no alpha channel")

    return {
        "character": character_id,
        "displayName": character["displayName"],
        "mood": mood,
        "metrics": metrics,
        "errors": errors,
    }


def generated_entries(manifest: dict[str, Any]):
    for character_id, character in manifest["characters"].items():
        for mood, entry in character["moods"].items():
            if entry["status"] in {"generated", "reviewed"}:
                yield character_id, character, mood, entry


def validate_all(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    QA_DIR.mkdir(parents=True, exist_ok=True)
    reports = [
        validate_asset(manifest, character_id, mood)
        for character_id, _character, mood, _entry in generated_entries(manifest)
    ]
    report_path = QA_DIR / "validation-v1.json"
    report_path.write_text(json.dumps({"schemaVersion": 1, "assets": reports}, indent=2) + "\n")
    failures = [report for report in reports if report["errors"]]
    print(f"validated {len(reports)} assets -> {report_path.relative_to(ROOT)}")
    if failures:
        for failure in failures:
            print(
                f"FAILED {failure['character']}/{failure['mood']}: "
                + "; ".join(failure["errors"]),
                file=sys.stderr,
            )
        raise SystemExit(1)
    return reports


def font(size: int):
    candidates = [
        Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def contact_sheet(manifest: dict[str, Any]) -> None:
    entries = list(generated_entries(manifest))
    if not entries:
        raise RuntimeError("No generated assets are listed in the manifest")
    QA_DIR.mkdir(parents=True, exist_ok=True)
    tile_width, tile_height, label_height = 360, 600, 58
    columns = 3
    rows = math.ceil(len(entries) / columns)
    sheet = Image.new("RGB", (columns * tile_width, rows * (tile_height + label_height)), "#F7F1E3")
    drawing = ImageDraw.Draw(sheet)
    label_font = font(22)

    for index, (character_id, character, mood, entry) in enumerate(entries):
        _, master_path, _ = paths_for(entry)
        with Image.open(master_path) as source:
            portrait = source.convert("RGBA")
            portrait.thumbnail((tile_width - 28, tile_height - 24), Image.Resampling.LANCZOS)
            x = (index % columns) * tile_width + (tile_width - portrait.width) // 2
            y = (index // columns) * (tile_height + label_height) + tile_height - portrait.height
            sheet.paste(portrait, (x, y), portrait)
        label = f"{character['displayName']} · {mood.upper()}"
        label_box = drawing.textbbox((0, 0), label, font=label_font)
        label_width = label_box[2] - label_box[0]
        label_x = (index % columns) * tile_width + (tile_width - label_width) // 2
        label_y = (index // columns) * (tile_height + label_height) + tile_height + 14
        drawing.text((label_x, label_y), label, fill="#25213D", font=label_font)

    output_path = QA_DIR / "contact-sheet-v1.png"
    sheet.save(output_path, optimize=True)
    print(f"contact sheet -> {output_path.relative_to(ROOT)}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    process_parser = subparsers.add_parser("process", help="Process one chroma source")
    process_parser.add_argument("character")
    process_parser.add_argument("mood", choices=("idle", "thinking", "success"))
    subparsers.add_parser("process-all", help="Process every generated manifest entry")
    subparsers.add_parser("validate", help="Validate generated PNG and WebP assets")
    subparsers.add_parser("contact-sheet", help="Render generated assets for visual QA")
    subparsers.add_parser("all", help="Process, validate, and render all generated assets")
    args = parser.parse_args()
    manifest = load_manifest()

    if args.command == "process":
        process_asset(manifest, args.character, args.mood)
    elif args.command in {"process-all", "all"}:
        for character_id, _character, mood, _entry in generated_entries(manifest):
            process_asset(manifest, character_id, mood)

    if args.command in {"validate", "all"}:
        validate_all(manifest)
    if args.command in {"contact-sheet", "all"}:
        contact_sheet(manifest)


if __name__ == "__main__":
    main()
