"""Génère les icônes PNG à partir du monogramme de l'arène, sans dépendance externe."""
from pathlib import Path
import struct
import zlib


ROOT = Path(__file__).resolve().parents[1] / "public" / "icons"


def chunk(kind, payload):
    return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)


def make_png(size, filename, maskable=False):
    rows = bytearray()
    radius = 0 if maskable else size * 0.22
    for y in range(size):
        rows.append(0)
        for x in range(size):
            t = (x + y) / (2 * size)
            red = int(184 - 94 * t)
            green = int(139 + 90 * t)
            blue = int(255 - 27 * t)
            alpha = 255
            if not maskable:
                cx = min(max(x, radius), size - radius)
                cy = min(max(y, radius), size - radius)
                if (x - cx) ** 2 + (y - cy) ** 2 > radius**2:
                    alpha = 0
            nx, ny = x / size, y / size
            stem = 0.30 <= nx <= 0.40 and 0.22 <= ny <= 0.78
            top_outer = ((nx - 0.53) / 0.20) ** 2 + ((ny - 0.36) / 0.15) ** 2 <= 1
            top_inner = ((nx - 0.51) / 0.09) ** 2 + ((ny - 0.36) / 0.065) ** 2 < 1
            bottom_outer = ((nx - 0.53) / 0.21) ** 2 + ((ny - 0.64) / 0.17) ** 2 <= 1
            bottom_inner = ((nx - 0.51) / 0.095) ** 2 + ((ny - 0.64) / 0.085) ** 2 < 1
            if stem or (top_outer and not top_inner) or (bottom_outer and not bottom_inner):
                red, green, blue, alpha = 255, 255, 255, 255
            rows.extend((red, green, blue, alpha))
    header = struct.pack(">2I5B", size, size, 8, 6, 0, 0, 0)
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(bytes(rows), 9)) + chunk(b"IEND", b"")
    (ROOT / filename).write_bytes(data)


ROOT.mkdir(parents=True, exist_ok=True)
make_png(192, "icon-192.png")
make_png(512, "icon-512.png")
make_png(512, "icon-maskable.png", maskable=True)
