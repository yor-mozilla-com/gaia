(function(window) {

  function Store() {
    Calendar.Store.Abstract.apply(this, arguments);

    this._remoteByAccount = Object.create(null);
  }

  Store.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,

    _store: 'calendars',

    _dependentStores: [
      'calendars', 'events'
    ],

    _parseId: function(id) {
      return id;
    },

    _assignId: function(obj) {
      if (!obj._id) {
        var id = obj.accountId + '-' + obj.remote.id;
        obj._id = id;
      }
    },

    _addToCache: function(object) {
      var remote = object.remote.id;

      this._cached[object._id] = object;

      if (!(object.accountId in this._remoteByAccount)) {
        this._remoteByAccount[object.accountId] = {};
      }
      this._remoteByAccount[object.accountId][remote] = object;
    },

    _removeFromCache: function(id) {
      if (id in this.cached) {
        var object = this.cached[id];
        var remote = object.remote.id;
        delete this.cached[id];
        delete this._remoteByAccount[object.accountId][remote];
      }
    },

    _createModel: function(obj, id) {
      if (!(obj instanceof Calendar.Models.Calendar)) {
        obj = new Calendar.Models.Calendar(obj);
      }

      if (typeof(id) !== 'undefined') {
        obj._id = id;
      }

      return obj;
    },

    _removeDependents: function(id, trans) {
      var store = this.db.getStore('Event');
      store.removeByCalendarId(id, trans);
    },

    remotesByAccount: function(accountId) {
      if (accountId in this._remoteByAccount) {
        return this._remoteByAccount[accountId];
      }
      return Object.create(null);
    },

    /**
     * Sync remote and local events for a calendar.
     */
    sync: function(account, calendar, callback) {
      // for now lets just do a very dumb
      // sync of the entire collection
      // we can assume everything is cached.

      var self = this;
      var persist = [];
      var store = this.db.getStore('Event');
      var originalIds = Object.keys(store.cached);
      var syncTime = new Date();

      if (!calendar._id) {
        throw new Error('calendar must be assigned an _id');
      }

      // 1. Open an event stream
      //    as we read the stream events
      //    determine if the event was added/deleted.
      //    Emit events as we go to update the UI
      //    but do *not* actually hit the db until
      //    entire sync is done.

      var provider = Calendar.App.provider(
        account.providerType
      );

      var stream = provider.eventStream(
        account.toJSON(),
        calendar.toJSON()
      );

      stream.on('data', function(event) {
        var id = calendar._id + '-' + event.id;
        var localEvent = store.cached[id];

        if (localEvent) {
          var localToken = localEvent.remote.syncToken;
          var remoteToken = event.syncToken;

          if (localToken !== remoteToken) {
            localEvent.remote = event;
            persist.push(localEvent);
          }

          var idx = originalIds.indexOf(id);
          originalIds.splice(idx, 1);
        } else {
          localEvent = {
            calendarId: calendar._id,
            remote: event
          };

          persist.push(localEvent);
        }
      });

      stream.send(commitSync);


      // 2. After the entire stream is finished
      //    and the records are sorted into
      //    add/remove/update open a transaction
      //    and actually persist the collection.


      function commitSync() {
        // 3. In the same transaction
        //    move the remotes syncToken
        //    to the calendars lastEventSyncToken
        //    and set the lastEventSyncDate

        var trans = self.db.transaction(
          ['calendars', 'events'], 'readwrite'
        );

        persist.forEach(function(event) {
          store.persist(event, trans);
        });

        originalIds.forEach(function(id) {
          store.remove(id, trans);
        });

        calendar.lastEventSyncToken = calendar.remote.syncToken;
        calendar.lastEventSyncDate = syncTime;

        self.persist(calendar, trans);

        trans.addEventListener('error', function(e) {
          callback(e);
        });

        trans.addEventListener('complete', function() {
          callback(null);
        });
      }
    }

  };

  Calendar.ns('Store').Calendar = Store;

}(this));
