import re
from typing import Dict, List, Optional

FAMILY_PATTERNS = [
    (r"\bAPI\b", "API"),
    (r"\bASME\b", "ASME"),
    (r"\bISO\b", "ISO"),
    (r"\bASTM\b", "ASTM"),
    (r"\bNACE\b", "NACE"),
    (r"\bIEC\b", "IEC"),
    (r"\bEN\b", "EN"),
]

YEAR_RE = re.compile(r"(?:19|20)\d{2}")
CLAUSE_RE = re.compile(
    r"\b(?:API|ASME|ISO|ASTM|NACE|IEC|B\d+(?:\.\d+)?|\d+\.\d+(?:\.\d+)*)\b",
    re.IGNORECASE,
)


def parse_standard_meta(filename: str) -> Dict[str, Optional[str]]:
    """Best-effort family/year from an engineering-standard filename."""
    upper = filename.upper()
    family = None
    for pattern, name in FAMILY_PATTERNS:
        if re.search(pattern, upper):
            family = name
            break
    year_match = YEAR_RE.search(filename)
    return {
        "family": family,
        "year": year_match.group(0) if year_match else None,
        "document": filename,
    }


def extract_keyword_terms(question: str) -> List[str]:
    """Clause-like tokens that should boost hybrid retrieval."""
    found = CLAUSE_RE.findall(question or "")
    extras = re.findall(r"\b[A-Z]{2,}(?:\s+\d+(?:\.\d+)*)?\b", question or "")
    terms: List[str] = []
    seen = set()
    for raw in found + extras:
        token = raw.strip()
        key = token.lower()
        if len(token) < 2 or key in seen:
            continue
        seen.add(key)
        terms.append(token)
    return terms


def matches_filters(
    filename: str,
    family: Optional[str] = None,
    year: Optional[str] = None,
    document: Optional[str] = None,
) -> bool:
    meta = parse_standard_meta(filename)
    name = filename.lower()
    if family and (meta["family"] or "").upper() != family.upper() and family.lower() not in name:
        return False
    if year and year not in filename:
        return False
    if document and document.lower() not in name:
        return False
    return True


def keyword_boost(text: str, terms: List[str]) -> float:
    if not terms or not text:
        return 0.0
    hay = text.lower()
    hits = sum(1 for t in terms if t.lower() in hay)
    return hits / max(1, len(terms))
