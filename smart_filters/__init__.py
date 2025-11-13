"""
Smart Filters Module - Умная контекстная фильтрация email списков

Модуль для расширенной фильтрации уже очищенных email-листов с учетом:
- Индустриальной релевантности
- Географических приоритетов
- Качества контактов
- Исключения нерелевантных категорий
"""

__version__ = '2.0.0'
__author__ = 'Email Checker Team'

from pathlib import Path
import json
from typing import List, Dict, Optional

# Путь к конфигурациям (UNIFIED: smart_filters/configs/)
CONFIGS_DIR = Path(__file__).parent / "configs"

def list_available_filters() -> List[Dict[str, str]]:
    """
    Динамически сканирует smart_filters/configs/ директорию и возвращает список доступных фильтров

    Returns:
        List[Dict]: Список словарей с информацией о конфигах:
            - name: имя конфига (без .json)
            - display_name: читаемое имя
            - target_market: целевой рынок
            - target_industry: индустрия
            - version: версия конфига
    """
    filters = []

    try:
        if not CONFIGS_DIR.exists():
            return filters

        for config_file in CONFIGS_DIR.glob("*.json"):
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)

                filter_info = {
                    'name': config_file.stem,
                    'display_name': config.get('display_name', config_file.stem),
                    'target_market': config.get('target_market', {}).get('country_name', 'Unknown'),
                    'target_industry': config.get('target_industry', 'Unknown'),
                    'version': config.get('version', '1.0'),
                    'config_name': config.get('config_name', config_file.stem)
                }

                filters.append(filter_info)
            except (json.JSONDecodeError, KeyError) as e:
                # Пропускаем битые конфиги
                print(f"Warning: Failed to load config {config_file}: {e}")
                continue

        # Сортируем по display_name
        filters.sort(key=lambda x: x['display_name'])

    except Exception as e:
        print(f"Error scanning configs directory: {e}")

    return filters

def get_config_path(filter_name: str) -> Path:
    """
    Возвращает путь к конфигу фильтра

    Args:
        filter_name: Имя фильтра (без .json расширения)

    Returns:
        Path: Путь к конфиг-файлу

    Raises:
        FileNotFoundError: Если конфиг не найден
    """
    config_file = CONFIGS_DIR / f"{filter_name}.json"

    if not config_file.exists():
        raise FileNotFoundError(f"Конфиг не найден: {config_file}")

    return config_file

def get_config_data(filter_name: str) -> Dict:
    """
    Загружает и возвращает данные конфига

    Args:
        filter_name: Имя фильтра

    Returns:
        Dict: Содержимое конфига

    Raises:
        FileNotFoundError: Если конфиг не найден
        json.JSONDecodeError: Если конфиг невалидный
    """
    config_path = get_config_path(filter_name)

    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def auto_suggest_config(filename: str) -> Optional[Dict[str, str]]:
    """
    Автоматически предлагает подходящий конфиг на основе имени файла

    Args:
        filename: Имя файла (может включать путь)

    Returns:
        Optional[Dict]: Информация о подходящем конфиге или None
    """
    filename_lower = Path(filename).stem.lower()

    # Паттерны для автоопределения
    patterns = {
        'italy': ['italy', 'италия', 'italian', 'itali'],
        'spain': ['spain', 'испания', 'spanish', 'españa', 'espana'],
        'portugal': ['portugal', 'португалия', 'portuguese', 'portug'],
        'france': ['france', 'франция', 'french', 'français'],
        'germany': ['germany', 'германия', 'german', 'deutschland'],
        'austria': ['austria', 'австрия', 'austrian'],
        'belgium': ['belgium', 'бельгия', 'belgian', 'belgique'],
        'poland': ['poland', 'польша', 'polish', 'polska'],
    }

    industry_patterns = {
        'hydraulics': ['hydraul', 'гидравл', 'hc'],
        'agriculture': ['agr', 'farm', 'tractor', 'агро', 'сельск'],
        'mining': ['mining', 'earthmoving', 'excavat', 'minería', 'землерой'],
        'construction': ['construction', 'building', 'construcción', 'строит'],
    }

    # Определяем страну
    detected_country = None
    for country, keywords in patterns.items():
        if any(keyword in filename_lower for keyword in keywords):
            detected_country = country
            break

    # Определяем индустрию
    detected_industry = None
    for industry, keywords in industry_patterns.items():
        if any(keyword in filename_lower for keyword in keywords):
            detected_industry = industry
            break

    # Ищем подходящий конфиг
    available_filters = list_available_filters()

    for filter_info in available_filters:
        filter_name = filter_info['name'].lower()

        # Проверяем соответствие стране и индустрии
        country_match = detected_country and detected_country in filter_name
        industry_match = detected_industry and detected_industry in filter_name

        if country_match or industry_match:
            filter_info['confidence'] = 'high' if (country_match and industry_match) else 'medium'
            filter_info['detected_country'] = detected_country
            filter_info['detected_industry'] = detected_industry
            return filter_info

    # Если не нашли точного совпадения, возвращаем наиболее общий конфиг
    if detected_industry:
        for filter_info in available_filters:
            if detected_industry in filter_info['name'].lower():
                filter_info['confidence'] = 'low'
                filter_info['detected_country'] = detected_country
                filter_info['detected_industry'] = detected_industry
                return filter_info

    return None
