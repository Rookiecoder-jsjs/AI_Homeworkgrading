"""Pytest configuration: ensure the backend package is importable.

`backend/` is treated as a flat module directory (no __init__.py), so we
prepend it to sys.path so `import utils`, `import database`, etc. work
both from the backend dir and from tests/.
"""
import os
import sys

import pytest

BACKEND_DIR = os.path.join(os.path.dirname(__file__), "..", "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, os.path.abspath(BACKEND_DIR))


@pytest.fixture
def backend_dir():
    return os.path.abspath(BACKEND_DIR)
