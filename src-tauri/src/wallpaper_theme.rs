use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WallpaperPalette {
    pub primary_accent: String,
    pub secondary_accent: String,
    pub dominant_background: String,
    pub surfaces: String,
    pub high_contrast_text: String,
    pub wallpaper_path: Option<String>,
}

#[derive(Clone, Copy, Debug)]
struct Rgb {
    r: f32,
    g: f32,
    b: f32,
}

impl Rgb {
    fn new(r: u8, g: u8, b: u8) -> Self {
        Self {
            r: r as f32,
            g: g as f32,
            b: b as f32,
        }
    }

    fn to_hex(&self) -> String {
        format!(
            "#{:02X}{:02X}{:02X}",
            self.r.round().clamp(0.0, 255.0) as u8,
            self.g.round().clamp(0.0, 255.0) as u8,
            self.b.round().clamp(0.0, 255.0) as u8
        )
    }

    fn distance_sq(&self, other: &Rgb) -> f32 {
        let dr = self.r - other.r;
        let dg = self.g - other.g;
        let db = self.b - other.b;
        dr * dr + dg * dg + db * db
    }

    fn relative_luminance(&self) -> f32 {
        let r = self.r / 255.0;
        let g = self.g / 255.0;
        let b = self.b / 255.0;
        0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    fn saturation(&self) -> f32 {
        let r = self.r / 255.0;
        let g = self.g / 255.0;
        let b = self.b / 255.0;
        let max = r.max(g).max(b);
        let min = r.min(g).min(b);
        let delta = max - min;
        if max == 0.0 {
            0.0
        } else {
            delta / max
        }
    }
}

pub fn fallback_palette(path: Option<String>) -> WallpaperPalette {
    WallpaperPalette {
        primary_accent: "#007AFF".to_string(),
        secondary_accent: "#5856D6".to_string(),
        dominant_background: "#0F172A".to_string(),
        surfaces: "#1E293B".to_string(),
        high_contrast_text: "#F8FAFC".to_string(),
        wallpaper_path: path,
    }
}

#[cfg(windows)]
fn get_wallpaper_registry_path() -> Option<String> {
    use windows::core::PCWSTR;
    use windows::Win32::System::Registry::{
        RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY_CURRENT_USER, KEY_READ, REG_SZ,
    };

    unsafe {
        let subkey: Vec<u16> = "Control Panel\\Desktop\0".encode_utf16().collect();
        let val_name: Vec<u16> = "Wallpaper\0".encode_utf16().collect();
        let mut hkey = windows::Win32::System::Registry::HKEY::default();

        if RegOpenKeyExW(
            HKEY_CURRENT_USER,
            PCWSTR(subkey.as_ptr()),
            0,
            KEY_READ,
            &mut hkey,
        )
        .is_ok()
        {
            let mut buf = [0u16; 512];
            let mut buf_size = (buf.len() * 2) as u32;
            let mut val_type = REG_SZ;

            let res = RegQueryValueExW(
                hkey,
                PCWSTR(val_name.as_ptr()),
                None,
                Some(&mut val_type),
                Some(buf.as_mut_ptr() as *mut u8),
                Some(&mut buf_size),
            );

            let _ = RegCloseKey(hkey);

            if res.is_ok() {
                let len = (buf_size as usize / 2).saturating_sub(1);
                let path = String::from_utf16_lossy(&buf[..len]);
                let trimmed = path.trim();
                if !trimmed.is_empty() && Path::new(trimmed).exists() {
                    return Some(trimmed.to_string());
                }
            }
        }

        // Secondary Windows fallback: check TranscodedWallpaper in AppData
        if let Ok(appdata) = std::env::var("APPDATA") {
            let transcoded = Path::new(&appdata)
                .join("Microsoft")
                .join("Windows")
                .join("Themes")
                .join("TranscodedWallpaper");
            if transcoded.exists() {
                return Some(transcoded.to_string_lossy().to_string());
            }
        }
    }
    None
}

#[cfg(not(windows))]
fn get_wallpaper_registry_path() -> Option<String> {
    // Non-windows environment (CI, container, or web host)
    None
}

/// Fast K-Means clustering on RGB pixels
fn extract_kmeans_palette(pixels: &[Rgb], k: usize, max_iterations: usize) -> Vec<(Rgb, usize)> {
    if pixels.is_empty() {
        return Vec::new();
    }
    if pixels.len() <= k {
        return pixels.iter().map(|&p| (p, 1)).collect();
    }

    // Deterministic seeding spread across pixel list
    let mut centroids: Vec<Rgb> = (0..k)
        .map(|i| {
            let idx = (i * pixels.len()) / k;
            pixels[idx]
        })
        .collect();

    let mut cluster_counts = vec![0usize; k];

    for _ in 0..max_iterations {
        let mut sums = vec![(0.0f32, 0.0f32, 0.0f32); k];
        let mut counts = vec![0usize; k];

        for p in pixels {
            let mut best_cluster = 0;
            let mut best_dist = f32::MAX;
            for (ci, c) in centroids.iter().enumerate() {
                let dist = p.distance_sq(c);
                if dist < best_dist {
                    best_dist = dist;
                    best_cluster = ci;
                }
            }
            sums[best_cluster].0 += p.r;
            sums[best_cluster].1 += p.g;
            sums[best_cluster].2 += p.b;
            counts[best_cluster] += 1;
        }

        let mut changed = false;
        for i in 0..k {
            if counts[i] > 0 {
                let new_c = Rgb {
                    r: sums[i].0 / counts[i] as f32,
                    g: sums[i].1 / counts[i] as f32,
                    b: sums[i].2 / counts[i] as f32,
                };
                if new_c.distance_sq(&centroids[i]) > 1.0 {
                    changed = true;
                }
                centroids[i] = new_c;
                cluster_counts[i] = counts[i];
            }
        }

        if !changed {
            break;
        }
    }

    centroids
        .into_iter()
        .zip(cluster_counts.into_iter())
        .collect()
}

pub fn extract_palette_from_image_path(path: &str) -> Option<WallpaperPalette> {
    let img_path = Path::new(path);
    if !img_path.exists() {
        return None;
    }

    let img = match image::open(img_path) {
        Ok(img) => img,
        Err(_) => return None,
    };

    // Fast downscale thumbnail to 48x48 for sub-5ms K-Means quantization
    let thumb = img.thumbnail(48, 48).to_rgb8();
    let pixels: Vec<Rgb> = thumb
        .pixels()
        .map(|p| Rgb::new(p[0], p[1], p[2]))
        .collect();

    if pixels.is_empty() {
        return None;
    }

    let mut clusters = extract_kmeans_palette(&pixels, 5, 12);
    if clusters.is_empty() {
        return None;
    }

    // Sort clusters by population (descending)
    clusters.sort_by(|a, b| b.1.cmp(&a.1));

    // 1. Dominant Background: largest cluster or low-luminance anchor
    let dominant_bg = clusters[0].0;

    // 2. High-contrast text: computed against dominant background luminance
    let bg_lum = dominant_bg.relative_luminance();
    let high_contrast_text = if bg_lum < 0.45 {
        Rgb::new(248, 250, 252) // #F8FAFC
    } else {
        Rgb::new(15, 23, 42) // #0F172A
    };

    // 3. Surfaces: cluster distinct from background, or an elevated/muted tone
    let surfaces = if clusters.len() > 1 {
        // Find cluster closest in hue/tone or second largest
        clusters[1].0
    } else {
        if bg_lum < 0.5 {
            Rgb {
                r: (dominant_bg.r + 20.0).min(255.0),
                g: (dominant_bg.g + 20.0).min(255.0),
                b: (dominant_bg.b + 25.0).min(255.0),
            }
        } else {
            Rgb {
                r: (dominant_bg.r - 20.0).max(0.0),
                g: (dominant_bg.g - 20.0).max(0.0),
                b: (dominant_bg.b - 20.0).max(0.0),
            }
        }
    };

    // 4. Primary Accent: cluster with highest saturation and good contrast against background
    let mut accent_candidates: Vec<Rgb> = clusters.iter().map(|c| c.0).collect();
    accent_candidates.sort_by(|a, b| {
        let sat_a = a.saturation();
        let sat_b = b.saturation();
        sat_b.partial_cmp(&sat_a).unwrap_or(std::cmp::Ordering::Equal)
    });

    let primary_accent = if accent_candidates[0].saturation() > 0.15 {
        accent_candidates[0]
    } else {
        // If wallpaper is grayscale/monochrome, provide a crisp electric blue accent
        Rgb::new(0, 122, 255)
    };

    // 5. Secondary Accent: second most saturated cluster
    let secondary_accent = if accent_candidates.len() > 1 && accent_candidates[1].saturation() > 0.1 {
        accent_candidates[1]
    } else {
        Rgb {
            r: (primary_accent.r * 0.8 + 40.0).min(255.0),
            g: (primary_accent.g * 0.7 + 50.0).min(255.0),
            b: (primary_accent.b * 0.9 + 60.0).min(255.0),
        }
    };

    Some(WallpaperPalette {
        primary_accent: primary_accent.to_hex(),
        secondary_accent: secondary_accent.to_hex(),
        dominant_background: dominant_bg.to_hex(),
        surfaces: surfaces.to_hex(),
        high_contrast_text: high_contrast_text.to_hex(),
        wallpaper_path: Some(path.to_string()),
    })
}

#[tauri::command]
pub async fn fetch_wallpaper_palette() -> Result<WallpaperPalette, String> {
    let wallpaper_path = get_wallpaper_registry_path();

    if let Some(ref path) = wallpaper_path {
        if let Some(palette) = extract_palette_from_image_path(path) {
            return Ok(palette);
        }
    }

    // Graceful fallback: never throw fatal errors, return standard system theme
    Ok(fallback_palette(wallpaper_path))
}
