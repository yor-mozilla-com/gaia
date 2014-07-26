define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var PermissionDetail =
    require('panels/app_permissions_detail/app_permissions_detail');

  return function ctor_app_permissions_detail_panel() {
    var elements = {};
    var permissionDetailModule = PermissionDetail();
    var uninstall =
      permissionDetailModule.uninstall.bind(permissionDetailModule);
    var back = permissionDetailModule.back.bind(permissionDetailModule);

    function bindEvents(doms) {
      doms.uninstallButton.addEventListener('click', uninstall);
      doms.back.addEventListener('action', back);
    }

    function unbindEvents(doms) {
      doms.uninstallButton.removeEventListener('click', uninstall);
      doms.back.removeEventListener('action', back);
    }

    return SettingsPanel({
      onInit: function(panel, options) {
        elements = {
          back: panel.querySelector('#appPermissions-details-header'),
          uninstallButton: panel.querySelector('.uninstall-app'),
          list: panel.querySelector('.permissionsListHeader + ul'),
          header: panel.querySelector('.permissionsListHeader'),
          developerLink: panel.querySelector('.developer-infos > small > a'),
          developerName: panel.querySelector('.developer-infos > a'),
          developerInfos: panel.querySelector('.developer-infos'),
          developerHeader: panel.querySelector('.developer-header'),
          detailTitle:
            panel.querySelector('#appPermissions-details-header > h1')
        };
        permissionDetailModule.init(elements, options.permissionsTable);
      },

      onBeforeShow: function(panel, options) {
        permissionDetailModule.showAppDetails(options.app);
        bindEvents(elements);
      },

      onBeforeHide: function() {
        unbindEvents(elements);
      }
    });
  };
});
