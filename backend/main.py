from typing import Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

app = FastAPI(
    title="YABATECH Case 9 Expert System API",
    description="Prototype for Student Loan / Financial Aid Eligibility Assessment",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StudentApplication(BaseModel):
    family_income: float = Field(ge=0, description="Annual family income in naira")
    academic_performance: str
    has_outstanding_loan: bool
    applying_for_new_loan: bool

    @field_validator("academic_performance")
    @classmethod
    def validate_academic_performance(cls, value: str) -> str:
        value = value.strip().lower()
        if value not in {"good", "average", "poor"}:
            raise ValueError("Academic performance must be good, average, or poor.")
        return value

class TestCase(BaseModel):
    id: str
    name: str
    description: str
    inputs: dict[str, Any]
    expected: dict[str, Any]

# Knowledge base: assignment examples are separated from proposed demonstration rules.
RULES = [
    {
        "id": "R1",
        "kind": "assignment",
        "goal": "eligibility",
        "conditions": ["family_income < 100000", "academic_performance == good"],
        "result": "high",
        "advice": "Recommend applying for a full bursary",
        "explanation": "The assignment's example rule links annual family income below ₦100,000 and good academic performance to high eligibility.",
    },
    {
        "id": "R2",
        "kind": "assignment",
        "goal": "eligibility",
        "conditions": ["has_outstanding_loan == true", "applying_for_new_loan == true"],
        "result": "rejected",
        "advice": "Must clear existing loan first",
        "explanation": "The assignment's example rule rejects a new loan application when an outstanding loan exists and the student is applying for a new loan.",
    },
    {
        "id": "R3",
        "kind": "proposed",
        "goal": "eligibility",
        "conditions": ["family_income >= 100000", "academic_performance == good", "no outstanding-loan conflict"],
        "result": "review",
        "advice": "Refer the application for further assessment",
        "explanation": "Proposed demonstration rule: the assignment's low-income rule does not apply, so a human reviewer should assess the case.",
    },
    {
        "id": "R4",
        "kind": "proposed",
        "goal": "eligibility",
        "conditions": ["academic_performance == average or poor", "no outstanding-loan conflict"],
        "result": "review",
        "advice": "Refer the application for further assessment",
        "explanation": "Proposed demonstration rule: the supplied example does not define an automatic decision for this academic-performance combination.",
    },
]

def _matches(rule: dict, facts: dict) -> bool:
    """Evaluate the conditions for a candidate rule against known facts."""
    if rule["id"] == "R1":
        return facts["family_income"] < 100000 and facts["academic_performance"] == "good"
    if rule["id"] == "R2":
        return facts["has_outstanding_loan"] is True and facts["applying_for_new_loan"] is True
    if rule["id"] == "R3":
        return facts["family_income"] >= 100000 and facts["academic_performance"] == "good" and not (
            facts["has_outstanding_loan"] and facts["applying_for_new_loan"]
        )
    if rule["id"] == "R4":
        return facts["academic_performance"] in {"average", "poor"} and not (
            facts["has_outstanding_loan"] and facts["applying_for_new_loan"]
        )
    return False

def backward_chain(facts: dict) -> dict:
    """
    Goal-driven backward chaining:
    start with goal eligibility, select rules that can conclude that goal,
    then test whether their antecedent conditions are supported by supplied facts.
    R2 has priority because the assignment says this conflict results in rejection.
    """
    goal = "eligibility"
    candidate_rules = [r for r in RULES if r["goal"] == goal]
    # Try the assignment's rejection rule first, then the high eligibility rule.
    ordered = sorted(candidate_rules, key=lambda r: {"R2": 0, "R1": 1, "R3": 2, "R4": 3}.get(r["id"], 99))
    for rule in ordered:
        if _matches(rule, facts):
            return {
                "eligibility": rule["result"],
                "advice": rule["advice"],
                "rule_id": rule["id"],
                "rule_type": rule["kind"],
                "explanation": rule["explanation"],
                "goal": goal,
                "conditions_checked": rule["conditions"],
                "method": "Backward chaining",
            }
    return {
        "eligibility": "review",
        "advice": "Refer the application for further assessment",
        "rule_id": "NONE",
        "rule_type": "fallback",
        "explanation": "No rule conclusively determines eligibility from the available facts. A human reviewer should assess the application.",
        "goal": goal,
        "conditions_checked": [],
        "method": "Backward chaining",
    }

@app.get("/")
def root():
    return {"message": "YABATECH Case 9 Expert System API is running", "docs": "/docs"}

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/assess")
def assess(application: StudentApplication):
    facts = application.model_dump()
    return {"facts": facts, "result": backward_chain(facts)}

TEST_CASES = [
    {
        "id": "TC01",
        "name": "Low income and good academic performance",
        "description": "Assignment Rule R1",
        "inputs": {"family_income": 80000, "academic_performance": "good", "has_outstanding_loan": False, "applying_for_new_loan": False},
        "expected": {"eligibility": "high", "advice": "Recommend applying for a full bursary", "rule_id": "R1"},
    },
    {
        "id": "TC02",
        "name": "Outstanding loan and new loan application",
        "description": "Assignment Rule R2",
        "inputs": {"family_income": 80000, "academic_performance": "good", "has_outstanding_loan": True, "applying_for_new_loan": True},
        "expected": {"eligibility": "rejected", "advice": "Must clear existing loan first", "rule_id": "R2"},
    },
    {
        "id": "TC03",
        "name": "Income at or above threshold with good performance",
        "description": "Proposed rule: human review",
        "inputs": {"family_income": 150000, "academic_performance": "good", "has_outstanding_loan": False, "applying_for_new_loan": False},
        "expected": {"eligibility": "review", "advice": "Refer the application for further assessment", "rule_id": "R3"},
    },
    {
        "id": "TC04",
        "name": "Average academic performance",
        "description": "Proposed rule: human review",
        "inputs": {"family_income": 80000, "academic_performance": "average", "has_outstanding_loan": False, "applying_for_new_loan": False},
        "expected": {"eligibility": "review", "advice": "Refer the application for further assessment", "rule_id": "R4"},
    },
    {
        "id": "TC05",
        "name": "Poor academic performance",
        "description": "Proposed rule: human review",
        "inputs": {"family_income": 70000, "academic_performance": "poor", "has_outstanding_loan": False, "applying_for_new_loan": False},
        "expected": {"eligibility": "review", "advice": "Refer the application for further assessment", "rule_id": "R4"},
    },
    {
        "id": "TC06",
        "name": "Outstanding loan but not applying for a new loan",
        "description": "No R2 conflict; review",
        "inputs": {"family_income": 200000, "academic_performance": "good", "has_outstanding_loan": True, "applying_for_new_loan": False},
        "expected": {"eligibility": "review", "advice": "Refer the application for further assessment", "rule_id": "R3"},
    },
    {
        "id": "TC07",
        "name": "Income exactly at threshold",
        "description": "R1 uses strictly less than ₦100,000",
        "inputs": {"family_income": 100000, "academic_performance": "good", "has_outstanding_loan": False, "applying_for_new_loan": False},
        "expected": {"eligibility": "review", "advice": "Refer the application for further assessment", "rule_id": "R3"},
    },
]

@app.get("/api/tests")
def list_tests():
    return {"tests": TEST_CASES}

@app.post("/api/tests/run")
def run_tests():
    results = []
    for test in TEST_CASES:
        actual_result = backward_chain(test["inputs"])
        expected = test["expected"]
        actual = {key: actual_result.get(key) for key in expected.keys()}
        passed = actual == expected
        results.append({
            "id": test["id"],
            "name": test["name"],
            "description": test["description"],
            "inputs": test["inputs"],
            "expected_output": expected,
            "actual_output": actual,
            "status": "PASS" if passed else "FAIL",
            "explanation": actual_result["explanation"],
            "rule_type": actual_result["rule_type"],
        })
    return {
        "total": len(results),
        "passed": sum(1 for r in results if r["status"] == "PASS"),
        "failed": sum(1 for r in results if r["status"] == "FAIL"),
        "results": results,
    }
