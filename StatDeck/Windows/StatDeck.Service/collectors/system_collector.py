"""
System information collector v2.
Detects the active foreground window application on Windows.

Data sources provided:
    system.active_app      — Clean app name (e.g. "Maya", "Chrome", "Desktop")
    system.active_process  — Process name without .exe (e.g. "maya", "chrome")
    system.active_title    — Full window title (e.g. "scene.mb - Autodesk Maya 2025")
    system.uptime          — System uptime in seconds
"""

import time
import logging
import psutil

try:
    import win32gui
    import win32process
    HAS_WIN32 = True
except ImportError:
    HAS_WIN32 = False

from .base_collector import BaseCollector

logger = logging.getLogger(__name__)

# Map process names (lowercase) to clean display names
PROCESS_DISPLAY_NAMES = {
    'explorer.exe': 'File Explorer',
    'chrome.exe': 'Chrome',
    'firefox.exe': 'Firefox',
    'msedge.exe': 'Edge',
    'code.exe': 'VS Code',
    'devenv.exe': 'Visual Studio',
    'maya.exe': 'Maya',
    '3dsmax.exe': '3ds Max',
    'blender.exe': 'Blender',
    'photoshop.exe': 'Photoshop',
    'illustrator.exe': 'Illustrator',
    'afterfx.exe': 'After Effects',
    'premiere pro.exe': 'Premiere Pro',
    'discord.exe': 'Discord',
    'spotify.exe': 'Spotify',
    'slack.exe': 'Slack',
    'teams.exe': 'Teams',
    'notepad.exe': 'Notepad',
    'notepad++.exe': 'Notepad++',
    'windowsterminal.exe': 'Terminal',
    'cmd.exe': 'Command Prompt',
    'powershell.exe': 'PowerShell',
    'pwsh.exe': 'PowerShell',
    'obs64.exe': 'OBS Studio',
    'steam.exe': 'Steam',
    'steamwebhelper.exe': 'Steam',
    'epicgameslauncher.exe': 'Epic Games',
    'taskmgr.exe': 'Task Manager',
    'electron.exe': 'Electron App',
    'gimp-2.10.exe': 'GIMP',
    'audacity.exe': 'Audacity',
    'vlc.exe': 'VLC',
    'wmplayer.exe': 'Media Player',
    'winword.exe': 'Word',
    'excel.exe': 'Excel',
    'powerpnt.exe': 'PowerPoint',
    'outlook.exe': 'Outlook',
    'onenote.exe': 'OneNote',
    'unity.exe': 'Unity',
    'unrealengine.exe': 'Unreal Engine',
}


class SystemCollector(BaseCollector):
    """Collects system-level info: active app, uptime."""

    def __init__(self):
        super().__init__()
        self._boot_time = psutil.boot_time()
        self._last_app = 'Desktop'
        self._last_process = 'desktop'
        self._last_title = ''

        if not HAS_WIN32:
            logger.warning(
                'pywin32 not installed — active app detection disabled. '
                'Install with: pip install pywin32'
            )

    def _get_clean_app_name(self, process_name, window_title):
        """Get a clean, human-readable app name."""
        proc_lower = process_name.lower()

        if proc_lower in PROCESS_DISPLAY_NAMES:
            return PROCESS_DISPLAY_NAMES[proc_lower]

        if window_title and ' - ' in window_title:
            candidate = window_title.split(' - ')[-1].strip()
            if 3 < len(candidate) < 35:
                return candidate

        name = process_name
        if name.lower().endswith('.exe'):
            name = name[:-4]
        return name.title() if name else 'Unknown'

    def _strip_exe(self, process_name):
        """Return process name without .exe extension, lowercase."""
        if process_name.lower().endswith('.exe'):
            return process_name[:-4].lower()
        return process_name.lower()

    def collect(self):
        active_app = 'Desktop'
        active_process = 'desktop'
        active_title = ''

        if HAS_WIN32:
            try:
                hwnd = win32gui.GetForegroundWindow()
                if hwnd:
                    active_title = win32gui.GetWindowText(hwnd) or ''
                    raw_process = ''

                    _, pid = win32process.GetWindowThreadProcessId(hwnd)
                    if pid:
                        try:
                            proc = psutil.Process(pid)
                            raw_process = proc.name()
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            raw_process = ''

                    if raw_process.lower() == 'explorer.exe':
                        if active_title:
                            active_app = 'File Explorer'
                            active_process = 'explorer'
                        else:
                            active_app = 'Desktop'
                            active_process = 'desktop'
                            active_title = 'Desktop'
                    elif not active_title and not raw_process:
                        active_app = 'Desktop'
                        active_process = 'desktop'
                        active_title = 'Desktop'
                    else:
                        active_app = self._get_clean_app_name(raw_process, active_title)
                        active_process = self._strip_exe(raw_process)

            except Exception as e:
                logger.debug(f'Active window detection failed: {e}')
                active_app = self._last_app
                active_process = self._last_process
                active_title = self._last_title

        # Track whether focus changed (for consumers that want change-only)
        changed = (active_process != self._last_process)

        self._last_app = active_app
        self._last_process = active_process
        self._last_title = active_title

        uptime = int(time.time() - self._boot_time)

        return {
            'active_app': active_app,
            'active_process': active_process,
            'active_title': active_title,
            'uptime': uptime,
            'changed': changed
        }
