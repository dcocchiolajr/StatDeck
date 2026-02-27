"""
Action executor that handles tile interaction events from the Pi.
"""

import logging
import subprocess
import os
from .launch_app_action import LaunchAppAction
from .hotkey_action import HotkeyAction
from .run_script_action import RunScriptAction
from .open_url_action import OpenURLAction
from .open_folder_action import OpenFolderAction

logger = logging.getLogger(__name__)


class ActionExecutor:
    """Executes actions triggered by tile interactions on the Pi display."""
    
    def __init__(self, layout_config):
        """
        Initialize the action executor.
        
        Args:
            layout_config: Layout configuration containing tile action definitions
        """
        self.layout_config = layout_config
        self.action_handlers = {
            'launch_app': LaunchAppAction(),
            'hotkey': HotkeyAction(),
            'run_script': RunScriptAction(),
            'open_url': OpenURLAction(),
            'open_folder': OpenFolderAction()
        }
    
    def execute(self, tile_id, action_type):
        """
        Execute an action based on tile interaction.
        
        Args:
            tile_id: ID of the tile that was interacted with
            action_type: Type of interaction ('tap', 'long_press', 'double_tap')
        """
        # Find the tile in the layout
        tile = self._find_tile(tile_id)
        
        if not tile:
            logger.warning(f"Tile {tile_id} not found in layout")
            return
        
        # Get the action configuration
        actions = tile.get('actions', {})
        action_config = actions.get(action_type)
        
        if not action_config:
            logger.debug(f"No action configured for {tile_id}.{action_type}")
            return
        
        # Get the action handler
        action_handler_type = action_config.get('type')
        handler = self.action_handlers.get(action_handler_type)
        
        if not handler:
            logger.warning(f"Unknown action type: {action_handler_type}")
            return
        
        # Execute the action
        try:
            logger.info(f"Executing {action_handler_type} for {tile_id}.{action_type}")
            handler.execute(action_config)
        except Exception as e:
            logger.error(f"Error executing action: {e}", exc_info=True)
    
    def _find_tile(self, tile_id):
            """
            Find a tile in the layout by ID.
        
            Args:
                tile_id: Tile ID to search for
        
            Returns:
                dict: Tile configuration, or None if not found
            """
            # 1. Check V4 Multi-Page structure
            if 'pages' in self.layout_config:
                for page in self.layout_config['pages']:
                    for tile in page.get('tiles', []):
                        if tile.get('id') == tile_id:
                            return tile
                        
            # 2. Check V3 Flat structure (Fallback)
            for tile in self.layout_config.get('tiles', []):
                if tile.get('id') == tile_id:
                    return tile
                
            return None
    
    def update_layout(self, new_layout):
        """
        Update the layout configuration.
        
        Args:
            new_layout: New layout configuration
        """
        self.layout_config = new_layout
        logger.info("Layout configuration updated")
