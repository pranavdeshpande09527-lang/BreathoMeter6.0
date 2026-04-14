import logging
import sys
import re

SECRET_PATTERNS = [
    re.compile(r"Bearer\s+[A-Za-z0-9\-\._~\+/]+=*", re.IGNORECASE),
    re.compile(r"(apikey|api_key|token|password|secret)=([^&\s]+)", re.IGNORECASE),
]


class SensitiveDataFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        for pattern in SECRET_PATTERNS:
            message = pattern.sub(r"\1=[REDACTED]" if pattern.groups >= 2 else "Bearer [REDACTED]", message)
        record.msg = message
        record.args = ()
        return True

def setup_logger(name: str) -> logging.Logger:
    """
    Creates a centralized logger for the application.
    Excludes sensitive data naturally by ensuring developers explicitly map what to log.
    """
    logger = logging.getLogger(name)
    
    # Only configure if no handlers exist to avoid duplicates
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        
        # Create console handler
        ch = logging.StreamHandler(sys.stdout)
        ch.setLevel(logging.INFO)
        ch.addFilter(SensitiveDataFilter())
        
        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        ch.setFormatter(formatter)
        
        logger.addHandler(ch)
        
    return logger

app_logger = setup_logger("breathometer_app")
