/*! Observe_evented 0.2.3 */

/* 
 * Object.observe and Array.observe made easy.
 * Developped by Louis AMELINE under the MIT license http://opensource.org/licenses/MIT
 * Released on 2015-03-17
 * 
 * https://github.com/louisameline/observe_evented
 */
(function(root){
	
	var defaultOptions = {
			additionalEventTypes: [],
			multipleObservers: false,
			output: {
				batchOnly: false,
				dropValues: false,
				minimalEvents: false,
				noUpdateEvents: false
			},
			shim: null
		},
		objectsDataStore = [],
		standardObjectEventTypes = ['add', 'update', 'delete', 'reconfigure', 'setPrototype'],
		// process changes with the provided algorithms
		computeAlgoPath = function(changes, algoPath){
			
			var events = changes;
			
			for(var i = 0; i < algoPath.length; i++){
				events = algos[algoPath[i]](events);
			}
			
			return events;
		},
		// various algorithms for event processing
		algos = {
			// turn the raw batch of events into atomic events
			computeEvents: function(changes){
				
				var events = [],
					object = changes[0].object;
				
				for(var i = 0; i < changes.length; i++){
					
					var change = changes[i];
					
					// if the change affected only one property
					if(change.type !== 'splice'){
						
						// change is immutable, let's copy it
						var event = $.extend({}, change),
							isArray = (object.constructor === Array);
						
						if(isArray){
							// O.o returns the index as a string !
							event.name = parseInt(event.name);
						}
						
						if(event.type === 'delete'){
							
							if(isArray){
								// delete foo[0] actually updates its content to null
								event.type = 'update';
								event.value = null;
							}
							else {
								// delete on an object really removes the property.
								// we'll rename the event to less misleading "remove"
								event.type = 'remove';
							}
						}
						
						events.push(event);
					}
					// the change is a splice : the object is an array and several
					// changes may have been made with a single function call (push,
					// splice...). Let's make sure we generate one event for each
					// change to preserve atomicity.
					else {
						
						for(var j = 0; j < change.removed.length; j++){
							
							// we don't set 'change.index + j' because the indices
							// actually decrement after every removal
							var idx = change.index,
								event = {
									name: idx,
									object: object,
									// value is seen as undefined if it was null, so
									// we cast it again
									oldValue: change.removed[j] || null,
									type: 'remove'
								};
							
							events.push(event);
						}
						
						for(var j = 0; j < change.addedCount; j++){
							
							var idx = change.index + j,
								event = {
									name: idx,
									object: object,
									type: 'add'
								};
							
							events.push(event);
						}
					}
				}
				
				return events;
			},
			// Set an accurate value property to all add and update events.
			// Since O.o is "lazy" and does not include the new value in the
			// changes objects, we have to iterate on all next changes to be
			// sure that the value is actually the one we have in the object
			// in its current state.
			findValues: function(events){
				
				var tamperedEvents = $.merge([], events),
					object = events[0].object;
				
				for(var i = 0; i < tamperedEvents.length; i++){
					
					var event = tamperedEvents[i];
					
					if(		(event.type === 'add' || event.type === 'update')
						&&	event.value === undefined
					){
						
						// in the case of an array, the property name is the index
						if(event.object.constructor === Array){
							
							var movingIndex = event.name;
							
							// let's iterate on the following events
							for(var j = i+1; j < tamperedEvents.length; j++){
								
								var e = tamperedEvents[j];
								
								// the addition/removal of a value in the array before
								// our value of interest modifies its index
								if(movingIndex > e.name){
									
									if(e.type === 'add'){
										movingIndex++;
									}
									else if(e.type === 'remove'){
										movingIndex--;
									}
								}
								else if(movingIndex === e.name){
									
									if(e.type === 'add'){
										// the addition of a value at our index pushes it
										// one step further in the array
										movingIndex++;
									}
									else if(e.type === 'update' || e.type === 'remove'){
										
										event.value = e.oldValue;
										
										// we have the info we wanted
										break;
									}
								}
							}
							
							// if no later change happened during the microtask, get the
							// value from the current state object
							if(event.value === undefined){
								event.value = object[movingIndex];
							}
						}
						else {
							
							for(var j = i+1; j < tamperedEvents.length; j++){
								
								var e = tamperedEvents[j];
								
								// here we are only concerned about the modifications
								// on our property
								if(event.name === e.name){
									
									if(e.type === 'update' || e.type === 'remove'){
										event.value = e.oldValue;
										
										// we have the info we wanted
										break;
									}
								}
							}
							
							if(event.value === undefined){
								event.value = object[event.name];
							}
						}
					}
				}
				
				return tamperedEvents;
			},
			minimalEvents: function(events){
				
				// let's regroup the changes by targeted value. This will
				// eventually be an array.
				var eventsByTarget,
					isArray = (events[0].object.constructor === Array);
				
				if(!isArray){
					
					eventsByTarget = {};
					
					for(var i = 0; i < events.length; i++){
						
						if(!eventsByTarget[events[i].name]){
							eventsByTarget[events[i].name] = [];
						}
						
						eventsByTarget[events[i].name].push(i);
					}
					
					// let's just keep the event indices in the same format as
					// arrays : [name, eventIndices] (see below)
					eventsByTarget = $.map(eventsByTarget, function(v, k){
						return [[k, v]];
					});
				}
				else {
					// in the case of arrays, we cannot regroup changes by index
					// out of the box since indices can fluctuate. Let's create
					// a small algorithm that will track which is which.
					
					// this will store the consecutive indices of a value that
					// had an event and the event type. At the end of the loop,
					// the last index will be the current one (-1 for removed
					// values). It's in the form:
					// [[indicesArray, eventIndices], ...]
					eventsByTarget = [];
					
					for(var i = 0; i < events.length; i++){
						
						var event = events[i],
							// the index of the value of eventsByTarget that
							// contains the information about the target of
							// this event
							ebt_index = null;
						
						// check if this value is already tracked.
						// A new value cannot be yet.
						if(event.type !== 'add'){
							
							for(var j = 0; j < eventsByTarget.length; j++){
								
								if(event.name === eventsByTarget[j][0][eventsByTarget[j][0].length - 1]){
									ebt_index = j;
									break;
								}
							}
						}
						
						// if not tracked, track it
						if(ebt_index === null){
							ebt_index = eventsByTarget.length;
							eventsByTarget.push([[], []]);
						}
						
						// additions and removals force us to register index changes
						if(event.type === 'add' || event.type === 'remove'){
							
							for(var j = 0; j < eventsByTarget.length; j++){
								
								if(eventsByTarget[j][0].length){
								
									var lastIndex = eventsByTarget[j][0][eventsByTarget[j][0].length - 1];
									
									if(event.name < lastIndex){
										
										if(event.type === 'add'){
											eventsByTarget[j][0].push(lastIndex + 1);
										}
										else {
											eventsByTarget[j][0].push(lastIndex - 1);
										}
									}
									else if(event.name === lastIndex){
									
										if(event.type === 'add'){
											eventsByTarget[j][0].push(lastIndex + 1);
										}
									}
								}
							}
						}
						
						// we are now able to save the new index for our value
						if(		event.type === 'add'
							// if the value was untracked
							||	eventsByTarget[ebt_index][0].length === 0
						){
							eventsByTarget[ebt_index][0].push(event.name);
						}
						else if(event.type === 'remove'){
							// this prevents the value from being picked up in
							// next iterations and be mistaken for a current value
							eventsByTarget[ebt_index][0].push(-1);
						}
						
						// and store the event
						eventsByTarget[ebt_index][1].push(i);
					}
					
					// keep only the last index for each event index list
					eventsByTarget = $.map(eventsByTarget, function(val){
						val[0] = val[0].pop();
						return [val];
					});
				}
				
				// ready to compute
				var removableEventIndices = [];
				for(var i = 0; i < eventsByTarget.length; i++){
					
					var name = eventsByTarget[i][0],
						eventIndices = eventsByTarget[i][1],
						lastEvent = events[eventIndices[eventIndices.length - 1]];
					
					// if we know that the value was eventually removed
					if(lastEvent.type === 'remove'){
						
						// if there is only one remove event, nothing to do
						if(eventIndices.length > 1){
							
							// if the removed value had actually been added to begin
							// with, any events about it can be ignored
							if(events[eventIndices[0]].type === 'add'){
								
								for(var j = 0; j < eventIndices.length; j++){
									removableEventIndices.push(eventIndices[j]);
								}
							}
							else {
								
								// otherwise let's just remember that it was removed
								for(var j = 0; j < eventIndices.length - 1; j++){
									removableEventIndices.push(eventIndices[j]);
								}
							}
						}
					}
					// otherwise, the only thing we are interested in is whether
					// the value already existed or not before all events. The
					// first event will tell us that.
					else {
						
						// for arrays, let's update its name so it reflects the
						// current index of the value
						if(isArray){
							events[eventIndices[0]].name = name;
						}
						else {
							// In the case of objects, the first event might be a
							// removal, which means that the overall operation was
							// an update.
							if(events[eventIndices[0]].type === 'remove'){
								events[eventIndices[0]].type = 'update';
							}
						}
						
						// also update the final value if values were computed
						if(lastEvent.value){
							events[eventIndices[0]].value = lastEvent.value;
						}
						
						// the other events are of no interest
						for(var j = 1; j < eventIndices.length; j++){
							removableEventIndices.push(eventIndices[j]);
						}
					}
				}
				
				// return an array without the removable events
				var tamperedEvents = $.grep(events, function(val, index){
					return $.inArray(index, removableEventIndices) === -1;
				});
				
				if(isArray){
					tamperedEvents.sort(function(a,b){
						return a.name > b.name;
					});
				}
				
				return tamperedEvents;
			},
			// turn update events into remove+add events
			noUpdateEvents: function(events){
				
				var tamperedEvents = [],
					object = events[0].object;
				
				for(var i = 0; i < events.length; i++){
					
					var event = events[i];
					
					if(event.type === 'update'){
						
						tamperedEvents.push(
							{
								object: object,
								name: event.name,
								oldValue: event.oldValue,
								type: 'remove'
							},
							{
								object: object,
								name: event.name,
								type: 'add'
							}
						);
						
						// if the value was computed by findValue, keep it
						if(event.value !== undefined){
							tamperedEvents[tamperedEvents.length - 1].value = event.value;
						}
					}
					else {
						tamperedEvents.push(event);
					}
				}
				
				return tamperedEvents;
			}
		},
		// allows to change the set of default options
		setDefaultOptions = function(options){
			defaultOptions = $.extend(defaultOptions, options);
		},
		emitter = function(objectData){
			this.objectData = objectData;
		},
		// return the data of observers active on the given object
		// (and creating this array if it does not exist yet)
		objectsDataFn = function(object){
			
			var a = [];
			for(var i = 0; i < objectsDataStore.length; i++){
				if(object === objectsDataStore[i].object){
					a.push(objectsDataStore[i]);
				}
			}
			
			return a;
		},
		/**
		 * @param {object|array} object
		 * @param {object} optional options
		 * @param {function} optional callback
		 * @return {object} An object that has `on`, `off` and `unobserve`
		 * properties
		 */
		observe = function(object, options, callback){
			
			// observe(object)
			if(!options){
				options = {};
			}
			// observe(object, callback)
			else if(typeof options === 'function'){
				callback = options;
				options = {};
			}
			
			// get any existing data about the current object
			var objectsData = objectsDataFn(object),
				objectData,
				oldAdEvTp;
			
			// if there is none or if we want to create a new observer
			if(objectsData.length === 0 || options.multipleObservers){
				
				objectData = {
					callbacks: [],
					emitter: null,
					isArray: object.constructor === Array,
					object: object,
					observer: null,
					options: {}
				};
				
				objectData.emitter = new emitter(objectData);
				
				objectsDataStore.push(objectData);
			}
			else {
				// we'll use the first we find
				objectData = objectsData[0];
				
				// save this before we overwrite it
				oldAdEvTp = objectData.options.additionalEventTypes;
			}
			
			// (re)set observer options
			objectData.options = $.extend({}, defaultOptions);
			$.extend(objectData.options, options);
			
			// register the callback if there is one
			if(callback){
				objectData.emitter.on(null, callback);
			}
			
			// in case the observer existed : unobserve if the event
			// types in the options differ
			if(objectData.observer){
				
				var differs = false,
					adEvTp = objectData.options.additionalEventTypes;
				
				if(adEvTp.length !== oldAdEvTp.length){
					differs = true;
				}
				else {
					
					diff = [];
					
					if($.grep(adEvTp, function(eventType){
						if($.inArray(eventType, oldAdEvTp) == -1){
							diff.push(eventType);
						}
					})); 
					
					if(diff.length > 0){
						differs = true;
					}
				}
				if(differs){
					objectData.emitter.disable();
				}
			}
			
			// determine the primitive or shim we'll use
			var	primitive = objectData.isArray ? Array : Object;
			
			if(!primitive.observe){
				
				var primitiveName = objectData.isArray ? 'Array' : 'Object';
				
				if(objectData.options.shim && objectData.options.shim[primitiveName].observe){
					primitive = objectData.options.shim[primitiveName];
				}
				else {
					throw new TypeError('This environment does not support ' + primitiveName + '.observe');
				}
			}
			objectData.primitive = primitive;
			
			// start observing if needed
			if(!objectData.observer){
				objectData.emitter.enable();
			}
			
			return objectData.emitter;
		},
		observer = function(objectData, changes, computed){
			
			var callbacks = objectData.callbacks,
				// determine the algoPath
				algoPath = [];
			
			// if the changes were already computed into events (happens when
			// emitter.trigger() is used), skip the first algo
			if(!computed){
				algoPath.push('computeEvents');
			}
			if(!objectData.options.output.dropValues){
				algoPath.push('findValues');
			}
			if(objectData.options.output.minimalEvents){
				algoPath.push('minimalEvents');
			}
			if(objectData.options.output.noUpdateEvents){
				algoPath.push('noUpdateEvents');
			}
			
			// get the event list in the desired format
			var events = computeAlgoPath(changes, algoPath),
				// we'll emit an additional event to the computed ones for batch
				// processing. Using a new array prevents a circular reference
				eventsFinal = [
					{
						object: objectData.object,
						type: 'batch',
						value: {
							raw: changes,
							computed: events
						}
					}
				];
			
			if(!objectData.options.output.batchOnly){
				$.merge(eventsFinal, events);
			}
			
			for(var j = 0; j < eventsFinal.length; j++){
				
				for(var k = 0; k < callbacks.length; k++){
					
					// filter on property name
					if(		callbacks[k].nameFilter === null
						||	$.inArray(eventsFinal[j].name, callbacks[k].nameFilter) !== -1
					){
						
						// filter on event type
						if(		callbacks[k].eventTypes === null
							||	$.inArray(eventsFinal[j].type, callbacks[k].eventTypes) !== -1
						){
							callbacks[k].callback.call(objectData.object, eventsFinal[j]);
						}
					}
				}
			}
		};
	
	emitter.prototype.on = function(eventType, nameFilter, callback){
		
		// eventType
		if(nameFilter === undefined){
			nameFilter = null;
		}
		// eventType, callback
		else if(typeof nameFilter === 'function'){
			callback = nameFilter;
			nameFilter = null;
		}
		
		// store as an array
		if(nameFilter && typeof nameFilter === 'string'){
			nameFilter = [nameFilter];
		}
		
		if(callback){
			
			// allow space-separated event types. Store as an array in all cases.
			if(eventType){
				eventType = eventType.split(' ');
			}
			
			var index = -1;
			
			for(var i = 0; i < this.objectData.callbacks.length; i++){
				if(callback === this.objectData.callbacks[i].callback){
					index = i;
					break;
				}
			}
			
			// if the callback is already bound
			if(index !== -1){
				
				if(eventType === null){
					this.objectData.callbacks[i].eventTypes = null;
				}
				else {
					
					// make sure it's listening on all provided event types
					for(var j = 0; j < eventType.length; j++){
						
						if($.inArray(eventType[j], this.objectData.callbacks[i].eventTypes) === -1){
							this.objectData.callbacks[i].eventTypes.push(eventType[j]);
						}
					}
				}
			}
			else {
				this.objectData.callbacks.push({
					callback: callback,
					eventTypes: eventType,
					nameFilter: nameFilter
				});
			}
		}
		else {
			throw new TypeError('Missing callback parameter');
		}
		
		return this;
	};
	emitter.prototype.off = function(eventType, callback){
		
		// callback
		if(eventType && typeof eventType === 'function'){
			callback = eventType;
			eventType = null;
		}
		
		if(eventType){
			eventType = eventType.split(' ');
		}
		
		var callbacks = this.objectData.callbacks,
			removableCallbackIndices = [];
		
		for(var i = 0; i < callbacks.length; i++){
			
			if(!callback || callback === callbacks[i].callback){
				
				if(eventType){
					
					callbacks[i].eventTypes = $.grep(callbacks[i].eventTypes, function(val, index){
						return $.inArray(val, eventType) === -1;
					});
				}
				
				// when there are no more events listened, remove
				if(		!eventType 
					||	(	callbacks[i].eventTypes
						&&	callbacks[i].eventTypes.length === 0
					)
				){
					removableCallbackIndices.push(i);
				}
			}
		}
		
		this.objectData.callbacks = $.grep(callbacks, function(val, index){
			return $.inArray(index, removableCallbackIndices) === -1;
		});
		
		return this;
	};
	// the signature of this may also be .trigger(events)
	emitter.prototype.trigger = function(eventType, name){
		
		var events = [];
		if(typeof eventType === 'string'){
			
			if(name === undefined){
				
				name = [];
				if(this.objectData.isArray){
					
					for(var i = 0; i < this.objectData.object.length; i++){
						name.push(i);
					}
				}
				else {
					for(key in this.objectData.object){
						name.push(key);
					}
				}
			}
			else if(typeof name !== 'object'){
				name = [name];
			}
			
			for(var i = 0; i < name.length; i++){
				
				events.push({
					name: name[i],
					object: this.objectData.object,
					type: eventType,
					// placeholder for update events
					oldValue: null
				});
			}
		}
		else {
			events = eventType;
		}
		
		observer(this.objectData, events, true);
		
		return this;
	};
	emitter.prototype.enable = function(){
		
		var that = this;
		
		if(!this.objectData.observer){
			
			// null does not work as a third argument
			var	eventTypes = undefined,
				addEvTp = this.objectData.options.additionalEventTypes;
			
			if(!this.objectData.isArray && addEvTp){
				
				eventTypes = $.merge([], standardObjectEventTypes);
				
				for(var i = 0; i < addEvTp.length; i++){
					if($.inArray(addEvTp[i], eventTypes) === -1){
						eventTypes.push(addEvTp[i]);
					}
				}
			}
			
			// wrap in an anonymous function tpo pass an argument but also
			// to have a unique function per emitter, which is useful when
			// using deliverChangeRecords
			var obsWrapper = function(changes){
				return observer(that.objectData, changes);
			};
			
			this.objectData.primitive.observe(
				this.objectData.object,
				obsWrapper,
				eventTypes
			);
			
			this.objectData.observer = obsWrapper;
		}
	};
	emitter.prototype.disable = function(){
		this.objectData.primitive.deliverChangeRecords(this.objectData.observer);
		this.objectData.primitive.unobserve(this.objectData.object, this.objectData.observer);
		
		this.objectData.observer = null;
	};
	emitter.prototype.destroy = function(asynchronous){
		
		var that = this,
			finish = function(){
				// remove listeners
				that.off();
				// delete the data object corresponding to the observer
				objectsDataStore.splice($.inArray(this.objectData, objectsDataStore), 1);
			};
		
		if(asynchronous){
			setTimeout(finish, 0);
		}
		else {
			// deliver queued changes
			this.deliverChangeRecords();
			finish();
		}
		
		// remove the observer
		this.disable();
	};
	// proxy the deliverChangeRecords and getNotifier methods
	emitter.prototype.deliverChangeRecords = function(){
		this.objectData.primitive.deliverChangeRecords(this.objectData.observer);
	};
	
	/*! jQuery utils */
	var $ = {
		extend:  function extend(target, source) {
			target = target || {};
			for (var prop in source) {
				if (typeof source[prop] === 'object' && source[prop] !== null) {
					target[prop] = extend(target[prop], source[prop]);
				} else {
					target[prop] = source[prop];
				}
			}
			
			return target;
		},
		grep: function (elems, callback, inv) {
			var retVal, ret = [],
				i = 0,
				length = elems.length;
			inv = !!inv;
			
			for (; i < length; i++) {
				retVal = !!callback(elems[i], i);
				if (inv !== retVal) {
					ret.push(elems[i]);
				}
			}

			return ret;
		},
		inArray: function(elt, arr, from){
			var len = arr.length >>> 0;

			var from = Number(arguments[2]) || 0;
			from = (from < 0)
				? Math.ceil(from)
				: Math.floor(from);
			if (from < 0)
				from += len;

			for (; from < len; from++){
				if (from in arr &&
				arr[from] === elt)
				return from;
			}
			return -1;
		},
		map: function (elems, callback, arg) {
			var value, i = 0,
				length = elems.length,
				ret = [];
			
			// Go through the array, translating each of the items to their
			if (elems.constructor === Array) {
				for (; i < length; i++) {
					value = callback(elems[i], i, arg);

					if (value != null) {
						ret[ret.length] = value;
					}
				}
				
				// Go through every key on the object,
			} else {
				for (i in elems) {
					value = callback(elems[i], i, arg);

					if (value != null) {
						ret[ret.length] = value;
					}
				}
			}
			
			// Flatten any nested arrays
			return [].concat.apply([], ret);
		},
		merge: function (first, second) {
			var l = second.length,
				i = first.length,
				j = 0;
			
			if (typeof l === "number") {
				for (; j < l; j++) {
					first[i++] = second[j];
				}
			} else {
				while (second[j] !== undefined) {
					first[i++] = second[j++];
				}
			}
			
			first.length = i;
			
			return first;
		}
	};
	
	var observe_evented = {
		observe: observe,
		defaultOptions: setDefaultOptions
	};
	
	if(typeof exports !== 'undefined'){
		if(typeof modules !== 'undefined' && module.exports){
			exports = module.exports = observe_evented;
		}
		exports.observe_evented = observe_evented;
	} 
	else {
		root.observe_evented = observe_evented;
	}
	
})(this);