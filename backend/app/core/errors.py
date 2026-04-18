import logging
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("breathometer")

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error on {request.method} {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )

import sentry_sdk

async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    # Manually capture the exception since this handler prevents it from bubbling up to Sentry
    sentry_sdk.capture_exception(exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred."},
    )

async def auth_exception_handler(request: Request, exc: Exception):
    logger.warning(f"Authentication failure: {exc}")
    # Will be triggered for specific auth exceptions we define or JWT failure
    return JSONResponse(
        status_code=401,
        content={"detail": str(exc)},
    )
    
def setup_error_handlers(app):
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, global_exception_handler)
    # FastApi handles HTTPException natively, but we can override if needed
