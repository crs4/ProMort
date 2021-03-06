#  Copyright (c) 2019, CRS4
#
#  Permission is hereby granted, free of charge, to any person obtaining a copy of
#  this software and associated documentation files (the "Software"), to deal in
#  the Software without restriction, including without limitation the rights to
#  use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
#  the Software, and to permit persons to whom the Software is furnished to do so,
#  subject to the following conditions:
#
#  The above copyright notice and this permission notice shall be included in all
#  copies or substantial portions of the Software.
#
#  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
#  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
#  FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
#  COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
#  IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
#  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from rest_framework.exceptions import NotFound

from odin.permissions import CanEnterGodMode

from slides_manager.models import Slide
from rois_manager.models import Slice, Core, FocusRegion
from rois_manager.serializers import SliceSerializer, CoreSerializer, FocusRegionSerializer
from reviews_manager.models import ROIsAnnotation, ROIsAnnotationStep

from itertools import chain
import logging
logger = logging.getLogger('promort')


class ROIDetailsAPI(APIView):
    permission_classes = (CanEnterGodMode,)

    def _get_slide(self, slide):
        try:
            return Slide.objects.get(id=slide)
        except Slide.DoesNotExist:
            raise NotFound('There is no Slide with label %s' % slide)

    def _get_rois_annotations(self, case):
        try:
            return ROIsAnnotation.objects.filter(case__id=case)
        except ROIsAnnotation.DoesNotExist:
            raise NotFound('There are no ROI annotations related to case %s' % case)

    def _get_rois_annotation(self, case, reviewer):
        try:
            return ROIsAnnotation.objects.get(case__id=case,
                                              reviewer__username=reviewer)
        except ROIsAnnotation.DoesNotExist:
            raise NotFound('There is no ROIs Annotation for case %s assigned to reviewers %s' %
                           (case, reviewer))

    def _get_rois_annotations_steps(self, rois_annotations):
        steps = []
        for ann in rois_annotations:
            steps.extend(ann.steps.all())
        return steps

    def _get_rois_annotation_step(self, rois_annotation_obj, slide):
        try:
            return ROIsAnnotationStep.objects.get(rois_annotation=rois_annotation_obj,
                                                  slide__id=slide)
        except ROIsAnnotationStep.DoesNotExist:
            raise NotFound('There is no ROIs Annotation Step associated to slide %s' % slide)

    def _get_slices(self, rois_annotation_step_obj):
        return rois_annotation_step_obj.slices.all()

    def _get_cores(self, slice_obj):
        return slice_obj.cores.all()

    def _get_focus_regions(self, core_obj):
        return core_obj.focus_regions.all()

    def _get_slice(self, rois_annotation_step_obj, slice_label):
        try:
            return Slice.objects.get(label=slice_label, annotation_step=rois_annotation_step_obj)
        except Slice.DoesNotExist:
            raise NotFound('There is no slice with label %s' % slice_label)

    def _get_slices_ids(self, rois_annotation_step_obj):
        return rois_annotation_step_obj.slices.values_list('id', flat=True)

    def _get_core(self, slice_ids, core_label):
        try:
            return Core.objects.get(label=core_label, slice__id__in=slice_ids)
        except Core.DoesNotExist:
            raise NotFound('There is no core with label %s' % core_label)

    def _get_cores_ids(self, slices_ids):
        return Core.objects.filter(slice__id__in=slices_ids).values_list('id', flat=True)

    def _get_focus_region(self, cores_ids, focus_region_label):
        try:
            return FocusRegion.objects.get(label=focus_region_label,
                                           core__id__in=cores_ids)
        except FocusRegion.DoesNotExist:
            raise NotFound('There is no focus region with label %s' % focus_region_label)

    def _fetch_rois(self, rois_annotation_step_obj):
        rois = []
        for slice in self._get_slices(rois_annotation_step_obj):
            rois.append(slice)
            for core in self._get_cores(slice):
                rois.append(core)
                for focus_region in self._get_focus_regions(core):
                    rois.append(focus_region)
        return rois

    def _get_rois_by_type(self, rois_annotation_step_obj, roi_type):
        pass

    def _serialize_roi_obj(self, roi_obj):
        if type(roi_obj) == Slice:
            return SliceSerializer(roi_obj).data
        elif type(roi_obj) == Core:
            return CoreSerializer(roi_obj).data
        else:
            return FocusRegionSerializer(roi_obj).data


class GetCaseDetails(ROIDetailsAPI):

    def get(self, request, case, format=None):
        rois_annotation_objs = self._get_rois_annotations(case)
        annotation_step_objs = self._get_rois_annotations_steps(rois_annotation_objs)
        rois_list = chain(*[self._fetch_rois(step) for step in annotation_step_objs])
        return Response([self._serialize_roi_obj(roi_obj) for roi_obj in rois_list],
                        status=status.HTTP_200_OK)


class GetSlideDetails(ROIDetailsAPI):

    def get(self, request, case, slide, format=None):
        rois_annotation_objs = self._get_rois_annotations(case)
        annotation_step_objs = [self._get_rois_annotation_step(r_ann, slide)
                                for r_ann in rois_annotation_objs]
        rois_list = chain(*[self._fetch_rois(step) for step in annotation_step_objs])
        return Response([self._serialize_roi_obj(roi_obj) for roi_obj in rois_list],
                        status=status.HTTP_200_OK)


class GetReviewerDetails(ROIDetailsAPI):

    def get(self, request, case, slide, reviewer, format=None):
        rois_annotation_obj = self._get_rois_annotation(case, reviewer)
        annotation_step_obj = self._get_rois_annotation_step(rois_annotation_obj, slide)
        rois_list = self._fetch_rois(annotation_step_obj)
        return Response([self._serialize_roi_obj(roi_obj) for roi_obj in rois_list],
                        status=status.HTTP_200_OK)


class GetDetailsByROIType(ROIDetailsAPI):

    def _get_rois(self, rois_annotation_step_obj, roi_type):
        slices = self._get_slices(rois_annotation_step_obj)
        if roi_type == 'slice':
            return slices
        elif roi_type == 'core':
            cores = Core.objects.filter(slice__in=slices)
            return cores
        elif roi_type == 'focus_region':
            focus_regions = FocusRegion.objects.filter(
                core__in=Core.objects.filter(slice__in=slices)
            )
            return focus_regions

    def get(self, request, case, slide, reviewer, roi_type, format=None):
        rois_annotation_obj = self._get_rois_annotation(case, reviewer)
        annotation_step_obj = self._get_rois_annotation_step(rois_annotation_obj, slide)
        rois_list = self._get_rois(annotation_step_obj, roi_type)
        return Response([self._serialize_roi_obj(roi_obj) for roi_obj in rois_list],
                        status=status.HTTP_200_OK)


class GetROIDetails(ROIDetailsAPI):

    def _get_roi(self, rois_annotation_step_obj, roi_type, roi_label):
        if roi_type == 'slice':
            return self._get_slice(rois_annotation_step_obj, roi_label)
        elif roi_type == 'core':
            slice_ids = self._get_slices_ids(rois_annotation_step_obj)
            return self._get_core(slice_ids, roi_label)
        elif roi_type == 'focus_region':
            cores_ids = self._get_cores_ids(self._get_slices_ids(rois_annotation_step_obj))
            return self._get_focus_region(cores_ids, roi_label)
        else:
            # TODO: raise error
            pass

    def get(self, request, case, slide, reviewer, roi_type, roi_label, format=None):
        rois_annotation_obj = self._get_rois_annotation(case, reviewer)
        annotation_step_obj = self._get_rois_annotation_step(rois_annotation_obj, slide)
        roi_obj = self._get_roi(annotation_step_obj, roi_type, roi_label)
        return Response(self._serialize_roi_obj(roi_obj), status=status.HTTP_200_OK)


class GetSlicesDetails(ROIDetailsAPI):

    def _get_slices(self, slide_obj):
        try:
            return Slice.objects.filter(slide=slide_obj)
        except Slice.DoesNotExist:
            raise NotFound('There are no slices for slide %s' % slide_obj.id)

    def get(self, request, slide, format=None):
        slide_obj = self._get_slide(slide)
        slices = self._get_slices(slide_obj)
        return Response([SliceSerializer(slice).data for slice in slices],
                        status=status.HTTP_200_OK)


class GetSliceDetails(ROIDetailsAPI):

    def _get_slice(self, slice_id, slide_obj):
        try:
            return Slice.objects.get(pk=slice_id, slide=slide_obj)
        except Slice.DoesNotExist:
            raise NotFound('There is no slice with ID %s for slide %s' % (slice_id, slide_obj.id))

    def get(self, request, slide, pk, format=None):
        slide_obj = self._get_slide(slide)
        slice = self._get_slice(pk, slide_obj)
        return Response(SliceSerializer(slice).data, status=status.HTTP_200_OK)


class GetCoresDetails(ROIDetailsAPI):

    def _get_cores(self, slide_obj):
        try:
            return Core.objects.filter(slice__in=Slice.objects.filter(slide=slide_obj))
        except (Slice.DoesNotExist, Core.DoesNotExist):
            raise NotFound('There are no cores for slide %s' % slide_obj.id)

    def get(self, request, slide, format=None):
        slide_obj = self._get_slide(slide)
        cores = self._get_cores(slide_obj)
        return Response([CoreSerializer(core).data for core in cores],
                        status=status.HTTP_200_OK)


class GetCoreDetails(ROIDetailsAPI):

    def _get_core(self, core_id, slide_obj):
        try:
            return Core.objects.get(pk=core_id, slice__in=Slice.objects.filter(slide=slide_obj))
        except (Slice.DoesNotExist, Core.DoesNotExist):
            raise NotFound('There is no core with ID %s for slide %s' % (core_id, slide_obj.id))

    def get(self, request, slide, pk, format=None):
        slide_obj = self._get_slide(slide)
        core = self._get_core(pk, slide_obj)
        return Response(CoreSerializer(core).data, status=status.HTTP_200_OK)


class GetFocusRegionsDetails(ROIDetailsAPI):

    def _get_focus_regions(self, slide_obj):
        try:
            return FocusRegion.objects.filter(core__in=Core.objects.filter(
                slice__in=Slice.objects.filter(slide=slide_obj)
            ))
        except (Slice.DoesNotExist, Core.DoesNotExist, FocusRegion.DoesNotExist):
            raise NotFound('There are no focus regions for slide %s' % slide_obj.id)

    def get(self, request, slide, format=None):
        slide_obj = self._get_slide(slide)
        focus_regions = self._get_focus_regions(slide_obj)
        return Response([FocusRegionSerializer(focus_region).data for focus_region in focus_regions],
                        status=status.HTTP_200_OK)


class GetFocusRegionDetails(ROIDetailsAPI):

    def _get_focus_region(self, focus_region_id, slide_obj):
        try:
            return FocusRegion.objects.get(pk=focus_region_id,
                                           core__in=Core.objects.filter(
                                               slice__in=Slice.objects.filter(slide=slide_obj)
                                           ))
        except (Slice.DoesNotExist, Core.DoesNotExist, FocusRegion.DoesNotExist):
            raise NotFound('There is no focus region with ID %s for slide %s' % (focus_region_id, slide_obj.id))

    def get(self, request, slide, pk, format=None):
        slide_obj = self._get_slide(slide)
        focus_region = self._get_focus_region(pk, slide_obj)
        return Response(FocusRegionSerializer(focus_region).data, status=status.HTTP_200_OK)
