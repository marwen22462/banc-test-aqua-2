import json
from pathlib import Path

bench_log = [
    "15:06:05 [Bench] Serveur HTTP démarré",
    "15:06:15 [Bench] Etape2 Vérification de la présence de la carte...",
    "15:06:15 [Bench] Carte détectée.",
    "15:06:17 [Bench] Activation relais alimentation (220V)...",
    "15:06:17 [CF carte] ets Jul 29 2019 12:21:46",
    "15:06:18 [CF carte] CONFIG I/O OK !vers final",
    "15:06:20 [Bench] Tension 30V Circuit = 31.16 V",
    "15:06:22 [Bench] Tension 30V Moteur = 32.63 V",
    "15:06:24 [Bench] Tension 3.3V = 3.300 V",
    "15:07:04 [Bench] Etape7 Téléversement confirmé par START.",
    "15:07:16 [Bench] Etape81 Recherche de la carte BLE...",
    "15:07:18 [Bench] Connexion à a0:b7:65:14:93:fa",
    "15:07:18 [Bench] Connecté au serveur BLE",
    "15:07:33 [Bench] Valeur BLE reçue pour forc = 1",
    "15:07:37 [Bench] PROGRAMMATION OK : prog = 1",
    "15:08:00 [Bench] Etape85 ROUE CODEUSE = 5 OK",
    "15:08:11 [Bench] ✅ TEST HARDWARE BLE TERMINÉ",
    "15:08:20 [Bench] Etape8 Ouverture volet (Relais OPEN activé) pendant 20s...",
    "15:09:09 [Bench] Etape11 Moteur volet fonctionne correctement dans les deux sens.",
    "15:09:33 [Bench] Etape13 15 impulsions atteintes, fin de course fermée programmée.",
    "15:10:14 [Bench] Etape15 Ouverture atteinte (15 impulsions).",
    "15:10:29 [Bench] Etape16 Fermeture atteinte (15 impulsions).",
    "15:10:37 [Bench] Etape18 Défaut capteur activé à l'impulsion 8.",
    "15:10:52 [Bench] Etape20 Ouverture atteinte (15 impulsions) après test défaut capteur.",
    "15:11:14 [Bench] Etape23 Ouverture volet avec bluetooth pendant 20s",
    "15:11:35 [Bench] Etape27 cliquer sur la bouton setup ne la relache pas cliquer sur start pour confirmer",
    "15:12:04 [CF carte] networks found",
]

report = {
    "generatedAt": "2026-09-30T15:12:04.000Z",
    "totalReports": 1,
    "latest": {
        "reportId": "livepoolvs-f8931465b7a0-1-2026-09-30T15:12:04Z",
        "savedAt": "2026-09-30T15:12:04.000Z",
        "testDate": "2026-09-30T15:06:05.000Z",
        "status": "passed",
        "finalResult": "passed",
        "deviceLabel": "LivePoolVs-F8931465B7A0",
        "deviceName": "LivePoolVs-F8931465B7A0",
        "capturedName": "LivePoolVs-F8931465B7A0",
        "fullProcessLog": bench_log,
        "processLogText": "\n".join(bench_log),
        "metadata": {
            "benchPort": "COM7",
            "cfCartePort": "COM7",
            "deviceName": "LivePoolVs-F8931465B7A0",
            "testStartedAt": "2026-09-30T15:06:05.000Z",
            "testFinishedAt": "2026-09-30T15:12:04.000Z",
        },
    },
    "reports": [
        {
            "reportId": "livepoolvs-f8931465b7a0-1-2026-09-30T15:12:04Z",
            "savedAt": "2026-09-30T15:12:04.000Z",
            "testDate": "2026-09-30T15:06:05.000Z",
            "status": "passed",
            "finalResult": "passed",
            "deviceLabel": "LivePoolVs-F8931465B7A0",
            "deviceName": "LivePoolVs-F8931465B7A0",
            "capturedName": "LivePoolVs-F8931465B7A0",
            "fullProcessLog": bench_log,
            "processLogText": "\n".join(bench_log),
            "metadata": {
                "benchPort": "COM7",
                "cfCartePort": "COM7",
                "deviceName": "LivePoolVs-F8931465B7A0",
                "testStartedAt": "2026-09-30T15:06:05.000Z",
                "testFinishedAt": "2026-09-30T15:12:04.000Z",
            },
        }
    ],
}

out = Path(__file__).resolve().parents[1] / "src" / "data" / "data.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Saved report to {out}")
print(f"deviceName={report['latest']['deviceName']}")
print(f"logLines={len(report['latest']['fullProcessLog'])}")
