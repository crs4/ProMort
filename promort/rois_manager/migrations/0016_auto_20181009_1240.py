# -*- coding: utf-8 -*-
# Generated by Django 1.11.5 on 2018-10-09 12:40
from __future__ import unicode_literals

from django.db import migrations, models


def update_tissue_classification(apps, schema_editor):
    FocusRegion = apps.get_model('rois_manager', 'FocusRegion')

    focus_regions = FocusRegion.objects.all()
    for fr in focus_regions:
        if fr.cancerous_region:
            fr.tissue_status = 'TUMOR'
        else:
            fr.tissue_status = 'NORMAL'
        fr.save()


class Migration(migrations.Migration):

    dependencies = [
        ('rois_manager', '0015_focusregion_tissue_status'),
    ]

    operations = [
        migrations.RunPython(update_tissue_classification)
    ]