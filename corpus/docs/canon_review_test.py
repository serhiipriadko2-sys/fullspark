import pathlib, subprocess, sys, json, re

def run(cmd):
    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

def test_decision_logic():
    # Ensure baseline exists
    rpt = pathlib.Path("reports/baseline_report.md")
    assert rpt.exists(), "baseline_report.md missing"

    # Run decide
    out = run([sys.executable, "ops/canon_review/decide.py"])
    print(out.stdout)
    assert '"verdict": "keep"' in out.stdout, "Expected KEEP with current metrics"

    # Enforce keep
    out2 = run([sys.executable, "ops/canon_review/enforce.py", "keep"])
    print(out2.stdout)
    assert "passed" in out2.stdout.lower()

if __name__ == "__main__":
    test_decision_logic()
    print("Canon Review Test: ✅ PASS")
