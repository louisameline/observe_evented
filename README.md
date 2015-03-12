Observe_evented
===========

A Javascript class that makes Array.observe and Object.observe very easy to use.

Observe_evented's specialty is to split the batch of changes returned by the native API into atomic and consistant easy-to-handle events. Test it on <a href="http://jsfiddle.net/d9w3uaav/">this jsFiddle page</a>.

This library requires :
- jQuery 1.7+
- an Object.observe compatible browser (only Chrome as of now, 2015-03) OR a shim that will emulate it on other browsers.

Object.observe is a proposed feature in the draft of ECMAScript 7.
As the standard itself may still evolve, this library may change accordingly.
You can read more about it [here](http://www.html5rocks.com/en/tutorials/es7/observe/).  

NOTE: examples on this page may not produce the same results if a shim is used instead of a natively compatible browser.

General usage
-------------------------

OBSERVE :

```javascript
// callback is called at each change with a single event as first argument

$.observe(object [, name] [, options] [, callback]);
```

or

```javascript
var $observer = $.observe(object [, name] [, options]);

$observer.on(eventType, function(event){
	console.log(event);
});
```

UNOBSERVE:

```javascript
$observer.unobserve();
```

or, for all observers on the object :

```javascript
$.unobserve(object);
```

EVENTS have these properties:

```javascript
{
	name: PropertyNameOrIndexOfChangedValue,
	object: observedObject,
	type: TypeOfEvent,
	// not present on update events
	oldValue: valueBeforeEvent
	// not present on remove events
	value: valueAfterEvent
}
```

Observe a whole object
-------------------------

Let's configure our observer like this:

```javascript
var basket = {};

$.observe(basket, function(event){
	
	switch(event.type){
		
		case 'add':
			console.log(
				'A property named "' + event.name +
				'" with the value "' + event.value +
				'" was added to the object'
			);
			break;
		
		case 'update':
			console.log(
				'The property named "' + event.name +
				'" was updated from "' + event.oldValue +
				'" to "' + event.value + '"'
			);
			break;
		
		case 'remove':
			console.log(
				'The property named "' + event.name +
				'" with the value "' + event.oldValue +
				'" was removed from the object'
			);
			break;
		
		default:
			// let's not worry about the other event types yet
			break;
	}
});

// triggers an add event
basket.fruit = 'apple';
// triggers an update event
basket.fruit = 'strawberry';
// triggers a remove event
delete basket.fruit;
```

Note that this is exactly equivalent to :

```javascript
var basket = {};

$.observe(basket)
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

For clarity, we'll use this notation in the rest of examples.

Side note : if you know your jQuery, you know you can also write:

```javascript
$.observe(basket).on('add update', function(event){
	console.log('A property was added or updated');
});
```

Observe a specific property of an object
-------------------------

Quite often you'll be interested in the changes of a specific property of an array.
That's when you should use the second parameter of $.observe:

```javascript
var basket = {};

var $observer = $.observe(basket, 'fruit');

$observer
	.on('add', function(event){
		console.log('The fruit property was added to the object');
	})
	.on('update', function(event){
		console.log('The fruit property had a change of value');
	});

// triggers an add event
basket.fruit = 'apple';
// triggers an update event
basket.fruit = 'strawberry';
// triggers nothing
basket.vegetable = 'carrot';
```

Observe an array
-------------------------

Pretty much the same as observing an object.

```javascript
var basket = [];

$.observe(basket)
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

A special note about the `delete basket[0];` command : as this effectively sets the value of `basket[0]` to `null` and does not actually remove the cell at index 0, it is an `update` event that will be triggered with `event.value = null`. Use the `splice` method to actually remove values from an array and consider stop using `delete` with arrays.

Please note that the second argument to $.observe, `name`, while *technically* working on arrays too, will probably not produce the result you would expect and will be useless to most people.

Observe multiple objects or arrays with a single function
-------------------------

Just use a single handler with multiple observers:

```javascript
var basket1 = [],
	basket2 = {},
	myFunction = function(event){
		if(event.type === 'add'){
			var nb = $.isArray(event.object) ? 1 : 2;
			console.log('A ' + event.value + ' was added to basket number ' + nb + ' ! ');
		}
	};

var $observer1 = $.observe(basket1),
	$observer2 = $.observe(basket2);

$observer1.on('add', myFunction);
$observer2.on('add', myFunction);

basket1.push('peach');
basket2.fruit = 'watermellon';
```

Or written with the callback argument syntax:

```javascript
$.observe(basket1, myFunction);
$.observe(basket2, myFunction);
```

Unobserve : stop a specific observer
-------------------------

```javascript
var basket = [];

var $observer = $.observe(basket);

$observer.on('add', function(event){
	console.log(
		'At index ' + event.name +
		', the following value was inserted: ' + event.value
	);
});

// triggers an add event
basket.push('apple');

// unobserve
$observer.unobserve();

// triggers nothing
basket.push('banana');
```

Unobserve : stop all observers on an object or array
-------------------------

```javascript
var basket = [];

// create two observers on the same array (just for the example)

$.observe(basket).on('add', function(event){
	console.log('A: a value was added to basket');
});

$.observe(basket).on('add', function(event){
	console.log('B: a value was added to basket');
});

// triggers two add events, one in each observer
basket.push('apple');

// stop all observers on the object
$.unobserve(basket);

// triggers nothing
basket.push('banana');
```

Event types
-------------------------

By default, the events sent by Observe_evented can be of the following types :  
`add`, `update`, `remove`, `batch`, `rawBatch`, `reconfigure`, `setPrototype`  
Notifiers also let you create more event types (read the article linked at the top of this page).

Options : optimize the results
-------------------------

An object of options can optionaly be provided as the third argument in the call to `$.observe`.

Before explaining the options, note that Observe_evented :  
- returns by default all events that happened on the object/array you observe,
- adds meaningful `event.value` properties that help you understand what happened all the way.

While this can be interesting in some cases and while debugging, you might want to work differently. The following options are here for that :

`options.dropValues` Since setting the `event.value` properties has a (generally) minor performance cost, you can choose not to generate them if you don't need them. Default: `false`.

`options.minimalEvents` Set this option to `true` to get only the minimum number of events nessary to transition from the object/array as it was before modifications to its current state. Example :

```javascript
var basket = { fruit: 'apple' };

var $observer = $.observe(basket, { minimalEvents: true });

$observer
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
// A property "vegetable" was created, its value is "pea"
```

As you can see, Observe_evented sends events as if the array went directly from its original state to its final one, that is to say :  
from `{ fruit: 'apple' }` to `{ fruit: 'cherry', vegetable: 'pea' }`

No events were sent for the intermediary states of `basket.fruit` and `basket.vegetable`. Since `basket.meat` does exist before the modifications nor after, no events are sent about that either.

Other options
-------------------------

`options.eventTypes` An array of enabled event types. Any event whose type is not included in this array will not be triggered. If you want to get events from another type than the standard ones (namely because you used notifiers), you will have to set up this option. Default: `null`.

The `$.observe.defaultOptions` method lets you modify the default options for all future calls, like for example:

```javascript
$.observe.defaultOptions({
	dropValues: true,
	eventTypes: ['add']
});

// all observers will now only emit 'add' events without `event.value` being set.
```

Advanced : Manage the events in batches
-------------------------

As you know, events are sent asynchronously and in batches by the browser to Observe_evented. If you didn't know, read the notice section below as it's something you must understand to avoid surprises.

So, sometimes you might find useful to get all events at once in your callback function, instead of having it called with only one event at a time. No problem.

There are two options available : get the batch of atomic events computed by Observe_evented, or the batch of raw events sent by the native Object/Array.observe function.

You can get these respectively by listening to `batch` and `rawBatch` events.

```javascript
var basket = [];

var $observer = $.observe(basket);

$observer
	.on('batch', function(event){
		console.log(event.value);
	})
	.on('rawBatch', function(event){
		console.log(event.value);
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
// Note: "object" has been collapsed, its value is ["strawberry", "apple", "pear"] all along.

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

No conflict
-------------------------

Chances are that other libraries or even jQuery are using/will use the `$.observe` and `$.unobserve` namespaces.

You can relocate the methods to `$.oe_observe` and `$.oe_unobserve` by calling `$.observe.noConflict()`.
You may choose another prefix by calling `$.observe.noConflict('myPrefix')`.

Any previous references of `$.observe` and `$.unobserve` will be restored.

Important notice
-------------------------

Events are sent asynchronously by the Object/Array.observe methods and this cannot be changed. 
The events will be sent *after* all commands in the current microtask have been run.

This means that when you do:

```javascript
var basket = { fruit: 'apple' };

$.observe(basket, 'fruit').on('update', function(event){
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

TODO
-------------------------

Have the library reviewed by the folks behind the O.o draft.

Write tests. Help is welcome !

See if there is a good shim out there that could be recommended to use alongside with Observe_evented.