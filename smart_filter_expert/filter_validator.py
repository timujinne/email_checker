#!/usr/bin/env python3
"""
Filter Validator - Quality assurance and testing system for smart filters

Features:
- Comprehensive filter validation
- Sample data testing
- Quality metrics assessment
- Performance benchmarking
- Troubleshooting recommendations
- Integration with blocklist analysis
"""

import json
import re
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set
from datetime import datetime
from collections import Counter, defaultdict


class FilterValidator:
    """Comprehensive validation and testing system for smart filters"""

    def __init__(self):
        self.root_dir = Path(__file__).parent.parent
        self.skill_dir = Path(__file__).parent
        self.configs_dir = self.root_dir / "smart_filters" / "configs"
        self.assets_dir = self.skill_dir / "assets"

        # Quality targets from best practices
        self.quality_targets = {
            "high_priority_max_percent": 10,
            "high_priority_min_relevance": 90,
            "medium_priority_range": (5, 20),
            "exclusion_justification_min": 80,
            "processing_speed_max": 3.0  # seconds per 1000 emails
        }

        # Test data samples
        self.test_samples = self._load_test_samples()

    def _load_test_samples(self) -> Dict:
        """Load test email samples for validation"""
        return {
            "germany_automotive": [
                {"email": "info@bmw.de", "company": "BMW AG", "domain": "bmw.de", "expected": "HIGH"},
                {"email": "kontakt@mercedes-benz.de", "company": "Mercedes-Benz Group", "domain": "mercedes-benz.de", "expected": "HIGH"},
                {"email": "sales@continental.de", "company": "Continental AG", "domain": "continental.de", "expected": "HIGH"},
                {"email": "hr@volkswagen.de", "company": "Volkswagen AG", "domain": "volkswagen.de", "expected": "EXCLUDED"},
                {"email": "john.doe@gmail.com", "company": "Personal", "domain": "gmail.com", "expected": "EXCLUDED"},
            ],
            "italy_hydraulics": [
                {"email": "info@oleodinamica.it", "company": "Oleodinamica S.p.A.", "domain": "oleodinamica.it", "expected": "HIGH"},
                {"email": "commercial@idraulica.it", "company": "Sistemi Idraulici", "domain": "idraulica.it", "expected": "HIGH"},
                {"email": "support@tempmail.com", "company": "Temp Mail", "domain": "tempmail.com", "expected": "EXCLUDED"},
            ]
        }

    def validate_filter(self, filter_name: str) -> Dict:
        """Perform comprehensive validation of filter configuration"""
        print(f"🔍 Comprehensive Filter Validation: {filter_name}")
        print("=" * 60)

        result = {
            "success": True,
            "errors": [],
            "warnings": [],
            "quality_score": 0,
            "recommendations": []
        }

        # Load configuration
        config_file = self.configs_dir / f"{filter_name}_config.json"
        if not config_file.exists():
            result["success"] = False
            result["errors"].append(f"Configuration file not found: {config_file}")
            return result

        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except Exception as e:
            result["success"] = False
            result["errors"].append(f"Failed to load configuration: {e}")
            return result

        # Structural validation
        structure_result = self._validate_structure(config)
        result["errors"].extend(structure_result["errors"])
        result["warnings"].extend(structure_result["warnings"])

        # Content validation
        content_result = self._validate_content(config, filter_name)
        result["errors"].extend(content_result["errors"])
        result["warnings"].extend(content_result["warnings"])

        # Quality assessment
        quality_result = self._assess_quality(config)
        result["quality_score"] = quality_result["score"]
        result["recommendations"].extend(quality_result["recommendations"])

        # Final status
        result["success"] = len(result["errors"]) == 0

        return result

    def _validate_structure(self, config: Dict) -> Dict:
        """Validate configuration structure"""
        result = {"errors": [], "warnings": []}

        # Required fields
        required_fields = [
            "filter_name", "target_country", "target_industry",
            "languages", "geographic", "hard_exclusions",
            "industry_keywords", "scoring"
        ]

        for field in required_fields:
            if field not in config:
                result["errors"].append(f"Missing required field: {field}")

        # Validate scoring structure
        if "scoring" in config:
            scoring = config["scoring"]
            if "weights" in scoring:
                weights = scoring["weights"]
                required_weights = ["email_quality", "company_relevance", "geographic_priority", "engagement"]

                for weight in required_weights:
                    if weight not in weights:
                        result["errors"].append(f"Missing scoring weight: {weight}")

                # Check weight sum
                total_weight = sum(weights.values())
                if abs(total_weight - 1.0) > 0.01:
                    result["errors"].append(f"Scoring weights don't sum to 1.0 (current: {total_weight})")

            if "thresholds" in scoring:
                thresholds = scoring["thresholds"]
                required_thresholds = ["high_priority", "medium_priority", "low_priority"]

                for threshold in required_thresholds:
                    if threshold not in thresholds:
                        result["errors"].append(f"Missing scoring threshold: {threshold}")

        # Validate geographic structure
        if "geographic" in config:
            geo = config["geographic"]
            if "excluded_countries" not in geo:
                result["warnings"].append("No excluded countries defined in geographic configuration")

        return result

    def _validate_content(self, config: Dict, filter_name: str) -> Dict:
        """Validate configuration content quality"""
        result = {"errors": [], "warnings": []}

        # Validate country code
        if "target_country" in config:
            country = config["target_country"]
            if not re.match(r'^[A-Z]{2}$', country):
                result["errors"].append(f"Invalid country code format: {country}")

        # Validate languages
        if "languages" in config:
            languages = config["languages"]
            if not languages:
                result["errors"].append("No languages specified")
            else:
                for lang in languages:
                    if not re.match(r'^[a-z]{2}$', lang):
                        result["warnings"].append(f"Potentially invalid language code: {lang}")

        # Validate industry keywords
        if "industry_keywords" in config:
            keywords = config["industry_keywords"]
            total_keywords = 0

            for category, keyword_list in keywords.items():
                if isinstance(keyword_list, list):
                    total_keywords += len(keyword_list)
                    for keyword in keyword_list:
                        if not isinstance(keyword, str) or len(keyword.strip()) == 0:
                            result["warnings"].append(f"Empty or invalid keyword in {category}")

            if total_keywords < 10:
                result["warnings"].append(f"Low keyword count: {total_keywords} (recommended: 20+)")
            elif total_keywords > 200:
                result["warnings"].append(f"Very high keyword count: {total_keywords} (may be too broad)")

        # Validate exclusions
        if "hard_exclusions" in config:
            exclusions = config["hard_exclusions"]

            if "personal_domains" in exclusions:
                personal_domains = exclusions["personal_domains"]
                if len(personal_domains) < 5:
                    result["warnings"].append("Few personal domains excluded (may miss personal emails)")

        return result

    def _assess_quality(self, config: Dict) -> Dict:
        """Assess overall quality and provide recommendations"""
        result = {"score": 50, "recommendations": []}  # Base score

        # Scoring factors
        score = 50

        # Language support (+15)
        languages = config.get("languages", [])
        if len(languages) >= 2:
            score += 15
        elif len(languages) == 1:
            score += 10

        # Keyword coverage (+20)
        keywords = config.get("industry_keywords", {})
        keyword_count = sum(len(v) if isinstance(v, list) else 0 for v in keywords.values())
        if keyword_count >= 30:
            score += 20
        elif keyword_count >= 15:
            score += 15
        elif keyword_count >= 8:
            score += 10

        # Geographic targeting (+15)
        geographic = config.get("geographic", {})
        excluded_countries = geographic.get("excluded_countries", [])
        if len(excluded_countries) >= 10:
            score += 15
        elif len(excluded_countries) >= 5:
            score += 10

        # Scoring configuration (+10)
        scoring = config.get("scoring", {})
        if scoring.get("weights") and scoring.get("thresholds"):
            score += 10

        # Exclusions quality (+10)
        exclusions = config.get("hard_exclusions", {})
        if exclusions.get("personal_domains") and exclusions.get("service_prefixes"):
            score += 10

        result["score"] = min(100, score)

        # Generate recommendations
        if score < 70:
            result["recommendations"].append("Consider adding more industry keywords")
            result["recommendations"].append("Review and expand excluded countries list")

        if len(languages) == 1 and config.get("target_country") in ["CH", "BE", "LU"]:
            result["recommendations"].append("Consider adding multiple languages for this multilingual market")

        if not config.get("scoring", {}).get("thresholds"):
            result["recommendations"].append("Add scoring thresholds for better quality control")

        return result

    def test_filter_with_samples(self, filter_name: str, sample_size: int = 100) -> Dict:
        """Test filter with sample data"""
        print(f"🧪 Testing Filter: {filter_name}")
        print("=" * 50)

        # Load filter configuration
        config_file = self.configs_dir / f"{filter_name}_config.json"
        if not config_file.exists():
            return {"success": False, "error": "Configuration file not found"}

        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except Exception as e:
            return {"success": False, "error": f"Failed to load config: {e}"}

        # Get relevant test samples
        country = config.get("target_country", "")
        industry = config.get("target_industry", "")
        sample_key = f"{country.lower()}_{industry}"

        test_emails = self.test_samples.get(sample_key, [])

        # Generate synthetic test data if no specific samples
        if not test_emails:
            test_emails = self._generate_synthetic_samples(config, sample_size)

        if not test_emails:
            return {"success": False, "error": "No test samples available"}

        # Test each sample
        results = {
            "success": True,
            "total_tested": len(test_emails),
            "correct_classifications": 0,
            "by_category": defaultdict(list),
            "performance": {},
            "issues": []
        }

        start_time = time.time()

        for sample in test_emails:
            classification = self._classify_email(sample, config)
            expected = sample.get("expected", "UNKNOWN")

            results["by_category"][classification].append(sample)

            if classification == expected:
                results["correct_classifications"] += 1
            elif expected != "UNKNOWN":
                results["issues"].append({
                    "email": sample["email"],
                    "expected": expected,
                    "actual": classification,
                    "reason": "Classification mismatch"
                })

        processing_time = time.time() - start_time
        results["performance"]["processing_time"] = processing_time
        results["performance"]["emails_per_second"] = len(test_emails) / processing_time if processing_time > 0 else 0

        # Calculate accuracy
        if results["total_tested"] > 0:
            results["accuracy"] = (results["correct_classifications"] / results["total_tested"]) * 100
        else:
            results["accuracy"] = 0

        return results

    def _generate_synthetic_samples(self, config: Dict, count: int) -> List[Dict]:
        """Generate synthetic test samples based on configuration"""
        samples = []
        country = config.get("target_country", "").lower()
        industry = config.get("target_industry", "")

        # Industry-specific domains
        industry_domains = {
            "automotive": ["bmw.de", "mercedes-benz.de", "volkswagen.de", "continental.de"],
            "hydraulics": ["oleodinamica.it", "idraulica.it", "hydraulics.de"],
            "construction": ["bouw.nl", "construction.fr", "bau.de"],
            "manufacturing": ["manufacturing.de", "produktion.de", "industrie.de"]
        }

        # Personal domains
        personal_domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"]

        # Generate samples
        for i in range(count):
            if i % 4 == 0:  # 25% industry relevant
                domain = industry_domains.get(industry, [f"industry.{country}"])[0] if industry_domains.get(industry) else f"industry.{country}"
                email = f"info@{domain}"
                company = f"Industry Company {i}"
                expected = "HIGH"
            elif i % 4 == 1:  # 25% potentially relevant
                domain = f"business.{country}"
                email = f"contact@{domain}"
                company = f"Business Ltd {i}"
                expected = "MEDIUM"
            elif i % 4 == 2:  # 25% personal
                domain = personal_domains[i % len(personal_domains)]
                email = f"user{i}@{domain}"
                company = "Personal"
                expected = "EXCLUDED"
            else:  # 25% HR/service
                domain = f"company.{country}"
                email = f"hr@{domain}"
                company = f"Company {i}"
                expected = "EXCLUDED"

            samples.append({
                "email": email,
                "company": company,
                "domain": domain,
                "expected": expected
            })

        return samples

    def _classify_email(self, sample: Dict, config: Dict) -> str:
        """Simple email classification based on configuration"""
        email = sample.get("email", "")
        domain = sample.get("domain", "")
        company = sample.get("company", "")

        # Check personal domains
        personal_domains = set(config.get("hard_exclusions", {}).get("personal_domains", []))
        if domain in personal_domains:
            return "EXCLUDED"

        # Check HR prefixes
        hr_prefixes = set()
        for prefixes in config.get("hard_exclusions", {}).get("hr_prefixes", {}).values():
            hr_prefixes.update(prefixes)

        for prefix in hr_prefixes:
            if email.startswith(prefix):
                return "EXCLUDED"

        # Check service prefixes
        service_prefixes = config.get("hard_exclusions", {}).get("service_prefixes", [])
        for prefix in service_prefixes:
            if prefix in email:
                return "EXCLUDED"

        # Check industry keywords
        industry_keywords = config.get("industry_keywords", {})
        relevant_text = f"{company} {domain}".lower()

        keyword_matches = 0
        for category, keywords in industry_keywords.items():
            if isinstance(keywords, list):
                for keyword in keywords:
                    if keyword.lower() in relevant_text:
                        keyword_matches += 1

        # Simple scoring
        if keyword_matches >= 2:
            return "HIGH"
        elif keyword_matches >= 1:
            return "MEDIUM"
        else:
            return "LOW"

    def benchmark_filter(self, filter_name: str, test_size: int = 1000) -> Dict:
        """Benchmark filter performance"""
        print(f"🏃 Performance Benchmark: {filter_name}")
        print("=" * 50)

        # Load configuration
        config_file = self.configs_dir / f"{filter_name}_config.json"
        if not config_file.exists():
            return {"success": False, "error": "Configuration file not found"}

        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except Exception as e:
            return {"success": False, "error": f"Failed to load config: {e}"}

        # Generate test data
        test_emails = self._generate_synthetic_samples(config, test_size)

        # Benchmark processing
        start_time = time.time()
        classifications = []

        for sample in test_emails:
            classification = self._classify_email(sample, config)
            classifications.append(classification)

        end_time = time.time()

        processing_time = end_time - start_time
        emails_per_second = test_size / processing_time if processing_time > 0 else 0

        # Analyze results
        category_counts = Counter(classifications)

        result = {
            "success": True,
            "test_size": test_size,
            "processing_time": processing_time,
            "emails_per_second": emails_per_second,
            "performance_rating": "Unknown",
            "category_distribution": dict(category_counts),
            "quality_metrics": {
                "high_priority_percent": (category_counts.get("HIGH", 0) / test_size) * 100,
                "medium_priority_percent": (category_counts.get("MEDIUM", 0) / test_size) * 100,
                "low_priority_percent": (category_counts.get("LOW", 0) / test_size) * 100,
                "excluded_percent": (category_counts.get("EXCLUDED", 0) / test_size) * 100
            }
        }

        # Performance rating
        if emails_per_second >= 500:
            result["performance_rating"] = "Excellent"
        elif emails_per_second >= 200:
            result["performance_rating"] = "Good"
        elif emails_per_second >= 100:
            result["performance_rating"] = "Acceptable"
        else:
            result["performance_rating"] = "Poor"

        return result

    def generate_quality_report(self, filter_name: str) -> Dict:
        """Generate comprehensive quality report"""
        print(f"📊 Generating Quality Report: {filter_name}")
        print("=" * 60)

        report = {
            "filter_name": filter_name,
            "timestamp": datetime.now().isoformat(),
            "validation": None,
            "testing": None,
            "benchmark": None,
            "overall_score": 0,
            "recommendations": []
        }

        # Run validation
        validation_result = self.validate_filter(filter_name)
        report["validation"] = validation_result

        # Run testing (if validation passed)
        if validation_result["success"]:
            testing_result = self.test_filter_with_samples(filter_name)
            report["testing"] = testing_result

            # Run benchmark
            benchmark_result = self.benchmark_filter(filter_name)
            report["benchmark"] = benchmark_result

            # Calculate overall score
            validation_score = validation_result.get("quality_score", 0)
            testing_score = testing_result.get("accuracy", 0) if testing_result.get("success") else 50
            performance_score = 100 if benchmark_result.get("performance_rating") in ["Excellent", "Good"] else 70

            report["overall_score"] = (validation_score * 0.4 + testing_score * 0.4 + performance_score * 0.2)

            # Generate recommendations
            if report["overall_score"] < 80:
                report["recommendations"].append("Overall quality score below target - review configuration")

            if testing_result.get("accuracy", 0) < 85:
                report["recommendations"].append("Low classification accuracy - check keyword relevance")

            if benchmark_result.get("emails_per_second", 0) < 100:
                report["recommendations"].append("Slow processing speed - consider optimization")

        return report


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Filter Validator - Quality assurance for smart filters"
    )

    parser.add_argument(
        '--validate',
        type=str,
        help='Validate filter configuration'
    )

    parser.add_argument(
        '--test',
        type=str,
        help='Test filter with sample data'
    )

    parser.add_argument(
        '--benchmark',
        type=str,
        help='Benchmark filter performance'
    )

    parser.add_argument(
        '--report',
        type=str,
        help='Generate comprehensive quality report'
    )

    parser.add_argument(
        '--sample-size',
        type=int,
        default=100,
        help='Sample size for testing (default: 100)'
    )

    args = parser.parse_args()

    validator = FilterValidator()

    if args.report:
        report = validator.generate_quality_report(args.report)
        print(f"\n📋 QUALITY REPORT SUMMARY")
        print("=" * 40)
        print(f"Filter: {report['filter_name']}")
        print(f"Overall Score: {report['overall_score']:.1f}/100")
        print(f"Validation: {'✅ PASSED' if report['validation']['success'] else '❌ FAILED'}")

        if report['testing']:
            print(f"Testing Accuracy: {report['testing'].get('accuracy', 0):.1f}%")

        if report['benchmark']:
            print(f"Performance: {report['benchmark'].get('performance_rating', 'Unknown')}")

        if report['recommendations']:
            print(f"\n💡 Recommendations:")
            for rec in report['recommendations']:
                print(f"   • {rec}")

    elif args.test:
        result = validator.test_filter_with_samples(args.test, args.sample_size)
        print(f"\n📊 TESTING RESULTS")
        print("=" * 30)
        print(f"Total Tested: {result['total_tested']}")
        print(f"Accuracy: {result.get('accuracy', 0):.1f}%")
        print(f"Processing Speed: {result['performance'].get('emails_per_second', 0):.0f} emails/sec")

        if result['issues']:
            print(f"\n⚠️  Issues Found: {len(result['issues'])}")
            for issue in result['issues'][:5]:  # Show first 5
                print(f"   • {issue['email']}: expected {issue['expected']}, got {issue['actual']}")

    elif args.benchmark:
        result = validator.benchmark_filter(args.benchmark)
        print(f"\n🏃 BENCHMARK RESULTS")
        print("=" * 30)
        print(f"Test Size: {result['test_size']}")
        print(f"Processing Time: {result['processing_time']:.2f}s")
        print(f"Speed: {result['emails_per_second']:.0f} emails/sec")
        print(f"Rating: {result['performance_rating']}")

        print(f"\n📈 Category Distribution:")
        for category, count in result['category_distribution'].items():
            percent = (count / result['test_size']) * 100
            print(f"   {category}: {count} ({percent:.1f}%)")

    elif args.validate:
        result = validator.validate_filter(args.validate)
        print(f"\n🔍 VALIDATION RESULTS")
        print("=" * 30)
        print(f"Status: {'✅ PASSED' if result['success'] else '❌ FAILED'}")
        print(f"Quality Score: {result['quality_score']}/100")

        if result['errors']:
            print(f"\n❌ Errors ({len(result['errors'])}):")
            for error in result['errors']:
                print(f"   • {error}")

        if result['warnings']:
            print(f"\n⚠️  Warnings ({len(result['warnings'])}):")
            for warning in result['warnings']:
                print(f"   • {warning}")

        if result['recommendations']:
            print(f"\n💡 Recommendations:")
            for rec in result['recommendations']:
                print(f"   • {rec}")

    else:
        print("❌ Please specify an action: --validate, --test, --benchmark, or --report")
        print("Example: python3 filter_validator.py --validate germany_automotive")


if __name__ == "__main__":
    main()