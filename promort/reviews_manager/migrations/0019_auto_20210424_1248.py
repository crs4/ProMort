# Generated by Django 3.1.7 on 2021-04-24 12:48

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reviews_manager', '0018_auto_20171128_0956'),
    ]

    operations = [
        migrations.AlterField(
            model_name='clinicalannotationstep',
            name='rejection_reason',
            field=models.CharField(blank=True, choices=[('BAD_QUALITY', 'Bad image quality'), ('BAD_ROIS', 'Wrong or inaccurate ROIs'), ('OTHER', 'Other (see notes)')], default=None, max_length=20, null=True),
        ),
        migrations.AlterField(
            model_name='reviewscomparison',
            name='positive_match',
            field=models.BooleanField(blank=True, default=None, null=True),
        ),
        migrations.AlterField(
            model_name='reviewscomparison',
            name='positive_quality_control',
            field=models.BooleanField(blank=True, default=None, null=True),
        ),
    ]