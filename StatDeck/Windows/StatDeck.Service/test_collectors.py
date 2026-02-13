#!/usr/bin/env python3
"""
Test all hardware collectors independently
Run this BEFORE starting the full service
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 80)
print("STATDECK COLLECTOR TESTS")
print("=" * 80)
print()

# Test CPU Collector
print("1. Testing CPU Collector...")
try:
    from collectors.cpu_collector import CPUCollector
    cpu = CPUCollector()
    stats = cpu.collect()
    
    print(f"   CPU Usage: {stats['usage']}%")
    print(f"   CPU Temp: {stats['temp']}°C (None if not available)")
    print(f"   Core Count: {stats['core_count']}")
    print(f"   Per-Core Usage: {stats['cores'][:4]}...")  # First 4 cores
    print("   ✓ CPU Collector OK\n")
except Exception as e:
    print(f"   ✗ CPU Collector FAILED: {e}\n")
    sys.exit(1)

# Test RAM Collector
print("2. Testing RAM Collector...")
try:
    from collectors.ram_collector import RAMCollector
    ram = RAMCollector()
    stats = ram.collect()
    
    print(f"   RAM Used: {stats['used']} MB")
    print(f"   RAM Total: {stats['total']} MB")
    print(f"   RAM Percent: {stats['percent']}%")
    print(f"   RAM Available: {stats['available']} MB")
    print("   ✓ RAM Collector OK\n")
except Exception as e:
    print(f"   ✗ RAM Collector FAILED: {e}\n")
    sys.exit(1)

# Test Disk Collector
print("3. Testing Disk Collector...")
try:
    from collectors.disk_collector import DiskCollector
    disk = DiskCollector()
    
    # Call twice to get speed measurements
    disk.collect()
    import time
    time.sleep(0.5)
    stats = disk.collect()
    
    print(f"   Disk Read Speed: {stats['read_speed']} MB/s")
    print(f"   Disk Write Speed: {stats['write_speed']} MB/s")
    print(f"   Disk Usage: {stats['usage_percent']}%")
    print("   ✓ Disk Collector OK\n")
except Exception as e:
    print(f"   ✗ Disk Collector FAILED: {e}\n")
    sys.exit(1)

# Test Network Collector
print("4. Testing Network Collector...")
try:
    from collectors.network_collector import NetworkCollector
    net = NetworkCollector()
    
    # Call twice to get speed measurements
    net.collect()
    import time
    time.sleep(0.5)
    stats = net.collect()
    
    print(f"   Upload Speed: {stats['upload_speed']} KB/s")
    print(f"   Download Speed: {stats['download_speed']} KB/s")
    print("   ✓ Network Collector OK\n")
except Exception as e:
    print(f"   ✗ Network Collector FAILED: {e}\n")
    sys.exit(1)

# Test GPU Collector
print("5. Testing GPU Collector...")
try:
    from collectors.gpu_collector import GPUCollector
    gpu = GPUCollector()
    stats = gpu.collect()
    
    if gpu.gpu_available:
        print(f"   GPU Usage: {stats['usage']}%")
        print(f"   GPU Temp: {stats['temp']}°C")
        print(f"   VRAM Used: {stats['vram_used']} MB")
        print(f"   VRAM Total: {stats['vram_total']} MB")
        print("   ✓ GPU Collector OK (GPU detected)\n")
    else:
        print("   ⚠️  GPU Collector OK (No GPU library available)")
        print("   Install pynvml for NVIDIA GPU support\n")
except Exception as e:
    print(f"   ✗ GPU Collector FAILED: {e}\n")
    sys.exit(1)

print("=" * 80)
print("✅ ALL COLLECTORS PASSED!")
print("=" * 80)
print("\nYou can now test the full service:")
print("  python main.py")
