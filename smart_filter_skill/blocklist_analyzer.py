#!/usr/bin/env python3
"""
Blocklist Analyzer - Analyze blocked emails and domains for pattern extraction

Features:
- Statistical analysis of blocklists
- Pattern extraction
- Suggestions for filter configs
- Auto-update configs with discovered patterns
"""

import json
import re
from pathlib import Path
from collections import Counter, defaultdict
from typing import Dict, List, Set, Tuple
from datetime import datetime


class BlocklistAnalyzer:
    """Analyzer for blocked emails and domains"""

    def __init__(self):
        self.root_dir = Path(__file__).parent.parent
        self.blocklists_dir = self.root_dir / "blocklists"
        self.configs_dir = self.root_dir / "smart_filters" / "configs"

        self.blocked_emails_file = self.blocklists_dir / "blocked_emails.txt"
        self.blocked_domains_file = self.blocklists_dir / "blocked_domains.txt"

        # Load blocklists
        self.blocked_emails = self._load_blocklist(self.blocked_emails_file)
        self.blocked_domains = self._load_blocklist(self.blocked_domains_file)

    def _load_blocklist(self, file_path: Path) -> Set[str]:
        """Load blocklist from file"""
        if not file_path.exists():
            print(f"⚠️ Blocklist not found: {file_path}")
            return set()

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = {line.strip().lower() for line in f if line.strip()}
            return lines
        except Exception as e:
            print(f"❌ Error loading {file_path}: {e}")
            return set()

    def analyze(self):
        """Perform comprehensive analysis"""
        print("📊 Blocklist Analysis\n")
        print("=" * 70)

        # Basic stats
        print(f"\n📈 Statistics:")
        print(f"   Blocked emails: {len(self.blocked_emails):,}")
        print(f"   Blocked domains: {len(self.blocked_domains):,}")

        # Domain analysis
        self._analyze_domains()

        # TLD analysis
        self._analyze_tlds()

        # Pattern analysis
        self._analyze_patterns()

        # Suggestions
        self._generate_suggestions()

    def _analyze_domains(self):
        """Analyze blocked domains"""
        print(f"\n🌐 Domain Analysis:")

        # Count full domains vs wildcards
        full_domains = [d for d in self.blocked_domains if not d.startswith('*')]
        wildcards = [d for d in self.blocked_domains if d.startswith('*')]

        print(f"   Full domains: {len(full_domains)}")
        print(f"   Wildcards: {len(wildcards)}")

        # Top domains
        if full_domains:
            domain_counter = Counter(full_domains)
            print(f"\n   Top 10 blocked domains:")
            for domain, count in domain_counter.most_common(10):
                print(f"      {domain}")

    def _analyze_tlds(self):
        """Analyze top-level domains"""
        print(f"\n🌍 TLD Analysis:")

        tld_counter = Counter()

        # Extract TLDs from domains
        for domain in self.blocked_domains:
            # Remove wildcard prefix
            clean_domain = domain.lstrip('*').lstrip('.')

            # Extract TLD
            if '.' in clean_domain:
                tld = '.' + clean_domain.split('.')[-1]
                tld_counter[tld] += 1

        # Also from emails
        for email in self.blocked_emails:
            if '@' in email:
                domain = email.split('@')[1]
                if '.' in domain:
                    tld = '.' + domain.split('.')[-1]
                    tld_counter[tld] += 1

        print(f"   Top 20 TLDs:")
        total = sum(tld_counter.values())
        for tld, count in tld_counter.most_common(20):
            percentage = (count / total) * 100
            print(f"      {tld:12} {count:6,} ({percentage:5.2f}%)")

    def _analyze_patterns(self):
        """Analyze patterns in blocked items"""
        print(f"\n🔍 Pattern Analysis:")

        patterns = {
            'Temporary email services': self._find_temp_email_patterns(),
            'Spam domains': self._find_spam_patterns(),
            'Country-specific patterns': self._find_country_patterns(),
            'Suspicious prefixes': self._find_suspicious_prefixes()
        }

        for category, items in patterns.items():
            if items:
                print(f"\n   {category}:")
                for item in items[:10]:  # Top 10
                    print(f"      {item}")

    def _find_temp_email_patterns(self) -> List[str]:
        """Find temporary email service patterns"""
        temp_keywords = [
            'temp', 'temporary', 'disposable', 'throw', 'guerrilla',
            'fake', 'trash', '10minute', 'mailinator', 'maildrop'
        ]

        temp_domains = []
        for domain in self.blocked_domains:
            for keyword in temp_keywords:
                if keyword in domain.lower():
                    temp_domains.append(domain)
                    break

        return list(set(temp_domains))

    def _find_spam_patterns(self) -> List[str]:
        """Find spam-related patterns"""
        spam_keywords = [
            'spam', 'scam', 'phishing', 'malware', 'virus',
            'fraud', 'fake', 'blackhat'
        ]

        spam_domains = []
        for domain in self.blocked_domains:
            for keyword in spam_keywords:
                if keyword in domain.lower():
                    spam_domains.append(domain)
                    break

        return list(set(spam_domains))

    def _find_country_patterns(self) -> List[str]:
        """Find country-specific patterns"""
        # Extract TLDs that appear frequently
        tld_counter = Counter()

        for domain in self.blocked_domains:
            clean_domain = domain.lstrip('*').lstrip('.')
            if '.' in clean_domain:
                tld = '.' + clean_domain.split('.')[-1]
                tld_counter[tld] += 1

        # Return TLDs with more than 10 occurrences
        return [tld for tld, count in tld_counter.most_common(30) if count > 10]

    def _find_suspicious_prefixes(self) -> List[str]:
        """Find suspicious email prefixes"""
        prefix_counter = Counter()

        for email in self.blocked_emails:
            if '@' in email:
                prefix = email.split('@')[0]

                # Look for patterns
                if len(prefix) > 20:  # Very long
                    prefix_counter['long_random'] += 1
                elif re.match(r'^[a-f0-9]{10,}$', prefix):  # Hex string
                    prefix_counter['hex_string'] += 1
                elif prefix.startswith('noreply'):
                    prefix_counter['noreply'] += 1

        return [f"{k}: {v}" for k, v in prefix_counter.most_common()]

    def _generate_suggestions(self):
        """Generate suggestions for filter configs"""
        print(f"\n💡 Suggestions for Filter Configs:")

        # Suggest excluded country domains
        excluded_tlds = self._find_country_patterns()[:15]
        if excluded_tlds:
            print(f"\n   Recommended excluded_countries:")
            print(f"   {json.dumps(excluded_tlds, indent=2)}")

        # Suggest personal domains
        personal_domains = self._find_personal_domains()
        if personal_domains:
            print(f"\n   Additional personal_domains:")
            for domain in personal_domains[:10]:
                print(f"      \"{domain}\",")

    def _find_personal_domains(self) -> List[str]:
        """Find personal/free email domains"""
        # Common patterns for free email providers
        free_keywords = ['mail', 'email', 'free', 'post']

        personal = []
        for domain in self.blocked_domains:
            # Skip if already wildcard
            if domain.startswith('*'):
                continue

            # Check for free email patterns
            for keyword in free_keywords:
                if keyword in domain and not any(sp in domain for sp in ['spam', 'temp', 'trash']):
                    personal.append(domain)
                    break

        return list(set(personal))

    def export_stats(self, output_file: str):
        """Export statistics to JSON"""
        stats = {
            "analysis_date": datetime.now().isoformat(),
            "total_blocked_emails": len(self.blocked_emails),
            "total_blocked_domains": len(self.blocked_domains),
            "tld_distribution": {},
            "pattern_categories": {
                "temporary_email": self._find_temp_email_patterns(),
                "spam_related": self._find_spam_patterns(),
                "excluded_tlds": self._find_country_patterns()[:20],
                "personal_domains": self._find_personal_domains()[:20]
            }
        }

        # TLD distribution
        tld_counter = Counter()
        for domain in self.blocked_domains:
            clean = domain.lstrip('*').lstrip('.')
            if '.' in clean:
                tld = '.' + clean.split('.')[-1]
                tld_counter[tld] += 1

        stats["tld_distribution"] = dict(tld_counter.most_common(30))

        # Write to file
        output_path = Path(output_file)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)

        print(f"\n✅ Stats exported to: {output_path}")

    def update_configs(self):
        """Update filter configs with blocklist insights"""
        print(f"\n🔧 Updating filter configs...\n")

        if not self.configs_dir.exists():
            print(f"❌ Configs directory not found: {self.configs_dir}")
            return

        # Get suggestions
        excluded_tlds = self._find_country_patterns()[:20]

        # Update each config
        for config_file in self.configs_dir.glob("*_config.json"):
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)

                # Update excluded_countries
                if "geographic" in config:
                    current_excluded = set(config["geographic"].get("excluded_countries", []))
                    new_excluded = current_excluded | set(excluded_tlds)

                    if new_excluded != current_excluded:
                        config["geographic"]["excluded_countries"] = sorted(list(new_excluded))
                        print(f"   ✅ Updated: {config_file.name}")
                        print(f"      Added {len(new_excluded - current_excluded)} new TLDs")

                        # Write back
                        with open(config_file, 'w', encoding='utf-8') as fw:
                            json.dump(config, fw, ensure_ascii=False, indent=2)

            except Exception as e:
                print(f"   ❌ Error updating {config_file.name}: {e}")


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Blocklist Analyzer - Analyze and extract patterns from blocklists"
    )

    parser.add_argument(
        '--analyze', '-a',
        action='store_true',
        help='Perform comprehensive analysis'
    )

    parser.add_argument(
        '--export-stats',
        type=str,
        metavar='FILE',
        help='Export statistics to JSON file'
    )

    parser.add_argument(
        '--update-configs',
        action='store_true',
        help='Update filter configs with blocklist insights'
    )

    args = parser.parse_args()

    analyzer = BlocklistAnalyzer()

    if args.export_stats:
        analyzer.export_stats(args.export_stats)
    elif args.update_configs:
        analyzer.update_configs()
    else:
        # Default: analyze
        analyzer.analyze()


if __name__ == "__main__":
    main()
