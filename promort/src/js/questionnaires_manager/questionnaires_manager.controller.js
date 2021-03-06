/*
 * Copyright (c) 2019, CRS4
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

(function () {
    'use strict';

    angular
        .module('promort.questionnaires_manager.controllers')
        .controller('QuestionnaireRequestsManagerController', QuestionnaireRequestsManagerController)
        .controller('QuestionnairePanelController', QuestionnairePanelController)
        .controller('QuestionsSetPanelController', QuestionsSetPanelController);

    QuestionnaireRequestsManagerController.$inject = ['$scope', '$routeParams', '$rootScope', '$log', '$location', '$route',
                                                      'QuestionnaireRequestService', 'SlidesSequenceViewerService',
                                                      'QuestionnaireAnswersService', 'WorkListService'];

    function QuestionnaireRequestsManagerController($scope, $routeParams, $rootScope, $log, $location, $route,
                                                    QuestionnaireRequestService, SlidesSequenceViewerService,
                                                    QuestionnaireAnswersService, WorkListService) {
        var vm = this;

        vm.panel_a_label = 'qm_panel_a';
        vm.panel_b_label = 'qm_panel_b';

        vm.request_label = undefined;
        vm.request_extended_label = undefined;
        vm.panel_a_questionnaire_label = undefined;
        vm.panel_b_questionnaire_label = undefined;
        vm.panel_a_last_completed_step = undefined;
        vm.panel_b_last_completed_step = undefined;
        vm.panel_a_remaining_steps = undefined;
        vm.panel_b_remaining_steps = undefined;
        vm.questionnairePanelACtrl = undefined;
        vm.questionsPanelACtrl = undefined;
        vm.questionnairePanelBCtrl = undefined;
        vm.questionsPanelBCtrl = undefined;
        vm.slides_sync_enabled = false;

        vm.slidesSyncRequired = slidesSyncRequired;
        vm.switchSlidesSync = switchSlidesSync;
        vm.slidesSyncEnabled = slidesSyncEnabled;
        vm.getPanelAId = getPanelAId;
        vm.getPanelBId = getPanelBId;
        vm.getPanelALoadedTriggerLabel = getPanelALoadedTriggerLabel;
        vm.getPanelBLoadedTriggerLabel = getPanelBLoadedTriggerLabel;
        vm.isDualPanelQuestionnaire = isDualPanelQuestionnaire;
        vm.showPanelA = showPanelA;
        vm.showPanelB = showPanelB;
        vm.getPanelAQuestionnaireLabel = getPanelAQuestionnaireLabel;
        vm.getPanelAStepIndex = getPanelAStepIndex;
        vm.getPanelBQuestionnaireLabel = getPanelBQuestionnaireLabel;
        vm.getPanelBStepIndex = getPanelBStepIndex;
        vm.formValid = formValid;
        vm.submitAnswers = submitAnswers;

        activate();

        function activate() {
            vm.request_label = $routeParams.label;

            QuestionnaireRequestService.get(vm.request_label)
                .then(questionnaireRequestSuccessFn, questionnaireRequestErrorFn);

            function questionnaireRequestSuccessFn(response) {
                vm.request_extended_label = response.data.extended_label;
                vm.panel_a_questionnaire_label = response.data.questionnaire_panel_a.label;
                vm.panel_a_last_completed_step = response.data.answers.questionnaire_panel_a.last_completed_step_index;
                vm.panel_a_remaining_steps = response.data.answers.questionnaire_panel_a.remaining_steps;
                if (response.data.questionnaire_panel_b !== null) {
                    vm.panel_b_questionnaire_label = response.data.questionnaire_panel_b.label;
                    vm.panel_b_last_completed_step = response.data.answers.questionnaire_panel_b.last_completed_step_index;
                    vm.panel_b_remaining_steps = response.data.answers.questionnaire_panel_b.remaining_steps;
                }

                // initialize SlidesSequenceViewerService
                SlidesSequenceViewerService.initialize();

                // trigger data loaded events used by each panel to query for details
                if(vm.showPanelA()) {
                    $rootScope.$broadcast(
                        vm.getPanelALoadedTriggerLabel(),
                        {
                            'panel_id': vm.getPanelAId(),
                            'questionnaire_label': vm.getPanelAQuestionnaireLabel(),
                            'step_index': vm.getPanelAStepIndex(),
                            'dual_panel_questionnaire': vm.isDualPanelQuestionnaire()
                        }
                    );
                }
                if(vm.showPanelB()) {
                    $rootScope.$broadcast(
                        vm.getPanelBLoadedTriggerLabel(),
                        {
                            'panel_id': vm.getPanelBId(),
                            'questionnaire_label': vm.getPanelBQuestionnaireLabel(),
                            'step_index': vm.getPanelBStepIndex(),
                            'dual_panel_questionnaire': vm.isDualPanelQuestionnaire()
                        }
                    );
                }

                // register questionnaires panels as soon as they are ready
                if(vm.showPanelA()) {
                    $scope.$on('questionnaire_panel.' + vm.getPanelAId() + '.ready',
                        function (event, args) {
                            console.log('Register questionnaire panel A controller');
                            vm.questionnairePanelACtrl = args.questionnairePanelCtrl;
                        }
                    );
                }
                if(vm.showPanelB()) {
                    $scope.$on('questionnaire_panel.' + vm.getPanelBId() + '.ready',
                        function(event, args) {
                            console.log('Register questionnaire panel B controller');
                            vm.questionnairePanelBCtrl = args.questionnairePanelCtrl;
                        }
                    );
                }

                // register questions panels as soon as they are ready, this will enable form validation
                if(vm.showPanelA()) {
                    $scope.$on('questions_panel.' + vm.getPanelAId() + '.ready',
                        function (event, args) {
                            console.log('Registering questions panel A controller');
                            vm.questionsPanelACtrl = args.panelCtrl;
                        }
                    );
                }
                if(vm.showPanelB()) {
                    $scope.$on('questions_panel.' + vm.getPanelBId() + '.ready',
                        function(event, args) {
                            console.log('Registering questions panel B controller');
                            vm.questionsPanelBCtrl = args.panelCtrl;
                        }
                    );
                }
            }

            function questionnaireRequestErrorFn(response) {
                $log.error(response.error);
            }

            $scope.$on('slides_sequence.page.changed', function(event, args) {
                if (vm.slidesSyncEnabled()) {
                    console.log('It seems that viewer ' + args.viewer_id + ' has changed its page to ' + args.page);
                    $rootScope.$broadcast('slides_sequence.page.change',
                        {'viewer_id': args.viewer_id, 'page': args.page});
                } else {
                    console.log('Slides sync disabled, ignore trigger');
                }
            });
        }

        function slidesSyncRequired() {
            if (vm.questionnairePanelACtrl === undefined && vm.questionnairePanelBCtrl === undefined) {
                return false;
            } else {
                var pa_slides_counter = vm.questionnairePanelACtrl.getSlidesCount();
                if (vm.questionnairePanelBCtrl !== undefined) {
                    var pb_slides_counter = vm.questionnairePanelBCtrl.getSlidesCount();
                }
                var multi_slides_counter = 0;
                if (pa_slides_counter !== undefined) {
                    for (var p in pa_slides_counter) {
                        if (pa_slides_counter[p] > 1) {
                            multi_slides_counter++;
                        }
                    }
                }
                if (pb_slides_counter !== undefined) {
                    for (var p in pb_slides_counter) {
                        if (pb_slides_counter[p] > 1) {
                            multi_slides_counter++;
                        }
                    }
                }
                return (multi_slides_counter > 1);
            }
        }

        function switchSlidesSync() {
            vm.slides_sync_enabled = !vm.slides_sync_enabled;
        }

        function slidesSyncEnabled() {
            return vm.slides_sync_enabled;
        }

        function getPanelAId() {
            return vm.panel_a_label;
        }

        function getPanelBId() {
            return vm.panel_b_label;
        }

        function getPanelALoadedTriggerLabel() {
            return vm.panel_a_label + '.data.ready';
        }

        function getPanelBLoadedTriggerLabel() {
            return vm.panel_b_label + '.data.ready';
        }

        function isDualPanelQuestionnaire() {
            return vm.showPanelA() && vm.showPanelB();
        }

        function showPanelA() {
            return vm.panel_a_remaining_steps > 0;
        }

        function showPanelB() {
            return vm.panel_b_remaining_steps > 0;
        }

        function getPanelAQuestionnaireLabel() {
            if(vm.showPanelA()) {
                return vm.panel_a_questionnaire_label;
            } else {
                return undefined;
            }
        }

        function getPanelAStepIndex() {
            if(vm.showPanelA()) {
                return vm.panel_a_last_completed_step + 1;
            } else {
                return undefined;
            }
        }

        function getPanelBQuestionnaireLabel() {
            if(vm.showPanelB()) {
                return vm.panel_b_questionnaire_label;
            } else {
                return undefined;
            }
        }

        function getPanelBStepIndex() {
            if(vm.showPanelB()) {
                return vm.panel_b_last_completed_step + 1;
            } else {
                return undefined;
            }
        }

        function formValid() {
            if(vm.isDualPanelQuestionnaire()) {
                if (typeof vm.questionsPanelACtrl === 'undefined' || typeof vm.questionsPanelBCtrl === 'undefined') {
                    return false;
                } else {
                    return (vm.questionsPanelACtrl.formValid() && vm.questionsPanelBCtrl.formValid());
                }
            } else if(!vm.showPanelB()) {
                if(typeof vm.questionsPanelACtrl === 'undefined') {
                    return false;
                } else {
                    return vm.questionsPanelACtrl.formValid();
                }
            } else {
                if(typeof vm.questionsPanelBCtrl === 'undefined') {
                    return false;
                } else {
                    return vm.questionsPanelBCtrl.formValid();
                }
            }
        }

        function submitAnswers() {
            function getStatusSuccessFn(response) {
                if(response.data.can_be_closed === true) {
                    WorkListService.closeQuestionnaireRequest(vm.request_label)
                        .then(closeQuestionnaireRequestSuccessFn, closeQuestionnaireRequestErrorFn);

                    function closeQuestionnaireRequestSuccessFn(response) {
                        $location.url('worklist');
                    }

                    function closeQuestionnaireRequestErrorFn(response) {
                        $log.error(response.error);
                    }
                } else {
                    $route.reload();
                }
            }

            function getStatusErrorFn(response) {
                $log.error(response.error);
            }

            if(vm.isDualPanelQuestionnaire()) {
                var panel_a_details = {
                    questionnaire_step_index: vm.getPanelAStepIndex(),
                    answers_json: vm.questionsPanelACtrl.getAnswers()
                };
                var panel_b_details = {
                    questionnaire_step_index: vm.getPanelBStepIndex(),
                    answers_json: vm.questionsPanelBCtrl.getAnswers()
                };
                QuestionnaireAnswersService.saveRequestAnswers(vm.request_label, panel_a_details, panel_b_details)
                    .then(saveRequestAnswersSuccessFn, saveRequestAnswersErrorFn);

                function saveRequestAnswersSuccessFn(response) {
                    QuestionnaireRequestService.get_status(vm.request_label)
                        .then(getStatusSuccessFn, getStatusErrorFn);
                }

                function saveRequestAnswersErrorFn(response) {
                    $log.error(response.error);
                }
            } else {
                if (vm.showPanelA()) {
                    QuestionnaireAnswersService.savePanelAnswers(vm.request_label, 'panel_a',
                        vm.getPanelAStepIndex(), vm.questionsPanelACtrl.getAnswers())
                        .then(savePanelAnswersSuccessFn, savePanelAnswersErrorFn);
                } else {
                    QuestionnaireAnswersService.savePanelAnswers(vm.request_label, 'panel_b',
                        vm.getPanelBStepIndex(), vm.questionsPanelBCtrl.getAnswers())
                        .then(savePanelAnswersSuccessFn, savePanelAnswersErrorFn);
                }
                function savePanelAnswersSuccessFn(response) {
                    QuestionnaireRequestService.get_status(vm.request_label)
                        .then(getStatusSuccessFn, getStatusErrorFn);
                }

                function savePanelAnswersErrorFn(response) {
                    $log.error(response.error);
                }

            }
        }
    }

    QuestionnairePanelController.$inject = ['$scope', '$routeParams', '$rootScope', '$log',
                                            'QuestionnaireStepService'];

    function QuestionnairePanelController($scope, $routeParams, $rootScope, $log, QuestionnaireStepService) {
        var vm = this;

        vm.panel_id = undefined;
        vm.questionnaire_label = undefined;
        vm.step_index = undefined;
        vm.slides_set_a_id = undefined;
        vm.slides_set_a_label = undefined;
        vm.slides_set_b_id = undefined;
        vm.slides_set_b_label = undefined;
        vm.questions_set_id = undefined;
        vm.viewer_panels_details = undefined;
        vm.dual_panel_questionnaire = undefined;

        vm.getPanelId = getPanelId;
        vm.isDualPanelQuestionnaire = isDualPanelQuestionnaire;
        vm.isDualSetsPanel = isDualSetsPanel;
        vm.getSlidesCount = getSlidesCount;
        vm.getSlidesSetADetails = getSlidesSetADetails;
        vm.getSlidesSetBDetails = getSlidesSetBDetails;
        vm.getQuestionsSetId = getQuestionsSetId;
        vm.getQuestionsLoadedTriggerLabel = getQuestionsLoadedTriggerLabel;
        vm.getQuestionsPanelIdentifier = getQuestionsPanelIdentifier;
        vm.getQuestionsDetails = getQuestionsDetails;
        vm.getSlidesSetPanelIdentifier = getSlidesSetPanelIdentifier;
        vm.getSlidesSetLoadedTriggerLabel = getSlidesSetLoadedTriggerLabel;
        vm.getViewerReadyTrigger = getViewerReadyTrigger;

        activate();

        function activate() {
            vm.panel_id = $scope.qpIdentifier;

            $scope.$on(
                $scope.qpWaitForIt,
                function(event, args) {
                    vm.questionnaire_label = args.questionnaire_label;
                    vm.step_index = args.step_index;
                    vm.dual_panel_questionnaire = args.dual_panel_questionnaire;
                    vm.viewer_panels_details = {
                        'set_a': undefined,
                        'set_b': undefined
                    };

                    QuestionnaireStepService.get(vm.questionnaire_label, vm.step_index)
                        .then(questionnaireStepSuccessFn, questionnaireStepErrorFn);

                    function questionnaireStepSuccessFn(response) {
                        vm.slides_set_a_id = response.data.slides_set_a.id;
                        vm.slides_set_a_label = response.data.slides_set_a_label;
                        if (response.data.slides_set_b !== null) {
                            vm.slides_set_b_id = response.data.slides_set_b.id;
                            vm.slides_set_b_label = response.data.slides_set_b_label;
                        }

                        // trigger data loaded events questions panel
                        $rootScope.$broadcast(
                            vm.getQuestionsLoadedTriggerLabel(),
                            vm.getQuestionsDetails(response.data.questions)
                        );
                        // trigger data loaded events for slides panel
                        $rootScope.$broadcast(
                            vm.getSlidesSetLoadedTriggerLabel('set_a'),
                            vm.getSlidesSetADetails()
                        );
                        // register viewer panel details once loaded
                        $scope.$on(vm.getViewerReadyTrigger('set_a'),
                            function(event, args) {
                                vm.viewer_panels_details.set_a = {
                                    'label': args.viewer_label,
                                    'slides_count': args.slides_count
                                }
                            }
                        );
                        if (vm.isDualSetsPanel()) {
                            // trigger data loaded events for slides panel
                            $rootScope.$broadcast(
                                vm.getSlidesSetLoadedTriggerLabel('set_b'),
                                vm.getSlidesSetBDetails()
                            );
                            // register viewer panel details once loaded
                            $scope.$on(vm.getViewerReadyTrigger('set_b'),
                                function(event, args) {
                                    vm.viewer_panels_details.set_b = {
                                        'label': args.viewer_label,
                                        'slides_count': args.slides_count
                                    }
                                }
                            );
                        }

                        console.log('Triggering event questionnaire_panel.' + vm.getPanelId() + '.ready');
                        $rootScope.$broadcast(
                            'questionnaire_panel.' + vm.getPanelId() + '.ready',
                            {'questionnairePanelCtrl': vm}
                        );
                    }

                    function questionnaireStepErrorFn(response) {
                        $log.error(response.error);
                    }
                }
            )
        }

        function getPanelId() {
            return vm.panel_id;
        }

        function isDualPanelQuestionnaire() {
            return vm.dual_panel_questionnaire;
        }

        function isDualSetsPanel() {
            return vm.slides_set_b_id !== undefined;
        }

        function getSlidesCount() {
            if (vm.viewer_panels_details.set_a === undefined && vm.viewer_panels_details.set_b === undefined) {
                return undefined;
            } else {
                var slides_count = {};
                if (vm.viewer_panels_details.set_a !== undefined) {
                    slides_count[vm.viewer_panels_details.set_a.label] = vm.viewer_panels_details.set_a.slides_count;
                }
                if (vm.viewer_panels_details.set_b !== undefined) {
                    slides_count[vm.viewer_panels_details.set_b.label] = vm.viewer_panels_details.set_b.slides_count;
                }
                return slides_count;
            }
        }

        function getSlidesSetADetails() {
            return {
                'slides_set_id': vm.slides_set_a_id,
                'slides_set_label': vm.slides_set_a_label
            }
        }

        function getSlidesSetBDetails() {
            return {
                'slides_set_id': vm.slides_set_b_id,
                'slides_set_label': vm.slides_set_b_label
            }
        }

        function getQuestionsSetId() {
            return vm.questions_set_id;
        }

        function getQuestionsLoadedTriggerLabel() {
            return vm.getPanelId() +  '.questions.ready';
        }

        function getQuestionsPanelIdentifier() {
            return vm.getPanelId();
        }

        function getQuestionsDetails(questions) {
            console.log(questions);
            return {
                'questions': $.parseJSON(questions.questions_json)
            }
        }

        function getSlidesSetPanelIdentifier(slides_set) {
            return vm.getPanelId() + '-' + slides_set;
        }

        function getSlidesSetLoadedTriggerLabel(slides_set) {
            return vm.getPanelId() + '.slides_' + slides_set + '.ready';
        }

        function getViewerReadyTrigger(slides_set) {
            return vm.getPanelId() + '.viewer_' + slides_set + '.ready';
        }
    }

    QuestionsSetPanelController.$inject = ['$scope', '$routeParams', '$rootScope', '$log'];

    function QuestionsSetPanelController($scope, $routeParams, $rootScope, $log) {
        var vm = this;

        vm.panel_id = undefined;
        vm.questions = undefined;
        vm.answers = undefined;
        vm.getPanelID = getPanelID;
        vm.getRadioGroupName = getRadioGroupName;
        vm.getAnswers = getAnswers;
        vm.formValid = formValid;

        activate();

        function activate() {
            vm.panel_id = $scope.qspIdentifier;

            $scope.$on(
                $scope.qspWaitForIt,
                function(event, args) {
                    console.log('Questions loaded!');
                    vm.questions = args.questions;

                    vm.answers = {};
                    for(var i=0; i<vm.questions.length; i++) {
                        if(vm.questions[i].type === "range") {
                            vm.answers[vm.questions[i].label] = vm.questions[i].default;
                        } else {
                            vm.answers[vm.questions[i].label] = undefined;
                        }
                    }

                    $rootScope.$broadcast(
                        'questions_panel.' + vm.getPanelID() + '.ready',
                        {'panelCtrl': vm}
                    );
                }
            )
        }

        function getPanelID() {
            return vm.panel_id;
        }

        function getRadioGroupName(question_label) {
            return vm.getPanelID() + '-' + question_label;
        }

        function getAnswers() {
            return JSON.stringify(vm.answers);
        }

        function formValid() {
            if(typeof vm.answers === 'undefined') {
                return false;
            } else {
                var form_valid = true;
                for(var a in vm.answers) {
                    if(typeof vm.answers[a] === 'undefined') {
                        form_valid = false;
                        break;
                    }
                }
                return form_valid;
            }
        }

    }
})();