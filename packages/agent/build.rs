fn main() {
    // Embed git hash
    let output = std::process::Command::new("git")
        .args(["rev-parse", "--short", "HEAD"])
        .output();
    if let Ok(output) = output {
        let hash = String::from_utf8_lossy(&output.stdout).trim().to_string();
        println!("cargo:rustc-env=GIT_HASH={}", hash);
    } else {
        println!("cargo:rustc-env=GIT_HASH=unknown");
    }

    // Embed build timestamp via `date` command (no extra deps)
    let output = std::process::Command::new("date")
        .args(["-u", "+%Y-%m-%dT%H:%M:%SZ"])
        .output();
    if let Ok(output) = output {
        let ts = String::from_utf8_lossy(&output.stdout).trim().to_string();
        println!("cargo:rustc-env=BUILD_TIMESTAMP={}", ts);
    } else {
        println!("cargo:rustc-env=BUILD_TIMESTAMP=unknown");
    }
}
