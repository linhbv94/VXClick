fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        println!("cargo:rerun-if-env-changed=DEVELOPER_DIR");
        println!("cargo:rerun-if-env-changed=SDKROOT");
        let gate = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../scripts/macos_sdk_gate.mjs");
        println!("cargo:rerun-if-changed={}", gate.display());
        let status = std::process::Command::new("node").arg(gate).status().expect("Node required for SDK gate");
        assert!(status.success(), "macOS SDK27.0 baseline gate failed");
    }

    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows")
        && std::env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("msvc") {
        // Tauri's default resource only links the manifest into the application,
        // leaving lib tests without Common Controls v6 (STATUS_ENTRYPOINT_NOT_FOUND).
        let manifest = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("windows_app.manifest");
        println!("cargo:rerun-if-changed={}", manifest.display());
        println!("cargo:rustc-link-arg=/MANIFEST:EMBED");
        println!("cargo:rustc-link-arg=/MANIFESTINPUT:{}", manifest.display());
        let windows = tauri_build::WindowsAttributes::new_without_app_manifest();
        tauri_build::try_build(tauri_build::Attributes::new().windows_attributes(windows))
            .expect("Windows resource/manifest build failed");
    } else {
        tauri_build::build();
    }
}
