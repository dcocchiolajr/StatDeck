"""
Open Folder Action
Opens a folder in Windows Explorer
"""

import subprocess
import logging
import os

logger = logging.getLogger(__name__)


class OpenFolderAction:
    """Opens a folder in Windows Explorer."""
    
    def execute(self, config):
        """
        Execute the open folder action.
        
        Args:
            config: Action configuration with 'folder' key
        """
        folder_path = config.get('folder', '')
        
        if not folder_path:
            logger.warning("No folder path specified")
            return
        
        # Expand environment variables like %USERPROFILE%
        folder_path = os.path.expandvars(folder_path)
        
        # Check if folder exists
        if not os.path.isdir(folder_path):
            logger.warning(f"Folder does not exist: {folder_path}")
            # Try to open anyway - might be a network path
        
        try:
            # Use explorer.exe to open the folder
            subprocess.Popen(['explorer.exe', folder_path])
            logger.info(f"Opened folder: {folder_path}")
        except Exception as e:
            logger.error(f"Failed to open folder: {e}")
