#!/usr/bin/env python3
"""
Requirements Analysis Script - Analyzes market requirements for filter creation

Features:
- Market size estimation
- Language requirement analysis
- Geographic recommendations
- Industry-specific insights
- Quality target suggestions
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

class RequirementsAnalyzer:
    """Analyzes requirements for smart filter creation"""

    def __init__(self):
        self.skill_dir = Path(__file__).parent.parent
        self.assets_dir = self.skill_dir / "assets"

        # Market data (simplified for demonstration)
        self.market_data = {
            "DE": {
                "name": "Germany",
                "languages": ["de", "en"],
                "industry_distribution": {
                    "automotive": 0.25,  # 25% of manufacturing
                    "manufacturing": 0.40,
                    "construction": 0.20,
                    "hydraulics": 0.15
                },
                "industrial_regions": ["bavaria", "baden-württemberg", "north rhine-westphalia"],
                "major_cities": ["berlin", "munich", "hamburg", "frankfurt", "cologne"],
                "company_count_estimates": {
                    "automotive": 1500,
                    "manufacturing": 8000,
                    "construction": 25000,
                    "hydraulics": 800
                }
            },
            "IT": {
                "name": "Italy",
                "languages": ["it", "en"],
                "industry_distribution": {
                    "automotive": 0.20,
                    "manufacturing": 0.35,
                    "construction": 0.15,
                    "hydraulics": 0.30
                },
                "industrial_regions": ["lombardy", "emilia-romagna", "piedmont", "veneto"],
                "major_cities": ["milan", "rome", "turin", "bologna", "naples"],
                "company_count_estimates": {
                    "automotive": 2000,
                    "manufacturing": 6000,
                    "construction": 15000,
                    "hydraulics": 1200
                }
            },
            "FR": {
                "name": "France",
                "languages": ["fr", "en"],
                "industry_distribution": {
                    "automotive": 0.15,
                    "manufacturing": 0.30,
                    "construction": 0.25,
                    "hydraulics": 0.30
                },
                "industrial_regions": ["île-de-france", "auvergne-rhône-alpes", "nouvelle-aquitaine"],
                "major_cities": ["paris", "lyon", "marseille", "toulouse", "nice"],
                "company_count_estimates": {
                    "automotive": 1000,
                    "manufacturing": 5000,
                    "construction": 20000,
                    "hydraulics": 900
                }
            },
            "ES": {
                "name": "Spain",
                "languages": ["es", "en"],
                "industry_distribution": {
                    "automotive": 0.30,
                    "manufacturing": 0.25,
                    "construction": 0.30,
                    "hydraulics": 0.15
                },
                "industrial_regions": ["andalusia", "catalonia", "valencia", "madrid"],
                "major_cities": ["madrid", "barcelona", "valencia", "seville", "bilbao"],
                "company_count_estimates": {
                    "automotive": 1800,
                    "manufacturing": 4000,
                    "construction": 18000,
                    "hydraulics": 600
                }
            },
            "CH": {
                "name": "Switzerland",
                "languages": ["de", "fr", "it", "en"],
                "industry_distribution": {
                    "automotive": 0.10,
                    "manufacturing": 0.45,
                    "construction": 0.25,
                    "hydraulics": 0.20
                },
                "industrial_regions": ["zurich", "geneva", "basel", "bern"],
                "major_cities": ["zurich", "geneva", "basel", "bern", "lausanne"],
                "company_count_estimates": {
                    "automotive": 300,
                    "manufacturing": 2500,
                    "construction": 3000,
                    "hydraulics": 400
                }
            }
        }

    def analyze_requirements(self, country: str, industry: str,
                           detailed: bool = False, multilingual: bool = False) -> Dict:
        """Analyze requirements for filter creation"""

        print(f"📊 Market Analysis: {self.get_country_name(country)} - {industry.capitalize()}")
        print("=" * 60)

        if country not in self.market_data:
            return {"error": f"Country {country} not supported"}

        country_data = self.market_data[country]
        analysis = {
            "country": country,
            "country_name": country_data["name"],
            "industry": industry,
            "analysis_date": datetime.now().isoformat(),
            "recommendations": []
        }

        # Basic analysis
        analysis.update(self._analyze_basic_requirements(country_data, industry))

        # Language analysis
        analysis.update(self._analyze_language_requirements(country_data, multilingual))

        # Geographic analysis
        analysis.update(self._analyze_geographic_requirements(country_data))

        # Quality targets
        analysis.update(self._suggest_quality_targets(country, industry))

        # Special considerations
        analysis.update(self._identify_special_considerations(country, industry, multilingual))

        # Detailed analysis if requested
        if detailed:
            analysis.update(self._detailed_analysis(country_data, industry))

        # Print analysis
        self._print_analysis(analysis)

        return analysis

    def _analyze_basic_requirements(self, country_data: Dict, industry: str) -> Dict:
        """Analyze basic market requirements"""

        company_count = country_data["company_count_estimates"].get(industry, 0)
        industry_share = country_data["industry_distribution"].get(industry, 0)

        return {
            "market_size": {
                "estimated_companies": company_count,
                "industry_share_percent": industry_share * 100,
                "market_maturity": "established" if company_count > 1000 else "emerging"
            },
            "languages": country_data["languages"],
            "primary_language": country_data["languages"][0]
        }

    def _analyze_language_requirements(self, country_data: Dict, multilingual: bool) -> Dict:
        """Analyze language requirements"""

        languages = country_data["languages"]
        primary_lang = languages[0]

        language_analysis = {
            "primary_language": primary_lang,
            "secondary_languages": languages[1:] if len(languages) > 1 else [],
            "multilingual_required": multilingual or len(languages) > 2,
            "language_distribution": {}
        }

        # Estimate language distribution (simplified)
        if country_data["name"] == "Switzerland":
            language_analysis["language_distribution"] = {
                "de": 0.65, "fr": 0.22, "it": 0.08, "en": 0.05
            }
        elif country_data["name"] == "Belgium":
            language_analysis["language_distribution"] = {
                "nl": 0.60, "fr": 0.39, "en": 0.01
            }
        else:
            # Single language dominant
            language_analysis["language_distribution"] = {
                primary_lang: 0.90, "en": 0.10
            }

        return language_analysis

    def _analyze_geographic_requirements(self, country_data: Dict) -> Dict:
        """Analyze geographic requirements"""

        return {
            "industrial_regions": country_data["industrial_regions"],
            "major_cities": country_data["major_cities"],
            "recommended_focus": country_data["industrial_regions"][:2],  # Top 2 regions
            "geographic_strategy": "regional_focus" if len(country_data["industrial_regions"]) > 3 else "national"
        }

    def _suggest_quality_targets(self, country: str, industry: str) -> Dict:
        """Suggest quality targets based on market characteristics"""

        # Base targets
        targets = {
            "high_priority_max_percent": 10,
            "high_priority_min_relevance": 90,
            "medium_priority_range": (5, 20),
            "processing_speed_target": 200  # emails/second
        }

        # Adjust based on market maturity
        if country in ["DE", "FR", "IT"]:  # Mature markets
            targets["high_priority_max_percent"] = 8
            targets["high_priority_min_relevance"] = 95
        elif country in ["ES", "PT"]:  # Developing markets
            targets["high_priority_max_percent"] = 12
            targets["high_priority_min_relevance"] = 85

        # Adjust based on industry
        if industry in ["hydraulics", "automotive"]:  # Specialized industries
            targets["high_priority_max_percent"] = 6
            targets["high_priority_min_relevance"] = 95
        elif industry in ["construction", "manufacturing"]:  # Broad industries
            targets["high_priority_max_percent"] = 10
            targets["high_priority_min_relevance"] = 90

        return targets

    def _identify_special_considerations(self, country: str, industry: str, multilingual: bool) -> Dict:
        """Identify special considerations for the market"""

        considerations = {
            "special_considerations": [],
            "recommended_approach": "standard",
            "complexity_level": "medium"
        }

        # Country-specific considerations
        if country == "CH":
            considerations["special_considerations"].append("4 official languages")
            considerations["special_considerations"].append("Strong regional differences")
            considerations["recommended_approach"] = "multilingual"
            considerations["complexity_level"] = "high"
        elif country == "IT":
            considerations["special_considerations"].append("Strong family-owned business sector")
            considerations["special_considerations"].append("Regional industrial clusters")
            considerations["recommended_approach"] = "regional_focus"
        elif country == "ES":
            considerations["special_considerations"].append("Regional economic variations")
            considerations["special_considerations"].append("Catalan language considerations in Catalonia")
        elif country == "DE":
            considerations["special_considerations"].append("Mittelstand (SME) dominance")
            considerations["special_considerations"].append("Engineering-focused culture")

        # Industry-specific considerations
        if industry == "hydraulics":
            considerations["special_considerations"].append("Highly technical terminology")
            considerations["special_considerations"].append("OEM vs distributor distinction important")
        elif industry == "automotive":
            considerations["special_considerations"].append("Tier 1/2/3 supplier hierarchy")
            considerations["special_considerations"].append("Electric vehicle transition impact")
        elif industry == "construction":
            considerations["special_considerations"].append("Residential vs commercial focus")
            considerations["special_considerations"].append("Seasonal business patterns")

        return considerations

    def _detailed_analysis(self, country_data: Dict, industry: str) -> Dict:
        """Provide detailed market analysis"""

        return {
            "competitive_landscape": {
                "market_concentration": "fragmented" if country_data["company_count_estimates"].get(industry, 0) > 5000 else "concentrated",
                "entry_barriers": "high" if industry in ["automotive", "hydraulics"] else "medium",
                "international_competition": "high" if country_data["name"] in ["DE", "IT", "FR"] else "medium"
            },
            "business_patterns": {
                "company_size_distribution": self._estimate_company_size_distribution(country_data["name"]),
                "decision_maker_patterns": self._get_decision_maker_patterns(industry),
                "seasonal_factors": self._get_seasonal_factors(industry)
            },
            "technical_considerations": {
                "email_domain_patterns": self._get_email_domain_patterns(country_data["name"]),
                "company_naming_conventions": self._get_naming_conventions(country_data["name"]),
                "language_complexity": "high" if country_data["name"] in ["DE", "FR"] else "medium"
            }
        }

    def _estimate_company_size_distribution(self, country_name: str) -> Dict:
        """Estimate company size distribution"""

        if country_name == "Germany":
            return {"large": 0.05, "medium": 0.25, "small": 0.70}  # Strong SME sector
        elif country_name == "Italy":
            return {"large": 0.03, "medium": 0.20, "small": 0.77}  # Very strong SME sector
        else:
            return {"large": 0.10, "medium": 0.30, "small": 0.60}  # Standard distribution

    def _get_decision_maker_patterns(self, industry: str) -> List[str]:
        """Get typical decision maker patterns by industry"""

        patterns = {
            "automotive": ["Technical Director", "Purchasing Manager", "CEO", "Engineering Manager"],
            "hydraulics": ["Technical Director", "Sales Manager", "CEO", "R&D Manager"],
            "manufacturing": ["Operations Director", "Technical Manager", "CEO", "Production Manager"],
            "construction": ["Project Manager", "Technical Director", "CEO", "Site Manager"]
        }

        return patterns.get(industry, ["CEO", "Technical Manager", "Sales Director"])

    def _get_seasonal_factors(self, industry: str) -> List[str]:
        """Get seasonal factors by industry"""

        factors = {
            "construction": ["Q1 planning", "Q2-Q3 peak season", "Q4 slowdown"],
            "automotive": ["Q1 new models", "Q2-Q3 production", "Q4 year-end"],
            "hydraulics": ["Relatively stable", "Slight Q1-Q2 increase", "Agricultural equipment cycles"],
            "manufacturing": ["Q1 planning", "Q2-Q3 steady", "Q4 year-end rush"]
        }

        return factors.get(industry, ["Standard business cycles"])

    def _get_email_domain_patterns(self, country_name: str) -> List[str]:
        """Get typical email domain patterns by country"""

        patterns = {
            "Germany": ["company.de", "company.com", "gmbh.de", "ag.de"],
            "Italy": ["company.it", "company.com", "spa.it", "srl.it"],
            "France": ["company.fr", "company.com", "sarl.fr", "sa.fr"],
            "Spain": ["company.es", "company.com", "sl.es", "sa.es"],
            "Switzerland": ["company.ch", "company.com", "ag.ch", "gmbh.ch"]
        }

        return patterns.get(country_name, ["company.country_tld", "company.com"])

    def _get_naming_conventions(self, country_name: str) -> List[str]:
        """Get typical company naming conventions by country"""

        conventions = {
            "Germany": ["GmbH", "AG", "KG", "OHG", "e.K."],
            "Italy": ["S.p.A.", "S.r.l.", "S.n.c.", "S.a.s."],
            "France": ["SA", "SARL", "EURL", "SAS"],
            "Spain": ["S.A.", "S.L.", "S.C.", "S.L.N.E."],
            "Switzerland": ["AG", "GmbH", "SA", "Sàrl"]
        }

        return conventions.get(country_name, ["LTD", "Inc.", "LLC", "Corp"])

    def get_country_name(self, country_code: str) -> str:
        """Get country name from code"""
        return self.market_data.get(country_code, {}).get("name", country_code)

    def _print_analysis(self, analysis: Dict):
        """Print formatted analysis"""

        print(f"📈 Market Size:")
        print(f"   Estimated Companies: {analysis['market_size']['estimated_companies']:,}")
        print(f"   Industry Share: {analysis['market_size']['industry_share_percent']:.1f}%")
        print(f"   Market Maturity: {analysis['market_size']['market_maturity']}")

        print(f"\n🌍 Language Requirements:")
        print(f"   Primary Language: {analysis['primary_language']}")
        if analysis['secondary_languages']:
            print(f"   Secondary Languages: {', '.join(analysis['secondary_languages'])}")
        if analysis['multilingual_required']:
            print(f"   Multilingual Mode: Required")

        print(f"\n📍 Geographic Focus:")
        print(f"   Industrial Regions: {', '.join(analysis['industrial_regions'])}")
        print(f"   Recommended Focus: {', '.join(analysis['recommended_focus'])}")
        print(f"   Strategy: {analysis['geographic_strategy']}")

        print(f"\n🎯 Quality Targets:")
        targets = analysis['quality_targets']
        print(f"   HIGH Priority Max: {targets['high_priority_max_percent']}%")
        print(f"   HIGH Relevance Min: {targets['high_priority_min_relevance']}%")
        print(f"   Processing Speed Target: {targets['processing_speed_target']} emails/sec")

        if analysis.get('special_considerations'):
            print(f"\n⚠️  Special Considerations:")
            for consideration in analysis['special_considerations']:
                print(f"   • {consideration}")

        print(f"\n💡 Recommended Approach: {analysis['recommended_approach']}")
        print(f"📊 Complexity Level: {analysis['complexity_level']}")

        # Detailed analysis if available
        if 'competitive_landscape' in analysis:
            print(f"\n🏢 Competitive Landscape:")
            landscape = analysis['competitive_landscape']
            print(f"   Market Concentration: {landscape['market_concentration']}")
            print(f"   Entry Barriers: {landscape['entry_barriers']}")
            print(f"   International Competition: {landscape['international_competition']}")


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Requirements Analysis for Smart Filter Creation"
    )

    parser.add_argument(
        '--country',
        type=str,
        required=True,
        help='Target country code (e.g., DE, IT, FR, ES, CH)'
    )

    parser.add_argument(
        '--industry',
        type=str,
        required=True,
        help='Target industry (automotive, manufacturing, construction, hydraulics)'
    )

    parser.add_argument(
        '--detailed',
        action='store_true',
        help='Include detailed market analysis'
    )

    parser.add_argument(
        '--multilingual',
        action='store_true',
        help='Enable multilingual analysis'
    )

    parser.add_argument(
        '--output',
        type=str,
        help='Save analysis to JSON file'
    )

    args = parser.parse_args()

    analyzer = RequirementsAnalyzer()
    analysis = analyzer.analyze_requirements(
        args.country,
        args.industry,
        args.detailed,
        args.multilingual
    )

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(analysis, f, ensure_ascii=False, indent=2)
        print(f"\n💾 Analysis saved to: {args.output}")


if __name__ == "__main__":
    main()