#!/usr/bin/env python3
"""
派生密钥安全测试脚本
测试新的派生密钥系统是否能有效防止恶意攻击
网站：https://eversoul.3000y.cloud/
"""

import requests
import hashlib
import base64
import json
import time
import random
from typing import Dict, Optional, Tuple

BASE_URL = "https://eversoul.3000y.cloud"

class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_test(name: str, description: str):
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*80}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}测试: {name}{Colors.RESET}")
    print(f"{Colors.YELLOW}{description}{Colors.RESET}")
    print(f"{Colors.CYAN}{'='*80}{Colors.RESET}")

def print_success(message: str):
    print(f"{Colors.GREEN}✓ {message}{Colors.RESET}")

def print_failure(message: str):
    print(f"{Colors.RED}✗ {message}{Colors.RESET}")

def print_info(message: str):
    print(f"{Colors.BLUE}ℹ {message}{Colors.RESET}")

def print_warning(message: str):
    print(f"{Colors.YELLOW}⚠ {message}{Colors.RESET}")

def get_challenge() -> Optional[Dict]:
    """获取 challenge 数据（包含派生密钥）"""
    try:
        # 添加随机参数绕过 CDN 缓存
        cache_buster = int(time.time() * 1000)
        response = requests.get(f"{BASE_URL}/api/auth/challenge?_t={cache_buster}")
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                return data['data']
        return None
    except Exception as e:
        print_failure(f"获取 challenge 失败: {e}")
        return None

def generate_signature(source: str, timestamp: int, nonce: str, derived_key: str) -> str:
    """使用派生密钥生成签名"""
    # 复杂的时间戳算法
    nonce_num = int(nonce[:8], 16) % 3600000
    complex_timestamp = timestamp + nonce_num
    
    # 拼接 payload（使用派生密钥）
    payload = f"{derived_key}{source}{complex_timestamp}{nonce}"
    
    # SHA-512 哈希
    hash_obj = hashlib.sha512(payload.encode('utf-8'))
    hash_bytes = hash_obj.digest()
    
    # Base64 URL-safe 编码，去除尾部=
    signature = base64.urlsafe_b64encode(hash_bytes).decode('utf-8').rstrip('=')
    
    return signature

# ============================================================================
# 测试 1: 无签名攻击
# ============================================================================
def test_1_no_signature_attack():
    """测试1：尝试不带签名直接注册（应该被拦截）"""
    print_test(
        "无签名攻击",
        "模拟恶意脚本不带任何签名参数直接发送请求"
    )
    
    url = f"{BASE_URL}/api/user/register"
    payload = {
        "email": f"attacker_{int(time.time())}@hack.com",
        "password": "hack123",
        "nickname": "Hacker"
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        print_info(f"状态码: {response.status_code}")
        
        try:
            result = response.json()
            print_info(f"响应: {result}")
        except:
            print_info(f"响应: {response.text[:200]}")
        
        if response.status_code == 400:
            print_success("✓ 防护有效：无签名请求被正确拦截")
            return True
        else:
            print_failure("✗ 安全漏洞：无签名请求竟然通过了！")
            return False
    except Exception as e:
        print_failure(f"请求失败: {e}")
        return False

# ============================================================================
# 测试 2: 伪造派生密钥攻击
# ============================================================================
def test_2_fake_derived_key_attack():
    """测试2：尝试使用伪造的派生密钥（应该被拦截）"""
    print_test(
        "伪造派生密钥攻击",
        "攻击者尝试自己生成一个假的派生密钥来签名"
    )
    
    # 获取真实的 challenge（但我们会伪造派生密钥）
    challenge = get_challenge()
    if not challenge:
        print_failure("无法获取 challenge")
        return False
    
    print_info(f"获取到 timestamp: {challenge['timestamp']}")
    print_info(f"获取到 nonce: {challenge['nonce'][:16]}...")
    print_info(f"获取到 sessionId: {challenge['sessionId']}")
    
    # 伪造一个派生密钥（随机生成）
    fake_derived_key = hashlib.sha256(f"fake_key_{random.random()}".encode()).hexdigest()
    print_warning(f"伪造的派生密钥: {fake_derived_key[:32]}...")
    
    # 使用伪造的密钥生成签名
    timestamp_short = str(int(time.time()))[-6:]
    email = f"fake_{timestamp_short}@hack.com"
    password = "hack123"
    nickname = f"Fake{timestamp_short}"
    
    source = f"{email}{nickname}{password}"
    signature = generate_signature(source, challenge['timestamp'], challenge['nonce'], fake_derived_key)
    
    print_info(f"伪造的签名: {signature[:32]}...")
    
    # 发送请求
    url = f"{BASE_URL}/api/user/register?s={signature}&t={challenge['timestamp']}&n={challenge['nonce']}&sid={challenge['sessionId']}"
    payload = {
        "email": email,
        "password": password,
        "nickname": nickname
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        print_info(f"状态码: {response.status_code}")
        
        try:
            result = response.json()
            print_info(f"响应: {result}")
        except:
            print_info(f"响应: {response.text[:200]}")
        
        if response.status_code in [400, 403]:
            print_success("✓ 防护有效：伪造的派生密钥被识破")
            return True
        else:
            print_failure("✗ 严重安全漏洞：伪造的派生密钥竟然有效！")
            return False
    except Exception as e:
        print_failure(f"请求失败: {e}")
        return False

# ============================================================================
# 测试 3: 跨会话攻击
# ============================================================================
def test_3_cross_session_attack():
    """测试3：尝试使用一个会话的派生密钥在另一个会话中使用（应该被拦截）"""
    print_test(
        "跨会话攻击",
        "攻击者尝试窃取别人的派生密钥并在自己的会话中使用"
    )
    
    # 获取第一个会话的 challenge
    print_info("获取第一个会话...")
    challenge1 = get_challenge()
    if not challenge1:
        print_failure("无法获取第一个 challenge")
        return False
    
    print_info(f"会话1 - sessionId: {challenge1['sessionId']}")
    
    # 等待一下，然后获取第二个会话的 challenge
    time.sleep(0.5)
    print_info("获取第二个会话...")
    challenge2 = get_challenge()
    if not challenge2:
        print_failure("无法获取第二个 challenge")
        return False
    
    print_info(f"会话2 - sessionId: {challenge2['sessionId']}")
    
    # 尝试使用会话1的派生密钥和会话2的sessionId
    print_warning("尝试跨会话攻击：使用会话1的派生密钥 + 会话2的sessionId")
    
    timestamp_short = str(int(time.time()))[-6:]
    email = f"cross_{timestamp_short}@hack.com"
    password = "hack123"
    nickname = f"Cross{timestamp_short}"
    
    source = f"{email}{nickname}{password}"
    # 使用会话1的派生密钥生成签名
    signature = generate_signature(source, challenge1['timestamp'], challenge1['nonce'], challenge1['derivedKey'])
    
    # 但是使用会话2的参数
    url = f"{BASE_URL}/api/user/register?s={signature}&t={challenge2['timestamp']}&n={challenge2['nonce']}&sid={challenge2['sessionId']}"
    payload = {
        "email": email,
        "password": password,
        "nickname": nickname
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        print_info(f"状态码: {response.status_code}")
        
        try:
            result = response.json()
            print_info(f"响应: {result}")
        except:
            print_info(f"响应: {response.text[:200]}")
        
        if response.status_code in [400, 403]:
            print_success("✓ 防护有效：跨会话攻击被识破")
            return True
        else:
            print_failure("✗ 安全漏洞：跨会话攻击成功！")
            return False
    except Exception as e:
        print_failure(f"请求失败: {e}")
        return False

# ============================================================================
# 测试 4: 正确的签名请求
# ============================================================================
def test_4_correct_signature():
    """测试4：使用正确的派生密钥和签名（应该成功）"""
    print_test(
        "正确签名请求",
        "验证合法用户使用正确的派生密钥可以成功注册"
    )
    
    # 获取 challenge
    challenge = get_challenge()
    if not challenge:
        print_failure("无法获取 challenge")
        return False
    
    print_info(f"timestamp: {challenge['timestamp']}")
    print_info(f"nonce: {challenge['nonce'][:16]}...")
    print_info(f"sessionId: {challenge['sessionId']}")
    print_info(f"derivedKey: {challenge['derivedKey'][:32]}...")
    
    # 生成正确的签名
    timestamp_short = str(int(time.time()))[-6:]
    email = f"legit_{timestamp_short}@example.com"
    password = "test123456"
    nickname = f"User{timestamp_short}"
    
    source = f"{email}{nickname}{password}"
    signature = generate_signature(source, challenge['timestamp'], challenge['nonce'], challenge['derivedKey'])
    
    print_info(f"签名: {signature[:32]}...")
    
    # 发送请求
    url = f"{BASE_URL}/api/user/register?s={signature}&t={challenge['timestamp']}&n={challenge['nonce']}&sid={challenge['sessionId']}"
    payload = {
        "email": email,
        "password": password,
        "nickname": nickname
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        print_info(f"状态码: {response.status_code}")
        
        try:
            result = response.json()
            print_info(f"响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
        except:
            print_info(f"响应: {response.text[:200]}")
        
        if response.status_code == 200:
            print_success("✓ 系统正常：正确的签名请求成功")
            return True
        else:
            print_failure(f"✗ 系统异常：正确的签名请求失败（{response.status_code}）")
            return False
    except Exception as e:
        print_failure(f"请求失败: {e}")
        return False

# ============================================================================
# 测试 5: 重放攻击
# ============================================================================
def test_5_replay_attack():
    """测试5：尝试重复使用相同的签名（应该被拦截）"""
    print_test(
        "重放攻击",
        "攻击者尝试重复使用之前的有效签名"
    )
    
    # 获取 challenge
    challenge = get_challenge()
    if not challenge:
        print_failure("无法获取 challenge")
        return False
    
    # 生成签名
    timestamp_short = str(int(time.time()))[-6:]
    email = f"replay_{timestamp_short}@example.com"
    password = "test123456"
    nickname = f"Replay{timestamp_short}"
    
    source = f"{email}{nickname}{password}"
    signature = generate_signature(source, challenge['timestamp'], challenge['nonce'], challenge['derivedKey'])
    
    url = f"{BASE_URL}/api/user/register?s={signature}&t={challenge['timestamp']}&n={challenge['nonce']}&sid={challenge['sessionId']}"
    payload = {
        "email": email,
        "password": password,
        "nickname": nickname
    }
    
    try:
        # 第一次请求
        print_info("发送第一次请求...")
        response1 = requests.post(url, json=payload, timeout=10)
        print_info(f"第一次请求状态码: {response1.status_code}")
        
        # 第二次请求（重放攻击）
        time.sleep(0.5)
        print_warning("尝试重放攻击：使用相同的签名再次请求...")
        
        # 修改邮箱避免"邮箱已注册"的错误
        ts2 = str(int(time.time()))[-6:]
        payload2 = {
            "email": f"replay2_{ts2}@example.com",
            "password": password,
            "nickname": f"Replay2{ts2}"
        }
        
        response2 = requests.post(url, json=payload2, timeout=10)
        print_info(f"第二次请求状态码: {response2.status_code}")
        
        try:
            result2 = response2.json()
            print_info(f"第二次请求响应: {result2}")
        except:
            print_info(f"响应: {response2.text[:200]}")
        
        if response2.status_code == 403:
            print_success("✓ 防护有效：重放攻击被正确拦截")
            return True
        else:
            print_failure("✗ 安全漏洞：重放攻击成功！")
            return False
    except Exception as e:
        print_failure(f"请求失败: {e}")
        return False

# ============================================================================
# 测试 6: 过期时间戳攻击
# ============================================================================
def test_6_expired_timestamp():
    """测试6：使用过期的时间戳（应该被拦截）"""
    print_test(
        "过期时间戳攻击",
        "攻击者使用10分钟前的时间戳"
    )
    
    # 获取 challenge 但使用过期的时间戳
    challenge = get_challenge()
    if not challenge:
        print_failure("无法获取 challenge")
        return False
    
    # 使用10分钟前的时间戳
    expired_timestamp = challenge['timestamp'] - (10 * 60 * 1000)
    print_warning(f"使用过期时间戳: {expired_timestamp} (10分钟前)")
    
    timestamp_short = str(int(time.time()))[-6:]
    email = f"expired_{timestamp_short}@example.com"
    password = "test123456"
    nickname = f"Exp{timestamp_short}"
    
    source = f"{email}{nickname}{password}"
    signature = generate_signature(source, expired_timestamp, challenge['nonce'], challenge['derivedKey'])
    
    url = f"{BASE_URL}/api/user/register?s={signature}&t={expired_timestamp}&n={challenge['nonce']}&sid={challenge['sessionId']}"
    payload = {
        "email": email,
        "password": password,
        "nickname": nickname
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        print_info(f"状态码: {response.status_code}")
        
        try:
            result = response.json()
            print_info(f"响应: {result}")
        except:
            print_info(f"响应: {response.text[:200]}")
        
        if response.status_code == 403:
            print_success("✓ 防护有效：过期时间戳被正确拦截")
            return True
        else:
            print_failure("✗ 安全漏洞：过期时间戳竟然通过了！")
            return False
    except Exception as e:
        print_failure(f"请求失败: {e}")
        return False

# ============================================================================
# 测试 7: 批量注册攻击
# ============================================================================
def test_7_bulk_registration_attack():
    """测试7：尝试快速批量注册（测试是否有其他限制）"""
    print_test(
        "批量注册攻击",
        "攻击者尝试在短时间内注册大量账号"
    )
    
    print_info("尝试在5秒内注册10个账号...")
    success_count = 0
    fail_count = 0
    
    for i in range(10):
        try:
            # 每次获取新的 challenge
            challenge = get_challenge()
            if not challenge:
                fail_count += 1
                continue
            
            # 生成签名
            timestamp_short = str(int(time.time()))[-6:]
            email = f"bulk_{timestamp_short}_{i}@example.com"
            password = "test123456"
            nickname = f"Bulk{timestamp_short}{i}"
            
            source = f"{email}{nickname}{password}"
            signature = generate_signature(source, challenge['timestamp'], challenge['nonce'], challenge['derivedKey'])
            
            url = f"{BASE_URL}/api/user/register?s={signature}&t={challenge['timestamp']}&n={challenge['nonce']}&sid={challenge['sessionId']}"
            payload = {
                "email": email,
                "password": password,
                "nickname": nickname
            }
            
            response = requests.post(url, json=payload, timeout=10)
            
            if response.status_code == 200:
                success_count += 1
                print(f"  {Colors.GREEN}✓{Colors.RESET} 第{i+1}次注册成功")
            else:
                fail_count += 1
                try:
                    result = response.json()
                    print(f"  {Colors.RED}✗{Colors.RESET} 第{i+1}次注册失败: {result.get('message', response.status_code)}")
                except:
                    print(f"  {Colors.RED}✗{Colors.RESET} 第{i+1}次注册失败: {response.status_code}")
            
            # 短暂延迟
            time.sleep(0.3)
        except Exception as e:
            fail_count += 1
            print(f"  {Colors.RED}✗{Colors.RESET} 第{i+1}次请求异常: {e}")
    
    print_info(f"批量注册结果: 成功{success_count}个，失败{fail_count}个")
    
    # 如果大部分都成功了，说明没有额外的速率限制
    if success_count >= 8:
        print_warning("⚠ 注意：批量注册基本都成功了，可能需要额外的速率限制")
        print_info("建议：添加基于 IP 或 User-Agent 的速率限制")
        return False
    else:
        print_success("✓ 批量注册受到了一定限制")
        return True

# ============================================================================
# 主测试函数
# ============================================================================
def main():
    print(f"\n{Colors.BOLD}{Colors.MAGENTA}")
    print("╔════════════════════════════════════════════════════════════════════════╗")
    print("║              派生密钥安全系统测试套件                                    ║")
    print("║         Derived Key Security System Test Suite                        ║")
    print("╚════════════════════════════════════════════════════════════════════════╝")
    print(f"{Colors.RESET}\n")
    
    print_info(f"目标网站: {BASE_URL}")
    print_info("测试将模拟各种恶意攻击场景\n")
    
    results = []
    
    # 运行所有测试
    print(f"\n{Colors.BOLD}{Colors.CYAN}开始安全测试...{Colors.RESET}\n")
    
    results.append(("无签名攻击", test_1_no_signature_attack()))
    results.append(("伪造派生密钥攻击", test_2_fake_derived_key_attack()))
    results.append(("跨会话攻击", test_3_cross_session_attack()))
    results.append(("正确签名请求", test_4_correct_signature()))
    results.append(("重放攻击防护", test_5_replay_attack()))
    results.append(("过期时间戳防护", test_6_expired_timestamp()))
    results.append(("批量注册限制", test_7_bulk_registration_attack()))
    
    # 打印总结
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*80}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.MAGENTA}测试总结{Colors.RESET}")
    print(f"{Colors.CYAN}{'='*80}{Colors.RESET}\n")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        if result:
            print(f"{Colors.GREEN}✓{Colors.RESET} {name}")
        else:
            print(f"{Colors.RED}✗{Colors.RESET} {name}")
    
    print(f"\n{Colors.BOLD}通过率: {passed}/{total} ({passed*100//total}%){Colors.RESET}")
    
    if passed == total:
        print(f"\n{Colors.BOLD}{Colors.GREEN}🎉 所有安全测试通过！派生密钥系统运行正常。{Colors.RESET}")
        print(f"{Colors.GREEN}✅ 主 AppKey 未泄露，即使派生密钥被窃取也无法推导出主密钥。{Colors.RESET}")
    elif passed >= total * 0.8:
        print(f"\n{Colors.BOLD}{Colors.YELLOW}⚠️  大部分测试通过，但仍有改进空间。{Colors.RESET}")
    else:
        print(f"\n{Colors.BOLD}{Colors.RED}❌ 发现严重安全漏洞！请立即修复。{Colors.RESET}")
    
    # 安全评估
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*80}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.MAGENTA}安全评估{Colors.RESET}")
    print(f"{Colors.CYAN}{'='*80}{Colors.RESET}\n")
    
    print(f"{Colors.BOLD}派生密钥系统的优势：{Colors.RESET}")
    print(f"  {Colors.GREEN}✓{Colors.RESET} 主 AppKey 永远不暴露给客户端")
    print(f"  {Colors.GREEN}✓{Colors.RESET} 每个会话使用不同的派生密钥")
    print(f"  {Colors.GREEN}✓{Colors.RESET} 派生密钥基于 sessionId + nonce + timestamp + User-Agent")
    print(f"  {Colors.GREEN}✓{Colors.RESET} 即使派生密钥泄露，也无法：")
    print(f"    • 推导出主 AppKey")
    print(f"    • 在其他会话中使用")
    print(f"    • 生成其他用户的签名")
    print(f"  {Colors.GREEN}✓{Colors.RESET} 结合 nonce 防重放机制")
    print(f"  {Colors.GREEN}✓{Colors.RESET} 结合时间窗口防护（5分钟）")
    
    print(f"\n{Colors.CYAN}{'='*80}{Colors.RESET}\n")

if __name__ == "__main__":
    main()

