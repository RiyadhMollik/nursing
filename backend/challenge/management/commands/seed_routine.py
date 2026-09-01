"""Seed DayRoutine from the CSV file."""
import csv
import os
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from challenge.models import DayRoutine

DATA_PATH = Path(__file__).resolve().parents[4] / "routine_data.tsv"


class Command(BaseCommand):
    help = "Seed DayRoutine table from the CSV routine file."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete existing rows first.")

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            DayRoutine.objects.all().delete()
            self.stdout.write(self.style.WARNING("Cleared existing routine rows."))

        if not DATA_PATH.exists():
            self.stderr.write(self.style.ERROR(f"Routine data not found: {DATA_PATH}"))
            return

        with open(DATA_PATH, encoding="utf-8-sig", newline="") as f:
            rows = list(csv.reader(f, delimiter="\t"))

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
            bsc_lecture = (row[3] or "").strip()
            bsc_topic = (row[4] or "").strip() if len(row) > 4 else ""
            diploma_lecture = (row[5] or "").strip() if len(row) > 5 else ""
            diploma_topic = (row[6] or "").strip() if len(row) > 6 else ""
            motivation = (row[7] or "").strip().lstrip("\u200b") if len(row) > 7 else ""

            obj, was_created = DayRoutine.objects.update_or_create(
                day_number=day_number,
                defaults={
                    "phase": phase,
                    "subject": subject,
                    # Keep the legacy field populated for older clients.
                    "lecture": bsc_lecture,
                    "bsc_lecture": bsc_lecture,
                    "bsc_topic": bsc_topic,
                    "diploma_lecture": diploma_lecture,
                    "diploma_topic": diploma_topic,
                    "motivational_line": motivation,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"Seeded routine: {created} created, {updated} updated. Total={DayRoutine.objects.count()}"
        ))
