import contextlib
import importlib.util
import io
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location(
    "website_gates", ROOT / "scripts" / "website_gates.py"
)
WEBSITE_GATES = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(WEBSITE_GATES)


class RechenlogikGateTest(unittest.TestCase):
    def pruefe(self, javascript: str) -> list[str]:
        with tempfile.TemporaryDirectory() as ordner:
            repo = Path(ordner)
            (repo / "site.js").write_text(javascript, encoding="utf-8")
            return WEBSITE_GATES.gate_rechenlogik(repo)

    def test_unmarkierter_rechenwert_in_wiz_demo_wird_erkannt(self):
        befunde = self.pruefe(
            "function wizDemo() {\n"
            "  const demoData = {\n"
            "    jaz: 3.8,\n"
            "  };\n"
            "}\n"
        )
        self.assertEqual(len(befunde), 1)
        self.assertIn("jaz: 3.8", befunde[0])

    def test_markierung_gilt_nur_fuer_unmittelbar_folgenden_objektblock(self):
        befunde = self.pruefe(
            "function wizDemo() {\n"
            "  // website-gate: rechenwerte-vorschau-naechster-block -- lokale Optik-Vorschau\n"
            "  const demoData = {\n"
            "    jaz: 3.8,\n"
            "  };\n"
            "  const jaz = 3.4;\n"
            "}\n"
        )
        self.assertEqual(len(befunde), 1)
        self.assertIn("const jaz = 3.4", befunde[0])

    def test_markierter_vorschaublock_ist_ausgenommen(self):
        befunde = self.pruefe(
            "function wizDemo() {\n"
            "  // website-gate: rechenwerte-vorschau-naechster-block -- lokale Optik-Vorschau\n"
            "  const demoData = {\n"
            "    bedarf: 9.2,\n"
            "    jaz: 3.8,\n"
            "  };\n"
            "}\n"
        )
        self.assertEqual(befunde, [])

    def test_ungueltige_markierung_ist_ein_befund(self):
        befunde = self.pruefe(
            "// website-gate: rechenwerte-vorschau-naechster-block\n"
            "const demoData = { jaz: 3.8 };\n"
        )
        self.assertTrue(any("ungültige Vorschau-Markierung" in befund for befund in befunde))

    def test_fliess_text_in_html_wird_nicht_als_code_geprueft(self):
        with tempfile.TemporaryDirectory() as ordner:
            repo = Path(ordner)
            (repo / "index.html").write_text("<p>JAZ: 3.8</p>", encoding="utf-8")
            self.assertEqual(WEBSITE_GATES.gate_rechenlogik(repo), [])


class TestlistenGateTest(unittest.TestCase):
    def git(self, repo: Path, *argumente: str) -> str:
        return subprocess.check_output(["git", "-C", str(repo), *argumente], text=True).strip()

    def schreibe_liste(self, repo: Path, relativ: str, seiten: list[str]) -> None:
        datei = repo / relativ
        datei.parent.mkdir(parents=True, exist_ok=True)
        datei.write_text("\n".join(f'\"/{seite}.html\"' for seite in seiten), encoding="utf-8")

    def test_nur_neue_ungetestete_seite_blockiert(self):
        with tempfile.TemporaryDirectory() as ordner:
            repo = Path(ordner)
            self.git(repo, "init", "-q")
            self.git(repo, "config", "user.email", "gate-test@herowerk.de")
            self.git(repo, "config", "user.name", "Website Gate Test")
            (repo / "index.html").write_text("Index", encoding="utf-8")
            (repo / "altseite.html").write_text("Alt", encoding="utf-8")
            for relativ in (
                "tests/a11y.spec.js",
                "tests/smoke.spec.js",
                "scripts/fidelity-pages.json",
                "lighthouserc.json",
            ):
                self.schreibe_liste(repo, relativ, ["index"])
            self.git(repo, "add", ".")
            self.git(repo, "commit", "-qm", "Basis")
            basis = self.git(repo, "rev-parse", "HEAD")

            (repo / "neu.html").write_text("Neu", encoding="utf-8")
            self.git(repo, "add", "neu.html")
            self.git(repo, "commit", "-qm", "Neue Seite")
            ausgabe = io.StringIO()
            with contextlib.redirect_stdout(ausgabe):
                befunde = WEBSITE_GATES.gate_testlisten(repo, basis)
            self.assertEqual(len(befunde), 1)
            self.assertIn("Seite 'neu' fehlt", befunde[0])
            self.assertIn("Altbestand, blockt nicht: 1", ausgabe.getvalue())

            for relativ in (
                "tests/a11y.spec.js",
                "tests/smoke.spec.js",
                "scripts/fidelity-pages.json",
                "lighthouserc.json",
            ):
                self.schreibe_liste(repo, relativ, ["index", "neu"])
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(WEBSITE_GATES.gate_testlisten(repo, basis), [])


if __name__ == "__main__":
    unittest.main()
