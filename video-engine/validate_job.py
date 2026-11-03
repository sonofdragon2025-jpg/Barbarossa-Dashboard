"""Standard-library-only draft intake validation. Does not download or publish."""
import json
from pathlib import Path

POLICY = json.loads((Path(__file__).parent / "job-policy.json").read_text())

def validate_job(job):
    if POLICY["global_pause"]:
        return False, "global_pause"
    if job.get("mode") not in POLICY["modes"]:
        return False, "invalid_mode"
    if job["mode"] == "authorized_source_clips" and not job.get("rights_evidence"):
        return False, "missing_rights_evidence"
    estimated = job.get("estimated_cost_usd")
    spent = job.get("monthly_spent_usd")
    if any(type(v) not in (int, float) or v < 0 for v in (estimated, spent)):
        return False, "unverified_cost"
    if estimated + spent > POLICY["monthly_total_cap_usd"]:
        return False, "budget_exceeded"
    return True, "draft_only"

if __name__ == "__main__":
    print("Video intake validator available; global pause is ON.")
