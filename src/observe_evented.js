/*! Observe_evented 0.1.0 */

/* 
 * Object.observe and Array.observe made easy.
 * Developped by Louis AMELINE under the MIT license http://opensource.org/licenses/MIT
 * Released on 2015-03-11
 * 
 * https://github.com/louisameline/observe_evented
 */
(function($){
	
	var defaultOptions = {
			dropValues: false,
			eventTypes: null,
			minimalEvents: false
		},
		_observe,
		observers = [],
		_unobserve;
	
	if($.observe){
		_observe = $.observe;
	}
	if($.unobserve){
		_unobserve = $.unobserve;
	}
	
	// return the list of observers active on the given object
	// (and creating this array if it does not exist yet)
	var _observersList = function(object){
		
		var index;
		$.each(observers, function(i, record){
			if(object === record.object){
				index = i;
				return false;
			}
		});
		
		if(index === undefined){
			
			index = observers.length;
			
			observers.push({
				object: object,
				observers: []
			});
		}
		
		return observers[index].observers;
	};
	
	$.observe = function(object, name, options, callback){
		
		// MANAGE PARAMETERS
		
		// object
		if(name === undefined){
			name = null;
		}
		// object, options
		else if(typeof name === 'object'){
			callback = options || function(){};
			options = name;
			name = null;
		}
		// object, callback
		else if(typeof name === 'function'){
			callback = name;
			options = {};
			name = null;
		}
		
		// options is falsy
		if(!options){
			options = {};
		}
		// object, name, callback
		else if(typeof options === 'function'){
			callback = options;
			options = {};
		}
		
		// callback is falsy
		if(!callback){
			callback = function(){};
		}
		
		// setup options
		options = $.extend(true, {}, defaultOptions, options);
		
		// SETUP THE OBSERVER AND THE EVENT EMITTER
		
		var observer = function(changes){
			
			$.each(changes, function(i, change){
				
				// if the change affected only one property
				if(change.type !== 'splice'){
					
					// change is immutable, let's copy it
					var event = $.extend(true, {}, change);
					
					if(isArray){
						// O.o returns the index as a string !?
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
					
					$.each(change.removed, function(j, value){
						
						// we don't set 'change.index + j' because the indices
						// actually decrement after every removal
						var idx = change.index,
							event = {
								name: idx,
								object: object,
								// value is seen as undefined if it was null, so
								// we cast it again
								oldValue: value || null,
								type: 'remove'
							};
						
						events.push(event);
					});
					
					for(var j = 0; j < change.addedCount; j++){
						
						var idx = change.index + j,
							event = {
								name: idx,
								object: object,
								type: 'add'
							};
						
						events.push(event);
					};
				}
			});
			
			// Set an accurate value property to all add and update events.
			// Since O.o is "lazy" and does not include the new value in the
			// changes objects, we have to iterate on all next changes to be
			// sure that the value is actually the one we have in the object
			// in its current state.
			if(!options.dropValues){
				
				for(var i = 0; i < events.length; i++){
					
					var event = events[i];
					
					if(		(event.type === 'add' || event.type === 'update')
						&&	event.value === undefined
					){
						
						// in the case of an array, the property name is the index
						if(isArray){
							
							var movingIndex = event.name;
							
							// let's iterate on the following events
							for(var j = i+1; j < events.length; j++){
								
								var e = events[j];
								
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
							
							for(var j = i+1; j < events.length; j++){
								
								var e = events[j];
								
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
			}
			
			// note : to do this, we compute the list of events, we do not keep
			// an older version of the array in memory for comparison
			if(options.minimalEvents){
				
				// let's regroup the changes by targeted value. This will
				// eventually be an array.
				var eventsByTarget;
				
				if(!isArray){
					
					eventsByTarget = {};
					
					$.each(events, function(i, event){
						
						if(!eventsByTarget[event.name]){
							eventsByTarget[event.name] = [];
						}
						
						eventsByTarget[event.name].push(i);
					});
					
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
							
							$.each(eventsByTarget, function(j, targetInfo){
								
								if(event.name === targetInfo[0][targetInfo[0].length - 1]){
									ebt_index = j;
									return false;
								}
							});
						}
						
						// if not tracked, track it
						if(ebt_index === null){
							ebt_index = eventsByTarget.length;
							eventsByTarget.push([[], []]);
						}
						
						// additions and removals force us to register index changes
						if(event.type === 'add' || event.type === 'remove'){
							
							$.each(eventsByTarget, function(j, targetInfo){
								
								if(targetInfo[0].length){
								
									var lastIndex = targetInfo[0][targetInfo[0].length - 1];
									
									if(event.name < lastIndex){
										
										if(event.type === 'add'){
											targetInfo[0].push(lastIndex + 1);
										}
										else {
											targetInfo[0].push(lastIndex - 1);
										}
									}
									else if(event.name === lastIndex){
									
										if(event.type === 'add'){
											targetInfo[0].push(lastIndex + 1);
										}
									}
								}
							});
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
				$.each(eventsByTarget, function(i, target){
					
					var name = target[0],
						eventIndices = target[1];
					
					var lastEvent = events[eventIndices[eventIndices.length - 1]];
					
					// if we know that the value was eventually removed
					if(lastEvent.type === 'remove'){
					
						// if there is only one remove event, nothing to do
						if(eventIndices.length > 1){
							
							// if the removed value had actually been added to begin
							// with, any events about it can be ignored
							if(events[eventIndices[0]].type === 'add'){
								
								$.each(eventIndices, function(j, index){
									removableEventIndices.push(index);
								});
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
					// the value already existed or not before all events
					else {
						
						// the first event tells us that, so we keep it solely
						for(var j = 1; j < eventIndices.length; j++){
							removableEventIndices.push(eventIndices[j]);
						}
						
						// for arrays, let's update its name so it reflects the
						// current index of the value
						if(isArray){
							events[eventIndices[0]].name = name;
						}
					}
				});
				
				// delete events
				events = $.grep(events, function(val, index){
					return $.inArray(index, removableEventIndices) === -1;
				});
				
				// for the remaining events, add the value property for consistency
				if(!options.dropValues){
					$.each(events, function(i, event){
						if(event.type === 'add' || event.type === 'update'){
							event.value = object[event.name];
						}
					});
				}
			}
			
			// we'll emit two more events additionaly to the original ones and
			// this prevents a circular reference
			var finalEventsStack = $.merge([], events);
			
			// user batch processing : emit an event with the raw
			// changes object provided by O.o
			finalEventsStack.unshift({
				type: 'rawBatch',
				value: changes
			});
			
			// user batch processing : also emit the whole array of atomic
			// events we have computed
			finalEventsStack.unshift({
				type: 'batch',
				value: events
			});
			
			$.each(finalEventsStack, function(i, event){
				
				if(		!options.eventTypes
					||	$.inArray(event.type, options.eventTypes) !== -1
				){
					if(name === null || name === event.name){
						
						callback.call(object, event);
					
						observer.$eventEmitter.trigger(event);
					}
				}
			});
		};
		
		// will allow users to bind listeners for our events
		observer.$eventEmitter = $({
			// providing these properties might be useful for debugging
			object: object,
			name: name
		});
		
		// will allow users to easily unobserve
		observer.$eventEmitter.unobserve = function(){
			$.unobserve(object, observer);
		};
		
		// store the observer, it might be needed by $.unobserve()
		_observersList(object).push(observer);
		
		
		// START OBSERVING
		
		var events = [],
			// not cool but the O.o currently forces this line when we don't want
			// to bother to call it with .apply()
			eventTypes = undefined,
			isArray = $.isArray(object),
			primitive = isArray ? Array : Object;
		
		// an array of types as third parameter only applies to objects (as far
		// as the call to O.o is concerned)
		if(!isArray && options.eventTypes){
			
			// if event.value is to be set
			if(!options.dropValues){
				
				// let's not alter the original array
				eventTypes = $.merge([], options.eventTypes);
				
				// we still need all add, update and delete events to compute
				// event.value. These events will just not trigger them on the
				// emitter.
				$.each(['add', 'update', 'delete'], function(i, type){
					if($.inArray(type, eventTypes) === -1){
						eventTypes.push(type);
					}
				});
			}
			else {
				eventTypes = options.eventTypes;
				
				// convert the remove type to its real name
				if($.inArray('remove', eventTypes) !== -1){
					eventTypes.push('delete');
				}
			}
		}
		
		primitive.observe(
			object,
			observer,
			eventTypes,
			// the 4th parameter, if defined, will be ignored by the native observe
			// function but, when the browser does not support O.O out of the box,
			// should hopefull be used for dirty-checking optimisation by the shim.
			name
		);
		
		return observer.$eventEmitter;
	};
	
	// allows to change the set of default options
	$.observe.defaultOptions = function(options){
		defaultOptions = $.extend(true, defaultOptions, options);
	};
	
	// allows to change the set of default options
	$.observe.noConflict = function(prefix){
		
		prefix = prefix || 'oe_';
		
		$[prefix + 'observe'] = $.observe;
		$[prefix + 'unobserve'] = $.unobserve;
		
		if(_observe){
			$.observe = _observe;
		}
		if(_unobserve){
			$.observe = _observe;
		}
	};
	
	// observer is for internal use
	$.unobserve = function(object, observer){
		
		var observersList = _observersList(object),
			primitive = $.isArray(object) ? Array : Object,
			unobserveList;
		
		if(observer){
			// unbind the provided observer
			unobserveList = [observer];
		}
		else {
			// unbind all observers for the object
			unobserveList = observersList;
		}
		
		$.each(unobserveList, function(i, obs){
			
			// a timeout because there may queued events waiting
			// for the end of the microtask to be emitted. We'll
			// wait until this microtask is done to unbind the
			// listeners
			setTimeout(function(){
				// unbind any user listeners for garbage collection
				obs.$eventEmitter.off();
			}, 0);
			
			// unbind
			primitive.unobserve(object, obs);
			
			// unreference from our listing
			observersList.splice($.inArray(obs, observersList), 1);
		});
	};
})(jQuery);