# Shotgun.js

> Smarter than your average pubsub library.

Shotgun.js is a custom event manager for JavaScript.  Built on the pubsub concept, you can tell functions to listen
for events that you define and manually fire those events at will.  Unlike using jQuery events, you can easily 
unsubscribe any function from any event, even if your function isn't named.  Shotgun.js also publishes trappable,
internal events as you use it.

Shotgun passes JSLint (except for one optimization meant for Google Closure Compiler ADVANCED_MODE), can be installed anywhere, and is also cross-browser compatible.  By default, it attaches a
namespace called SHOTGUN to the global object.  You can also use SG as a shorcut for this.  Here's how it works:

## Creating Subscriptions

When you create an event subscription with Shotgun, you are, in essence, telling a specific function to listen for
the firing of some event and then invoke itself when it hears that event fired.  The event will publish an array
of arguments that the function will take into itself upon invocation.  Let's look at an example:

```javascript

var eventKey = SHOTGUN.listen({
	"event"  : "myCustomEvent",
	"key"    : "someKeyName",
	"action" : function (x, y) {
		return x + y;
	}
});

// returns => 'someKeyName'

```

In the above example we passed an object with 3 properties to **SHOTGUN.listen**.  The **event** property contains
the name of the event your function will subscribe to.  The **action** property contains the function that should be
invoked when the event is fired.  But the real secret to Shotgun.js is the **key** property.  

With the **key** property you can uniquely name each of your individual subscriptions.  If you do not pass a **key**
property to **SHOTGUN.listen**, a random 64 character key will be generated for you.  **SHOTGUN.listen** returns your
subscription key so that you will have it available for use in the future.

You can subscribe as many functions to an event name as you want but you can not subscribe more than one function using
the same key. If you try to give two subscriptions the same **key**, the first subscription will disappear, being
overridden by the the second.  Uniquely naming your keys will allow you to delete any subscription, whether the 
**action** function is named or not.

Note: You don't have to do anything special to create an event for the first time.  When you make a subscription,
Shotgun.js will check to see if that event already exists.  If not, it will be created for you.

Now let's fire an event.

## Firing (Publishing) Events

In order to demonstrate how cool Shotgun.js is, we will first need to make two more subscriptions to the same event.

```javascript

var eventKey2 = SHOTGUN.listen({
	"event"  : "myCustomEvent",
	"key"    : "anotherKeyName",
	"action" : function (x, y) {
		return x - y;
	}
});

// returns => 'anotherKeyName'

var eventKey3 = SHOTGUN.listen({
	"event"  : "myCustomEvent",
	"action" : function (x, y) {
		return x * y;
	}
});

// returns something like => '.o:/u@D{#NLtr:PsKCIei_c.4c{9lP@Rv=c|N_NQeI6S*J9JcT?8#Evn*9t:UMBA'

```

We now have 3 functions subscribed to **myCustomEvent**.  If we simply fire **myCustomEvent** with an array of
arguments, all 3 functions will be invoked and take those arguments into themselves.  Like so:

```javascript

SHOTGUN.fire({
	"event" : "myCustomEvent",
	"args"  : [4, 2]
});

// Each function subscribed to 'myCustomEvent' runs.
// They return 6, 2, and 8, respectively.

```

In the above example we fired an event with an array of arguments thus invoking every function subscribed to the event.
However, we have subscription keys we can use!  So let's be more specific.  We'll invoke only 2 of our three functions
subscripted to **myCustomEvent**.

```javascript

SHOTGUN.fire({
	"event" : "myCustomEvent",
	"key"   : [eventKey, eventKey2],
	"args"  : [4, 2]
});

// Only 2 of the three functions are invoked.  They return 6 and 2 respectively.

```

By passing **a single key or array of keys** to **SHOTGUN.fire**, you can specify which specific subscriptions you
want to receive your event publication.

## Unsubscribing

Once you make a subscription, it exists until you either remove it manually or override it with another subscription.
That's OK because subscription keys give us a way to easily do that.  We just call **SHOTGUN.remove**.

```javascript

SHOTGUN.remove({
	"event" : "myCustomEvent",
	"key"   : eventKey
});

// A function is unsubscribed from 'myCustomEvent'

```

In the above example we removed a single subscription from an event.  However, we can also remove all subscriptions
from an event simply by not passing in a **key** property to **SHOTGUN.remove**.

```javascript

SHOTGUN.remove({"event" : "myCustomEvent"});

// The entire event and all subscriptions to it are removed.

```

## Internal Events

You might be interested to know that Shotgun publishes events for you to trap whenever you make a subscription or
remove a subscription.  There is no trappable event when a publish occurs because that would suck you into an infinite
loop.  Nobody wants that.  Anyway, here are your internal events:

```javascript

// newListener -> Fired any time a subscription is made
SHOTGUN.listen({
	"event"  : "newListener",
	"action" : function (obj) {
		// obj.event  === the event name (in this case 'newListener')
		// obj.key    === the subscirption key
		// obj.action === the function that subscribed to the event
	}
});

// rmListener -> Fired any time a specific subscription is removed
SHOTGUN.listen({
	"event"  : "rmListener",
	"action" : function (e, k) {
		// e === the event name that the function was subscribed to
		// k === the subscirption key
	}
});

// rmEvent -> Fired any time you delete an entire event and all its subscriptions
SHOTGUN.listen({
	"event"  : "rmEvent",
	"action" : function (e) {
		// e === the event name that was removed
	}
});

```

## Keeping Track

Lastly, you can always get a good look at the current state of Shotgun.js subscriptions by running
**SHOTGUN.events**.

```javascript

SHOTGUN.events()

/*
returns an object like this =>
{
	"eventName" : {
		"subscriptionKey" : {
			"action" : function () {}
		},
		"subscriptionKey2" : {
			"action" : function () {}
		}
	},
	"eventName2" : {
		"subscriptionKey" : {
			"action" : function () {}
		},
		"subscriptionKey2" : {
			"action" : function () {}
		}
	}
}
*/

```