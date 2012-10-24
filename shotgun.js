/*!
 * Name: shotgun.js
 * Author: John Newman
 * Date: 1/21/2012
 * License: MIT
 * Version: 3.1
 * URL: https://github.com/jgnewman/shotgun
 * Description: Smarter than your average pubsub library.  Small and fast.  
 * Contains trappable internal events and gives you lots of control over your subscriptions.
 * 
 * As of v3.1:
 *     Support for internal events such that you won't risk overwriting internal event names when you create an event.
 * 
 * As of v3.0:
 *     Since it is least frequently used, key is now always the last argument.
 *     SG.try has been renamed SG.attempt for linting purposes.
 *     SG.attempt now passes the function you tried to call along with the error to the error listener.
 *     Smarter, faster, more organized directory structure.
 *     Better unique ID generator that doesn't have to check previously generated IDs.
 * 
 * As of v2.0:
 *     Completely revamped the events syntax to feel and work more like a directory system.
 *     You can now group events together under "directories".
 *     As such, you no longer pass in arrays of keys to publish because sub directories are a better way to group events.
 *     Changed syntax to generally help you get there faster.
 *     Using a '*' at the end of your event will fire all events and events under sub-directories under the current path.
 *     This is recursive though, so don't go crazy with your events if you're going to use it.
 *     SHOTGUN.events has been renamed SHOTGUN.getEvents.
 * 
 * As of v1.5:
 *     Contains an event-based abstraction of the try/catch block.  
 *     You can now decouple your error handling from your work flow, set multiple tries to a single catch,
 *     and even indirectly call your try recursively through an events channel.
 *     Unique keys are now shorter and SHOTGUN will run a test to make sure generated keys are actually unique.
 *     Contains a new trappable event: tryError
 * 
 * Internal events you can trap:
 *     newListener -> Fired any time a new subscription is made.  Gives you an object containing the event, key, and action.
 *     rmEvent     -> Fired any time you remove an entire group of actions by event name.  Gives you the name of the event removed.
 *     rmListener  -> Fired any time you unsubscribe a single action by key.  Gives you the name of the event and the name of the key.
 *     tryError    -> Fired any time SHOTGUN.try() publishes an error.
 * 
 */

(function (global) {
  "use strict";

  // This is to give you more options for naming your events.
  /*jslint nomen: true */

  var module        = module || null,
      idIncrementor = 999999,
      realEvents    = {},
      excludeItem   = {},
      eventDirs,
      internalEventDirs,
      output;

  /*
   * Returns the first item in obj
   */
  function first(obj) {
    return obj[0];
  }

  /*
   * Returns the last item in obj
   */
  function last(obj) {
    return obj[obj.length - 1];
  }

  /*
   * Returns all but the last item in obj
   */
  function lead(obj) {
    return obj.slice(0, obj.length - 1);
  }

  /*
   * Step 1: Generate a new date in milliseconds
   * Step 2: Add an incrementor
   * Step 3: Add 25 random chars
   * Philosophy: Generating the date means we only have to worry about ids converging when
   *             those ids are created during the same millisecond.  The incrementor ranges
   *             from 1000000 to 9999999 so there is virtually no way that this many ids will
   *             be created in the same millisecond.  But if somehow they are or if a bad JS
   *             implementation somehow calls the function twice at the exact same moment and
   *             glitches out on the incrementor, we rely on a random 25 character string.
   */
  function idgen() {
    var newStr = '',
        chars  = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghiklmnopqrstuvwxyz",
        i;

    // Start with a timestamp in milliseconds
    newStr += (new Date()).getTime();

    // Add 1 to the incrementor and add on the new number
    idIncrementor += 1;
    newStr += ("-" + idIncrementor + "-");

    // Reset the incrementor if it's getting too large
    if (idIncrementor === 9999999) {
      idIncrementor = 999999;
    }

    // Add on a random 25 char string
    for (i = 0; i < 25; i += 1) {
      newStr += chars[Math.floor(Math.random() * chars.length)];
    }

    // If there was a prefix, add it to the beginning and end
    return newStr;
  }

  /*
   * Where:
   * obj - an ordered object
   * fun - a function to call on each item in obj
   *
   * Iterates over obj calling fun for each item.
   * Returns an array of all fun returns.
   */
  function map(obj, fun) {
    var i, len = obj.length, output = [];
    for (i = 0; i < len; i += 1) {
      output.push(fun(obj[i], i));
    }
    return output;
  }

  /*
   * Where:
   * obj - an object literal
   * fun - a function to call on each item in obj
   *
   * Iterates over obj calling fun for each item.
   * Returns an object of all fun returns.
   */
  function chart(obj, fun) {
    var i, item, output = {};
    for (i in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, i)) {
        item = fun(obj[i], i);
        if (item !== excludeItem) {
          output[i] = item;
        }
      }
    }
    return output;
  }

  // Constructors for naming our event dir objects
  function Events() {}
  function InternalEvents() {}

  // Use the constructors to name our event dir objects
  eventDirs = new Events();
  internalEventDirs = new InternalEvents();


  /*
   * Where:
   * name - a string representing an event name (useful if you are passing around a dynamic name)
   *
   * Returns true if the event name represents an internal event
   */
  function evIsInternal(name) {
    return (name.slice(0, 9) === '_internal');
  }


  /*
   * Where:
   * name              - a string representing a the intended directory name
   * parentDir         - an object literal; the parent of the new directory being created
   * gotHereFromListen - a boolean or undefined, informs the function whether it is
   *                     being called by .listen
   *
   * Constructs the a directory object
   */
  function dirObject(name, parentDir, gotHereFromListen) {
    var eventRef;
    
    // Die if we're trying to create a directory under internalEventDirs
    // and we got here from .listen
    if (parentDir === internalEventDirs && gotHereFromListen) {
      throw new Error('Attempt to subscribe to an internal event without first registering the event.');
    }

    // Create a new id and a spot in realEvents associated with it
    eventRef = idgen();
    realEvents[eventRef] = {};

    // Set up a prototype with access to that spot in realEvents
    function Directory() {}
    Directory.prototype = {
      "_dirEvents"    : realEvents[eventRef],
      "_dirEventsKey" : eventRef,
      "_parentDir"    : parentDir,
      "_dirName"      : name
    };

    // Build the object with its prototype
    return new Directory();
  }


  /*
   * Where:
   * evDir       - an object literal; the directory containing functions to invoke
   * key         - a string; the id of a single function to be invoked; null, if no key is desired
   * args        - an array; the arguments to pass to the functions when invoked
   * beRecursive - a boolean; whether we want to invoke functions within sub-directories as well
   *
   * Actually invokes functions subscribed to an event
   */
  function invokeEvents(evDir, key, args, beRecursive) {
    var events = evDir._dirEvents;

    // If we have a key, only call the function associated with that key and end.
    if (key) {
      events[key].apply(null, args);
      return true;
    }

    // If we don't have a key, call all the functions in the evdir.
    chart(events, function (val) {
      val.apply(null, args);
    });

    // If we don't want to be recursive, stop here.
    if (!beRecursive) {
      return true;
    }

    // If we do want to be recursive, call self for every directory in the evdir.
    return chart(evDir, function (val, prop) {
      if (first(prop) === '_') {
        return excludeItem;
      }
      return invokeEvents(val, key, args, beRecursive);
    });
  }

  // Create the object to be exported...
  output = {

    /*
     * Where:
     * ev   - a string; mandatory; represents the event name
     * args - an array; optional; the arguments to be passed to functions
     * key  - a string; optional; the id of a single function to be called
     *
     * Determines how functions in the event should be invoked and calls invokeEvents
     * to actually call them
     */
    "fire" : function (ev, args, key) {
      var eventArray,
          argArray,
          realKey,
          recursive,
          evDir;

      // Allow user to be somewhat liberal with arguments
      if (typeof args === 'string') {
        argArray = [];
        realKey = args;
      } else {
        argArray = args;
        realKey = key;
      }

      // Determine whether this is an internal event or not and set evDir appropriately
      if (evIsInternal(ev)) {
        // Slice the keyword off the front of the event name
        ev = ev.slice(10);
        evDir = internalEventDirs;
      } else {
        evDir = eventDirs;
      }

      // Determine whether or not we need to be recursive and set up our directory chain array
      if (last(ev) === '*') {
        recursive = true;
        eventArray = lead(lead(ev)).split('/');
      } else {
        eventArray = ev.split('/');
      }

      // Use that chain array to find our event directory
      map(eventArray, function (each) {
        evDir = evDir[each];
      });

      // Give up if the event doesn't exist
      if (!evDir) {
        return false;
      }

      // Fire off desired functions listening for this event
      return invokeEvents(evDir, realKey, argArray, recursive);

    },

    /*
     * Where:
     * ev  - a string; mandatory; represents the event name
     * fn  - a function; mandatory; the function subscribing to the event
     * key - a string; optional; the id of a single function to be called;
     *       if not provided, will be generated
     *
     * Subscribes a function to an event
     */
    "listen" : function (ev, fn, key) {
      var realKey = key || idgen(),
          evArray,
          parentDir;

      // Determine whether this is an internal event or not and set parentDir appropriately
      if (evIsInternal(ev)) {
        // Slice the keyword off the front of the event name
        ev = ev.slice(10);
        parentDir = internalEventDirs;
      } else {
        parentDir = eventDirs;
      }

      // Creat our directory chain array
      evArray = ev.split('/');

      // create directories as needed
      map(evArray, function (each) {
        parentDir[each] = parentDir[each] || dirObject(each, parentDir, true);
        parentDir = parentDir[each];
      });

      // put the function into the realEvents directory
      parentDir._dirEvents[realKey] = fn;

      // fire an internal event
      this.fire('_internal/newListener', [ev, fn, realKey]);

      return realKey;
    },

    /*
     * Where:
     * all arguments - strings; representing the names of new internal events
     *
     * Creates one or more new internal events
     */
    "registerInternal" : function () {
      map(arguments, function (arg) {
        var evDir = internalEventDirs,
            evArray = arg.split('/');

        // create directories as needed
        map(evArray, function (each) {
          evDir[each] = evDir[each] || dirObject(each, evDir, false);
          evDir = evDir[each];
        });
      });

      return true;
    },

    /*
     * Where:
     * ev  - a string; mandatory; represents the event name
     * key - a string; optional; the id of a single function to be unsubscribed from the event;
     *
     * If key is provided, removes the corresponding function from the event.  Otherwise,
     * deletes the entire event.
     */
    "remove" : function (ev, key) {
      var eventArray,
          evDir;

      // Determine whether this is an internal event or not and set evDir appropriately
      if (evIsInternal(ev)) {
        // Slice the keyword off the front of the event name
        ev = ev.slice(10);
        evDir = internalEventDirs;
      } else {
        evDir = eventDirs;
      }

      // Set up our directory chain array
      eventArray = ev.split('/');

      // Find our event directory
      map(eventArray, function (each) {
        evDir = evDir[each];
      });

      // If we have a key, remove that function and end
      if (key) {
        delete evDir._dirEvents[key];
        this.fire('_internal/rmListener', [ev, key]);
        return true;
      }

      // If we don't have a key, remove the entire event and end
      delete realEvents[evDir._dirEventsKey];
      delete evDir._parentDir[evDir._dirName];
      this.fire('_internal/rmEvent', [ev]);
      return true;
    },

    /*
     * Where:
     * ev  - a string; mandatory; represents the event name
     * fn  - a function; mandatory; the function you want to try to invoke
     * key - a string; optional; the id of a single function to be called when there's an error
     *
     * Decouples try/catch.  Calls fn in global of a try.  If there is an error, catches the
     * error and publishes everything to the event name so it can be picked up by subscribed
     * functions.
     */
    "attempt" : function (ev, fn, key) {
      var realEvent,
          realFn,
          realKey;

      // Allow user to be somewhat liberal with arguments.
      // You don't have to pass in an event name if you don't want to.
      if (typeof ev === 'function') {
        realFn = ev;
        realKey = fn;
      } else {
        realEvent = ev;
        realFn = fn;
        realKey = key;
      }

      // Try to call the function
      try {
        realFn();

      // If it doesn't work...
      } catch (err) {

        // Fire the user's manual event if there is one
        if (realEvent) {
          this.fire(realEvent, [err, realFn], realKey);
        }

        // Fire the internal tryError event
        this.fire('_internal/tryError', [err, realFn], realKey);
      }
    },

    /*
     * Returns the state of all custom event subscriptions.
     */
    "getEvents" : function () {
      return eventDirs;
    },

    /*
     * Returns the state of all internal event subscriptions.
     */
    "getInternalEvents" : function () {
      return internalEventDirs;
    },
    
    /*
     * Where:
     * fun - a function to be executed upon docReady
     *
     * Convenience method for setting up a docReady listener.
     */
    "docReady" : function (fun) {
      this.listen('docReady', fun);
    }
  };

  // Register default internal events
  output.registerInternal('newListener', 'rmEvent', 'rmListener', 'tryError');
  
  /*
   * If we're in the browser, setup a docReady event for convenience
   */
  function fireDocReady() {
    if (/in/.test(global.document.readyState)) {
      return global.setTimeout(fireDocReady, 100);
    }
    return output.fire('docReady');
  }
  
  if (global.constructor.name === 'Window') {
    fireDocReady();
  }

  // Export to multiple environments

  // AMD
  if (global.define && typeof global.define === fun && global.define.amd) {
    global.define('SHOTGUN', [], output);

  // Node
  } else if (module && module.exports) {
    module.exports = output;

  // Browser
  } else {
    global.SHOTGUN = global.SG = output;
  }

}(this));