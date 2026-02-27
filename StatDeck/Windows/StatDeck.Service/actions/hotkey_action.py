"""
Action to send keyboard shortcuts.
"""

import logging

logger = logging.getLogger(__name__)


class HotkeyAction:
    """Sends keyboard shortcuts."""
    
    def __init__(self):
        """Initialize hotkey action."""
        try:
            import pyautogui
            self.pyautogui = pyautogui
            self.available = True
        except ImportError:
            logger.warning("pyautogui not installed - hotkey actions disabled")
            self.available = False
    
    def execute(self, config):
        """
        Send a keyboard shortcut.
        
        Args:
            config: Action configuration containing 'keys' (e.g., 'ctrl+shift+esc')
        """
        if not self.available:
            logger.error("pyautogui not available - cannot send hotkeys")
            return
        
        keys = config.get('keys', '')
        
        if not keys:
            logger.error("No keys specified for hotkey action")
            return
        
        try:
            # Parse keys (e.g., "ctrl+shift+esc" -> ['ctrl', 'shift', 'esc'])
            key_list = [k.strip().lower() for k in keys.split('+')]
            
            # Send hotkey
            self.pyautogui.hotkey(*key_list)
            logger.info(f"Sent hotkey: {keys}")
            
        except Exception as e:
            logger.error(f"Failed to send hotkey {keys}: {e}")
