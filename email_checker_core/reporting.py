import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any
from collections import defaultdict

class ReportGenerator:
    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.all_results = []

    def add_result(self, result_data: Dict):
        self.all_results.append(result_data)

    def save_results(self, filename_base: str, results: Dict[str, List[str]]):
        """Сохраняет результаты в отдельные файлы"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        for category, emails in results.items():
            if not emails:
                continue

            output_file = self.output_dir / f"{filename_base}_{category}_{timestamp}.txt"
            try:
                with open(output_file, 'w', encoding='utf-8') as f:
                    for email in sorted(emails):
                        f.write(f"{email}\n")

                print(f"💾 Сохранено {len(emails)} email в {output_file.name}")
            except Exception as e:
                print(f"❌ Ошибка при сохранении {output_file}: {e}")

    def generate_html_report(self, filename_base: str = "report"):
        """Генерирует HTML отчет с визуализацией"""
        if not self.all_results:
            print("❌ Нет данных для генерации отчета")
            return

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = self.output_dir / f"{filename_base}_{timestamp}.html"

        # Агрегация данных
        total_stats = defaultdict(int)
        list_details = []

        for result in self.all_results:
            for key, value in result['stats'].items():
                total_stats[key] += value
            # Добавляем статистику о дедупликации
            total_stats['duplicates_removed'] += result.get('duplicates_removed', 0)
            total_stats['prefix_duplicates_removed'] += result.get('prefix_duplicates_removed', 0)
            list_details.append(result)

        # Генерация HTML
        html_content = self._create_html_template(total_stats, list_details)

        try:
            with open(report_file, 'w', encoding='utf-8') as f:
                f.write(html_content)

            print(f"📊 HTML отчет сохранен: {report_file.name}")
        except Exception as e:
            print(f"❌ Ошибка при сохранении отчета {report_file}: {e}")

    def _create_html_template(self, total_stats: Dict, list_details: List) -> str:
        """Создает HTML шаблон отчета"""
        total = total_stats['total_checked']
        clean = total_stats['clean']
        blocked_email = total_stats['blocked_email']
        blocked_domain = total_stats['blocked_domain']
        invalid = total_stats['invalid']
        duplicates_removed = total_stats['duplicates_removed']
        prefix_duplicates_removed = total_stats['prefix_duplicates_removed']

        # Данные для графиков
        pie_data = [
            ['Категория', 'Количество'],
            ['Чистые', clean],
            ['Блок email', blocked_email],
            ['Блок домен', blocked_domain]
        ]
        if invalid > 0:
            pie_data.append(['Невалидные', invalid])

        # Детали по спискам
        lists_table = ""
        for i, detail in enumerate(list_details, 1):
            stats = detail['stats']
            duplicates_removed = detail.get('duplicates_removed', 0)
            prefix_duplicates_removed = detail.get('prefix_duplicates_removed', 0)
            lists_table += f"""
            <tr>
                <td>{detail['filename']}</td>
                <td>{stats['total_checked']:,}</td>
                <td class="text-success">{stats['clean']:,}</td>
                <td class="text-danger">{stats['blocked_email']:,}</td>
                <td class="text-warning">{stats['blocked_domain']:,}</td>
                <td class="text-muted">{stats['invalid']:,}</td>
                <td class="text-info">{duplicates_removed:,}</td>
                <td class="text-secondary">{prefix_duplicates_removed:,}</td>
                <td>{stats['check_time']:.2f}с</td>
            </tr>
            """

        html = f"""
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Checker - Отчет</title>
    <script src="https://www.gstatic.com/charts/loader.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .metric-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
            padding: 20px;
            margin: 10px 0;
        }}
        .metric-value {{
            font-size: 2.5rem;
            font-weight: bold;
        }}
        .chart-container {{
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin: 20px 0;
        }}
        .table-container {{
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        body {{
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
        }}
        .header {{
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 30px 0;
            margin-bottom: 30px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1 class="text-center">📧 Email Checker - Отчет</h1>
            <p class="text-center lead">Сгенерирован: {datetime.now().strftime("%d.%m.%Y %H:%M:%S")}</p>
        </div>
    </div>

    <div class="container">
        <!-- Общая статистика -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="metric-card text-center">
                    <div class="metric-value">{total:,}</div>
                    <div>Всего проверено</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric-card text-center" style="background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%);">
                    <div class="metric-value">{clean:,}</div>
                    <div>Чистые ({clean/total*100 if total > 0 else 0:.1f}%)</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric-card text-center" style="background: linear-gradient(135deg, #ff6b6b 0%, #ffa8a8 100%);">
                    <div class="metric-value">{blocked_email + blocked_domain:,}</div>
                    <div>Заблокировано ({(blocked_email + blocked_domain)/total*100 if total > 0 else 0:.1f}%)</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric-card text-center" style="background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);">
                    <div class="metric-value">{total_stats['check_time']:.2f}с</div>
                    <div>Время обработки</div>
                </div>
            </div>
        </div>

        <!-- Графики -->
        <div class="row">
            <div class="col-md-6">
                <div class="chart-container">
                    <h3 class="text-center mb-3">📊 Распределение результатов</h3>
                    <div id="pieChart" style="height: 400px;"></div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="chart-container">
                    <h3 class="text-center mb-3">📈 Статистика по типам блокировки</h3>
                    <div id="barChart" style="height: 400px;"></div>
                </div>
            </div>
        </div>

        <!-- Детальная таблица -->
        <div class="table-container">
            <h3 class="mb-3">📋 Детали по спискам</h3>
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Файл</th>
                            <th>Всего</th>
                            <th class="text-success">Чистые</th>
                            <th class="text-danger">Блок Email</th>
                            <th class="text-warning">Блок Домен</th>
                            <th class="text-muted">Невалидные</th>
                            <th class="text-info">Дубли между списками</th>
                            <th class="text-secondary">Дубли с '20'</th>
                            <th>Время</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lists_table}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Производительность -->
        <div class="chart-container mt-4">
            <h3 class="text-center mb-3">⚡ Производительность</h3>
            <div class="row text-center">
                <div class="col-md-4">
                    <h4 class="text-primary">{total/total_stats['check_time']:,.0f}</h4>
                    <p>email/сек</p>
                </div>
                <div class="col-md-4">
                    <h4 class="text-info">{len(list_details)}</h4>
                    <p>обработано списков</p>
                </div>
                <div class="col-md-4">
                    <h4 class="text-success">{(clean/total*100) if total > 0 else 0:.1f}%</h4>
                    <p>успешность очистки</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        google.charts.load('current', {{'packages':['corechart']}});
        google.charts.setOnLoadCallback(drawCharts);

        function drawCharts() {{
            // Круговая диаграмма
            var pieData = google.visualization.arrayToDataTable({pie_data});
            var pieOptions = {{
                title: 'Распределение email по категориям',
                pieHole: 0.4,
                colors: ['#28a745', '#dc3545', '#ffc107', '#6c757d'],
                backgroundColor: 'transparent'
            }};
            var pieChart = new google.visualization.PieChart(document.getElementById('pieChart'));
            pieChart.draw(pieData, pieOptions);

            // Столбчатая диаграмма
            var barData = google.visualization.arrayToDataTable([
                ['Тип', 'Количество'],
                ['Заблокированы по email', {blocked_email}],
                ['Заблокированы по домену', {blocked_domain}]
            ]);
            var barOptions = {{
                title: 'Типы блокировки',
                colors: ['#dc3545', '#ffc107'],
                backgroundColor: 'transparent',
                hAxis: {{title: 'Количество'}},
                vAxis: {{title: 'Тип блокировки'}}
            }};
            var barChart = new google.visualization.ColumnChart(document.getElementById('barChart'));
            barChart.draw(barData, barOptions);
        }}
    </script>
</body>
</html>
        """
        return html
