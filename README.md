Observe_evented
===========

A Javascript class that makes Array.observe and Object.observe easy to use.

Observe_evented's specialty is to split the batch of changes returned by the native API into atomic and consistent events. It also provides several options that make them easier to handle.

Test it on <a href="http://jsfiddle.net/d9w3uaav/5/">this jsFiddle page</a>.

This library has no dependency. It works in Object.observe compatible environments like Node 0.11.13+ and Chrome 36+, or other environments with a shim that will emulate Array/Object.observe. For Object.observe, you can checkout [Massimo Artizzu's "Object-observe" shim](https://github.com/MaxArt2501/object-observe).

Object.observe is a proposed feature in the draft of ECMAScript 7.
As the standard itself may still evolve, this library may change accordingly.
You can read more about it [here](http://www.html5rocks.com/en/tutorials/es7/observe/).  

Available under MIT license on [GitHub](https://github.com/louisameline/observe_evented) and [Npm](https://www.npmjs.com/package/observe_evented).

NOTE: examples on this page may produce different results if a shim is used instead of a natively compatible browser.

Quick reference guide
-------------------------

CREATE AN OBSERVER

```javascript
// `object` can be an Array or an Object.
var observer = observe_evented.observe(object [, options]);
```

LISTEN TO CHANGES

```javascript
// `eventType` is one event type or several space-separated event types.
// `name` is optional, to filter the changes on a property name. It may be a
// string or an array of strings.
// `callback` is called at each change with a single event as first argument.
observer.on(eventType [, name] , callback);
```

REMOVE A LISTENER

```javascript
observer.off(handler);
// or, to stop the listener only for a given event type:
// (note: space-separated event types is also possible)
observer.off(eventType, handler);
```

or, to remove several listeners:

```javascript
// stop all listeners on the observer for a given event type:
// (note: space-separated event types is also possible)
observer.off(eventType);
// or, to stop all listeners of the observer altogether:
observer.off();
```

Note: queued events for the current object will immediately (ie synchronously) be emitted when you remove a listener.

TRIGGER EVENTS ON HANDLERS

```javascript
// `name` may be an property name (or an index for arrays) of the
// observed object or an array of property names
observer.trigger(eventType, name);
// or, to trigger the event on all values in the object/array:
observer.trigger(eventType);
// or directly provide an array of events
observer.trigger(events);

// example of the last syntax:
observer.trigger([
	{
		name: 'fruit',
		type: 'update',
		object: myArray,
		oldValue: 'fake event'
	},
	{
		name: 'vegetable',
		type: 'add',
		object: myArray
	}
]);

```

PAUSE AN OBSERVER

```javascript
observer.disable();
```

RESUME AN OBSERVER

```javascript
observer.enable();
```

REMOVE AN OBSERVER

```javascript
observer.destroy(asynchronously);
```

EVENTS have these properties:

```javascript
{
	name: PropertyNameOrIndexOfChangedValue,
	object: observedObjectOrArray,
	type: TypeOfEvent,
	// not present on add events
	oldValue: valueBeforeEvent
	// not present on remove events
	value: valueAfterEvent
}
```

and their types are usually `add`, `update` or `remove`.

OPTIONS

See the options section for full reference.

```javascript
var options = {
	additionalEventTypes: [],
	multipleObservers: false,
	shim: null,
	output: {
		batchOnly: false,
		dropValues: false,
		minimalEvents: false,
		noUpdateEvents: false
	}
}
```

Basic examples
-------------------------

Observe an object:

```javascript
var basket = {},
	observer = observe_evented.observe(basket);

observer
	.on('add', function(event){
		console.log(
			'A property named "' + event.name +
			'" with the value "' + event.value +
			'" was added to the object'
		);
	})
	.on('update', function(event){
		console.log(
			'The property named "' + event.name +
			'" was updated from "' + event.oldValue +
			'" to "' + event.value + '"'
		);
	})
	.on('remove', function(event){
		console.log(
			'The property named "' + event.name +
			'" with the value "' + event.oldValue +
			'" was removed from the object'
		);
	});

// triggers an add event
basket.fruit = 'apple';
// triggers an update event
basket.fruit = 'strawberry';
// triggers a remove event
delete basket.fruit;
```

Observe an array (works the same way):

```javascript
var basket = [],
	observer = observe_evented.observe(basket);

observer
	.on('add', function(event){
		console.log(
			'At index ' + event.name +
			', the following value was inserted: ' + event.value
		);
	})
	.on('update', function(event){
		console.log(
			'At index ' + event.name +
			', the value was updated from ' + event.oldValue +
			' to ' + event.value
		);
	})
	.on('remove', function(event){
		console.log(
			'The value at index ' + event.name +
			' was removed from the array, its value was: ' + event.oldValue
		);
	});

// triggers an add event
basket[0] = 'apple';
// triggers an update event
basket[0] = 'pear';
// triggers an add event
basket.push('banana');
// triggers two add events
basket.push('strawberry', 'coconut');
// triggers two remove events and two add events
basket.splice(0, 2, 'cherry', 'mango');
```

A special note about the `delete basket[0];` command : as this effectively sets the value of `basket[0]` to `null` and does not actually remove the cell at index 0, it is an `update` event that will be triggered with `event.value == null`. Use the `splice` method to actually remove values from an array and consider stop using `delete` with arrays.

Observe a specific property of an object
-------------------------

Quite often you'll be interested in the changes of a specific property of an object. That's when you should use the second parameter of `observer.on`. 

You may provide a property name or an array of property names:

```javascript
var basket = {},
	observer = observe_evented.observe(basket);

observer
	.on('add', 'fruit', function(event){
		console.log('The fruit property was added to the object');
	})
	.on('update', ['fruit', 'vegetable'], function(event){
		console.log('The ' + event.name + ' property had a change of value');
	});

// triggers an add event
basket.fruit = 'apple';
// triggers an update event
basket.fruit = 'strawberry';
// triggers nothing
basket.vegetable = 'carrot';
// triggers an update event
basket.vegetable = 'bean';
// triggers nothing
basket.drink = 'coke';
```

Please note that this second argument, while *technically* working on arrays too, will probably not produce the result you would expect and will be useless to most people.

Data-binding with Observe_evented
-------------------------

One of the ways to use the power of Object.observe is for data-binding. As soon as your object/array changes, you might want to reflect that change in the DOM. Here is an example with the jQuery syntax:

```javascript
var basket = {},
	observer = observe_evented.observe(basket);

observer.on('add', function(event){
	$('#myDiv').append(event.value + ' was added to the basket. ')
});

// these will be listed on our web page
basket.fruit = 'apple';
basket.vegetable = 'carrot';
basket.drink = 'coke';
```

Great ! But sometimes you will have objects/arrays that will have been populated before the observer was set up:

```javascript
// the basket is already full of goods
var basket = {
		fruit: 'apple',
		vegetable: 'carrot',
		drink: 'coke'
	},
	observer = observe_evented.observe(basket);

// Our existing goods will not be listed in the page as they were
// added to the basket before this listener is bound
observer.on('add', function(event){
	$('#myDiv').append(event.value + ' was added to the basket. ')
});
```

To solve this and initialize your page correctly, after you bound your handler with `observer.on()`, just fire it by triggering "fake" `add` events on every property of the basket:

```javascript
observer.trigger('add');
```

Observe multiple objects or arrays from a single function
-------------------------

Just use a single handler on multiple observers:

```javascript
var basket1 = [],
	basket2 = {},
	myFunction = function(event){
		var nb = (event.object.constructor === Array) ? 1 : 2;
		console.log('A ' + event.value + ' was added to basket number ' + nb + ' ! ');
	};

var observer1 = observe_evented.observe(basket1),
	observer2 = observe_evented.observe(basket2);

observer1.on('add', myFunction);
observer2.on('add', myFunction);

basket1.push('peach');
basket2.fruit = 'watermellon';
```

Event types
-------------------------

By default, the events sent by Observe_evented can be of the following types :

`add`, `update`, `remove`, `batch`, `reconfigure`, `setPrototype`

Notifiers also let you create more event types (read the article linked at the top of this page).

Options : optimize performances
-------------------------

An object of options can optionaly be provided in the call to `observe_evented.observe()`.

Before explaining the options, note that Observe_evented :  
- returns by default all events that happened on the object/array you observe,
- adds meaningful `event.value` properties that help you understand what happened all the way.

While this can be interesting in some cases and while debugging, you might want to work differently. The following options are here for that :

`options.output.dropValues` Since generating the `event.value` properties has a (generally) minor performance cost, you can choose not to generate them if you don't need them. Default: `false`.

`options.output.minimalEvents` Set this option to `true` to get only the minimum number of events nessary to transition from the object/array as it was before modifications to its current state. This can effectively optimize your application by ignoring meaningless events. Example :

```javascript
var basket = { fruit: 'apple' },
	observer = observe_evented.observe(basket, {
		output: {
			minimalEvents: true
		}
	});

observer
	.on('add', function(event){
		console.log(
			'A property "' + event.name + '" was created, ' +
			'its value is "' + event.value + '"'
		);
	})
	.on('update', function(event){
		console.log(
			'The property "' + event.name + '" was updated, ' +
			'its value is "' + event.value + '"'
		);
	})
	.on('remove', function(event){
		console.log('The property "' + event.name + '" was deleted');
	});

basket.fruit = 'banana';
basket.fruit = 'mango';
basket.fruit = 'cherry';
basket.vegetable = 'carrot';
basket.vegetable = 'pea';
basket.meat = 'pork';
basket.meat = 'chicken';
delete basket.meat;

// Logged :
//
// The property "fruit" was updated, its value is "cherry"
// A property "vegetable" was added, its value is "pea"
```

As you can see, Observe_evented sends events as if the object went directly from its original state to its final one, that is to say :  
from `{ fruit: 'apple' }` to `{ fruit: 'cherry', vegetable: 'pea' }`

No events were sent for the intermediary states of `basket.fruit` and `basket.vegetable`. Since `basket.meat` does exist before the modifications nor after, no events are sent about that either.

Other options
-------------------------

`options.additionalEventTypes` If you need an object observer to return more than the standard change types, namely because you use notifiers, you may provide them to this option as an array. Default: empty array.

`options.multipleObservers` See the dedicated "Create multiple observers on a same object/array" section below. Default: `false`.

`options.shim` Should you wish to use a shim that does not directly extend Object and Array prototype, you may provide an adapter for it via this option. You must provide an object that has `Array` and `Object` properties which will expose `observe`, `unobserve` and `deliverChangeRecords` methods.

`options.output.batchOnly` If you prefer to work on batched events (see the section below) and do not need them to be triggered individually, set this option to `true`. Only the `batch` events will then be triggered. Default: `false`.

`options.output.noUpdateEvents` Semantically, updating a value in an array/object is not the same thing as removing it and adding its replacement at the same index/key. However, the end result is the same. Furthermore, a browser using a shim won't even be able to make the difference. For the sake of consistency, this is why you may set this option to `true` to prevent `update` events and replace them by a `remove` event followed by an `add` event. Default: `false`

`observe_evented.setDefaultOptions()` This method lets you modify the default options for all future calls, like for example:

```javascript
observe_evented.setDefaultOptions({
	additionalEventTypes: ['myCustomType1', 'myCustomType2'],
	output: {
		dropValues: true,
		noUpdateEvents: true
	}
});

// all observers created from now on will now only emit events without
// `event.value` being set, and `update` events will be converted.
```

Advanced: create multiple observers on a same object/array
-------------------------

By default, Observe_evented creates only one observer per object/array for simplicity and improved performances, even if you call `observe_evented.observe()` multiple times on it.

That is to say:

```javascript
var basket = { fruit: 'apple' },
	observer1 = observe_evented.observe(basket),
	observer2 = observe_evented.observe(basket);

// this logs `true`
console.log(observer1 === observer2 ? true : false);
```

However, please note that when you call `observe_evented.observe()` a second time, the options provided in the first call will be lost and replaced by the options of the second call (or the default options if not provided).

In case you really need to create a second observer on the object/array, for example because you want to work with a different set of options in parallel, you may force this by setting the `multipleObservers` option to `true`.

As a result:

```javascript
var basket = { fruit: 'apple' },
	observer1 = observe_evented.observe(basket),
	observer2 = observe_evented.observe(basket, { multipleObservers: true });

// this logs `false`
console.log(observer1 === observer2 ? true : false);
```

Please note that when you use several observers on an object/array, all events will be fired on an observer, and then all events will be fired on the next, etc.

Advanced: the short syntax of .observe()
-------------------------

Some people might be happy to know that they can actually provide a listener as third argument to `observe_evented.observe()`, that is to say:

```javascript
var observer = observe_evented.observe(object [, options], callback);
```

This is equivalent to:

```javascript
var observer = observe_evented.observe(object [, options]);
observer.on(null, callback);
```

Which has for effect that your callback will be called for every single event fired on the observer.

Advanced: pause, resume and remove observers
-------------------------

When the observer is paused by using its the `disable` method, `Object.unobserve()` is actually called. Its configuration and listeners however are kept in case you ever want to resume observing by calling its `enable` method.

When you call the `destroy` method of the observer, the object/array is unobserved and references to its configuration and listeners are definitively deleted.

When called, the `destroy` method will synchronously deliver any queued events before destruction. If you wish to proceed to the destruction asynchronously at the end of the current microtask, you may call it with `true` as the first argument.

Example:

```javascript
var basket = { fruit: 'apple' },
	observer = observe_evented.observe(basket);

observer.on('update', function(event){
	console.log(
		'The property "' + event.name + '" was updated, ' +
		'its value is "' + event.value + '"'
	);
});

// triggers an update event
basket.fruit = 'banana';
observer.disable();
// triggers nothing
basket.fruit = 'mango';
observer.enable();
// triggers an update event
basket.fruit = 'cherry';
observer.destroy();
// triggers nothing
basket.fruit = 'pear';
```

Note: since the listener called by `Object.observe` is actually not the same before disabling and after enabling again, the events are coming to your handlers in two distinct batches.

Advanced: deliverChangeRecords
-------------------------

This methods is directly proxied by Observe_evented on the currently observed object, without the need for you to provide any arguments.

When calling this method, all queued events will be immediately fired (synchronously), instead of having to wait for the end of the current microtask (asynchronously).

```javascript
var basket = { fruit: 'apple' },
	observer = observe_evented.observe(basket);

observer.deliverChangeRecords();
```

Advanced : Manage the events in batches
-------------------------

As you know, events are sent asynchronously and in batches by the browser to Observe_evented. If you didn't know, read the notice section below as it's something you must understand to avoid surprises.

So, sometimes you might find useful to get all events at once in your callback function, instead of having it called with only one event at a time. No problem.

You will be able to get the batch of atomic events computed by Observe_evented and the batch of raw events sent by the native Object/Array.observe function.

You can get these by listening to `batch` events.

```javascript
var basket = [],
	observer = observe_evented.observe(basket);

observer.on('batch', function(event){
	console.log(event.value.computed);
	console.log(event.value.raw);
});

basket[0] = 'apple';
basket.push('pear');
basket.unshift('banana', 'cherry');
// delete should be avoided on arrays, it's only for the example
delete basket[0];
basket.splice(0, 2, 'strawberry');
```

...will log:

```javascript
// Note: "object" has been collapsed, its value is ["strawberry", "apple", "pear"]
// all along.

[
  {
    "name": 0,
    "object": [...],
    "type": "add",
    "value": "apple"
  },
  {
    "name": 1,
    "object": [...],
    "type": "add",
    "value": "pear"
  },
  {
    "name": 0,
    "object": [...],
    "type": "add",
    "value": "banana"
  },
  {
    "name": 1,
    "object": [...],
    "type": "add",
    "value": "cherry"
  },
  {
    "type": "update",
    "object": [...],
    "name": 0,
    "oldValue": "banana",
    "value": null
  },
  {
    "name": 0,
    "object": [...],
    "oldValue": null,
    "type": "remove"
  },
  {
    "name": 0,
    "object": [...],
    "oldValue": "cherry",
    "type": "remove"
  },
  {
    "name": 0,
    "object": [...],
    "type": "add",
    "value": "strawberry"
  }
]

[
  {
    "type": "splice",
    "object": [...],
    "index": 0,
    "removed": [],
    "addedCount": 1
  },
  {
    "type": "splice",
    "object": [...],
    "index": 1,
    "removed": [],
    "addedCount": 1
  },
  {
    "type": "splice",
    "object": [...],
    "index": 0,
    "removed": [],
    "addedCount": 2
  },
  {
    "type": "delete",
    "object": [...],
    "name": "0",
    "oldValue": "banana"
  },
  {
    "type": "splice",
    "object": [...],
    "index": 0,
    "removed": [
      null,
      "cherry"
    ],
    "addedCount": 1
  }
]
```

Important notice
-------------------------

Events are sent asynchronously by the Object/Array.observe methods unless you call the `deliverChangeRecords` method.  
This means that events will be sent *after* all commands in the current microtask have been run.

This means that when you do:

```javascript
var basket = { fruit: 'apple' };,
	observer = observe(basket);

observer.on('update', 'fruit', function(event){
	console.log('The fruit property was updated, its value changed to ' + event.value + '.');
	console.log('But its real current value is ' + basket[event.name] + '.');
});

basket.fruit = 'pear';
basket.fruit = 'grape';
basket.fruit = 'strawberry';
```

...the following will be logged:

```javascript
The fruit property was updated, its value changed to pear.
But its real current value is strawberry.
The fruit property was updated, its value changed to grape.
But its real current value is strawberry.
The fruit property was updated, its value changed to strawberry.
But its real current value is strawberry.
```

That also explains why `event.object` reflects the state of the object as it is after all changes have been made.

For more information, read the article linked at the top of this page.