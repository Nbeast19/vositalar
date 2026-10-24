"""Boblar va roviylar qatlamlari katalogga ulanishi (scripts/publish_release.py layers) va Pages nashrida
Release'dan olinishi (scripts/fetch_release_packages.py) — QARORLAR.md #53."""
import hashlib
import importlib.util
import io
import json
import zipfile
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


def _load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / f"{name}.py")
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


pr = _load("publish_release")
fr = _load("fetch_release_packages")


def _overlay(path: Path, target_sha: str, kind="overlay") -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("package.json", json.dumps({"package_id": "hm-overlay-x", "kind": kind, "package_version": "0.2.0",
                                                "title": {"uz": "X: boblar (mahalliy qatlam)"},
                                                "target": {"package_sha256": target_sha}}))
    path.write_bytes(buf.getvalue())
    return buf.getvalue()


@pytest.fixture
def site(tmp_path):
    web = tmp_path / "web"
    web.mkdir()
    cat = {"release": {"repo": "o/r", "tag": "kitoblar-v1"},
           "packages": [{"package_id": "hm-x", "kind": "base_book", "file": "paketlar/hm-x-1.hmz", "package_sha256": "a" * 64},
                        {"package_id": "hm-sharh", "kind": "commentary", "file": "paketlar/hm-sharh-1.hmz", "package_sha256": "b" * 64}]}
    (web / "catalog.json").write_text(json.dumps(cat), "utf-8")
    (tmp_path / "assets.json").write_text(json.dumps([{"name": "hm-overlay-x-0.2.0.hmz", "id": 7}]), "utf-8")
    return tmp_path, web


def test_layer_attaches_to_its_book_by_target_sha(site):
    tmp, web = site
    data = _overlay(tmp / "hm-overlay-x-0.2.0.hmz", "a" * 64)
    assert pr.layers([tmp / "hm-overlay-x-0.2.0.hmz"], tmp / "assets.json", web, "o/r", "qatlamlar-v1") == {"layers": 1}
    cat = json.loads((web / "catalog.json").read_text("utf-8"))
    base, comm = cat["packages"]
    ov = base["overlay"]
    assert ov["package_sha256"] == hashlib.sha256(data).hexdigest() and ov["compressed_bytes"] == len(data)
    assert ov["file"] == "paketlar/hm-overlay-x-0.2.0.hmz" and ov["release_tag"] == "qatlamlar-v1" and ov["release_asset_id"] == 7
    assert ov["download_url"] == "https://github.com/o/r/releases/download/qatlamlar-v1/hm-overlay-x-0.2.0.hmz"
    assert "overlay" not in comm


def test_layer_for_another_book_version_or_missing_asset_is_refused(site):
    tmp, web = site
    _overlay(tmp / "hm-overlay-x-0.2.0.hmz", "c" * 64)
    with pytest.raises(SystemExit, match="asosiy kitob"):
        pr.layers([tmp / "hm-overlay-x-0.2.0.hmz"], tmp / "assets.json", web, "o/r", "qatlamlar-v1")
    _overlay(tmp / "hm-overlay-y-0.2.0.hmz", "a" * 64)
    with pytest.raises(SystemExit, match="asset yo'q"):
        pr.layers([tmp / "hm-overlay-y-0.2.0.hmz"], tmp / "assets.json", web, "o/r", "qatlamlar-v1")
    _overlay(tmp / "hm-overlay-x-0.2.0.hmz", "a" * 64, kind="base_book")
    with pytest.raises(SystemExit, match="qatlam paketi emas"):
        pr.layers([tmp / "hm-overlay-x-0.2.0.hmz"], tmp / "assets.json", web, "o/r", "qatlamlar-v1")


def test_pages_fetch_takes_layers_from_their_own_release_and_checks_sha(site, monkeypatch):
    tmp, web = site
    layer = _overlay(tmp / "hm-overlay-x-0.2.0.hmz", "a" * 64)
    pr.layers([tmp / "hm-overlay-x-0.2.0.hmz"], tmp / "assets.json", web, "o/r", "qatlamlar-v1")
    files = {"kitoblar-v1": {"hm-x-1.hmz": b"kitob", "hm-sharh-1.hmz": b"sharh"}, "qatlamlar-v1": {"hm-overlay-x-0.2.0.hmz": layer}}
    cat = json.loads((web / "catalog.json").read_text("utf-8"))
    cat["packages"][0]["package_sha256"] = hashlib.sha256(b"kitob").hexdigest()
    cat["packages"][1]["package_sha256"] = hashlib.sha256(b"sharh").hexdigest()
    (web / "catalog.json").write_text(json.dumps(cat), "utf-8")
    calls = []

    def fake_run(cmd, check):
        tag, d = cmd[3], Path(cmd[cmd.index("--dir") + 1])
        calls.append(tag)
        d.mkdir(parents=True, exist_ok=True)
        for n, b in files[tag].items():
            (d / n).write_bytes(b)

    monkeypatch.setattr(fr.subprocess, "run", fake_run)
    monkeypatch.setattr("sys.argv", ["x", "--web", str(web)])
    fr.main()
    assert sorted(calls) == ["kitoblar-v1", "qatlamlar-v1"]
    assert (web / "paketlar/hm-overlay-x-0.2.0.hmz").read_bytes() == layer
    assert (web / "paketlar/hm-x-1.hmz").read_bytes() == b"kitob"
    files["qatlamlar-v1"]["hm-overlay-x-0.2.0.hmz"] = b"buzilgan"
    with pytest.raises(SystemExit, match="SHA-256 mos emas"):
        fr.main()
