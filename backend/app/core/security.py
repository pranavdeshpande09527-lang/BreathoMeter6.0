import html
import re
from typing import Iterable, Optional

from fastapi import HTTPException

from app.database import supabase_request

UUID_RE = re.compile(r"^[0-9a-fA-F-]{36}$")
CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def validate_identifier(value: str, field_name: str = "id") -> str:
    if not value or not UUID_RE.fullmatch(value):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}.")
    return value


def sanitize_free_text(value: Optional[str], *, max_length: int, field_name: str) -> Optional[str]:
    if value is None:
        return None

    cleaned = CONTROL_CHARS_RE.sub("", value).strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail=f"{field_name} cannot be empty.")
    if len(cleaned) > max_length:
        raise HTTPException(status_code=400, detail=f"{field_name} exceeds maximum length.")

    return html.escape(cleaned, quote=False)


def sanitize_string_list(values: Optional[Iterable[str]], *, max_items: int, max_length: int, field_name: str) -> list[str]:
    sanitized: list[str] = []
    for item in list(values or [])[:max_items]:
        cleaned = sanitize_free_text(item, max_length=max_length, field_name=field_name)
        if cleaned:
            sanitized.append(cleaned)
    return sanitized


async def ensure_appointment_participant(appointment_id: str, user) -> dict:
    validate_identifier(appointment_id, "appointment_id")
    res = await supabase_request(
        "appointments",
        "GET",
        query_params={"id": f"eq.{appointment_id}", "limit": "1"},
        token=user.token,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appointment = res[0]
    if appointment.get("patient_id") != user.id and appointment.get("doctor_id") != user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this appointment")
    return appointment


async def get_doctor_patient_ids(user) -> set[str]:
    appointments = await supabase_request(
        "appointments",
        "GET",
        query_params={
            "doctor_id": f"eq.{user.id}",
            "status": "in.(pending,accepted,completed)",
            "select": "patient_id",
        },
        token=user.token,
    )
    return {row.get("patient_id") for row in appointments or [] if row.get("patient_id")}


async def ensure_doctor_patient_access(doctor_user, patient_id: str) -> None:
    validate_identifier(patient_id, "patient_id")
    patient_ids = await get_doctor_patient_ids(doctor_user)
    if patient_id not in patient_ids:
        raise HTTPException(status_code=403, detail="Doctor is not authorized to access this patient")


async def ensure_doctor_report_access(doctor_user, report_id: str) -> dict:
    validate_identifier(report_id, "report_id")
    res = await supabase_request(
        "risk_predictions",
        "GET",
        query_params={"id": f"eq.{report_id}", "limit": "1"},
        token=doctor_user.token,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Report not found")

    report = res[0]
    await ensure_doctor_patient_access(doctor_user, report.get("user_id", ""))
    return report


def redact_value(value: Optional[str]) -> str:
    if not value:
        return ""
    if "@" in value:
        local, _, domain = value.partition("@")
        return f"{local[:2]}***@{domain}"
    if len(value) <= 6:
        return "***"
    return f"{value[:3]}***{value[-2:]}"
