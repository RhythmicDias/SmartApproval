use lettre::message::{header::ContentType, Attachment, MultiPart, SinglePart};
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use std::fs;

// ---------------------------------------------------------------------------
// Helper commands
// ---------------------------------------------------------------------------

#[tauri::command]
fn get_downloads_path() -> String {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());
    format!("{}/Downloads", home).replace('\\', "/")
}

#[tauri::command]
fn check_file_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

// ---------------------------------------------------------------------------
// Email via SMTP (lettre)
// ---------------------------------------------------------------------------

#[derive(serde::Deserialize)]
pub struct SmtpConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
}

#[tauri::command]
async fn send_email_smtp(
    from: String,
    to: String,
    cc: String,
    bcc: String,
    subject: String,
    body: String,
    attachment_path: String,
    smtp: SmtpConfig,
) -> Result<String, String> {
    // Read attachment bytes
    let file_bytes =
        fs::read(&attachment_path).map_err(|e| format!("Cannot read PDF: {e}"))?;
    let file_name = std::path::Path::new(&attachment_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("document.pdf")
        .to_string();

    let attachment = Attachment::new(file_name)
        .body(file_bytes, ContentType::parse("application/pdf").unwrap());

    // Build message — parse all recipient lists upfront
    let from_mailbox: lettre::message::Mailbox = from
        .parse()
        .map_err(|e| format!("Invalid From '{from}': {e}"))?;

    let to_mailboxes: Vec<lettre::message::Mailbox> = to
        .split(';')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|addr| {
            addr.parse()
                .map_err(|e| format!("Invalid To '{addr}': {e}"))
        })
        .collect::<Result<Vec<_>, _>>()?;

    let cc_mailboxes: Vec<lettre::message::Mailbox> = cc
        .split(';')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|addr| {
            addr.parse()
                .map_err(|e| format!("Invalid Cc '{addr}': {e}"))
        })
        .collect::<Result<Vec<_>, _>>()?;

    let bcc_mailboxes: Vec<lettre::message::Mailbox> = bcc
        .split(';')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|addr| {
            addr.parse()
                .map_err(|e| format!("Invalid Bcc '{addr}': {e}"))
        })
        .collect::<Result<Vec<_>, _>>()?;

    if to_mailboxes.is_empty() {
        return Err("No valid To recipients specified.".to_string());
    }

    let mut builder = Message::builder().from(from_mailbox).subject(&subject);

    for mailbox in to_mailboxes {
        builder = builder.to(mailbox);
    }
    for mailbox in cc_mailboxes {
        builder = builder.cc(mailbox);
    }
    for mailbox in bcc_mailboxes {
        builder = builder.bcc(mailbox);
    }

    let email = builder
        .multipart(
            MultiPart::mixed()
                .singlepart(SinglePart::html(body))
                .singlepart(attachment),
        )
        .map_err(|e| format!("Failed to build email: {e}"))?;

    // Connect and send via SMTP
    let creds = Credentials::new(smtp.username.clone(), smtp.password.clone());

    let mailer_builder = if smtp.port == 465 {
        SmtpTransport::relay(&smtp.host)
    } else {
        SmtpTransport::starttls_relay(&smtp.host)
    };

    let mailer = mailer_builder
        .map_err(|e| format!("SMTP relay error: {e}"))?
        .port(smtp.port)
        .credentials(creds)
        .build();

    mailer
        .send(&email)
        .map_err(|e| format!("Failed to send email: {e}"))?;

    Ok("Email sent successfully.".to_string())
}

#[tauri::command]
async fn download_file(url: String, path: String) -> Result<(), String> {
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to connect: {e}"))?;
        
    let status = response.status();
    if !status.is_success() {
        return Err(format!("Download failed with status: {status}"));
    }
    
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read bytes: {e}"))?;
        
    fs::write(path, bytes)
        .map_err(|e| format!("Failed to save file: {e}"))?;
        
    Ok(())
}

// ---------------------------------------------------------------------------
// App entry point
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_downloads_path,
            check_file_exists,
            send_email_smtp,
            download_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
