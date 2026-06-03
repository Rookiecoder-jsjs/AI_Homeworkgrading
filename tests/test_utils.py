"""Tests for backend/utils.py — focus on extract_json robustness.

These cases mirror the 14 boundary tests called out in ARCHITECTURE.md §5
plus a few extras for the trailing-comma and string-escape paths.
"""
import pytest

from utils import extract_json


class TestExtractJsonHappyPath:
    def test_simple_object(self):
        assert extract_json('{"a": 1}') == {"a": 1}

    def test_nested_object(self):
        assert extract_json('{"a": {"b": [1, 2]}}') == {"a": {"b": [1, 2]}}

    def test_brace_with_string_value(self):
        # Common case: AI returns an object with Chinese string values.
        assert extract_json('{"feedback": "回答正确"}') == {"feedback": "回答正确"}


class TestExtractJsonCodeFence:
    def test_json_fence(self):
        assert extract_json('```json\n{"a": 1}\n```') == {"a": 1}

    def test_bare_fence(self):
        assert extract_json('```\n{"a": 1}\n```') == {"a": 1}


class TestExtractJsonBracesInString:
    def test_brace_in_string(self):
        assert extract_json('{"msg": "hello {world}"}') == {"msg": "hello {world}"}

    def test_escaped_quote_in_string(self):
        assert extract_json(r'{"msg": "say \"hi\""}') == {"msg": 'say "hi"'}

    def test_backslash_in_string(self):
        assert extract_json(r'{"path": "C:\\dir"}') == {"path": "C:\\dir"}


class TestExtractJsonSetNotationBefore:
    def test_set_brace_then_json(self):
        # Some AI responses lead with a non-JSON brace like "{x | x in A}"
        assert extract_json('Hi {stuff} then {"a": 1}') == {"a": 1}

    def test_text_then_json(self):
        assert extract_json('Here is the JSON: {"a": 2}') == {"a": 2}


class TestExtractJsonTrailingComma:
    def test_trailing_comma_in_object(self):
        assert extract_json('{"a": 1, "b": 2,}') == {"a": 1, "b": 2}

    def test_trailing_comma_in_array(self):
        assert extract_json('{"a": [1, 2, 3,]}') == {"a": [1, 2, 3]}


class TestExtractJsonFailures:
    def test_no_json(self):
        assert extract_json("just some text") is None

    def test_unclosed_brace(self):
        assert extract_json('{"a": 1') is None

    def test_empty_string(self):
        assert extract_json("") is None

    def test_whitespace_only(self):
        assert extract_json("   \n\t  ") is None
