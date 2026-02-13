"""
Test the nvidia-smi based GPU collector
"""

import subprocess
import json

print("Testing nvidia-smi GPU Collector")
print("=" * 60)

# Test 1: Check nvidia-smi works
print("\n1. Testing nvidia-smi command...")
try:
    result = subprocess.run(['nvidia-smi', '--version'], 
                          capture_output=True, 
                          text=True, 
                          timeout=2)
    if result.returncode == 0:
        print("   ✓ nvidia-smi found")
        print(f"   Version info: {result.stdout.split()[2]}")
    else:
        print("   ✗ nvidia-smi failed")
except Exception as e:
    print(f"   ✗ Error: {e}")
    exit(1)

# Test 2: Query GPU stats
print("\n2. Querying GPU statistics...")
try:
    result = subprocess.run([
        'nvidia-smi',
        '--query-gpu=utilization.gpu,utilization.memory,temperature.gpu,memory.used,memory.total',
        '--format=csv,noheader,nounits'
    ], capture_output=True, text=True, timeout=2)
    
    if result.returncode == 0:
        print("   ✓ Query successful")
        print(f"   Raw output: {result.stdout.strip()}")
        
        values = result.stdout.strip().split(',')
        print(f"\n   Parsed values:")
        print(f"   GPU Usage: {values[0].strip()}%")
        print(f"   Memory Usage: {values[1].strip()}%")
        print(f"   Temperature: {values[2].strip()}°C")
        print(f"   VRAM Used: {values[3].strip()} MB")
        print(f"   VRAM Total: {values[4].strip()} MB")
    else:
        print("   ✗ Query failed")
except Exception as e:
    print(f"   ✗ Error: {e}")

# Test 3: Test the actual collector
print("\n3. Testing GPUCollector class...")
try:
    from collectors.gpu_collector import GPUCollector
    
    collector = GPUCollector()
    print(f"   GPU Available: {collector.gpu_available}")
    
    data = collector.collect()
    print("\n   Collector output:")
    print(json.dumps(data, indent=4))
    
    if data['usage'] > 0 or data['temp'] > 0:
        print("\n   ✓ GPU collector working!")
    else:
        print("\n   ⚠️  GPU returns zeros")
    
except Exception as e:
    print(f"   ✗ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
