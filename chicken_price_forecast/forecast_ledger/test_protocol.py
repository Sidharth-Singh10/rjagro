import json
import subprocess
import sys
import unittest
from pathlib import Path

from forecast_ledger.protocol import definition


class ProtocolTests(unittest.TestCase):
    def test_fingerprint_is_deterministic_and_methods_are_frozen(self):
        first, config = definition()
        second, _ = definition()
        self.assertEqual(first, second)
        self.assertRegex(first, r'^[a-f0-9]{64}$')
        self.assertEqual([m['id'] for m in config['models']], ['existing', 'hybrid', 'ar1', 'naive'])
        self.assertTrue(config['events'])
        self.assertEqual(config['issuance'], 'on price entry')
        self.assertEqual(config['originsFrom'], '2026-11-01')
        self.assertEqual(config['fitDeadlineSeconds'], 900)
        self.assertIn('sourceFiles', config)

    def test_source_hash_tracks_code_changes(self):
        _, config = definition()
        self.assertTrue(any(path.endswith('forecast_ledger/core.py') for path in config['sourceFiles']))
        self.assertTrue(any(path.endswith('reassessment/models.py') for path in config['sourceFiles']))
        self.assertFalse(any('test_' in path for path in config['sourceFiles']))

    def test_image_requirements_include_timezone_data(self):
        requirements = (Path(__file__).resolve().parents[1] / 'requirements-ledger.txt').read_text()
        self.assertIn('tzdata==', requirements)
        self.assertIn('scikit-learn==', requirements)

    def test_describe_needs_no_database(self):
        root = Path(__file__).resolve().parents[1]
        result = subprocess.run([sys.executable, '-m', 'forecast_ledger.worker', '--describe'],
                                cwd=root, capture_output=True, text=True, timeout=120,
                                env={k: v for k, v in __import__('os').environ.items()
                                     if k not in ('DATABASE_URL', 'FORECAST_PROTOCOL_ID')})
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload['id'], definition()[0])

    def test_worker_refuses_unpinned_protocol(self):
        root = Path(__file__).resolve().parents[1]
        result = subprocess.run([sys.executable, '-m', 'forecast_ledger.worker'],
                                cwd=root, capture_output=True, text=True, timeout=120,
                                env={'PATH': '/usr/bin:/bin', 'PYTHONPATH': str(root)})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('FORECAST_PROTOCOL_ID', result.stderr)


if __name__ == '__main__':
    unittest.main()
