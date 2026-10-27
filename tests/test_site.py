"""Frozen acceptance checks for every page in site/. Standard library only.

These tests belong to the project owner: contributors, people or agents, must
not edit them to make a change pass (CODEOWNERS and the branch ruleset).
"""

import re
import unittest
from html.parser import HTMLParser
from pathlib import Path

SITE = Path(__file__).resolve().parents[1] / "site"


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags, self.attrs, self.title, self._in_title = [], [], "", False

    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)
        self.attrs.append((tag, dict(attrs)))
        self._in_title = tag == "title"

    def handle_endtag(self, tag):
        self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data


def pages():
    found = sorted(SITE.rglob("*.html"))
    assert found, "site/ needs at least index.html"
    for path in found:
        page = Page()
        page.feed(path.read_text(encoding="utf-8"))
        yield path, page


class SiteTests(unittest.TestCase):
    def test_every_page_declares_language_title_and_viewport(self):
        for path, page in pages():
            with self.subTest(page=path.name):
                html = dict(page.attrs)["html"]
                self.assertTrue(html.get("lang"))
                self.assertTrue(page.title.strip())
                metas = [a for t, a in page.attrs if t == "meta"]
                self.assertTrue(any(m.get("name") == "viewport" for m in metas))

    def test_every_page_has_one_h1_and_the_main_landmarks(self):
        for path, page in pages():
            with self.subTest(page=path.name):
                self.assertEqual(page.tags.count("h1"), 1)
                for landmark in ("header", "main", "footer"):
                    self.assertIn(landmark, page.tags)

    def test_images_have_alt_text_and_links_have_targets(self):
        for path, page in pages():
            for tag, attrs in page.attrs:
                with self.subTest(page=path.name, tag=tag):
                    if tag == "img":
                        self.assertIn("alt", attrs)
                    if tag == "a":
                        self.assertTrue(attrs.get("href"))

    def test_local_links_and_assets_resolve(self):
        for path, page in pages():
            for tag, attrs in page.attrs:
                target = attrs.get("href") or attrs.get("src")
                if not target or re.match(r"(https?:|mailto:|tel:|#)", target):
                    continue
                local = target.replace("%BASE%", "").split("#")[0].split("?")[0]
                with self.subTest(page=path.name, target=target):
                    self.assertTrue((SITE / local).exists() or local == "")

    def test_no_external_or_inline_scripts(self):
        for path, page in pages():
            with self.subTest(page=path.name):
                self.assertNotIn("script", page.tags)

    def test_no_active_content(self):
        # A static page runs nothing and sends nothing anywhere: no event
        # handlers, script or data URLs, embedded documents, forms or
        # redirects, whatever its text asked for.
        for path, page in pages():
            for tag, attrs in page.attrs:
                with self.subTest(page=path.name, tag=tag):
                    self.assertNotIn(tag, ("iframe", "object", "embed", "form", "frame", "base"))
                    self.assertFalse([name for name in attrs if name.startswith("on")])
                    if tag == "meta":
                        self.assertNotEqual((attrs.get("http-equiv") or "").lower(), "refresh")
                    for name in ("href", "src", "action", "data", "formaction"):
                        value = re.sub(r"\s", "", attrs.get(name) or "").lower()
                        self.assertFalse(value.startswith(("javascript:", "data:", "vbscript:")))

    def test_the_release_marker_is_present(self):
        index = (SITE / "index.html").read_text(encoding="utf-8")
        self.assertIn('data-release="%RELEASE%"', index)


if __name__ == "__main__":
    unittest.main()
