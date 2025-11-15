#!/usr/bin/env python3
"""
Test script for LangGraph Chatbot
"""
import httpx
import sys
import json

LANGGRAPH_URL = "http://localhost:8001"

def test_health():
    """Test health endpoint"""
    print("🔍 Testing health endpoint...")
    try:
        response = httpx.get(f"{LANGGRAPH_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_chat(message: str, user_id: str = "test-user"):
    """Test chat endpoint"""
    print(f"\n💬 Testing chat with message: '{message}'")
    try:
        response = httpx.post(
            f"{LANGGRAPH_URL}/chat",
            json={
                "message": message,
                "user_id": user_id,
                "session_id": "test-session"
            },
            timeout=30.0
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Response: {data.get('response', 'No response')}")
            return True
        else:
            print(f"❌ Chat failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def run_tests():
    """Run all tests"""
    print("=" * 60)
    print("🤖 LangGraph Chatbot Test Suite")
    print("=" * 60)
    
    # Test health
    if not test_health():
        print("\n⚠️  Service not available. Make sure LangGraph is running:")
        print("   docker-compose up langgraph")
        sys.exit(1)
    
    # Test chat with various questions
    test_questions = [
        "Xin chào!",
        "Làm sao để nộp thuốc?",
        "Tôi có bao nhiêu điểm?",
        "Có nhà thuốc nào gần đây không?",
        "Voucher là gì?",
    ]
    
    print("\n" + "=" * 60)
    print("📝 Running Chat Tests")
    print("=" * 60)
    
    passed = 0
    for question in test_questions:
        if test_chat(question):
            passed += 1
    
    print("\n" + "=" * 60)
    print(f"📊 Results: {passed}/{len(test_questions)} tests passed")
    print("=" * 60)
    
    if passed == len(test_questions):
        print("✅ All tests passed!")
        return 0
    else:
        print(f"⚠️  {len(test_questions) - passed} tests failed")
        return 1


if __name__ == "__main__":
    sys.exit(run_tests())
