// Web bridge mock for Tauri v2 runtime when running inside web browser / preview
// Seamlessly delegates to native Tauri when in Tauri desktop app.

export function setupTauriMock() {
  if (typeof window === "undefined") return;
  if ("__TAURI_INTERNALS__" in window && (window as any).__TAURI_INTERNALS__) {
    // Native Tauri environment detected; do not override
    return;
  }

  let callbackIdCounter = 1;
  const callbacks = new Map<number, (payload: any) => void>();
  const eventListeners = new Map<string, Map<number, (event: { event: string; id: number; payload: any }) => void>>();
  let eventIdCounter = 1;

  function transformCallback(cb: any, once = false): number {
    const id = callbackIdCounter++;
    callbacks.set(id, (data: any) => {
      if (once) callbacks.delete(id);
      if (typeof cb === "function") cb(data);
    });
    return id;
  }

  function unregisterCallback(id: number) {
    callbacks.delete(id);
  }

  function emitMockEvent(event: string, payload: any) {
    const listeners = eventListeners.get(event);
    if (listeners) {
      listeners.forEach((handler, id) => {
        try {
          handler({ event, id, payload });
        } catch (e) {
          console.warn("[TauriMock] Listener error:", e);
        }
      });
    }
  }

  const samplePalettes = [
    {
      primary_accent: "#38BDF8", // Electric Sky Blue
      secondary_accent: "#818CF8", // Indigo Glow
      dominant_background: "#0B1120", // Deep Obsidian Navy
      surfaces: "#1E293B", // Slate Surface
      high_contrast_text: "#F8FAFC", // Off-white
      wallpaper_path: "C:\\Windows\\Web\\Wallpaper\\ThemeA\\img0.jpg",
    },
    {
      primary_accent: "#F43F5E", // Rose Neon
      secondary_accent: "#FB923C", // Sunset Amber
      dominant_background: "#180D1B", // Dark Plum Velvet
      surfaces: "#2D1B36", // Violet Slate
      high_contrast_text: "#FFF1F2",
      wallpaper_path: "C:\\Windows\\Web\\Wallpaper\\ThemeB\\img1.jpg",
    },
    {
      primary_accent: "#10B981", // Emerald Peak
      secondary_accent: "#06B6D4", // Cyan Flow
      dominant_background: "#061A14", // Deep Forest Black
      surfaces: "#0E3328", // Pine Surface
      high_contrast_text: "#F0FDF4",
      wallpaper_path: "C:\\Windows\\Web\\Wallpaper\\ThemeC\\img2.jpg",
    },
  ];

  let currentPaletteIdx = 0;

  async function mockInvoke(cmd: string, args: any = {}): Promise<any> {
    switch (cmd) {
      case "fetch_wallpaper_palette": {
        // Return current active wallpaper palette
        const storedCustom = localStorage.getItem("nectar-mock-wallpaper-palette");
        if (storedCustom) {
          try {
            return JSON.parse(storedCustom);
          } catch {}
        }
        return samplePalettes[currentPaletteIdx % samplePalettes.length];
      }

      case "cycle_mock_wallpaper": {
        currentPaletteIdx = (currentPaletteIdx + 1) % samplePalettes.length;
        const newPalette = samplePalettes[currentPaletteIdx];
        emitMockEvent("wallpaper-palette-updated", newPalette);
        return newPalette;
      }

      case "load_settings": {
        const result: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("nectar-")) {
            result[key] = localStorage.getItem(key);
          }
        }
        return result;
      }

      case "save_setting": {
        const { key, value } = args;
        if (value === null || value === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, String(value));
        }
        emitMockEvent("settings-changed", { key, value });
        return true;
      }

      case "reset_settings": {
        localStorage.clear();
        return true;
      }

      case "get_system_accent_color": {
        return "#007AFF";
      }

      case "get_monitors": {
        return [
          {
            id: "primary",
            name: "Primary Display (2560x1440)",
            is_primary: true,
            width: 2560,
            height: 1440,
            scale_factor: 1.0,
          },
        ];
      }

      case "has_battery": {
        return true;
      }

      case "get_battery_status": {
        return { level: 88, charging: false, seconds_left: 14400 };
      }

      case "get_volume":
      case "get_volume_state": {
        return { volume: 0.72, muted: false };
      }

      case "get_brightness": {
        return 75;
      }

      case "get_wifi_status": {
        return { enabled: true, connected: true };
      }

      case "get_bluetooth_state": {
        return true;
      }

      case "get_battery_saver_state": {
        return false;
      }

      case "get_cpu_usage": {
        return 14.2;
      }

      case "get_ram_usage": {
        return 38.6;
      }

      case "get_disk_space": {
        return 62.4;
      }

      case "get_network_speed": {
        return { up: 1250000, down: 4500000 };
      }

      case "get_drives": {
        return ["C:"];
      }

      case "get_active_windows": {
        return [
          {
            hwnd: 101,
            title: "Visual Studio Code",
            process_name: "code.exe",
            is_minimized: false,
            is_active: true,
          },
          {
            hwnd: 102,
            title: "Google Chrome",
            process_name: "chrome.exe",
            is_minimized: false,
            is_active: false,
          },
          {
            hwnd: 103,
            title: "Spotify Music",
            process_name: "spotify.exe",
            is_minimized: false,
            is_active: false,
          },
          {
            hwnd: 104,
            title: "Terminal",
            process_name: "windowsterminal.exe",
            is_minimized: false,
            is_active: false,
          },
        ];
      }

      case "load_pinned_apps": {
        return ["code.exe", "chrome.exe", "spotify.exe", "windowsterminal.exe"];
      }

      case "get_app_media_sessions": {
        return [
          {
            id: "spotify",
            title: "Midnight City",
            artist: "M83",
            is_playing: true,
            has_media: true,
            position_ms: 85000,
            duration_ms: 243000,
          },
        ];
      }

      case "check_for_updates": {
        return { available: false, version: "1.7.0" };
      }

      case "open_settings_window": {
        // Broadcast custom event so web container can toggle settings view
        window.dispatchEvent(new CustomEvent("nectar:open-settings"));
        return true;
      }

      case "open_calendar_window": {
        window.dispatchEvent(new CustomEvent("nectar:open-calendar"));
        return true;
      }

      case "plugin:event|listen": {
        const { event, handler } = args;
        const id = eventIdCounter++;
        if (!eventListeners.has(event)) {
          eventListeners.set(event, new Map());
        }
        const callbackFn = callbacks.get(handler);
        if (callbackFn) {
          eventListeners.get(event)!.set(id, callbackFn);
        }
        return id;
      }

      case "plugin:event|unlisten": {
        const { event, eventId } = args;
        const listeners = eventListeners.get(event);
        if (listeners) {
          listeners.delete(eventId);
        }
        return true;
      }

      case "plugin:event|emit": {
        const { event, payload } = args;
        emitMockEvent(event, payload);
        return true;
      }

      case "plugin:autostart|is_enabled": {
        return false;
      }

      case "plugin:window|get_all_windows": {
        return ["main"];
      }

      default:
        // No-op for window management & desktop hooks
        return null;
    }
  }

  (window as any).__TAURI_IS_MOCK__ = true;
  (window as any).__TAURI_INTERNALS__ = {
    metadata: {
      currentWindow: { label: "main" },
      currentWebview: { label: "main" },
    },
    transformCallback,
    unregisterCallback,
    convertFileSrc: (path: string) => path,
    invoke: mockInvoke,
  };

  (window as any).__TAURI_EVENT_PLUGIN_INTERNALS__ = {
    unregisterListener: (event: string, eventId: number) => {
      const listeners = eventListeners.get(event);
      if (listeners) {
        listeners.delete(eventId);
      }
    },
  };
}

// Auto-run on module evaluation
setupTauriMock();
