#!/usr/bin/env python3
"""
Batch Filter Creation Script - Create multiple filters for regions or industries

Features:
- Multi-country filter creation
- Multi-industry batch processing
- Quality consistency across filters
- Automated testing and validation
- Performance benchmarking
"""

import json
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from filter_generator import FilterGenerator
from filter_validator import FilterValidator


class BatchFilterCreator:
    """Creates multiple filters with consistent quality"""

    def __init__(self):
        self.skill_dir = Path(__file__).parent.parent
        self.generator = FilterGenerator()
        self.validator = FilterValidator()

        # Quality standards for batch creation
        self.quality_standards = {
            "min_quality_score": 80,
            "min_test_accuracy": 85,
            "min_performance_speed": 100  # emails/second
        }

        # Supported regions and configurations
        self.regions = {
            "europe": ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "CH"],
            "western_europe": ["DE", "FR", "IT", "ES", "NL", "BE", "CH", "AT", "LU"],
            "southern_europe": ["IT", "ES", "PT", "GR"],
            "central_europe": ["DE", "AT", "CH", "CZ", "PL", "HU"],
            "nordic": ["SE", "NO", "FI", "DK"]
        }

    def create_batch_filters(self, countries: List[str], industry: str,
                            quality_mode: str = "balanced",
                            output_prefix: str = None) -> Dict:
        """Create filters for multiple countries"""

        print(f"🏭 Batch Filter Creation: {industry.upper()} Industry")
        print(f"🌍 Target Countries: {', '.join(countries)}")
        print(f"⚙️  Quality Mode: {quality_mode}")
        print("=" * 70)

        results = {
            "batch_id": f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "countries": countries,
            "industry": industry,
            "quality_mode": quality_mode,
            "created_filters": [],
            "failed_filters": [],
            "batch_statistics": {},
            "start_time": datetime.now().isoformat()
        }

        start_time = time.time()

        for i, country in enumerate(countries, 1):
            print(f"\n📂 Processing {country} ({i}/{len(countries)})...")

            filter_name = f"{country.lower()}_{industry}"
            if output_prefix:
                filter_name = f"{output_prefix}_{filter_name}"

            try:
                # Create filter with consistent settings
                filter_result = self._create_single_filter(
                    country=country,
                    industry=industry,
                    filter_name=filter_name,
                    quality_mode=quality_mode
                )

                if filter_result["success"]:
                    results["created_filters"].append(filter_result)
                    print(f"   ✅ {filter_name}: Quality Score {filter_result['quality_score']}/100")
                else:
                    results["failed_filters"].append({
                        "country": country,
                        "filter_name": filter_name,
                        "error": filter_result.get("error", "Unknown error")
                    })
                    print(f"   ❌ {filter_name}: {filter_result.get('error', 'Failed')}")

            except Exception as e:
                error_msg = f"Unexpected error: {str(e)}"
                results["failed_filters"].append({
                    "country": country,
                    "filter_name": filter_name,
                    "error": error_msg
                })
                print(f"   ⚠️  {filter_name}: {error_msg}")

        # Calculate batch statistics
        end_time = time.time()
        results["end_time"] = datetime.now().isoformat()
        results["processing_time"] = end_time - start_time
        results["batch_statistics"] = self._calculate_batch_statistics(results)

        # Print summary
        self._print_batch_summary(results)

        return results

    def create_industry_batch(self, industries: List[str], country: str,
                            quality_mode: str = "balanced") -> Dict:
        """Create filters for multiple industries in one country"""

        print(f"🏭 Industry Batch Creation: {country.upper()} Market")
        print(f"🏢 Target Industries: {', '.join(industries)}")
        print(f"⚙️  Quality Mode: {quality_mode}")
        print("=" * 70)

        results = {
            "batch_id": f"industry_batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "country": country,
            "industries": industries,
            "quality_mode": quality_mode,
            "created_filters": [],
            "failed_filters": [],
            "batch_statistics": {},
            "start_time": datetime.now().isoformat()
        }

        start_time = time.time()

        for i, industry in enumerate(industries, 1):
            print(f"\n📂 Processing {industry} ({i}/{len(industries)})...")

            filter_name = f"{country.lower()}_{industry}"

            try:
                # Create filter with consistent settings
                filter_result = self._create_single_filter(
                    country=country,
                    industry=industry,
                    filter_name=filter_name,
                    quality_mode=quality_mode
                )

                if filter_result["success"]:
                    results["created_filters"].append(filter_result)
                    print(f"   ✅ {filter_name}: Quality Score {filter_result['quality_score']}/100")
                else:
                    results["failed_filters"].append({
                        "industry": industry,
                        "filter_name": filter_name,
                        "error": filter_result.get("error", "Unknown error")
                    })
                    print(f"   ❌ {filter_name}: {filter_result.get('error', 'Failed')}")

            except Exception as e:
                error_msg = f"Unexpected error: {str(e)}"
                results["failed_filters"].append({
                    "industry": industry,
                    "filter_name": filter_name,
                    "error": error_msg
                })
                print(f"   ⚠️  {filter_name}: {error_msg}")

        # Calculate batch statistics
        end_time = time.time()
        results["end_time"] = datetime.now().isoformat()
        results["processing_time"] = end_time - start_time
        results["batch_statistics"] = self._calculate_batch_statistics(results)

        # Print summary
        self._print_batch_summary(results)

        return results

    def _create_single_filter(self, country: str, industry: str,
                             filter_name: str, quality_mode: str) -> Dict:
        """Create a single filter with quality validation"""

        result = {
            "filter_name": filter_name,
            "country": country,
            "industry": industry,
            "quality_mode": quality_mode,
            "success": False,
            "quality_score": 0,
            "validation_passed": False,
            "test_accuracy": 0,
            "performance_score": 0,
            "warnings": []
        }

        try:
            # Get country data
            country_data = self.generator.available_countries.get(country)
            if not country_data:
                result["error"] = f"Country {country} not supported"
                return result

            # Get template if available
            template = None
            if industry in self.generator.available_templates:
                template_file = self.generator.templates_dir / f"{industry}_template.json"
                if template_file.exists():
                    with open(template_file, 'r', encoding='utf-8') as f:
                        template = json.load(f)

            # Build configuration
            config = self.generator._build_config(
                filter_name=filter_name,
                country_code=country,
                industry=industry,
                languages=country_data["languages"],
                template=template
            )

            # Apply quality mode adjustments
            self._apply_quality_mode_adjustments(config, quality_mode)

            # Generate filter files
            self.generator._generate_filter_files(
                filter_name=filter_name,
                country_code=country,
                industry=industry,
                languages=country_data["languages"],
                template=template
            )

            # Apply blocklist insights
            self.generator._apply_blocklist_insights(filter_name)

            # Validate created filter
            validation_result = self.validator.validate_filter(filter_name)

            if validation_result["success"]:
                result["validation_passed"] = True
                result["quality_score"] = validation_result["quality_score"]
                result["warnings"] = validation_result["warnings"]

                # Test filter performance
                test_result = self.validator.test_filter_with_samples(filter_name, 100)
                if test_result.get("success"):
                    result["test_accuracy"] = test_result.get("accuracy", 0)

                # Benchmark performance
                benchmark_result = self.validator.benchmark_filter(filter_name, 500)
                if benchmark_result.get("success"):
                    result["performance_score"] = 100 if benchmark_result.get("emails_per_second", 0) >= self.quality_standards["min_performance_speed"] else 75

                # Check quality standards
                if (result["quality_score"] >= self.quality_standards["min_quality_score"] and
                    result["test_accuracy"] >= self.quality_standards["min_test_accuracy"]):
                    result["success"] = True
                else:
                    result["warnings"].append("Filter below quality standards")
            else:
                result["error"] = "Validation failed"
                result["warnings"] = validation_result["errors"]

        except Exception as e:
            result["error"] = f"Creation failed: {str(e)}"

        return result

    def _apply_quality_mode_adjustments(self, config: Dict, quality_mode: str):
        """Apply quality mode specific adjustments"""

        if quality_mode == "aggressive":
            # Lower thresholds for more results
            if "scoring" in config and "thresholds" in config["scoring"]:
                thresholds = config["scoring"]["thresholds"]
                thresholds["high_priority"] = int(thresholds.get("high_priority", 100) * 0.85)
                thresholds["medium_priority"] = int(thresholds.get("medium_priority", 50) * 0.85)

        elif quality_mode == "conservative":
            # Higher thresholds for better quality
            if "scoring" in config and "thresholds" in config["scoring"]:
                thresholds = config["scoring"]["thresholds"]
                thresholds["high_priority"] = int(thresholds.get("high_priority", 100) * 1.15)
                thresholds["medium_priority"] = int(thresholds.get("medium_priority", 50) * 1.15)

        elif quality_mode == "balanced":
            # Standard settings - no changes needed
            pass

    def _calculate_batch_statistics(self, results: Dict) -> Dict:
        """Calculate batch processing statistics"""

        created = results["created_filters"]
        failed = results["failed_filters"]

        if not created:
            return {
                "total_filters": 0,
                "success_rate": 0,
                "average_quality_score": 0,
                "average_test_accuracy": 0,
                "average_performance_score": 0
            }

        stats = {
            "total_filters": len(created) + len(failed),
            "successful_filters": len(created),
            "failed_filters": len(failed),
            "success_rate": (len(created) / (len(created) + len(failed))) * 100 if (len(created) + len(failed)) > 0 else 0,
            "average_quality_score": sum(f["quality_score"] for f in created) / len(created),
            "average_test_accuracy": sum(f["test_accuracy"] for f in created) / len(created),
            "average_performance_score": sum(f["performance_score"] for f in created) / len(created),
            "processing_time_per_filter": results["processing_time"] / len(created) if created else 0
        }

        # Quality distribution
        quality_distribution = {"excellent": 0, "good": 0, "acceptable": 0, "poor": 0}
        for filter_result in created:
            score = filter_result["quality_score"]
            if score >= 95:
                quality_distribution["excellent"] += 1
            elif score >= 85:
                quality_distribution["good"] += 1
            elif score >= 75:
                quality_distribution["acceptable"] += 1
            else:
                quality_distribution["poor"] += 1

        stats["quality_distribution"] = quality_distribution

        return stats

    def _print_batch_summary(self, results: Dict):
        """Print batch processing summary"""

        stats = results["batch_statistics"]
        created = results["created_filters"]
        failed = results["failed_filters"]

        print(f"\n📊 BATCH CREATION SUMMARY")
        print("=" * 50)
        print(f"Batch ID: {results['batch_id']}")
        print(f"Processing Time: {results['processing_time']:.2f} seconds")
        print(f"Filters Created: {len(created)}")
        print(f"Filters Failed: {len(failed)}")
        print(f"Success Rate: {stats['success_rate']:.1f}%")

        if created:
            print(f"\n📈 Quality Metrics:")
            print(f"   Average Quality Score: {stats['average_quality_score']:.1f}/100")
            print(f"   Average Test Accuracy: {stats['average_test_accuracy']:.1f}%")
            print(f"   Average Performance: {stats['average_performance_score']:.1f}/100")
            print(f"   Time per Filter: {stats['processing_time_per_filter']:.2f}s")

            print(f"\n🎯 Quality Distribution:")
            dist = stats["quality_distribution"]
            print(f"   Excellent (95+): {dist['excellent']}")
            print(f"   Good (85-94): {dist['good']}")
            print(f"   Acceptable (75-84): {dist['acceptable']}")
            print(f"   Poor (<75): {dist['poor']}")

        if failed:
            print(f"\n⚠️  Failed Filters:")
            for failure in failed:
                print(f"   • {failure.get('filter_name', 'Unknown')}: {failure.get('error', 'Unknown error')}")

        print(f"\n✅ Batch creation completed successfully!")


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Batch Filter Creation for Multiple Countries/Industries"
    )

    parser.add_argument(
        '--countries',
        type=str,
        help='Comma-separated country codes (e.g., DE,FR,IT,ES)'
    )

    parser.add_argument(
        '--region',
        type=str,
        help='Predefined region (europe, western_europe, southern_europe, central_europe, nordic)'
    )

    parser.add_argument(
        '--industries',
        type=str,
        help='Comma-separated industries (e.g., automotive,manufacturing,hydraulics)'
    )

    parser.add_argument(
        '--industry',
        type=str,
        help='Single industry for multi-country batch'
    )

    parser.add_argument(
        '--country',
        type=str,
        help='Single country for multi-industry batch'
    )

    parser.add_argument(
        '--quality-mode',
        type=str,
        choices=['balanced', 'aggressive', 'conservative'],
        default='balanced',
        help='Quality mode for filter creation'
    )

    parser.add_argument(
        '--output-prefix',
        type=str,
        help='Prefix for generated filter names'
    )

    parser.add_argument(
        '--save-report',
        type=str,
        help='Save batch report to JSON file'
    )

    args = parser.parse_args()

    creator = BatchFilterCreator()

    # Determine batch type
    if args.region or args.countries:
        if not args.industry:
            print("❌ Error: --industry required when using --countries or --region")
            return

        # Get country list
        if args.region:
            if args.region not in creator.regions:
                print(f"❌ Error: Region '{args.region}' not supported")
                print(f"Available regions: {', '.join(creator.regions.keys())}")
                return
            countries = creator.regions[args.region]
        else:
            countries = [c.strip().upper() for c in args.countries.split(',')]

        # Create country batch
        results = creator.create_batch_filters(
            countries=countries,
            industry=args.industry,
            quality_mode=args.quality_mode,
            output_prefix=args.output_prefix
        )

    elif args.country and args.industries:
        industries = [i.strip() for i in args.industries.split(',')]

        # Create industry batch
        results = creator.create_industry_batch(
            industries=industries,
            country=args.country.upper(),
            quality_mode=args.quality_mode
        )

    else:
        print("❌ Error: Please specify either:")
        print("   --countries + --industry (or --region + --industry)")
        print("   OR --country + --industries")
        return

    # Save report if requested
    if args.save_report:
        with open(args.save_report, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"\n💾 Batch report saved to: {args.save_report}")


if __name__ == "__main__":
    main()