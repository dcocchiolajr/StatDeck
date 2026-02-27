"""
Action to open URLs in the default browser.
"""

import webbrowser
import logging

logger = logging.getLogger(__name__)


class OpenURLAction:
    """Opens URLs in the default browser."""
    
    def execute(self, config):
        """
        Open a URL.
        
        Args:
            config: Action configuration containing 'url'
        """
        url = config.get('url')
        
        if not url:
            logger.error("No URL specified for open_url action")
            return
        
        try:
            webbrowser.open(url)
            logger.info(f"Opened URL: {url}")
            
        except Exception as e:
            logger.error(f"Failed to open URL {url}: {e}")
