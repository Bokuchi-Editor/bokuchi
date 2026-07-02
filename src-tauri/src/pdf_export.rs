//! # PDF Export
//!
//! Tauri ships no bundled Chromium, so there is no JS print API we can rely on
//! (`window.print()` is a no-op in macOS WKWebView). Instead we drive the OS
//! webview's *native* print-to-PDF facility from Rust:
//!
//! - **macOS**: `NSPrintOperation` on the `WKWebView`, saving silently to a file.
//! - **Windows**: `ICoreWebView2.PrintToPdf` via WebView2.
//! - **Linux**: `webkit2gtk` `PrintOperation` exporting to a PDF file.
//!
//! All three honour `@media print` / `@page` CSS, so the page-break rules and
//! one-slide-per-page layout the frontend builds into the export HTML take
//! effect.
//!
//! The flow: the frontend builds a fully self-contained HTML document and a
//! target path, then calls [`export_pdf`]. We load that HTML into a hidden
//! webview window, wait for it to finish loading, run the platform print, then
//! close the window.
//!
//! Note: only the macOS path is verified on this build host. The Windows and
//! Linux paths are written against the documented native APIs and need a build
//! on those platforms to confirm.

use serde::Deserialize;
use tauri::async_runtime::Sender;
use tauri::webview::PageLoadEvent;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// Page geometry for the exported PDF, in inches. Computed by the frontend
/// (A4 with margins for normal Markdown; the slide's own pixel size at 96dpi
/// with no margin for Marp).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfPageOptions {
    pub width_inch: f64,
    pub height_inch: f64,
    pub margin_inch: f64,
}

/// Label of the transient hidden window used to render the export document.
const EXPORT_WINDOW_LABEL: &str = "bokuchi-pdf-export";

/// Pixels-per-inch the webview assumes for CSS lengths; used to size the hidden
/// render window so the document lays out at its intended dimensions.
const CSS_DPI: f64 = 96.0;

/// Render `html` in a hidden webview and save it to `output_path` as PDF.
#[tauri::command]
pub async fn export_pdf(
    app: AppHandle,
    html: String,
    output_path: String,
    page: PdfPageOptions,
) -> Result<(), String> {
    // Load the document via a temp file: it is fully self-contained (inline CSS,
    // data-URI fonts, inline SVG), so a file:// URL renders identically.
    let tmp_path = std::env::temp_dir().join(format!("bokuchi-pdf-export-{}.html", std::process::id()));
    std::fs::write(&tmp_path, html).map_err(|e| format!("failed to write temp HTML: {e}"))?;
    let file_url = url::Url::from_file_path(&tmp_path).map_err(|_| "invalid temp file path".to_string())?;

    // Drop any leftover export window from a previous (possibly failed) run.
    if let Some(win) = app.get_webview_window(EXPORT_WINDOW_LABEL) {
        let _ = win.close();
    }

    let (tx, mut rx) = tauri::async_runtime::channel::<Result<(), String>>(1);

    let window_width = (page.width_inch * CSS_DPI).round().max(200.0);
    let window_height = (page.height_inch * CSS_DPI).round().max(200.0);

    let output_for_load = output_path.clone();
    let page_for_load = page.clone();
    // on_page_load fires for both Started and Finished (and again on any
    // sub-navigation); only print once.
    let fired = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));

    // The window is shown off-screen rather than hidden: WKWebView does not lay
    // out (and prints blank) when its window is never displayed. Positioning it
    // far off the visible desktop keeps it invisible to the user.
    let build_result = WebviewWindowBuilder::new(&app, EXPORT_WINDOW_LABEL, WebviewUrl::External(file_url))
        .title("PDF Export")
        .inner_size(window_width, window_height)
        .position(12000.0, 12000.0)
        .decorations(false)
        .focused(false)
        .skip_taskbar(true)
        .visible(true)
        .on_page_load(move |window, payload| {
            if payload.event() != PageLoadEvent::Finished {
                return;
            }
            if fired.swap(true, std::sync::atomic::Ordering::SeqCst) {
                return;
            }
            let window = window.clone();
            let tx = tx.clone();
            let output = output_for_load.clone();
            let page = page_for_load.clone();
            // Let layout/fonts settle, then print. We run the wait off the main
            // thread; `with_webview` re-dispatches the actual native call onto
            // the main thread where it must run.
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(400));
                let dispatched = window.with_webview(move |platform_webview| {
                    print_platform_webview(platform_webview, &output, &page, tx);
                });
                if let Err(e) = dispatched {
                    eprintln!("[pdf_export] with_webview dispatch failed: {e}");
                }
            });
        })
        .build();

    if let Err(e) = build_result {
        let _ = std::fs::remove_file(&tmp_path);
        return Err(format!("failed to create export window: {e}"));
    }

    let result = rx
        .recv()
        .await
        .unwrap_or_else(|| Err("PDF export did not report a result".to_string()));

    if let Some(win) = app.get_webview_window(EXPORT_WINDOW_LABEL) {
        let _ = win.close();
    }
    let _ = std::fs::remove_file(&tmp_path);

    result
}

// ---------------------------------------------------------------------------
// macOS — NSPrintOperation on the WKWebView, saving silently to a PDF file.
//
// Two WebKit quirks shape this:
//   * `NSPrintOperation.runOperation()` *hangs* on WKWebView — we must use the
//     async `runOperationModalForWindow:` variant instead.
//   * WKWebView prints content that is scrolled out of view as blank pages, so
//     we grow the web view's frame tall enough to lay the whole document out
//     before printing.
//
// Because the print runs asynchronously and we pass no Cocoa delegate, we
// detect completion by watching the output file settle (off the main thread).
// ---------------------------------------------------------------------------
#[cfg(target_os = "macos")]
fn print_platform_webview(
    platform_webview: tauri::webview::PlatformWebview,
    output_path: &str,
    page: &PdfPageOptions,
    done: Sender<Result<(), String>>,
) {
    use objc2::runtime::AnyObject;
    use objc2_app_kit::{
        NSPrintInfo, NSPrintJobSavingURL, NSPrintSaveJob, NSPrintingPaginationMode, NSView, NSWindow,
    };
    use objc2_foundation::{NSCopying, NSSize, NSString, NSURL};
    use objc2_web_kit::WKWebView;

    // Tall enough to lay out long documents in one piece so nothing is
    // "scrolled out of view" (which WKWebView would print blank).
    const LAYOUT_HEIGHT: f64 = 30000.0;
    const PT_PER_INCH: f64 = 72.0;

    let kickoff = (|| -> Result<(), String> {
        let wk_ptr = platform_webview.inner() as *mut WKWebView;
        if wk_ptr.is_null() {
            return Err("WKWebView handle was null".to_string());
        }
        let window_ptr = platform_webview.ns_window() as *mut NSWindow;
        if window_ptr.is_null() {
            return Err("NSWindow handle was null".to_string());
        }

        let margin = page.margin_inch * PT_PER_INCH;

        unsafe {
            let webview: &WKWebView = &*wk_ptr;
            let window: &NSWindow = &*window_ptr;

            // Force the whole document to be laid out (avoids blank pages).
            let view: &NSView = webview;
            let current = view.frame();
            view.setFrameSize(NSSize::new(
                current.size.width.max(page.width_inch * 96.0),
                LAYOUT_HEIGHT,
            ));

            let print_info = NSPrintInfo::sharedPrintInfo();
            print_info.setPaperSize(NSSize::new(page.width_inch * PT_PER_INCH, page.height_inch * PT_PER_INCH));
            print_info.setTopMargin(margin);
            print_info.setBottomMargin(margin);
            print_info.setLeftMargin(margin);
            print_info.setRightMargin(margin);
            print_info.setHorizontalPagination(NSPrintingPaginationMode::Automatic);
            print_info.setVerticalPagination(NSPrintingPaginationMode::Automatic);

            // Configure a silent "save as PDF" job to our target path.
            print_info.setJobDisposition(NSPrintSaveJob);
            let url = NSURL::fileURLWithPath(&NSString::from_str(output_path));
            let dict = print_info.dictionary();
            let value: &AnyObject = &url;
            let key: &objc2::runtime::ProtocolObject<dyn NSCopying> =
                objc2::runtime::ProtocolObject::from_ref(NSPrintJobSavingURL);
            dict.setObject_forKey(value, key);

            let operation = webview.printOperationWithPrintInfo(&print_info);
            operation.setShowsPrintPanel(false);
            operation.setShowsProgressPanel(false);
            // Async variant: returns immediately, prints on the run loop.
            // runOperation() would hang here.
            operation.runOperationModalForWindow_delegate_didRunSelector_contextInfo(
                window,
                None,
                None,
                std::ptr::null_mut(),
            );
        }
        Ok(())
    })();

    match kickoff {
        Err(e) => {
            let _ = done.try_send(Err(e));
        }
        Ok(()) => {
            // The print is now running asynchronously; watch the file settle
            // off the main thread so we don't block the UI.
            let output = output_path.to_string();
            std::thread::spawn(move || {
                let _ = done.try_send(wait_for_pdf_complete(&output));
            });
        }
    }
}

/// Wait for an asynchronously-written PDF to appear and stop growing.
#[cfg(target_os = "macos")]
fn wait_for_pdf_complete(path: &str) -> Result<(), String> {
    use std::time::{Duration, Instant};

    let start = Instant::now();
    let timeout = Duration::from_secs(30);
    let mut last_size = 0u64;
    let mut stable_since: Option<Instant> = None;

    loop {
        if start.elapsed() > timeout {
            return Err("PDF export timed out".to_string());
        }
        std::thread::sleep(Duration::from_millis(150));
        let size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
        if size > 0 && size == last_size {
            match stable_since {
                Some(since) if since.elapsed() >= Duration::from_millis(600) => return Ok(()),
                Some(_) => {}
                None => stable_since = Some(Instant::now()),
            }
        } else {
            stable_since = None;
        }
        last_size = size;
    }
}

// ---------------------------------------------------------------------------
// Windows — ICoreWebView2.PrintToPdf (WebView2).
// ---------------------------------------------------------------------------
#[cfg(windows)]
fn print_platform_webview(
    platform_webview: tauri::webview::PlatformWebview,
    output_path: &str,
    page: &PdfPageOptions,
    done: Sender<Result<(), String>>,
) {
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        ICoreWebView2Environment6, ICoreWebView2_7, COREWEBVIEW2_PRINT_ORIENTATION_PORTRAIT,
    };
    use webview2_com::PrintToPdfCompletedHandler;
    use windows::core::{Interface, HSTRING, PCWSTR};

    let result = (|| -> Result<(), String> {
        let controller = platform_webview.controller();
        let core = unsafe { controller.CoreWebView2() }.map_err(|e| format!("CoreWebView2: {e}"))?;
        let webview7: ICoreWebView2_7 = core.cast().map_err(|e| format!("ICoreWebView2_7 cast: {e}"))?;

        let environment = platform_webview.environment();
        let env6: ICoreWebView2Environment6 = environment.cast().map_err(|e| format!("ICoreWebView2Environment6 cast: {e}"))?;
        let settings = unsafe { env6.CreatePrintSettings() }.map_err(|e| format!("CreatePrintSettings: {e}"))?;

        unsafe {
            settings.SetPageWidth(page.width_inch).ok();
            settings.SetPageHeight(page.height_inch).ok();
            settings.SetMarginTop(page.margin_inch).ok();
            settings.SetMarginBottom(page.margin_inch).ok();
            settings.SetMarginLeft(page.margin_inch).ok();
            settings.SetMarginRight(page.margin_inch).ok();
            settings.SetShouldPrintBackgrounds(true).ok();
            settings.SetOrientation(COREWEBVIEW2_PRINT_ORIENTATION_PORTRAIT).ok();
        }

        let path = HSTRING::from(output_path);
        let done_handler = done.clone();
        let handler = PrintToPdfCompletedHandler::create(Box::new(move |hr, succeeded| {
            if hr.is_ok() && succeeded {
                let _ = done_handler.try_send(Ok(()));
            } else {
                let _ = done_handler.try_send(Err(format!("PrintToPdf failed (hr={hr:?}, succeeded={succeeded})")));
            }
            Ok(())
        }));

        unsafe {
            webview7
                .PrintToPdf(PCWSTR(path.as_ptr()), &settings, &handler)
                .map_err(|e| format!("PrintToPdf: {e}"))?;
        }
        Ok(())
    })();

    // On the success path the completion handler sends the final result; only
    // forward early failures here.
    if let Err(e) = result {
        let _ = done.try_send(Err(e));
    }
}

// ---------------------------------------------------------------------------
// Linux — webkit2gtk PrintOperation exporting straight to a PDF file.
// ---------------------------------------------------------------------------
#[cfg(target_os = "linux")]
fn print_platform_webview(
    platform_webview: tauri::webview::PlatformWebview,
    output_path: &str,
    _page: &PdfPageOptions,
    done: Sender<Result<(), String>>,
) {
    use webkit2gtk::{PrintOperation, PrintOperationExt};

    let result = (|| -> Result<(), String> {
        let webview = platform_webview.inner();
        let print_op = PrintOperation::new(&webview);

        // Direct the GTK print settings at a PDF file instead of a printer.
        let settings = gtk::PrintSettings::new();
        let uri = url::Url::from_file_path(output_path)
            .map_err(|_| "invalid output path".to_string())?
            .to_string();
        settings.set("output-uri", &uri);
        settings.set("output-file-format", "pdf");
        print_op.set_print_settings(&settings);

        let done_finished = done.clone();
        print_op.connect_finished(move |_| {
            let _ = done_finished.try_send(Ok(()));
        });
        let done_failed = done.clone();
        print_op.connect_failed(move |_, err| {
            let _ = done_failed.try_send(Err(format!("print failed: {err}")));
        });

        // Run without showing the print dialog.
        print_op.print();
        Ok(())
    })();

    if let Err(e) = result {
        let _ = done.try_send(Err(e));
    }
}
