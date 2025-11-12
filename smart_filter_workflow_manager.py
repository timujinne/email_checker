#!/usr/bin/env python3
"""
Smart Filter Workflow Manager - Orchestrator для полного цикла обработки

Управляет этапами:
1. LVP базовая фильтрация (check-lvp)
2. Smart Filter применение
3. Создание FINAL CLEAN LIST
4. Генерация отчётов

Author: Email Checker Team
Version: 1.0.0
"""

import json
import subprocess
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from collections import defaultdict

@dataclass
class WorkflowStage:
    """Этап обработки в workflow"""
    name: str
    status: str  # pending, running, completed, error
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

@dataclass
class WorkflowResult:
    """Результат выполнения workflow"""
    workflow_id: str
    input_file: str
    config_name: str
    stages: List[WorkflowStage]
    overall_status: str
    total_time: float
    final_output_files: Dict[str, str]
    statistics: Dict[str, Any]

class SmartFilterWorkflowManager:
    """Оркестратор полного workflow обработки email-списков"""

    def __init__(self, progress_callback: Optional[Callable] = None):
        """
        Args:
            progress_callback: Функция для отправки обновлений прогресса
                               Сигнатура: callback(stage: str, progress: int, message: str)
        """
        self.progress_callback = progress_callback
        self.current_workflow_id = None

    def execute_full_workflow(
        self,
        input_file: Path,
        config_name: str,
        score_threshold: float = 30.0,
        skip_base_filtering: bool = False
    ) -> WorkflowResult:
        """
        Выполняет полный цикл обработки от LVP до FINAL CLEAN LIST

        Args:
            input_file: Путь к исходному файлу (LVP или TXT)
            config_name: Имя Smart Filter конфига
            score_threshold: Порог Score для финального списка
            skip_base_filtering: Пропустить базовую LVP фильтрацию (если уже выполнена)

        Returns:
            WorkflowResult: Результаты workflow
        """
        self.current_workflow_id = f"workflow_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        stages = []
        overall_start = time.time()

        try:
            # STAGE 1: Базовая LVP фильтрация (опционально)
            clean_file = input_file
            if not skip_base_filtering and input_file.suffix.lower() == '.lvp':
                stage1 = self._execute_base_filtering(input_file)
                stages.append(stage1)

                if stage1.status == 'error':
                    return self._create_error_result(input_file, config_name, stages, stage1.error)

                # Находим созданный clean файл
                clean_file = self._find_clean_file(input_file)
                if not clean_file:
                    return self._create_error_result(
                        input_file, config_name, stages,
                        "Clean file not found after base filtering"
                    )

            # STAGE 2: Smart Filter применение
            stage2 = self._execute_smart_filter(clean_file, config_name)
            stages.append(stage2)

            if stage2.status == 'error':
                return self._create_error_result(input_file, config_name, stages, stage2.error)

            # STAGE 3: Создание FINAL CLEAN LIST
            stage3 = self._create_final_clean_list(
                smart_filtered_file=stage2.result.get('output_files', {}).get('json'),
                score_threshold=score_threshold,
                original_filename=input_file.stem
            )
            stages.append(stage3)

            if stage3.status == 'error':
                return self._create_error_result(input_file, config_name, stages, stage3.error)

            # STAGE 4: Генерация отчёта
            stage4 = self._generate_summary_report(stages, input_file, config_name)
            stages.append(stage4)

            # Собираем финальные файлы
            final_files = {
                'txt': stage3.result.get('txt_file'),
                'csv': stage3.result.get('csv_file'),
                'report': stage4.result.get('report_file')
            }

            # Собираем статистику
            statistics = self._collect_statistics(stages)

            total_time = time.time() - overall_start

            return WorkflowResult(
                workflow_id=self.current_workflow_id,
                input_file=str(input_file),
                config_name=config_name,
                stages=stages,
                overall_status='completed',
                total_time=total_time,
                final_output_files=final_files,
                statistics=statistics
            )

        except Exception as e:
            return self._create_error_result(input_file, config_name, stages, str(e))

    def _execute_base_filtering(self, input_file: Path) -> WorkflowStage:
        """Этап 1: Базовая LVP фильтрация"""
        stage = WorkflowStage(
            name="base_lvp_filtering",
            status="running",
            start_time=datetime.now().isoformat()
        )

        self._notify_progress("base_lvp_filtering", 10, "Starting base LVP filtering...")

        try:
            # Запускаем email_checker.py check-lvp
            cmd = ['python3', 'email_checker.py', 'check-lvp', str(input_file)]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600  # 10 минут таймаут
            )

            if result.returncode != 0:
                stage.status = 'error'
                stage.error = f"Base filtering failed: {result.stderr}"
            else:
                stage.status = 'completed'
                stage.result = {
                    'stdout': result.stdout,
                    'stderr': result.stderr
                }
                self._notify_progress("base_lvp_filtering", 100, "Base filtering completed")

        except subprocess.TimeoutExpired:
            stage.status = 'error'
            stage.error = "Base filtering timeout (>10 minutes)"
        except Exception as e:
            stage.status = 'error'
            stage.error = f"Base filtering error: {str(e)}"

        stage.end_time = datetime.now().isoformat()
        return stage

    def _execute_smart_filter(self, clean_file: Path, config_name: str) -> WorkflowStage:
        """Этап 2: Smart Filter применение"""
        stage = WorkflowStage(
            name="smart_filter",
            status="running",
            start_time=datetime.now().isoformat()
        )

        self._notify_progress("smart_filter", 30, "Applying Smart Filter...")

        try:
            from smart_filter_processor_v2 import SmartFilterProcessor

            processor = SmartFilterProcessor(filter_name=config_name)
            result = processor.process_clean_file(clean_file, include_metadata=True)

            if result.get('success'):
                stage.status = 'completed'
                stage.result = result
                self._notify_progress("smart_filter", 100, "Smart Filter completed")
            else:
                stage.status = 'error'
                stage.error = result.get('error', 'Unknown error')

        except FileNotFoundError as e:
            stage.status = 'error'
            stage.error = f"Config not found: {config_name}"
        except Exception as e:
            stage.status = 'error'
            stage.error = f"Smart Filter error: {str(e)}"

        stage.end_time = datetime.now().isoformat()
        return stage

    def _create_final_clean_list(
        self,
        smart_filtered_file: str,
        score_threshold: float,
        original_filename: str
    ) -> WorkflowStage:
        """Этап 3: Создание FINAL CLEAN LIST"""
        stage = WorkflowStage(
            name="create_final_list",
            status="running",
            start_time=datetime.now().isoformat()
        )

        self._notify_progress("create_final_list", 60, "Creating FINAL CLEAN LIST...")

        try:
            if not smart_filtered_file or not Path(smart_filtered_file).exists():
                raise FileNotFoundError(f"Smart filtered file not found: {smart_filtered_file}")

            # Загружаем JSON с результатами Smart Filter
            with open(smart_filtered_file, 'r', encoding='utf-8') as f:
                results = json.load(f)

            # Фильтруем по Score threshold
            qualified_emails = []
            for item in results:
                score = item.get('final_score', 0)
                priority = item.get('priority', 'low')
                breakdown = item.get('indicators', {}).get('scoring_breakdown', {})

                if score >= score_threshold:
                    qualified_emails.append({
                        'email': item['email'],
                        'score': score,
                        'priority': priority,
                        'relevance': breakdown.get('relevance', 0),
                        'geographic': breakdown.get('geographic', 0),
                        'email_quality': breakdown.get('email', 0),
                        'engagement': breakdown.get('engagement', 0)
                    })

            # Сортируем по Score от большего к меньшему
            qualified_emails.sort(key=lambda x: x['score'], reverse=True)

            if not qualified_emails:
                stage.status = 'error'
                stage.error = f"No emails qualified with Score >= {score_threshold}"
                stage.end_time = datetime.now().isoformat()
                return stage

            # Создаём файлы
            timestamp = datetime.now().strftime("%Y%m%d")
            output_dir = Path(smart_filtered_file).parent

            txt_filename = f"FINAL_CLEAN_{original_filename}_ALL_SORTED_{timestamp}.txt"
            csv_filename = f"FINAL_CLEAN_{original_filename}_ALL_SORTED_{timestamp}.csv"

            txt_file = output_dir / txt_filename
            csv_file = output_dir / csv_filename

            # Сохраняем TXT (только emails)
            with open(txt_file, 'w', encoding='utf-8') as f:
                for item in qualified_emails:
                    f.write(item['email'] + '\n')

            # Сохраняем CSV с метаданными
            import csv
            with open(csv_file, 'w', encoding='utf-8', newline='') as f:
                writer = csv.writer(f)
                writer.writerow([
                    'email', 'priority', 'final_score', 'relevance',
                    'geographic', 'email_quality', 'engagement'
                ])
                for item in qualified_emails:
                    writer.writerow([
                        item['email'],
                        item['priority'],
                        f"{item['score']:.1f}",
                        item['relevance'],
                        item['geographic'],
                        item['email_quality'],
                        item['engagement']
                    ])

            stage.status = 'completed'
            stage.result = {
                'txt_file': str(txt_file),
                'csv_file': str(csv_file),
                'total_emails': len(qualified_emails),
                'score_range': {
                    'max': qualified_emails[0]['score'],
                    'min': qualified_emails[-1]['score']
                },
                'priority_distribution': {
                    'high': sum(1 for e in qualified_emails if e['priority'] == 'high'),
                    'medium': sum(1 for e in qualified_emails if e['priority'] == 'medium'),
                    'low': sum(1 for e in qualified_emails if e['priority'] == 'low')
                }
            }

            self._notify_progress("create_final_list", 100, f"Created FINAL CLEAN LIST: {len(qualified_emails)} emails")

        except Exception as e:
            stage.status = 'error'
            stage.error = f"Failed to create FINAL CLEAN LIST: {str(e)}"

        stage.end_time = datetime.now().isoformat()
        return stage

    def _generate_summary_report(
        self,
        stages: List[WorkflowStage],
        input_file: Path,
        config_name: str
    ) -> WorkflowStage:
        """Этап 4: Генерация сводного отчёта"""
        stage = WorkflowStage(
            name="generate_report",
            status="running",
            start_time=datetime.now().isoformat()
        )

        self._notify_progress("generate_report", 90, "Generating summary report...")

        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_dir = Path("reports")
            report_dir.mkdir(exist_ok=True)

            report_file = report_dir / f"workflow_report_{input_file.stem}_{timestamp}.txt"

            # Генерируем содержимое отчёта
            report_lines = [
                "=" * 80,
                "SMART FILTER WORKFLOW REPORT",
                "=" * 80,
                f"Workflow ID: {self.current_workflow_id}",
                f"Input file: {input_file}",
                f"Config: {config_name}",
                f"Timestamp: {datetime.now().isoformat()}",
                "",
                "STAGES:",
            ]

            for idx, s in enumerate(stages, 1):
                report_lines.append(f"\n{idx}. {s.name.upper()}")
                report_lines.append(f"   Status: {s.status}")
                report_lines.append(f"   Start: {s.start_time}")
                report_lines.append(f"   End: {s.end_time}")

                if s.status == 'error':
                    report_lines.append(f"   Error: {s.error}")
                elif s.result:
                    report_lines.append(f"   Result: {self._format_result(s.result)}")

            report_lines.extend([
                "",
                "=" * 80,
                f"Generated: {datetime.now().isoformat()}",
                "=" * 80
            ])

            with open(report_file, 'w', encoding='utf-8') as f:
                f.write('\n'.join(report_lines))

            stage.status = 'completed'
            stage.result = {'report_file': str(report_file)}
            self._notify_progress("generate_report", 100, "Report generated")

        except Exception as e:
            stage.status = 'error'
            stage.error = f"Failed to generate report: {str(e)}"

        stage.end_time = datetime.now().isoformat()
        return stage

    def _find_clean_file(self, original_file: Path) -> Optional[Path]:
        """Находит созданный clean файл после базовой фильтрации"""
        output_dir = Path("output")
        pattern = f"{original_file.stem}_clean_*.txt"

        clean_files = list(output_dir.glob(pattern))

        if not clean_files:
            return None

        # Возвращаем самый новый файл
        return max(clean_files, key=lambda p: p.stat().st_mtime)

    def _collect_statistics(self, stages: List[WorkflowStage]) -> Dict[str, Any]:
        """Собирает статистику по всем этапам"""
        stats = {
            'total_stages': len(stages),
            'completed_stages': sum(1 for s in stages if s.status == 'completed'),
            'failed_stages': sum(1 for s in stages if s.status == 'error'),
            'stage_details': {}
        }

        for stage in stages:
            if stage.result:
                stats['stage_details'][stage.name] = stage.result

        return stats

    def _notify_progress(self, stage: str, progress: int, message: str):
        """Отправляет обновление прогресса через callback"""
        if self.progress_callback:
            self.progress_callback(stage, progress, message)

    def _format_result(self, result: Dict[str, Any]) -> str:
        """Форматирует результат для отчёта"""
        # Упрощённый вывод ключевых метрик
        if 'total_emails' in result:
            return f"{result['total_emails']} emails processed"
        elif 'statistics' in result:
            stats = result['statistics']
            return f"Qualified: {stats.get('qualified_leads', 0)}, Excluded: {stats.get('hard_excluded', 0)}"
        return "Completed"

    def _create_error_result(
        self,
        input_file: Path,
        config_name: str,
        stages: List[WorkflowStage],
        error_message: str
    ) -> WorkflowResult:
        """Создаёт результат с ошибкой"""
        return WorkflowResult(
            workflow_id=self.current_workflow_id or "error",
            input_file=str(input_file),
            config_name=config_name,
            stages=stages,
            overall_status='error',
            total_time=0,
            final_output_files={},
            statistics={'error': error_message}
        )

# CLI для тестирования
if __name__ == "__main__":
    import sys

    def progress_callback(stage, progress, message):
        print(f"[{stage}] {progress}%: {message}")

    if len(sys.argv) < 3:
        print("Usage: python3 smart_filter_workflow_manager.py <input_file> <config_name> [score_threshold]")
        sys.exit(1)

    input_file = Path(sys.argv[1])
    config_name = sys.argv[2]
    score_threshold = float(sys.argv[3]) if len(sys.argv) > 3 else 30.0

    manager = SmartFilterWorkflowManager(progress_callback=progress_callback)
    result = manager.execute_full_workflow(
        input_file=input_file,
        config_name=config_name,
        score_threshold=score_threshold,
        skip_base_filtering=False
    )

    print("\n" + "=" * 80)
    print(f"Workflow Status: {result.overall_status}")
    print(f"Total Time: {result.total_time:.2f}s")
    print(f"\nFinal Files:")
    for file_type, file_path in result.final_output_files.items():
        print(f"  - {file_type.upper()}: {file_path}")
    print("=" * 80)
