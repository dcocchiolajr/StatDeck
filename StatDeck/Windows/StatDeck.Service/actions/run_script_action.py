"""
Action to run scripts or batch files.
"""

import subprocess
import os
import logging

logger = logging.getLogger(__name__)


class RunScriptAction:
    """Executes scripts or batch files."""
    
    def execute(self, config):
        """
        Run a script file.
        
        Args:
            config: Action configuration containing 'script' path
        """
        script = config.get('script')
        
        if not script:
            logger.error("No script specified for run_script action")
            return
        
        # Check if file exists
        if not os.path.exists(script):
            logger.error(f"Script not found: {script}")
            return
        
        try:
            # Determine how to run based on extension
            ext = os.path.splitext(script)[1].lower()
            
            if ext == '.bat' or ext == '.cmd':
                # Windows batch file
                subprocess.Popen([script], shell=True)
            elif ext == '.ps1':
                # PowerShell script
                subprocess.Popen(['powershell', '-File', script])
            elif ext == '.py':
                # Python script
                subprocess.Popen(['python', script])
            else:
                # Try to execute directly
                subprocess.Popen([script], shell=True)
            
            logger.info(f"Executed script: {script}")
            
        except Exception as e:
            logger.error(f"Failed to run script {script}: {e}")
