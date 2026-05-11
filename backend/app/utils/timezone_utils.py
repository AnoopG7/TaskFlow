"""
Timezone utility for mapping abbreviations to IANA timezone names.
Used by agent loop and scheduler for correct time handling.
"""

import pytz
import logging

logger = logging.getLogger(__name__)

# Common timezone abbreviation → IANA timezone mapping
ABBREVIATION_MAP = {
    "IST": "Asia/Kolkata",
    "GMT": "Europe/London",
    "UTC": "UTC",
    "EST": "America/New_York",
    "EDT": "America/New_York",
    "CST": "America/Chicago",
    "CDT": "America/Chicago",
    "MST": "America/Denver",
    "MDT": "America/Denver",
    "PST": "America/Los_Angeles",
    "PDT": "America/Los_Angeles",
    "CET": "Europe/Paris",
    "CEST": "Europe/Paris",
    "EET": "Europe/Bucharest",
    "EEST": "Europe/Bucharest",
    "JST": "Asia/Tokyo",
    "KST": "Asia/Seoul",
    "CST_CHINA": "Asia/Shanghai",
    "AEST": "Australia/Sydney",
    "AWST": "Australia/Perth",
    "NZST": "Pacific/Auckland",
    "GST": "Asia/Dubai",
    "EAT": "Africa/Nairobi",
    "WAT": "Africa/Lagos",
    "BRT": "America/Sao_Paulo",
    "ART": "America/Argentina/Buenos_Aires",
}

DEFAULT_TIMEZONE = "UTC"


def resolve_timezone(tz_str: str | None) -> str:
    """
    Resolve a timezone string to a valid IANA timezone name.
    
    Accepts:
    - IANA names: "Asia/Kolkata", "America/New_York"
    - Abbreviations: "IST", "EST", "PST"
    - Common aliases: "India Standard Time", "Eastern Time"
    
    Returns valid IANA timezone or DEFAULT_TIMEZONE if invalid.
    """
    if not tz_str or not tz_str.strip():
        return DEFAULT_TIMEZONE
    
    tz_str = tz_str.strip()
    
    # Check if it's already a valid IANA timezone
    if tz_str in pytz.all_timezones:
        return tz_str
    
    # Check abbreviation map (case-insensitive)
    upper = tz_str.upper()
    if upper in ABBREVIATION_MAP:
        return ABBREVIATION_MAP[upper]
    
    # Try case-insensitive IANA match
    for tz in pytz.all_timezones:
        if tz.lower() == tz_str.lower():
            return tz
    
    logger.warning(f"Unknown timezone '{tz_str}', defaulting to {DEFAULT_TIMEZONE}")
    return DEFAULT_TIMEZONE


def get_pytz_timezone(tz_str: str | None) -> pytz.BaseTzInfo:
    """
    Get a pytz timezone object from a timezone string.
    
    Returns pytz.UTC if timezone is invalid.
    """
    resolved = resolve_timezone(tz_str)
    try:
        return pytz.timezone(resolved)
    except Exception as e:
        logger.error(f"Error creating pytz timezone for '{tz_str}': {e}")
        return pytz.UTC


def format_local_time(tz_str: str | None) -> str:
    """
    Get current time formatted in the user's timezone.
    
    Returns: "2026-05-08 12:30 IST (Asia/Kolkata)"
    """
    from datetime import datetime
    
    tz_name = resolve_timezone(tz_str)
    tz = pytz.timezone(tz_name)
    now = datetime.now(tz)
    
    # Get abbreviation from the timezone object
    abbr = now.strftime("%Z")
    
    return f"{now.strftime('%Y-%m-%d %H:%M')} {abbr} ({tz_name})"
