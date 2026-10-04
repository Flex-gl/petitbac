# Construit data/quiz/bank.json depuis le classeur Quiz Battle.
# Les mauvaises réponses sont d'autres réponses réelles de la même catégorie.
import json
import re
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

SOURCE = Path(r"C:\Users\HP\Downloads\Quiz_Battle_3000_questions.xlsx")
TARGET = Path(__file__).resolve().parents[1] / "data" / "quiz" / "bank.json"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def col_index(ref):
    letters = "".join(ch for ch in ref if ch.isalpha())
    number = 0
    for ch in letters:
        number = number * 26 + (ord(ch) - 64)
    return number - 1


def cell_text(cell):
    inline = cell.find("m:is", NS)
    if inline is not None:
        return "".join(node.text or "" for node in inline.iter() if node.text)
    value = cell.find("m:v", NS)
    return value.text if value is not None else ""


def fold(value):
    text = unicodedata.normalize("NFKD", value or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower().replace("\u2019", "'").replace("`", "'")
    return re.sub(r"\s+", " ", text).strip()


def difficulty(value):
    key = fold(value)
    if key.startswith("fac"):
        return "facile"
    if key.startswith("dif"):
        return "difficile"
    if key.startswith("moy"):
        return "moyen"
    return ""


def rng_for(seed):
    state = seed & 0xFFFFFFFF

    def nxt():
        nonlocal state
        state = (1664525 * state + 1013904223) & 0xFFFFFFFF
        return state / 4294967296

    return nxt


def load_rows():
    with zipfile.ZipFile(SOURCE) as book:
        root = ET.fromstring(book.read("xl/worksheets/sheet1.xml"))
    rows = []
    for row in root.findall(".//m:sheetData/m:row", NS):
        values = [""] * 6
        for cell in row.findall("m:c", NS):
            index = col_index(cell.attrib.get("r", "A1"))
            if index < 6:
                values[index] = cell_text(cell).strip()
        rows.append(values)
    return rows


def main():
    rows = load_rows()
    records = []
    errors = []
    seen = set()
    duplicates = 0
    for line, values in enumerate(rows[1:], start=2):
        categorie, raw_difficulty, question, answer = values[1], values[2], values[3], values[4]
        if not question or not answer:
            errors.append({"line": line, "message": "Question ou réponse manquante"})
            continue
        level = difficulty(raw_difficulty)
        if not level:
            errors.append({"line": line, "message": "Difficulté inconnue"})
            continue
        if not categorie:
            errors.append({"line": line, "message": "Catégorie manquante"})
            continue
        key = fold(question)
        if key in seen:
            duplicates += 1
            continue
        seen.add(key)
        records.append({
            "id": f"q{values[0] or line}",
            "categorie": categorie,
            "difficulte": level,
            "question": question,
            "reponse_correcte": answer,
            "explication": "",
            "actif": 0,
        })

    by_category = defaultdict(list)
    for item in records:
        known = {fold(answer) for answer in by_category[item["categorie"]]}
        if fold(item["reponse_correcte"]) not in known:
            by_category[item["categorie"]].append(item["reponse_correcte"])

    global_answers = []
    seen_answers = set()
    for item in records:
        key = fold(item["reponse_correcte"])
        if key not in seen_answers:
            seen_answers.add(key)
            global_answers.append(item["reponse_correcte"])

    active = 0
    incomplete = 0
    for item in records:
        roll = rng_for(sum(ord(ch) for ch in item["id"]) + 17)
        correct = item["reponse_correcte"]
        pool = [answer for answer in by_category[item["categorie"]] if fold(answer) != fold(correct)]
        if len(pool) < 3:
            extra = [answer for answer in global_answers if fold(answer) != fold(correct) and fold(answer) not in {fold(value) for value in pool}]
            pool = pool + extra
        picked = []
        guard = 0
        while len(picked) < 3 and pool and guard < 80:
            guard += 1
            index = int(roll() * len(pool))
            choice = pool.pop(index)
            if fold(choice) == fold(correct) or any(fold(choice) == fold(value) for value in picked):
                continue
            picked.append(choice)
        if len(picked) < 3:
            incomplete += 1
            item["option_a"] = item["option_b"] = item["option_c"] = item["option_d"] = ""
            item["origine"] = "a-completer"
            continue
        options = picked + [correct]
        order = [0, 1, 2, 3]
        for index in range(3, 0, -1):
            swap = int(roll() * (index + 1))
            order[index], order[swap] = order[swap], order[index]
        shuffled = [options[index] for index in order]
        item["option_a"], item["option_b"], item["option_c"], item["option_d"] = shuffled
        item["actif"] = 1
        item["origine"] = "banque"
        active += 1

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": 1,
        "source": SOURCE.name,
        "note": "Les mauvaises réponses sont d'autres réponses réelles de la même catégorie. Elles restent modifiables et désactivables.",
        "questions": records,
    }
    TARGET.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({
        "file": str(TARGET),
        "bytes": TARGET.stat().st_size,
        "imported": len(records),
        "active": active,
        "incomplete": incomplete,
        "duplicates": duplicates,
        "errors": len(errors),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
