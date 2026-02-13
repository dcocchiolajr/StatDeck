"""
Test what the HTTP server actually returns
"""

import json
from collectors.cpu_collector import CPUCollector
from collectors.gpu_collector import GPUCollector
from collectors.ram_collector import RAMCollector
from collectors.disk_collector import DiskCollector
from collectors.network_collector import NetworkCollector

print("Testing Collectors Output...")
print("=" * 60)

collectors = {
    'cpu': CPUCollector(),
    'gpu': GPUCollector(),
    'ram': RAMCollector(),
    'disk': DiskCollector(),
    'network': NetworkCollector()
}

stats = {}

for name, collector in collectors.items():
    try:
        data = collector.collect()
        stats[name] = data
        print(f"\n{name.upper()}:")
        print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"\n{name.upper()}: ERROR - {e}")
        stats[name] = {}

print("\n" + "=" * 60)
print("\nFULL JSON OUTPUT:")
print(json.dumps(stats, indent=2))
