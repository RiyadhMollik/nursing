"""Seed DayRoutine from the CSV file."""
import csv
import os
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from challenge.models import DayRoutine

CSV_PATH = Path(__file__).resolve().parents[4] / "নার্সিং নতুন লেকচার প্ল্যান - Sheet18.csv"


class Command(BaseCommand):
    help = "Seed DayRoutine table from the CSV routine file."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete existing rows first.")

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            DayRoutine.objects.all().delete()
            self.stdout.write(self.style.WARNING("Cleared existing routine rows."))

        if not CSV_PATH.exists():
            self.stderr.write(self.style.ERROR(f"CSV not found: {CSV_PATH}"))
            return

        with open(CSV_PATH, encoding="utf-8") as f:
            rows = list(csv.reader(f))

        # locate header row
        header_idx = None
        for i, row in enumerate(rows):
            if row and row[0] == "দিন":
                header_idx = i
                break
        if header_idx is None:
            self.stderr.write(self.style.ERROR("Header row not found in CSV."))
            return

        created = 0
        updated = 0
        for row in rows[header_idx + 1:]:
            if not row or not row[0] or not row[0].startswith("Day-"):
                continue
            try:
                day_number = int(row[0].replace("Day-", "").strip())
            except ValueError:
                continue
            phase = (row[1] or "").strip()
            subject = (row[2] or "").strip()
            lecture = (row[3] or "").strip()
            bsc = (row[4] or "").strip() if len(row) > 4 else ""
            diploma = (row[5] or "").strip() if len(row) > 5 else ""

            obj, was_created = DayRoutine.objects.update_or_create(
                day_number=day_number,
                defaults={
                    "phase": phase,
                    "subject": subject,
                    "lecture": lecture,
                    "bsc_topic": bsc,
                    "diploma_topic": diploma,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"Seeded routine: {created} created, {updated} updated. Total={DayRoutine.objects.count()}"
        ))
