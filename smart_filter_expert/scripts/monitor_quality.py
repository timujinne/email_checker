#!/usr/bin/env python3
"""
Quality Monitoring Script - Track filter performance over time

Features:
- Performance tracking and trend analysis
- Quality score monitoring
- Classification accuracy measurement
- Automated quality alerts
- Historical reporting
"""

import json
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from filter_validator import FilterValidator


class QualityMonitor:
    """Monitors filter quality and performance over time"""

    def __init__(self):
        self.skill_dir = Path(__file__).parent.parent
        self.reports_dir = self.skill_dir / "quality_reports"
        self.reports_dir.mkdir(exist_ok=True)

        self.validator = FilterValidator()

        # Quality thresholds
        self.quality_thresholds = {
            "min_quality_score": 80,
            "min_test_accuracy": 85,
            "min_performance_speed": 100,
            "max_high_priority_percent": 12,
            "min_high_priority_relevance": 85
        }

        # Alert levels
        self.alert_levels = {
            "critical": 0,    # Below minimum thresholds
            "warning": 10,    # 10% below target
            "info": 20        # 20% below target
        }

    def monitor_filter(self, filter_name: str, period_days: int = 30) -> Dict:
        """Monitor a single filter over specified period"""

        print(f"📊 Quality Monitoring: {filter_name}")
        print(f"📅 Period: Last {period_days} days")
        print("=" * 60)

        monitoring_data = {
            "filter_name": filter_name,
            "monitoring_date": datetime.now().isoformat(),
            "period_days": period_days,
            "current_metrics": {},
            "historical_data": [],
            "trends": {},
            "alerts": [],
            "recommendations": []
        }

        # Get current metrics
        current_metrics = self._get_current_metrics(filter_name)
        monitoring_data["current_metrics"] = current_metrics

        # Load historical data
        historical_data = self._load_historical_data(filter_name, period_days)
        monitoring_data["historical_data"] = historical_data

        # Analyze trends
        if historical_data:
            monitoring_data["trends"] = self._analyze_trends(historical_data)

        # Check for alerts
        alerts = self._check_alerts(current_metrics, monitoring_data.get("trends", {}))
        monitoring_data["alerts"] = alerts

        # Generate recommendations
        recommendations = self._generate_recommendations(current_metrics, alerts, monitoring_data.get("trends", {}))
        monitoring_data["recommendations"] = recommendations

        # Save current data point
        self._save_current_data_point(filter_name, current_metrics)

        # Print monitoring results
        self._print_monitoring_results(monitoring_data)

        return monitoring_data

    def monitor_all_filters(self, period_days: int = 30) -> Dict:
        """Monitor all available filters"""

        print(f"📊 Batch Quality Monitoring")
        print(f"📅 Period: Last {period_days} days")
        print("=" * 60)

        # Get all available filters
        config_dir = self.skill_dir.parent / "smart_filters" / "configs"
        if not config_dir.exists():
            print("❌ No filter configurations found")
            return {"error": "No filters found"}

        filter_files = list(config_dir.glob("*_config.json"))
        filter_names = [f.stem.replace("_config", "") for f in filter_files]

        if not filter_names:
            print("❌ No filters found to monitor")
            return {"error": "No filters found"}

        batch_results = {
            "batch_date": datetime.now().isoformat(),
            "period_days": period_days,
            "total_filters": len(filter_names),
            "filter_results": {},
            "overall_health": "unknown",
            "batch_alerts": [],
            "batch_recommendations": []
        }

        print(f"🔍 Monitoring {len(filter_names)} filters...\n")

        for filter_name in filter_names:
            print(f"📂 Monitoring: {filter_name}")
            try:
                result = self.monitor_filter(filter_name, period_days)
                batch_results["filter_results"][filter_name] = result

                # Collect critical alerts
                for alert in result.get("alerts", []):
                    if alert["level"] == "critical":
                        batch_results["batch_alerts"].append({
                            "filter": filter_name,
                            "metric": alert["metric"],
                            "message": alert["message"]
                        })

            except Exception as e:
                print(f"   ⚠️  Error monitoring {filter_name}: {e}")
                batch_results["filter_results"][filter_name] = {
                    "error": str(e),
                    "monitoring_failed": True
                }

        # Calculate overall health
        batch_results["overall_health"] = self._calculate_overall_health(batch_results)

        # Generate batch recommendations
        batch_results["batch_recommendations"] = self._generate_batch_recommendations(batch_results)

        # Print batch summary
        self._print_batch_summary(batch_results)

        # Save batch report
        self._save_batch_report(batch_results)

        return batch_results

    def _get_current_metrics(self, filter_name: str) -> Dict:
        """Get current performance metrics for a filter"""

        metrics = {
            "timestamp": datetime.now().isoformat(),
            "quality_score": 0,
            "test_accuracy": 0,
            "performance_speed": 0,
            "validation_passed": False,
            "issues_found": []
        }

        try:
            # Validate filter
            validation_result = self.validator.validate_filter(filter_name)
            metrics["quality_score"] = validation_result.get("quality_score", 0)
            metrics["validation_passed"] = validation_result.get("success", False)
            metrics["issues_found"] = validation_result.get("errors", []) + validation_result.get("warnings", [])

            # Test filter if validation passed
            if validation_result.get("success"):
                test_result = self.validator.test_filter_with_samples(filter_name, 100)
                if test_result.get("success"):
                    metrics["test_accuracy"] = test_result.get("accuracy", 0)

                    # Check category distribution
                    category_counts = test_result.get("by_category", {})
                    total_tested = test_result.get("total_tested", 1)
                    high_priority_percent = (category_counts.get("HIGH", 0) / total_tested) * 100
                    metrics["high_priority_percent"] = high_priority_percent

            # Benchmark performance
            benchmark_result = self.validator.benchmark_filter(filter_name, 500)
            if benchmark_result.get("success"):
                metrics["performance_speed"] = benchmark_result.get("emails_per_second", 0)

        except Exception as e:
            metrics["error"] = str(e)
            metrics["validation_passed"] = False

        return metrics

    def _load_historical_data(self, filter_name: str, period_days: int) -> List[Dict]:
        """Load historical data for the specified period"""

        history_file = self.reports_dir / f"{filter_name}_history.json"
        if not history_file.exists():
            return []

        try:
            with open(history_file, 'r', encoding='utf-8') as f:
                all_data = json.load(f)

            # Filter data by date range
            cutoff_date = datetime.now() - timedelta(days=period_days)
            filtered_data = []

            for data_point in all_data:
                try:
                    data_date = datetime.fromisoformat(data_point["timestamp"])
                    if data_date >= cutoff_date:
                        filtered_data.append(data_point)
                except (KeyError, ValueError):
                    continue

            return sorted(filtered_data, key=lambda x: x["timestamp"])

        except Exception as e:
            print(f"   ⚠️  Could not load historical data: {e}")
            return []

    def _analyze_trends(self, historical_data: List[Dict]) -> Dict:
        """Analyze trends in historical data"""

        if len(historical_data) < 2:
            return {"insufficient_data": True}

        trends = {}
        metrics_to_analyze = ["quality_score", "test_accuracy", "performance_speed"]

        for metric in metrics_to_analyze:
            values = [point.get(metric, 0) for point in historical_data if metric in point]
            if len(values) >= 2:
                # Calculate trend (simple linear regression slope approximation)
                recent_avg = sum(values[-3:]) / min(3, len(values))
                older_avg = sum(values[:3]) / min(3, len(values))

                trend_direction = "stable"
                trend_percent = 0

                if older_avg > 0:
                    trend_percent = ((recent_avg - older_avg) / older_avg) * 100

                    if trend_percent > 5:
                        trend_direction = "improving"
                    elif trend_percent < -5:
                        trend_direction = "declining"

                trends[metric] = {
                    "direction": trend_direction,
                    "percent_change": trend_percent,
                    "recent_average": recent_avg,
                    "older_average": older_avg
                }

        return trends

    def _check_alerts(self, current_metrics: Dict, trends: Dict) -> List[Dict]:
        """Check for quality alerts"""

        alerts = []

        # Check quality score
        quality_score = current_metrics.get("quality_score", 0)
        if quality_score < self.quality_thresholds["min_quality_score"]:
            alerts.append({
                "level": "critical",
                "metric": "quality_score",
                "value": quality_score,
                "threshold": self.quality_thresholds["min_quality_score"],
                "message": f"Quality score {quality_score} below minimum {self.quality_thresholds['min_quality_score']}"
            })
        elif quality_score < self.quality_thresholds["min_quality_score"] + 10:
            alerts.append({
                "level": "warning",
                "metric": "quality_score",
                "value": quality_score,
                "threshold": self.quality_thresholds["min_quality_score"],
                "message": f"Quality score {quality_score} approaching minimum threshold"
            })

        # Check test accuracy
        test_accuracy = current_metrics.get("test_accuracy", 0)
        if test_accuracy < self.quality_thresholds["min_test_accuracy"]:
            alerts.append({
                "level": "critical",
                "metric": "test_accuracy",
                "value": test_accuracy,
                "threshold": self.quality_thresholds["min_test_accuracy"],
                "message": f"Test accuracy {test_accuracy}% below minimum {self.quality_thresholds['min_test_accuracy']}%"
            })

        # Check performance speed
        performance_speed = current_metrics.get("performance_speed", 0)
        if performance_speed < self.quality_thresholds["min_performance_speed"]:
            alerts.append({
                "level": "warning",
                "metric": "performance_speed",
                "value": performance_speed,
                "threshold": self.quality_thresholds["min_performance_speed"],
                "message": f"Performance {performance_speed} emails/sec below target {self.quality_thresholds['min_performance_speed']}"
            })

        # Check validation status
        if not current_metrics.get("validation_passed", False):
            alerts.append({
                "level": "critical",
                "metric": "validation",
                "value": False,
                "threshold": True,
                "message": "Filter validation failed"
            })

        # Check trends for declining performance
        for metric, trend in trends.items():
            if trend.get("direction") == "declining" and trend.get("percent_change", 0) < -15:
                alerts.append({
                    "level": "warning",
                    "metric": f"{metric}_trend",
                    "value": trend.get("percent_change", 0),
                    "threshold": -15,
                    "message": f"{metric.replace('_', ' ').title()} declining by {trend.get('percent_change', 0):.1f}%"
                })

        return alerts

    def _generate_recommendations(self, current_metrics: Dict, alerts: List[Dict], trends: Dict) -> List[str]:
        """Generate recommendations based on metrics and alerts"""

        recommendations = []

        # Quality-based recommendations
        quality_score = current_metrics.get("quality_score", 0)
        if quality_score < 70:
            recommendations.append("Major filter revision required - quality score critically low")
        elif quality_score < 85:
            recommendations.append("Review and optimize filter configuration")

        # Accuracy-based recommendations
        test_accuracy = current_metrics.get("test_accuracy", 0)
        if test_accuracy < 80:
            recommendations.append("Review keyword relevance and add industry-specific terms")
        elif test_accuracy < 90:
            recommendations.append("Consider adding more specific industry keywords")

        # Performance-based recommendations
        performance_speed = current_metrics.get("performance_speed", 0)
        if performance_speed < 50:
            recommendations.append("Optimize filter algorithm for better performance")
        elif performance_speed < 100:
            recommendations.append("Consider keyword optimization for speed")

        # Alert-based recommendations
        for alert in alerts:
            if alert["metric"] == "quality_score" and alert["level"] == "critical":
                recommendations.append("Immediate attention needed - review filter structure and configuration")
            elif alert["metric"] == "test_accuracy" and alert["level"] == "critical":
                recommendations.append("Test with real data to identify classification issues")
            elif alert["metric"] == "validation":
                recommendations.append("Fix validation errors before production use")

        # Trend-based recommendations
        for metric, trend in trends.items():
            if trend.get("direction") == "declining":
                recommendations.append(f"Investigate {metric.replace('_', ' ')} decline and implement improvements")

        # Issues-based recommendations
        issues = current_metrics.get("issues_found", [])
        if issues:
            recommendations.append(f"Address {len(issues)} configuration issues found during validation")

        if not recommendations:
            recommendations.append("Filter performance is within acceptable ranges")

        return recommendations

    def _save_current_data_point(self, filter_name: str, metrics: Dict):
        """Save current metrics to history"""

        history_file = self.reports_dir / f"{filter_name}_history.json"

        try:
            # Load existing history
            if history_file.exists():
                with open(history_file, 'r', encoding='utf-8') as f:
                    history = json.load(f)
            else:
                history = []

            # Add current data point
            history.append(metrics)

            # Keep only last 90 days of data
            cutoff_date = datetime.now() - timedelta(days=90)
            filtered_history = []
            for point in history:
                try:
                    point_date = datetime.fromisoformat(point["timestamp"])
                    if point_date >= cutoff_date:
                        filtered_history.append(point)
                except (KeyError, ValueError):
                    continue

            # Save updated history
            with open(history_file, 'w', encoding='utf-8') as f:
                json.dump(filtered_history, f, ensure_ascii=False, indent=2)

        except Exception as e:
            print(f"   ⚠️  Could not save historical data: {e}")

    def _print_monitoring_results(self, monitoring_data: Dict):
        """Print monitoring results"""

        current = monitoring_data["current_metrics"]
        alerts = monitoring_data["alerts"]
        recommendations = monitoring_data["recommendations"]
        trends = monitoring_data.get("trends", {})

        print(f"\n📈 Current Metrics:")
        print(f"   Quality Score: {current.get('quality_score', 0)}/100")
        print(f"   Test Accuracy: {current.get('test_accuracy', 0):.1f}%")
        print(f"   Performance Speed: {current.get('performance_speed', 0):.0f} emails/sec")
        print(f"   Validation Status: {'✅ Passed' if current.get('validation_passed') else '❌ Failed'}")

        if current.get("high_priority_percent") is not None:
            print(f"   HIGH Priority %: {current['high_priority_percent']:.1f}%")

        if trends:
            print(f"\n📊 Trends:")
            for metric, trend in trends.items():
                if trend.get("direction") != "stable":
                    direction_icon = "📈" if trend["direction"] == "improving" else "📉"
                    print(f"   {metric.replace('_', ' ').title()}: {direction_icon} {trend['direction']} ({trend['percent_change']:+.1f}%)")

        if alerts:
            print(f"\n⚠️  Alerts ({len(alerts)}):")
            for alert in alerts:
                level_icon = {"critical": "🚨", "warning": "⚠️", "info": "ℹ️"}.get(alert["level"], "•")
                print(f"   {level_icon} {alert['message']}")

        if recommendations:
            print(f"\n💡 Recommendations:")
            for i, rec in enumerate(recommendations, 1):
                print(f"   {i}. {rec}")

    def _calculate_overall_health(self, batch_results: Dict) -> str:
        """Calculate overall health score for all filters"""

        filter_results = batch_results["filter_results"]
        if not filter_results:
            return "unknown"

        total_filters = len(filter_results)
        healthy_filters = 0
        warning_filters = 0
        critical_filters = 0

        for filter_name, result in filter_results.items():
            if result.get("error") or result.get("monitoring_failed"):
                critical_filters += 1
            else:
                alerts = result.get("alerts", [])
                critical_alerts = [a for a in alerts if a.get("level") == "critical"]
                warning_alerts = [a for a in alerts if a.get("level") == "warning"]

                if critical_alerts:
                    critical_filters += 1
                elif warning_alerts:
                    warning_filters += 1
                else:
                    healthy_filters += 1

        # Calculate health percentage
        health_percentage = (healthy_filters / total_filters) * 100 if total_filters > 0 else 0

        if health_percentage >= 90:
            return "excellent"
        elif health_percentage >= 75:
            return "good"
        elif health_percentage >= 60:
            return "acceptable"
        else:
            return "poor"

    def _generate_batch_recommendations(self, batch_results: Dict) -> List[str]:
        """Generate batch-level recommendations"""

        recommendations = []

        critical_filters = len([r for r in batch_results["filter_results"].values()
                              if r.get("alerts") and any(a.get("level") == "critical" for a in r.get("alerts", []))])

        if critical_filters > 0:
            recommendations.append(f"Immediate attention required for {critical_filters} filter(s) with critical issues")

        batch_alerts = batch_results.get("batch_alerts", [])
        if batch_alerts:
            recommendations.append(f"Review {len(batch_alerts)} critical alerts across all filters")

        overall_health = batch_results.get("overall_health", "unknown")
        if overall_health in ["poor", "acceptable"]:
            recommendations.append("Consider comprehensive filter optimization across the board")
        elif overall_health == "good":
            recommendations.append("Routine maintenance and monitoring recommended")

        return recommendations

    def _print_batch_summary(self, batch_results: Dict):
        """Print batch monitoring summary"""

        print(f"\n📊 BATCH MONITORING SUMMARY")
        print("=" * 50)
        print(f"Total Filters: {batch_results['total_filters']}")
        print(f"Overall Health: {batch_results['overall_health'].upper()}")

        batch_alerts = batch_results.get("batch_alerts", [])
        if batch_alerts:
            print(f"⚠️  Critical Alerts: {len(batch_alerts)}")

        batch_recommendations = batch_results.get("batch_recommendations", [])
        if batch_recommendations:
            print(f"\n💡 Batch Recommendations:")
            for rec in batch_recommendations:
                print(f"   • {rec}")

    def _save_batch_report(self, batch_results: Dict):
        """Save batch monitoring report"""

        report_file = self.reports_dir / f"batch_monitoring_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        try:
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(batch_results, f, ensure_ascii=False, indent=2)
            print(f"\n💾 Batch report saved to: {report_file}")
        except Exception as e:
            print(f"   ⚠️  Could not save batch report: {e}")


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Quality Monitoring for Smart Filters"
    )

    parser.add_argument(
        '--config',
        type=str,
        help='Monitor specific filter configuration'
    )

    parser.add_argument(
        '--all',
        action='store_true',
        help='Monitor all available filters'
    )

    parser.add_argument(
        '--period',
        type=int,
        default=30,
        help='Monitoring period in days (default: 30)'
    )

    parser.add_argument(
        '--save-report',
        type=str,
        help='Save monitoring report to JSON file'
    )

    args = parser.parse_args()

    monitor = QualityMonitor()

    if args.config:
        # Monitor specific filter
        result = monitor.monitor_filter(args.config, args.period)

        if args.save_report:
            with open(args.save_report, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"\n💾 Monitoring report saved to: {args.save_report}")

    elif args.all:
        # Monitor all filters
        result = monitor.monitor_all_filters(args.period)

        if args.save_report:
            with open(args.save_report, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"\n💾 Batch monitoring report saved to: {args.save_report}")

    else:
        print("❌ Please specify either --config or --all")
        print("Examples:")
        print("  python3 monitor_quality.py --config germany_automotive")
        print("  python3 monitor_quality.py --all --period 60")


if __name__ == "__main__":
    main()