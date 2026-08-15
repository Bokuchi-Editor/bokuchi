//! # PDF image recompression (export post-processing)
//!
//! The native print-to-PDF path (see `pdf_export`) lets the OS webview decide
//! how images are embedded, and none of the platform print APIs expose a
//! compression knob. WebKit in particular re-rasterizes scaled/filtered slide
//! images at print resolution and embeds them as **Flate-compressed raw
//! bitmaps** — a 23 MB deck was measured to carry 20 MB of such streams, while
//! the same pixels encode to ~1.5 MB of JPEG. Pre-scaling the source images
//! does not help because the print engine discards their encoding entirely.
//!
//! So we fix it after the fact: walk the finished PDF and re-encode every
//! large, plain-Flate 8-bit RGB/gray image XObject as JPEG (DCTDecode),
//! keeping dimensions, color space and any /SMask (transparency) untouched.
//! Quality loss is exactly one JPEG encode of an already-rasterized bitmap;
//! resolution is unchanged.
//!
//! The pass is best-effort by design: the printed PDF is already valid, so the
//! caller treats any error here as "keep the original file", never as an
//! export failure. The rewrite goes through a temp file + rename so a crash
//! mid-save cannot corrupt the user's output.

use std::io::Read;

use lopdf::{Dictionary, Document, Object};

/// JPEG quality for re-encoded bitmaps. 80 was validated on real decks as
/// visually clean while shrinking Flate streams by ~10×.
const JPEG_QUALITY: u8 = 80;

/// Streams smaller than this are left alone: the savings are negligible and
/// small UI fragments (list markers, emoji glyph runs) stay pixel-exact.
const MIN_STREAM_BYTES: usize = 100 * 1024;

/// Recompress large Flate bitmap images in the PDF at `path` in place.
/// Returns the number of bytes shaved off the affected image streams.
pub fn compress_pdf_images(path: &str) -> Result<u64, String> {
    let mut doc = Document::load(path).map_err(|e| format!("failed to parse PDF: {e}"))?;

    let mut saved: u64 = 0;
    for object in doc.objects.values_mut() {
        let Object::Stream(stream) = object else { continue };
        if !is_recompressible_image(&stream.dict) || stream.content.len() < MIN_STREAM_BYTES {
            continue;
        }
        let Some(jpeg) = flate_bitmap_to_jpeg(&stream.dict, &stream.content) else { continue };
        if jpeg.len() >= stream.content.len() {
            continue;
        }
        saved += (stream.content.len() - jpeg.len()) as u64;
        stream.dict.set("Filter", Object::Name(b"DCTDecode".to_vec()));
        stream.set_content(jpeg);
    }

    if saved == 0 {
        return Ok(0);
    }

    // Write via temp file + rename so an interrupted save never leaves a
    // half-written PDF at the user's chosen path.
    let tmp_path = format!("{path}.recompress.tmp");
    doc.save(&tmp_path).map_err(|e| format!("failed to save PDF: {e}"))?;
    std::fs::rename(&tmp_path, path).map_err(|e| {
        let _ = std::fs::remove_file(&tmp_path);
        format!("failed to replace PDF: {e}")
    })?;
    Ok(saved)
}

/// An image stream qualifies when it is exactly the shape the webview's print
/// rasterizer emits: 8-bit, plain FlateDecode, no predictor (/DecodeParms).
/// Anything else (already-JPEG passthrough, 1-bit masks, exotic filters) is
/// left untouched.
fn is_recompressible_image(dict: &Dictionary) -> bool {
    let is_image = matches!(dict.get(b"Subtype"), Ok(Object::Name(n)) if n.as_slice() == b"Image");
    let plain_flate = match dict.get(b"Filter") {
        Ok(Object::Name(n)) => n.as_slice() == b"FlateDecode",
        Ok(Object::Array(a)) => {
            a.len() == 1 && matches!(&a[0], Object::Name(n) if n.as_slice() == b"FlateDecode")
        }
        _ => false,
    };
    let eight_bit = matches!(dict.get(b"BitsPerComponent"), Ok(o) if o.as_i64().is_ok_and(|b| b == 8));
    is_image && plain_flate && eight_bit && dict.get(b"DecodeParms").is_err()
}

/// Inflate the stream and JPEG-encode it. Returns `None` when the pixel data
/// is not a straight RGB or grayscale bitmap (e.g. CMYK, sub-byte packing) —
/// the component count is inferred from the decoded length, so any mismatch
/// with Width×Height means "don't touch it".
fn flate_bitmap_to_jpeg(dict: &Dictionary, content: &[u8]) -> Option<Vec<u8>> {
    let width = u32::try_from(dict.get(b"Width").ok()?.as_i64().ok()?).ok()?;
    let height = u32::try_from(dict.get(b"Height").ok()?.as_i64().ok()?).ok()?;
    if width == 0 || height == 0 {
        return None;
    }

    let mut raw = Vec::new();
    flate2::read::ZlibDecoder::new(content).read_to_end(&mut raw).ok()?;

    let pixels = (width as usize).checked_mul(height as usize)?;
    let color_type = if raw.len() == pixels.checked_mul(3)? {
        image::ExtendedColorType::Rgb8
    } else if raw.len() == pixels {
        image::ExtendedColorType::L8
    } else {
        return None;
    };

    let mut jpeg = Vec::new();
    image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg, JPEG_QUALITY)
        .encode(&raw, width, height, color_type)
        .ok()?;
    Some(jpeg)
}
