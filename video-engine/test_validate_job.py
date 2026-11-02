import unittest
from unittest.mock import patch
from validate_job import validate_job

class JobPolicyTests(unittest.TestCase):
    def setUp(self):
        self.job = {"mode":"authorized_source_clips","rights_evidence":"licensed","estimated_cost_usd":1,"monthly_spent_usd":20}
    def test_global_pause_blocks(self):
        self.assertEqual(validate_job(self.job), (False,"global_pause"))
    def test_missing_rights(self):
        with patch.dict("validate_job.POLICY", {"global_pause":False}):
            self.assertEqual(validate_job({**self.job,"rights_evidence":""})[1],"missing_rights_evidence")
    def test_budget_cap(self):
        with patch.dict("validate_job.POLICY", {"global_pause":False}):
            self.assertEqual(validate_job({**self.job,"monthly_spent_usd":100})[1],"budget_exceeded")
    def test_unverified_cost(self):
        with patch.dict("validate_job.POLICY", {"global_pause":False}):
            self.assertEqual(validate_job({**self.job,"estimated_cost_usd":None})[1],"unverified_cost")
    def test_approved_draft_intake(self):
        with patch.dict("validate_job.POLICY", {"global_pause":False}):
            self.assertEqual(validate_job(self.job), (True,"draft_only"))

if __name__ == "__main__":
    unittest.main()
