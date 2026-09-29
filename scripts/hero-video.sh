#!/usr/bin/env bash
# Encode the homepage hero video and its stills: `scripts/hero-video.sh path/to/master.mp4`.
# Needs ffmpeg with libsvtav1, libx264 and libwebp (libaom for AVIF stills), plus base64.
#
# Writes to public/video/hero/:
#   hero-1080.av1.mp4 / hero-1080.h264.mp4   16:9, for tablets and desktops
#   hero-720x1280.av1.mp4 / .h264.mp4        9:16 centre crop, for phones
#   poster-1080.{avif,webp,jpg} / poster-720x1280.{avif,webp,jpg}   first frame
# and prints the ~24px blurred-placeholder data URLs (first frame) to paste into
# src/designs/studio/heroVideo.ts. No audio: the hero plays muted.
set -euo pipefail
src="${1:?usage: scripts/hero-video.sh master.mp4}"
out="$(cd "$(dirname "$0")/.." && pwd)/public/video/hero"
mkdir -p "$out"
common=(-hide_banner -v error -y -i "$src" -an -r 24000/1001)
wide="scale=1920:1080:flags=lanczos,format=yuv420p"
tall="crop=ih*9/16:ih,scale=720:1280:flags=lanczos,format=yuv420p"

for v in "1080:$wide" "720x1280:$tall"; do
  name="${v%%:*}"
  vf="${v#*:}"
  # AV1: much smaller; decoded in hardware on most recent phones and laptops.
  ffmpeg "${common[@]}" -vf "$vf" -c:v libsvtav1 -preset 5 -crf 44 -g 48 -svtav1-params tune=0 \
    -movflags +faststart "$out/hero-$name.av1.mp4"
  # H.264 fallback for everything else.
  ffmpeg "${common[@]}" -vf "$vf" -c:v libx264 -preset slow -crf 29 -profile:v high -g 48 \
    -movflags +faststart "$out/hero-$name.h264.mp4"
  # First frame as the poster (it is also the LCP image), so poster → video has no jump.
  ffmpeg -hide_banner -v error -y -i "$src" -frames:v 1 -vf "$vf" -c:v libaom-av1 -still-picture 1 -crf 32 "$out/poster-$name.avif"
  ffmpeg -hide_banner -v error -y -i "$src" -frames:v 1 -vf "$vf" -c:v libwebp -quality 72 "$out/poster-$name.webp"
  ffmpeg -hide_banner -v error -y -i "$src" -frames:v 1 -vf "$vf" -q:v 5 "$out/poster-$name.jpg"
  # Tiny blurred placeholder (24px wide), inlined in the HTML (see sorenblank.com/writing/base64-and-perceived-performance).
  # (WebP rather than PNG: a detailed frame is ~2-7 KB as PNG, a few hundred bytes as WebP.)
  b64=$(ffmpeg -hide_banner -v error -i "$src" -frames:v 1 -vf "${vf%%,format*},scale=24:-2" -f image2pipe -vcodec libwebp -quality 40 - | base64 | tr -d '\n')
  echo "$name placeholder (${#b64} chars): data:image/webp;base64,$b64"
done
ls -la "$out"
