import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List

class ConfigManager:
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.lists_config_file = self.base_dir / "lists_config.json"
        self.lists_config = self._load_lists_config()

    def _load_lists_config(self) -> Dict:
        """Загружает конфигурацию списков"""
        try:
            if self.lists_config_file.exists():
                with open(self.lists_config_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print(f"⚠️  Ошибка загрузки конфигурации: {e}")
        return {"lists": []}

    def save_lists_config(self):
        """Сохраняет конфигурацию списков"""
        try:
            with open(self.lists_config_file, 'w', encoding='utf-8') as f:
                json.dump(self.lists_config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"⚠️  Ошибка сохранения конфигурации: {e}")

    def get_list_metadata(self, filename: str, output_dir: Path) -> Dict:
        """Возвращает метаданные для файла списка"""
        for list_info in self.lists_config.get("lists", []):
            if list_info["filename"] == filename:
                return list_info

        # Если файл не найден в конфигурации, создаем базовую запись
        # Проверяем, есть ли уже выходные файлы (значит файл был обработан)
        output_files = list(output_dir.glob(f"{Path(filename).stem}_*"))
        is_processed = len(output_files) > 0

        # Умное определение страны по имени файла
        filename_lower = filename.lower()
        detected_country = "Unknown"
        detected_category = "General"

        # Определение страны
        if any(marker in filename_lower for marker in ["ru_", "_ru", "russia", "russian"]):
            detected_country = "Russia"
        elif any(marker in filename_lower for marker in ["poland", "polland", "pol_", "_pl"]):
            detected_country = "Poland"
        elif any(marker in filename_lower for marker in ["belgium", "belg_", "_be"]):
            detected_country = "Belgium"
        elif any(marker in filename_lower for marker in ["germany", "german", "_de", "_ger"]):
            detected_country = "Germany"
        elif any(marker in filename_lower for marker in ["czech", "czeh", "_cz"]):
            detected_country = "Czech Republic"
        elif any(marker in filename_lower for marker in ["bulgaria", "bolgar", "_bg"]):
            detected_country = "Bulgaria"
        elif any(marker in filename_lower for marker in ["romania", "rumonia", "romonia", "_ro", "_rom"]):
            detected_country = "Romania"
        elif any(marker in filename_lower for marker in ["hungary", "hungar", "_hu", "_hun"]):
            detected_country = "Hungary"
        elif any(marker in filename_lower for marker in ["croatia", "croat", "_hr", "_cro"]):
            detected_country = "Croatia"
        elif any(marker in filename_lower for marker in ["montenegro", "monten", "_me", "_mne"]):
            detected_country = "Montenegro"
        elif any(marker in filename_lower for marker in ["macedonia", "macedon", "_mk", "_mac"]):
            detected_country = "North Macedonia"
        elif any(marker in filename_lower for marker in ["serbia", "serb", "_rs", "_srb"]):
            detected_country = "Serbia"
        elif any(marker in filename_lower for marker in ["slovenia", "sloven", "_si", "_slo"]):
            detected_country = "Slovenia"
        elif any(marker in filename_lower for marker in ["slovakia", "slovak", "_sk", "_svk"]):
            detected_country = "Slovakia"
        elif any(marker in filename_lower for marker in ["austria", "austri", "_at", "_aut"]):
            detected_country = "Austria"
        elif any(marker in filename_lower for marker in ["netherlands", "dutch", "_nl", "_ned"]):
            detected_country = "Netherlands"
        elif any(marker in filename_lower for marker in ["france", "french", "_fr", "_fra"]):
            detected_country = "France"
        elif any(marker in filename_lower for marker in ["italy", "italian", "_it", "_ita"]):
            detected_country = "Italy"
        elif any(marker in filename_lower for marker in ["spain", "spanish", "_es", "_esp"]):
            detected_country = "Spain"
        elif any(marker in filename_lower for marker in ["portugal", "portug", "_pt", "_por"]):
            detected_country = "Portugal"
        elif any(marker in filename_lower for marker in ["eu_", "europe"]):
            detected_country = "Europe"
        elif any(marker in filename_lower for marker in ["rf_", "_rf", "rb_"]):
            detected_country = "Mixed"

        # Определение категории
        if any(marker in filename_lower for marker in ["motor", "auto", "car"]):
            detected_category = "Automotive"
        elif any(marker in filename_lower for marker in ["agro", "agri", "farm"]):
            detected_category = "Agriculture"
        elif any(marker in filename_lower for marker in ["metal", "manufacture", "industry"]):
            detected_category = "Manufacturing"
        elif any(marker in filename_lower for marker in ["transport", "municip", "public"]):
            detected_category = "Transportation"
        elif any(marker in filename_lower for marker in ["hc_", "construct", "build", "buld"]):
            detected_category = "Manufacturing"  # Heavy Construction
        elif any(marker in filename_lower for marker in ["full", "complete", "database"]):
            detected_category = "Regional"

        new_list = {
            "filename": filename,
            "display_name": Path(filename).stem.replace("_", " ").title(),
            "country": detected_country,
            "category": detected_category,
            "priority": len(self.lists_config.get("lists", [])) + 1,
            "processed": is_processed,
            "date_added": datetime.now().strftime("%Y-%m-%d"),
            "description": f"Auto-detected list: {filename}"
        }

        self.lists_config.setdefault("lists", []).append(new_list)
        self.save_lists_config()
        return new_list

    def update_list_processed_status(self, filename: str, processed: bool = True):
        """Обновляет статус обработки в конфигурации"""
        for list_info in self.lists_config.get("lists", []):
            if list_info["filename"] == filename:
                list_info["processed"] = processed
                self.save_lists_config()
                break
