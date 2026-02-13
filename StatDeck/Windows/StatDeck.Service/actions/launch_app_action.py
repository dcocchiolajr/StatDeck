"""
Action to launch applications.
"""

import subprocess
import os
import logging

logger = logging.getLogger(__name__)


class LaunchAppAction:
    """Launches an application executable."""
    
    def execute(self, config):
        """
        Launch an application.
        
        Args:
            config: Action configuration containing 'target' and optional 'arguments'
        """
        target = config.get('target')
        arguments = config.get('arguments', '')
        
        if not target:
            logger.error("No target specified for launch_app action")
            return
        
        # Check if file exists
        if not os.path.exists(target):
            logger.error(f"Application not found: {target}")
            return
        
        try:
            # Build command
            cmd = [target]
            if arguments:
                cmd.extend(arguments.split())
            
            # Launch application
            subprocess.Popen(cmd, shell=True)
            logger.info(f"Launched: {target}")
            
        except Exception as e:
            logger.error(f"Failed to launch {target}: {e}")
