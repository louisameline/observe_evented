var tap = require('tap'),
	test = tap.test,
	plan = tap.plan,
	observe_evented = require('../src/observe_evented.js');


// test 1
var results_1 = {
		onNullCount: 0,
		onAddCount: 0,
		onUpdateCount: 0,
		onRemoveCount: 0
	},
	basket_1 = { vegetable: 'carrot' },
	observer_1 = observe_evented.observe(basket_1, function(event){
		if(event.type === 'batch'){
			results_1.batch = event.value;
		}
	});

observer_1
	.on(null, function(event){
		results_1.onNullCount++;
	})
	.on('add', function(event){
		results_1.onAddCount++;
	})
	.on('update', function(event){
		results_1.onUpdateCount++;
	})
	.on('remove', function(event){
		results_1.onRemoveCount++;
	});

basket_1.fruit = 'apple';
basket_1.fruit = 'strawberry';
basket_1.vegetable = 'pea';
basket_1.vegetable = 'bean';
basket_1.meat = 'chicken';
delete basket_1.meat;

test('Observing an object', function(t){
	
	t.plan(8);
	
	setTimeout(function(){
		t.ok(results_1.batch, 'callback as param to observe() works, event batch caught');
		t.equal(results_1.batch.computed[0].value, 'apple', 'event.value generated');
		t.equal(results_1.batch.raw.length, 6, '6 raw events were emitted');
		t.equal(results_1.batch.computed.length, 6, '6 computed events were generated');
		t.equal(results_1.onNullCount, 7, 'all events + batch have been fired on the callback bound with null');
		t.equal(results_1.onAddCount, 2, '2 add events');
		t.equal(results_1.onUpdateCount, 3, '3 update events');
		t.equal(results_1.onRemoveCount, 1, '1 remove event');
	}, 0);
});


// test 2
var results_2 = {
		onAddCount: 0,
		onUpdateCount: 0,
		onRemoveCount: 0,
		onBatchCount: 0
	},
	basket_2 = ['apple'],
	observer_2 = observe_evented.observe(basket_2);

observer_2
	.on('add', function(event){
		results_2.onAddCount++;
	})
	.on('update', function(event){
		results_2.onUpdateCount++;
	})
	.on('remove', function(event){
		results_2.onRemoveCount++;
	})
	.on('batch', function(event){
		results_2.batch = event.value;
	});

basket_2[0] = 'peach';
basket_2.push('pear');
basket_2.unshift('banana', 'cherry');
delete basket_2[0];
basket_2.splice(0, 2, 'strawberry', 'grape');
basket_2.push('watermellon', 'mango');

test('observing an array', function(t){
	
	t.plan(5);
	
	setTimeout(function(){
		t.equal(results_2.batch.raw.length, 6, '6 raw events were emitted');
		t.equal(results_2.batch.computed.length, 11, '11 computed events were generated');
		t.equal(results_2.onAddCount, 7, '7 add events');
		t.equal(results_2.onUpdateCount, 2, '2 update events');
		t.equal(results_2.onRemoveCount, 2, '2 remove events');
	}, 0);
});


// test 3
var results_3 = {
		onAddCount: 0,
		onUpdateCount: 0,
		onRemoveCount: 0,
		onBatchCount: 0
	},
	basket_3 = { fruit: 'apple' },
	observer_3 = observe_evented.observe(basket_3, {
		output: {
			dropValues: true,
			minimalEvents: true
		}
	});

observer_3
	.on('add', function(event){
		results_3.onAddCount++;
	})
	.on('update', function(event){
		results_3.onUpdateCount++;
	})
	.on('remove', function(event){
		results_3.onRemoveCount++;
	})
	.on('batch', function(event){
		results_3.batch = event.value;
	});

basket_3.fruit = 'banana';
basket_3.fruit = 'mango';
basket_3.fruit = 'cherry';
basket_3.vegetable = 'carrot';
basket_3.vegetable = 'pea';
basket_3.meat = 'pork';
basket_3.meat = 'chicken';
delete basket_3.meat;

test('dropValues and minimalEvents options', function(t){
	
	t.plan(6);
	
	setTimeout(function(){
		t.equal(results_3.batch.raw.length, 8, '8 raw events were emitted');
		t.equal(results_3.batch.computed.length, 2, '2 computed events were generated');
		t.ok(!results_3.batch.computed[0].value, 'value has been dropped');
		t.equal(results_3.onAddCount, 1, '1 add event');
		t.equal(results_3.onUpdateCount, 1, '1 update events');
		t.equal(results_3.onRemoveCount, 0, 'no remove events');
	}, 0);
});


// test 4
var results_4 = {
		onAddCount: 0,
		onUpdateCount: 0,
		onRemoveCount: 0,
		onBatchCount: 0
	},
	basket_4 = { fruit: 'apple' },
	observer_4a = observe_evented.observe(basket_4);

var observer_4b = observe_evented.observe(basket_4, {
	output: {
		minimalEvents: true,
		noUpdateEvents: true
	}
});

observer_4b
	.on('add', function(event){
		results_4.onAddCount++;
	})
	.on('update', function(event){
		results_4.onUpdateCount++;
	})
	.on('remove', function(event){
		results_4.onRemoveCount++;
	})
	.on('batch', function(event){
		results_4.batch = event.value;
	});

basket_4.fruit = 'banana';
basket_4.fruit = 'mango';
basket_4.fruit = 'cherry';
basket_4.vegetable = 'carrot';

test('minimalEvents and noUpdateEvents options', function(t){
	
	t.plan(6);
	
	setTimeout(function(){
		t.equal(observer_4a, observer_4b, 'Observer was not duplicated');
		t.equal(results_4.batch.raw.length, 4, '4 raw events were emitted');
		t.equal(results_4.batch.computed.length, 3, '3 computed events were generated');
		t.equal(results_4.onAddCount, 2, '2 add event');
		t.equal(results_4.onUpdateCount, 0, 'no update events');
		t.equal(results_4.onRemoveCount, 1, '1 remove event');
	}, 0);
});


// test 5
var results_5 = {
		onAddCount: 0,
		onUpdateCount: 0,
		onRemoveCount: 0,
		onBatchCount: 0
	},
	basket_5 = { fruit: 'apple' },
	observer_5a = observe_evented.observe(basket_5);

var observer_5b = observe_evented.observe(basket_5, {
	multipleObservers: true,
	output: {
		batchOnly: true
	}
});

observer_5b
	.on('add', function(event){
		results_5.onAddCount++;
	})
	.on('update', function(event){
		results_5.onUpdateCount++;
	})
	.on('remove', function(event){
		results_5.onRemoveCount++;
	})
	.on('batch', function(event){
		results_5.batch = event.value;
	});

basket_5.fruit = 'banana';
basket_5.fruit = 'mango';
basket_5.fruit = 'cherry';
basket_5.vegetable = 'carrot';

test('batchOnly and multipleObservers options', function(t){
	
	t.plan(6);
	
	setTimeout(function(){
		t.notEqual(observer_5a, observer_5b, 'Observer was duplicated');
		t.equal(results_5.batch.raw.length, 4, '4 raw events were emitted');
		t.equal(results_5.batch.computed.length, 4, '4 computed events were generated');
		t.equal(results_5.onAddCount, 0, '0 add events emitted');
		t.equal(results_5.onUpdateCount, 0, '0 update events emitted');
		t.equal(results_5.onRemoveCount, 0, '0 remove events emitted');
	}, 0);
});


// test 6
var results_6 = {
		onAddCount: 0,
		onAddNamespacedCount: 0,
		onUpdateCount: 0,
		onUpdateNamespacedCount: 0,
		onRemoveCount: 0,
		onRemoveNamespacedCount: 0,
		onBatchCount: 0,
		spec: 0
	},
	basket_6 = { fruit: 'apple' },
	observer_6 = observe_evented.observe(basket_6),
	specHandler = function(){
		results_6.spec++;
	};

observer_6
	.on('add', function(event){
		results_6.onAddCount++;
	})
	.on('add.ns', function(event){
		results_6.onAddNamespacedCount++;
	})
	.on('update', function(event){
		results_6.onUpdateCount++;
	})
	.on('update.ns', function(event){
		results_6.onUpdateNamespacedCount++;
	})
	.on('update', 'fruit', specHandler)
	.on('remove', function(event){
		results_6.onRemoveCount++;
	})
	.on('remove.ns', function(event){
		results_6.onRemoveNamespacedCount++;
	});

basket_6.fruit = 'banana';

observer_6.disable();

basket_6.fruit = 'mango';

observer_6.enable();

basket_6.fruit = 'cherry';
basket_6.vegetable = 'carrot';

observer_6.off('update', specHandler);
observer_6.off('add.ns');

basket_6.fruit = 'lemon';

basket_6.tool = 'hammer';

observer_6.off('.ns');

delete basket_6.tool;

basket_6.fruit = 'strawberry';

observer_6.off('add');

basket_6.fruit = 'wallnut';
basket_6.drink = 'tomatoe';

observer_6.destroy();

delete basket_6.fruit;

test('enable, disable, destroy, property filter, specific, namespaced and global unbinding', function(t){
	
	t.plan(7);
	
	setTimeout(function(){
		t.equal(results_6.spec, 2, 'specific handler');
		t.equal(results_6.onUpdateCount, 5, '5 update events');
		t.equal(results_6.onUpdateNamespacedCount, 3, '3 update events');
		t.equal(results_6.onAddCount, 2, '2 add events');
		t.equal(results_6.onAddNamespacedCount, 1, '1 add namespaced event');
		t.equal(results_6.onRemoveCount, 1, '1 remove event');
		t.equal(results_6.onRemoveNamespacedCount, 0, '0 remove namespaced events');
	}, 0);
});