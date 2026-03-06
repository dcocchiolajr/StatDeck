"""
Profile Manager v2 — File-based auto-switch.

layouts/ folder contains {process}.json files.
Filenames ARE the mapping. No config file needed.
"""

import os
import json
import time
import logging
from threading import Lock

logger = logging.getLogger(__name__)

DEFAULT_DEBOUNCE = 1.0


class ProfileManager:
    """Monitors active app and triggers layout switches with debounce."""

    def __init__(self, layouts_dir='layouts', debounce=DEFAULT_DEBOUNCE, on_switch=None):
        self.layouts_dir = layouts_dir
        self.debounce = debounce
        self.on_switch = on_switch
        self.lock = Lock()

        self._current_profile = None
        self._pending_profile = None
        self._pending_since = 0
        self._layout_cache = {}

        if os.path.isdir(self.layouts_dir):
            profiles = self._scan_profiles()
            if profiles:
                print(f'  Profile switching ready: {len(profiles)} layouts ({", ".join(profiles)})')
            else:
                print(f'  No layouts in {self.layouts_dir}/ — profile switching inactive')
        else:
            print(f'  No layouts/ directory — profile switching inactive')
            
    @property
    def debounce_time(self):
        return self.debounce

    @debounce_time.setter
    def debounce_time(self, value):
        logger.info(f"Debounce updated: {self.debounce}s -> {value}s")
        self.debounce = value

    def _scan_profiles(self):
        profiles = []
        try:
            for f in os.listdir(self.layouts_dir):
                if f.endswith('.json'):
                    profiles.append(f[:-5])
        except OSError:
            pass
        return sorted(profiles)

    @property
    def enabled(self):
        return os.path.isfile(os.path.join(self.layouts_dir, 'default.json'))

    def has_profile(self, process_name):
        return os.path.isfile(os.path.join(self.layouts_dir, f'{process_name.lower()}.json'))

    def load_layout(self, profile_name):
        if profile_name in self._layout_cache:
            return self._layout_cache[profile_name]

        filepath = os.path.join(self.layouts_dir, f'{profile_name}.json')
        if not os.path.isfile(filepath):
            return None

        try:
            with open(filepath, 'r') as f:
                layout = json.load(f)
            self._layout_cache[profile_name] = layout
            return layout
        except Exception as e:
            logger.error(f'Failed to load layout {filepath}: {e}')
            return None

    def invalidate_cache(self, profile_name=None):
        if profile_name:
            self._layout_cache.pop(profile_name, None)
        else:
            self._layout_cache.clear()

    def update(self, system_stats):
        if not self.enabled:
            return

        process = system_stats.get('active_process', 'desktop').lower()
        now = time.time()

        target = process if self.has_profile(process) else 'default'

        with self.lock:
            if target == self._current_profile:
                self._pending_profile = None
                self._pending_since = 0
                return

            if target != self._pending_profile:
                self._pending_profile = target
                self._pending_since = now
                return

            if (now - self._pending_since) < self.debounce:
                return

            new_profile = self._pending_profile
            self._pending_profile = None
            self._pending_since = 0

        self._do_switch(new_profile)

    def _do_switch(self, profile_name):
        layout = self.load_layout(profile_name)
        if not layout:
            return

        with self.lock:
            old = self._current_profile
            self._current_profile = profile_name

        old_display = old or 'None'
        logger.info(f'Profile switch: {old_display} -> {profile_name}')
        print(f'  Profile: {old_display} -> {profile_name}')

        if self.on_switch:
            try:
                self.on_switch(layout, profile_name)
            except Exception as e:
                logger.error(f'Switch callback failed: {e}')

    def force_switch(self, profile_name):
        with self.lock:
            self._pending_profile = None
            self._pending_since = 0
        self._do_switch(profile_name)

    def get_current_profile(self):
        with self.lock:
            return self._current_profile
