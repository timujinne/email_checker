import argparse
import sys
from pathlib import Path
from email_checker_core import EmailChecker

def main():
    parser = argparse.ArgumentParser(description="Email Checker & Blocklist Manager")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Команда: check (проверка одного файла)
    check_parser = subparsers.add_parser("check", help="Check emails from a file")
    check_parser.add_argument("file", help="Path to the input file (txt or lvp)")
    check_parser.add_argument("--metadata", action="store_true", help="Treat input file as a metadata file (LVP, JSON, CSV)")
    check_parser.add_argument("--enrich", action="store_true", help="Enrich emails with metadata from LVP files")

    # Команда: batch (пакетная проверка)
    batch_parser = subparsers.add_parser("batch", help="Batch process multiple files")
    batch_parser.add_argument("files", nargs="+", help="List of files to process")
    batch_parser.add_argument("--exclude-duplicates", action="store_true", help="Exclude duplicates across files")

    # Команда: incremental (инкрементальная проверка)
    inc_parser = subparsers.add_parser("incremental", help="Process new/changed files in input directory")
    inc_parser.add_argument("--exclude-duplicates", action="store_true", help="Exclude duplicates across files")
    inc_parser.add_argument("--generate-html", action="store_true", help="Generate HTML report after processing")
    inc_parser.add_argument("--batch-lvp", action="store_true", help="Process all LVP files in input directory")
    inc_parser.add_argument("--all", action="store_true", help="Process ALL files (TXT + LVP) in input directory")

    # Команда: status (статус списков)
    status_parser = subparsers.add_parser("status", help="Show status of email lists")
    status_parser.add_argument("--pattern", help="Filter by filename pattern")
    status_parser.add_argument("--category", help="Filter by category")
    status_parser.add_argument("--country", help="Filter by country")

    args = parser.parse_args()

    checker = EmailChecker()

    if args.command == "check":
        if args.enrich:
            checker.check_single_list_enriched(args.file)
        elif args.metadata or args.file.lower().endswith('.lvp'):
            checker.check_lvp_file(args.file)
        else:
            checker.check_single_list(args.file)

    elif args.command == "batch":
        # Проверяем, являются ли файлы LVP
        is_lvp_batch = all(f.lower().endswith('.lvp') for f in args.files)
        if is_lvp_batch:
            checker.check_multiple_lvp_files(args.files, exclude_duplicates=args.exclude_duplicates)
        else:
            checker.check_multiple_lists(args.files, exclude_duplicates=args.exclude_duplicates)

    elif args.command == "incremental":
        if args.all:
            checker.check_all_incremental(exclude_duplicates=args.exclude_duplicates, generate_html=args.generate_html)
        elif args.batch_lvp:
            checker.check_lvp_batch(exclude_duplicates=args.exclude_duplicates, generate_html=args.generate_html)
        else:
            checker.check_incremental_batch(exclude_duplicates=args.exclude_duplicates, generate_html=args.generate_html)

    elif args.command == "status":
        checker.show_status(pattern=args.pattern, category=args.category, country=args.country)

    else:
        parser.print_help()

if __name__ == "__main__":
    main()