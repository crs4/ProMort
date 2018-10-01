from django.core.management.base import BaseCommand
from clinical_annotations_manager.models import FocusRegionAnnotation

from csv import DictWriter

import logging

logger = logging.getLogger('promort_commands')


class Command(BaseCommand):
    help = """
    Export existing FocusRegion clinical data to CSV
    """

    def add_arguments(self, parser):
        parser.add_argument('--output_file', dest='output', type=str, required=True,
                            help='path of the output CSV file')

    def _load_data(self):
        focus_region_annotation = FocusRegionAnnotation.objects.all()
        return focus_region_annotation

    def _export_data(self, data, out_file):
        header = ['case_id', 'slide_id', 'rois_review_step_id', 'clinical_review_step_id', 'reviewer',
                  'focus_region_id', 'focus_region_label', 'creation_date', 'perineural_involvement',
                  'intraductal_carcinoma', 'ductal_carcinoma', 'poorly_formed_glands',
                  'cribriform_pattern', 'small_cell_signet_ring', 'hypernephroid_pattern',
                  'mucinous', 'comedo_necrosis', 'gleason_4_percentage']
        with open(out_file, 'w') as ofile:
            writer = DictWriter(ofile, delimiter=',', fieldnames=header)
            writer.writeheader()
            for focus_region_annotation in data:
                writer.writerow(
                    {
                        'case_id': focus_region_annotation.focus_region.core.slice.slide.case.id,
                        'slide_id': focus_region_annotation.focus_region.core.slice.slide.id,
                        'rois_review_step_id': focus_region_annotation.annotation_step.rois_review_step.label,
                        'clinical_review_step_id': focus_region_annotation.annotation_step.label,
                        'reviewer': focus_region_annotation.author.username,
                        'focus_region_id': focus_region_annotation.focus_region.id,
                        'focus_region_label': focus_region_annotation.focus_region.label,
                        'creation_date': focus_region_annotation.creation_date.strftime('%Y-%m-%d %H:%M:%S'),
                        'perineural_involvement': focus_region_annotation.perineural_involvement,
                        'intraductal_carcinoma': focus_region_annotation.intraductal_carcinoma,
                        'ductal_carcinoma': focus_region_annotation.ductal_carcinoma,
                        'poorly_formed_glands': focus_region_annotation.poorly_formed_glands,
                        'cribriform_pattern': focus_region_annotation.cribriform_pattern,
                        'small_cell_signet_ring': focus_region_annotation.small_cell_signet_ring,
                        'hypernephroid_pattern': focus_region_annotation.hypernephroid_pattern,
                        'mucinous': focus_region_annotation.mucinous,
                        'comedo_necrosis': focus_region_annotation.comedo_necrosis,
                        'gleason_4_percentage': focus_region_annotation.get_gleason_4_percentage()
                    }
                )

    def handle(self, *args, **opts):
        logger.info('=== Starting export job ===')
        focus_region_annotations = self._load_data()
        self._export_data(focus_region_annotations, opts['output'])
        logger.info('=== Data saved to %s ===', opts['output'])