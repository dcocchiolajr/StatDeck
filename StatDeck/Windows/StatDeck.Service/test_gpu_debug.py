"""
Debug GPU collection with detailed error messages
"""

print("Testing GPU Collector with Debug Info...")
print("=" * 60)

# Test 1: Check if pynvml is installed
print("\n1. Checking pynvml installation...")
try:
    import pynvml
    print("   ✓ pynvml module found")
except ImportError as e:
    print(f"   ✗ pynvml not installed: {e}")
    print("   → Run: pip install nvidia-ml-py3")
    exit(1)

# Test 2: Try to initialize NVML
print("\n2. Initializing NVML...")
try:
    pynvml.nvmlInit()
    print("   ✓ NVML initialized successfully")
except Exception as e:
    print(f"   ✗ Failed to initialize NVML: {e}")
    print("   → Check NVIDIA drivers are installed")
    exit(1)

# Test 3: Get device count
print("\n3. Checking for NVIDIA GPUs...")
try:
    device_count = pynvml.nvmlDeviceGetCount()
    print(f"   ✓ Found {device_count} NVIDIA GPU(s)")
except Exception as e:
    print(f"   ✗ Failed to get device count: {e}")
    exit(1)

# Test 4: Get GPU info
print("\n4. Getting GPU information...")
try:
    handle = pynvml.nvmlDeviceGetHandleByIndex(0)
    name = pynvml.nvmlDeviceGetName(handle)
    print(f"   ✓ GPU 0: {name}")
    
    # Test utilization
    util = pynvml.nvmlDeviceGetUtilizationRates(handle)
    print(f"   GPU Usage: {util.gpu}%")
    
    # Test temperature
    temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
    print(f"   GPU Temp: {temp}°C")
    
    # Test memory
    mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
    print(f"   VRAM Used: {mem.used / (1024**3):.1f} GB")
    print(f"   VRAM Total: {mem.total / (1024**3):.1f} GB")
    
    print("\n✓ All GPU tests passed!")
    
except Exception as e:
    print(f"   ✗ Failed to get GPU info: {e}")
    import traceback
    traceback.print_exc()

# Test 5: Test the actual collector
print("\n5. Testing GPUCollector class...")
try:
    from collectors.gpu_collector import GPUCollector
    import json
    
    collector = GPUCollector()
    data = collector.collect()
    print("   Collector output:")
    print(json.dumps(data, indent=4))
    
except Exception as e:
    print(f"   ✗ Collector failed: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
