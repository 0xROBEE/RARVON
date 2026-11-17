//! Bench for desktop (beta), milestone 1.
//!
//! Serves Bench's own pages from this computer and opens them in a browser
//! "app mode" window (Edge or Chrome: a clean window with no tabs or address
//! bar). The program has no window of its own and exits when the Bench window
//! is closed.
//!
//! Safety, from the first line:
//! - listens on 127.0.0.1 only (never reachable from the network);
//! - answers only requests addressed to that exact host and port, which stops
//!   "DNS rebinding" (a bad website disguising itself as this computer);
//! - serves files only from Bench's own folder, never paths outside it;
//! - the one command it accepts ("still open") requires a secret key that only
//!   Bench's own page receives, so other websites can't use or detect it.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::io::Cursor;
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

const VERSION: &str = env!("CARGO_PKG_VERSION");
/// Bench's usual port. Staying on one address lets the window remember your
/// settings (theme, language) between launches; if it's taken, any free port is used.
const USUAL_PORT: u16 = 47821;
/// After the page says goodbye (window closed), exit unless it says hello again
/// this quickly (a reload does).
const AFTER_BYE: Duration = Duration::from_secs(8);
/// A minimized window may only say "still open" once a minute (browsers slow
/// hidden pages down); with no word for this long, the window is gone.
const SILENT_FOR: Duration = Duration::from_secs(180);
/// If no Bench window ever reports in (the browser failed to open), give up after this long.
const FIRST_CONTACT: Duration = Duration::from_secs(90);

/// What the Bench window last told the engine.
#[derive(Default)]
struct Contact {
    alive: Option<Instant>,
    bye: Option<Instant>,
}

fn main() {
    let web = match find_web_folder() {
        Some(dir) => dir,
        None => {
            eprintln!("Bench could not find its pages (a 'web' folder next to the program).");
            std::process::exit(1);
        }
    };

    let token = secret_key();
    let server = Server::http(("127.0.0.1", USUAL_PORT))
        .or_else(|_| Server::http("127.0.0.1:0"))
        .expect("could not listen on this computer");
    let port = server.server_addr().to_ip().expect("ip address").port();
    let origin = format!("http://127.0.0.1:{port}");

    let last_contact: Arc<Mutex<Contact>> = Arc::new(Mutex::new(Contact::default()));
    {
        let last_contact = Arc::clone(&last_contact);
        let token = token.clone();
        let host = format!("127.0.0.1:{port}");
        thread::spawn(move || {
            for request in server.incoming_requests() {
                handle(request, &web, &host, &token, &last_contact);
            }
        });
    }

    if !open_app_window(&format!("{origin}/")) {
        eprintln!("Bench could not open a window: Microsoft Edge or Google Chrome is needed.");
        std::process::exit(1);
    }

    // Stay alive while the Bench window is open.
    let started = Instant::now();
    loop {
        thread::sleep(Duration::from_secs(2));
        let contact = last_contact.lock().unwrap();
        let closed = match (contact.alive, contact.bye) {
            (_, Some(bye)) => bye.elapsed() > AFTER_BYE,
            (Some(alive), None) => alive.elapsed() > SILENT_FOR,
            (None, None) => started.elapsed() > FIRST_CONTACT,
        };
        if closed {
            break;
        }
    }
}

/// Bench's pages: `web` next to the program; while developing, `BENCH_WEB_DIR` or the site's `dist`.
fn find_web_folder() -> Option<PathBuf> {
    let mut candidates = Vec::new();
    if let Ok(dir) = std::env::var("BENCH_WEB_DIR") {
        candidates.push(PathBuf::from(dir));
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join("web"));
        }
    }
    candidates.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../dist"));
    candidates
        .into_iter()
        .find(|d| d.join("index.html").is_file())
        .and_then(|d| d.canonicalize().ok())
}

/// 32 random bytes as hex, from the operating system's secure random source.
fn secret_key() -> String {
    let mut bytes = [0u8; 32];
    getrandom::getrandom(&mut bytes).expect("secure random numbers");
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn header(name: &str, value: &str) -> Header {
    Header::from_bytes(name.as_bytes(), value.as_bytes()).expect("valid header")
}

fn reply(request: Request, status: u16, body: &str) {
    let _ = request.respond(Response::from_string(body).with_status_code(StatusCode(status)));
}

fn handle(request: Request, web: &Path, host: &str, token: &str, last_contact: &Mutex<Contact>) {
    // Only requests addressed exactly to this computer and port.
    let host_ok = request.headers().iter().any(|h| h.field.equiv("Host") && h.value.as_str() == host);
    if !host_ok {
        return reply(request, 403, "Forbidden");
    }

    let url = request.url().to_string();
    let path = url.split(['?', '#']).next().unwrap_or("/").to_string();

    // "Still open" and "goodbye" from Bench's own page, with the secret key.
    if path == "/__bench/alive" || path == "/__bench/bye" {
        let in_header = request.headers().iter().any(|h| h.field.equiv("X-Bench-Key") && h.value.as_str() == token);
        // A goodbye is sent as the window closes, which can only carry the key in the address.
        let in_query = url.split_once('?').is_some_and(|(_, q)| q.split('&').any(|p| p == format!("key={token}")));
        if *request.method() != Method::Post || !(in_header || in_query) {
            return reply(request, 403, "Forbidden");
        }
        let mut contact = last_contact.lock().unwrap();
        if path == "/__bench/alive" {
            contact.alive = Some(Instant::now());
            contact.bye = None;
        } else {
            contact.bye = Some(Instant::now());
        }
        drop(contact);
        return reply(request, 204, "");
    }

    if *request.method() != Method::Get && *request.method() != Method::Head {
        return reply(request, 405, "Method not allowed");
    }

    // Find the file, never outside Bench's own folder.
    let decoded = percent_encoding::percent_decode_str(&path).decode_utf8_lossy().to_string();
    let relative = Path::new(decoded.trim_start_matches('/'));
    if relative.components().any(|c| !matches!(c, Component::Normal(_))) {
        return reply(request, 400, "Bad request");
    }
    let mut file = web.join(relative);
    let is_page = file.extension().is_none();
    if file.is_dir() || (is_page && !file.is_file()) {
        // Pages like /tools/video/convert are all served by index.html.
        file = web.join("index.html");
    }
    let Ok(mut body) = fs::read(&file) else {
        return reply(request, 404, "Not found");
    };

    let name = file.file_name().and_then(|n| n.to_str()).unwrap_or("");
    if name == "index.html" {
        // Tell Bench's page it is running in the app, with the key for "still open".
        let marker = format!(
            "<script>window.__BENCH_APP__={{version:\"{VERSION}\",key:\"{token}\"}}</script></head>"
        );
        body = String::from_utf8_lossy(&body).replacen("</head>", &marker, 1).into_bytes();
    }

    let len = body.len();
    let mut response = Response::new(StatusCode(200), Vec::new(), Cursor::new(body), Some(len), None)
        .with_header(header("Content-Type", content_type(&file)))
        .with_header(header("X-Content-Type-Options", "nosniff"))
        .with_header(header("Referrer-Policy", "no-referrer"));
    let cache = if path.starts_with("/assets/") { "public, max-age=31536000, immutable" } else { "no-cache" };
    response = response.with_header(header("Cache-Control", cache));
    let _ = request.respond(response);
}

fn content_type(file: &Path) -> &'static str {
    match file.extension().and_then(|e| e.to_str()).unwrap_or("").to_ascii_lowercase().as_str() {
        "html" => "text/html; charset=utf-8",
        "js" | "mjs" => "text/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "json" | "webmanifest" => "application/json",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "ico" => "image/x-icon",
        "woff2" => "font/woff2",
        "woff" => "font/woff",
        "wasm" => "application/wasm",
        "txt" | "md" => "text/plain; charset=utf-8",
        "xml" => "application/xml",
        // OCR language data stays compressed: the OCR engine unpacks it itself.
        _ => "application/octet-stream",
    }
}

/// Opens Bench in a browser app window (no tabs or address bar), reusing the
/// browser already on the computer.
fn open_app_window(url: &str) -> bool {
    let program_files = |var: &str| std::env::var(var).ok().map(PathBuf::from);
    let mut browsers = Vec::new();
    for base in [program_files("ProgramFiles(x86)"), program_files("ProgramFiles"), program_files("LOCALAPPDATA")].into_iter().flatten() {
        browsers.push(base.join("Microsoft/Edge/Application/msedge.exe"));
        browsers.push(base.join("Google/Chrome/Application/chrome.exe"));
    }
    // Linux: whichever is installed.
    for name in ["microsoft-edge", "google-chrome", "chromium", "chromium-browser"] {
        browsers.push(PathBuf::from(name));
    }
    for browser in browsers {
        let is_path = browser.components().count() > 1;
        if is_path && !browser.is_file() {
            continue;
        }
        if Command::new(&browser).arg(format!("--app={url}")).arg("--new-window").spawn().is_ok() {
            return true;
        }
    }
    false
}
