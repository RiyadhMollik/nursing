from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("challenge", "0002_admintoken")]

    operations = [
        migrations.AddField(
            model_name="dayroutine",
            name="bsc_lecture",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="dayroutine",
            name="diploma_lecture",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="dayroutine",
            name="motivational_line",
            field=models.TextField(blank=True),
        ),
    ]
