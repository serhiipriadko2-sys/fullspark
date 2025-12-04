#!/usr/bin/env python3
"""
Comprehensive import and dependency check for IskraSpaceApp.
This script verifies all critical modules can be imported successfully.
"""
import sys
import traceback

def test_imports():
    """Test all critical imports."""
    results = []

    # Test core models
    try:
        from core.models import (
            IskraMetrics,
            IskraResponse,
            FacetType,
            PhaseType,
            AdomlBlock,
            UserRequest,
            PolicyAnalysis,
            NodeType,
        )
        results.append(("✓ Core models", True))
    except Exception as e:
        results.append(("✗ Core models", False, str(e)))

    # Test core engine
    try:
        from core.engine import FacetEngine
        results.append(("✓ Core engine", True))
    except Exception as e:
        results.append(("✗ Core engine", False, str(e)))

    # Test services
    services_to_test = [
        ("LLM Service", "services.llm", "LLMService"),
        ("Persistence Service", "services.persistence", "PersistenceService"),
        ("Phase Engine", "services.phase_engine", "PhaseEngine"),
        ("Guardrails", "services.guardrails", "GuardrailService"),
        ("Policy Engine", "services.policy_engine", "PolicyEngine"),
        ("Fractal Service", "services.fractal", "FractalService"),
        ("SIFT Protocol", "services.sift_protocol", "SIFTProtocol"),
        ("Telos Layer", "services.telos_layer", "TelosLayer"),
        ("Canon Feedback", "services.canon_feedback_loop", "CanonFeedbackLoop"),
        ("Anti Echo Detector", "services.anti_echo_detector", "AntiEchoDetector"),
        ("Pain Memory Manager", "services.pain_memory_manager", "PainMemoryManager"),
    ]

    for name, module_path, class_name in services_to_test:
        try:
            module = __import__(module_path, fromlist=[class_name])
            getattr(module, class_name)
            results.append((f"✓ {name}", True))
        except Exception as e:
            results.append((f"✗ {name}", False, str(e)))

    # Test memory system
    try:
        from memory.hypergraph import HypergraphMemory
        from memory.growth_nodes import GrowthNode
        results.append(("✓ Memory system", True))
    except Exception as e:
        results.append(("✗ Memory system", False, str(e)))

    # Test config
    try:
        import config
        assert hasattr(config, 'THRESHOLDS')
        assert hasattr(config, 'CORE_MANTRA')
        assert hasattr(config, 'TELOS_CONFIG')
        results.append(("✓ Configuration", True))
    except Exception as e:
        results.append(("✗ Configuration", False, str(e)))

    # Test main app
    try:
        from main import app, get_session
        results.append(("✓ Main application", True))
    except Exception as e:
        results.append(("✗ Main application", False, str(e)))

    return results

def main():
    print("=" * 70)
    print("IskraSpaceApp - Import & Dependency Verification")
    print("=" * 70)
    print()

    results = test_imports()

    passed = 0
    failed = 0

    for result in results:
        if result[1]:
            print(result[0])
            passed += 1
        else:
            print(result[0])
            if len(result) > 2:
                print(f"  Error: {result[2]}")
            failed += 1

    print()
    print("=" * 70)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 70)

    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
