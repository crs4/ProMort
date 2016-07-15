(function () {
    'use strict';

    angular
        .module('promort.routes')
        .config(config);

    config.$inject = ['$routeProvider'];

    function config($routeProvider) {
        $routeProvider
            // login template
            .when('/login', {
                controller: 'LoginController',
                controllerAs: 'vm',
                templateUrl: '/static/templates/authentication/login.html'
            })
            // user worklist template
            .when('/worklist', {
                controller: 'WorkListController',
                controllerAs: 'wlc',
                templateUrl: '/static/templates/worklist/pending_reviews.html'
            })
            // review steps template
            .when('/worklist/:case', {
                controller: 'ReviewController',
                controllerAs: 'rc',
                templateUrl: '/static/templates/worklist/review_steps.html'
            })
            // slide quality control
            .when('/worklist/:case/:slide/quality_control', {
                controller: 'QualityControlController',
                controllerAs: 'qcc',
                templateUrl: '/static/templates/slide_review/quality_control.html'
            })
            // no match
            .otherwise('/');
    }
})();