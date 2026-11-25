// Puts Rarvon's icon and file details into the Windows program. The version in
// the file's Properties comes from Cargo.toml, so it always matches the release.
fn main() {
    println!("cargo:rerun-if-changed=rarvon.rc");
    println!("cargo:rerun-if-changed=rarvon.ico");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("windows") {
        return;
    }
    let version = std::env::var("CARGO_PKG_VERSION").unwrap();
    let mut parts: Vec<String> = version.split(['.', '-']).take(3).map(|p| p.parse::<u16>().unwrap_or(0).to_string()).collect();
    parts.resize(3, "0".into());
    let numbers = format!("{},0", parts.join(","));

    let dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    let icon = format!("{dir}/rarvon.ico").replace('\\', "/");
    let rc = std::fs::read_to_string("rarvon.rc")
        .unwrap()
        .replace("RARVON_ICON", &icon)
        .replace("RARVON_VERSION_NUMBERS", &numbers)
        .replace("RARVON_VERSION", &version);
    let out = std::path::Path::new(&std::env::var("OUT_DIR").unwrap()).join("rarvon.rc");
    std::fs::write(&out, rc).unwrap();
    embed_resource::compile(&out, embed_resource::NONE).manifest_optional().unwrap();
}
