/* monitor - v0.6.10 - 2014-05-16 */

//     Underscore.js 1.4.4
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.4.4';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? null : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value || _.identity);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    var args = slice.call(arguments, 2);
    return function() {
      return func.apply(context, args.concat(slice.call(arguments)));
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(n);
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

//     Backbone.js 0.9.9

//     (c) 2010-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(){

  // Initial Setup
  // -------------

  // Save a reference to the global object (`window` in the browser, `exports`
  // on the server).
  var root = this;

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create a local reference to array methods.
  var array = [];
  var push = array.push;
  var slice = array.slice;
  var splice = array.splice;

  // The top-level namespace. All public Backbone classes and modules will
  // be attached to this. Exported for both CommonJS and the browser.
  var Backbone;
  if (typeof exports !== 'undefined') {
    Backbone = exports;
  } else {
    Backbone = root.Backbone = {};
  }

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '0.9.9';

  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

  // For Backbone's purposes, jQuery, Zepto, or Ender owns the `$` variable.
  Backbone.$ = root.jQuery || root.Zepto || root.ender;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // ---------------

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
    } else if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
    } else {
      return true;
    }
  };

  // Optimized internal dispatch function for triggering events. Tries to
  // keep the usual cases speedy (most Backbone events have 3 arguments).
  var triggerEvents = function(obj, events, args) {
    var ev, i = -1, l = events.length;
    switch (args.length) {
    case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx);
    return;
    case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, args[0]);
    return;
    case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, args[0], args[1]);
    return;
    case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, args[0], args[1], args[2]);
    return;
    default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  };

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind one or more space separated events, or an events map,
    // to a `callback` function. Passing `"all"` will bind the callback to
    // all events fired.
    on: function(name, callback, context) {
      if (!(eventsApi(this, 'on', name, [callback, context]) && callback)) return this;
      this._events || (this._events = {});
      var list = this._events[name] || (this._events[name] = []);
      list.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind events to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!(eventsApi(this, 'once', name, [callback, context]) && callback)) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      this.on(name, once, context);
      return this;
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `events` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var list, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (list = this._events[name]) {
          events = [];
          if (callback || context) {
            for (j = 0, k = list.length; j < k; j++) {
              ev = list[j];
              if ((callback && callback !== (ev.callback._callback || ev.callback)) ||
                  (context && context !== ev.context)) {
                events.push(ev);
              }
            }
          }
          this._events[name] = events;
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(this, events, args);
      if (allEvents) triggerEvents(this, allEvents, arguments);
      return this;
    },

    // An inversion-of-control version of `on`. Tell *this* object to listen to
    // an event in another object ... keeping track of what it's listening to.
    listenTo: function(object, events, callback) {
      var listeners = this._listeners || (this._listeners = {});
      var id = object._listenerId || (object._listenerId = _.uniqueId('l'));
      listeners[id] = object;
      object.on(events, callback || this, this);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(object, events, callback) {
      var listeners = this._listeners;
      if (!listeners) return;
      if (object) {
        object.off(events, callback, this);
        if (!events && !callback) delete listeners[object._listenerId];
      } else {
        for (var id in listeners) {
          listeners[id].off(null, null, this);
        }
        this._listeners = {};
      }
      return this;
    }
  };

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Create a new model, with defined attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var defaults;
    var attrs = attributes || {};
    this.cid = _.uniqueId('c');
    this.changed = {};
    this.attributes = {};
    this._changes = [];
    if (options && options.collection) this.collection = options.collection;
    if (options && options.parse) attrs = this.parse(attrs);
    if (defaults = _.result(this, 'defaults')) _.defaults(attrs, defaults);
    this.set(attrs, {silent: true});
    this._currentAttributes = _.clone(this.attributes);
    this._previousAttributes = _.clone(this.attributes);
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"` unless
    // you choose to silence it.
    set: function(key, val, options) {
      var attr, attrs;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (_.isObject(key)) {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      // Extract attributes and options.
      var silent = options && options.silent;
      var unset = options && options.unset;

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      var now = this.attributes;

      // For each `set` attribute...
      for (attr in attrs) {
        val = attrs[attr];

        // Update or delete the current value, and track the change.
        unset ? delete now[attr] : now[attr] = val;
        this._changes.push(attr, val);
      }

      // Signal that the model's state has potentially changed, and we need
      // to recompute the actual changes.
      this._hasComputed = false;

      // Fire the `"change"` events.
      if (!silent) this.change(options);
      return this;
    },

    // Remove an attribute from the model, firing `"change"` unless you choose
    // to silence it. `unset` is a noop if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"` unless you choose
    // to silence it.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overriden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        if (!model.set(model.parse(resp), options)) return false;
        if (success) success(model, resp, options);
      };
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      var attrs, current, done;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (key == null || _.isObject(key)) {
        attrs = key;
        options = val;
      } else if (key != null) {
        (attrs = {})[key] = val;
      }
      options = options ? _.clone(options) : {};

      // If we're "wait"-ing to set changed attributes, validate early.
      if (options.wait) {
        if (attrs && !this._validate(attrs, options)) return false;
        current = _.clone(this.attributes);
      }

      // Regular saves `set` attributes before persisting to the server.
      var silentOptions = _.extend({}, options, {silent: true});
      if (attrs && !this.set(attrs, options.wait ? silentOptions : options)) {
        return false;
      }

      // Do not persist invalid models.
      if (!attrs && !this._validate(null, options)) return false;

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      var model = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        done = true;
        var serverAttrs = model.parse(resp);
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (!model.set(serverAttrs, options)) return false;
        if (success) success(model, resp, options);
      };

      // Finish configuring and sending the Ajax request.
      var method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method == 'patch') options.attrs = attrs;
      var xhr = this.sync(method, this, options);

      // When using `wait`, reset attributes to original values unless
      // `success` has been called already.
      if (!done && options.wait) {
        this.clear(silentOptions);
        this.set(current, silentOptions);
      }

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
      };

      if (this.isNew()) {
        options.success();
        return false;
      }

      var xhr = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) === '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return this.id == null;
    },

    // Call this method to manually fire a `"change"` event for this model and
    // a `"change:attribute"` event for each changed attribute.
    // Calling this will cause all objects observing the model to update.
    change: function(options) {
      var changing = this._changing;
      this._changing = true;

      // Generate the changes to be triggered on the model.
      var triggers = this._computeChanges(true);

      this._pending = !!triggers.length;

      for (var i = triggers.length - 2; i >= 0; i -= 2) {
        this.trigger('change:' + triggers[i], this, triggers[i + 1], options);
      }

      if (changing) return this;

      // Trigger a `change` while there have been changes.
      while (this._pending) {
        this._pending = false;
        this.trigger('change', this, options);
        this._previousAttributes = _.clone(this.attributes);
      }

      this._changing = false;
      return this;
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (!this._hasComputed) this._computeChanges();
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false, old = this._previousAttributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Looking at the built up list of `set` attribute changes, compute how
    // many of the attributes have actually changed. If `loud`, return a
    // boiled-down list of only the real changes.
    _computeChanges: function(loud) {
      this.changed = {};
      var already = {};
      var triggers = [];
      var current = this._currentAttributes;
      var changes = this._changes;

      // Loop through the current queue of potential model changes.
      for (var i = changes.length - 2; i >= 0; i -= 2) {
        var key = changes[i], val = changes[i + 1];
        if (already[key]) continue;
        already[key] = true;

        // Check if the attribute has been modified since the last change,
        // and update `this.changed` accordingly. If we're inside of a `change`
        // call, also add a trigger to the list.
        if (current[key] !== val) {
          this.changed[key] = val;
          if (!loud) continue;
          triggers.push(key, val);
          current[key] = val;
        }
      }
      if (loud) this._changes = [];

      // Signals `this.changed` is current to prevent duplicate calls from `this.hasChanged`.
      this._hasComputed = true;
      return triggers;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. If a specific `error` callback has
    // been passed, call that instead of firing the general `"error"` event.
    _validate: function(attrs, options) {
      if (!this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validate(attrs, options);
      if (!error) return true;
      if (options && options.error) options.error(this, error, options);
      this.trigger('error', this, error, options);
      return false;
    }

  });

  // Backbone.Collection
  // -------------------

  // Provides a standard collection class for our sets of models, ordered
  // or unordered. If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set. Pass **silent** to avoid
    // firing the `add` event for every new model.
    add: function(models, options) {
      var i, args, length, model, existing, needsSort;
      var at = options && options.at;
      var sort = ((options && options.sort) == null ? true : options.sort);
      models = _.isArray(models) ? models.slice() : [models];

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      for (i = models.length - 1; i >= 0; i--) {
        if(!(model = this._prepareModel(models[i], options))) {
          this.trigger("error", this, models[i], options);
          models.splice(i, 1);
          continue;
        }
        models[i] = model;

        existing = model.id != null && this._byId[model.id];
        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        if (existing || this._byCid[model.cid]) {
          if (options && options.merge && existing) {
            existing.set(model.attributes, options);
            needsSort = sort;
          }
          models.splice(i, 1);
          continue;
        }

        // Listen to added models' events, and index models for lookup by
        // `id` and by `cid`.
        model.on('all', this._onModelEvent, this);
        this._byCid[model.cid] = model;
        if (model.id != null) this._byId[model.id] = model;
      }

      // See if sorting is needed, update `length` and splice in new models.
      if (models.length) needsSort = sort;
      this.length += models.length;
      args = [at != null ? at : this.models.length, 0];
      push.apply(args, models);
      splice.apply(this.models, args);

      // Sort the collection if appropriate.
      if (needsSort && this.comparator && at == null) this.sort({silent: true});

      if (options && options.silent) return this;

      // Trigger `add` events.
      while (model = models.shift()) {
        model.trigger('add', model, this, options);
      }

      return this;
    },

    // Remove a model, or a list of models from the set. Pass silent to avoid
    // firing the `remove` event for every model removed.
    remove: function(models, options) {
      var i, l, index, model;
      options || (options = {});
      models = _.isArray(models) ? models.slice() : [models];
      for (i = 0, l = models.length; i < l; i++) {
        model = this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byCid[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model);
      }
      return this;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: this.length}, options));
      return model;
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: 0}, options));
      return model;
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function(begin, end) {
      return this.models.slice(begin, end);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj.id != null ? obj.id : obj] || this._byCid[obj.cid || obj];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of `filter`.
    where: function(attrs) {
      if (_.isEmpty(attrs)) return [];
      return this.filter(function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      if (!this.comparator) {
        throw new Error('Cannot sort a set without a comparator');
      }

      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options || !options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Smartly update a collection with a change set of models, adding,
    // removing, and merging as necessary.
    update: function(models, options) {
      var model, i, l, existing;
      var add = [], remove = [], modelMap = {};
      var idAttr = this.model.prototype.idAttribute;
      options = _.extend({add: true, merge: true, remove: true}, options);
      if (options.parse) models = this.parse(models);

      // Allow a single model (or no argument) to be passed.
      if (!_.isArray(models)) models = models ? [models] : [];

      // Proxy to `add` for this case, no need to iterate...
      if (options.add && !options.remove) return this.add(models, options);

      // Determine which models to add and merge, and which to remove.
      for (i = 0, l = models.length; i < l; i++) {
        model = models[i];
        existing = this.get(model.id || model.cid || model[idAttr]);
        if (options.remove && existing) modelMap[existing.cid] = true;
        if ((options.add && !existing) || (options.merge && existing)) {
          add.push(model);
        }
      }
      if (options.remove) {
        for (i = 0, l = this.models.length; i < l; i++) {
          model = this.models[i];
          if (!modelMap[model.cid]) remove.push(model);
        }
      }

      // Remove models (if applicable) before we add and merge the rest.
      if (remove.length) this.remove(remove, options);
      if (add.length) this.add(add, options);
      return this;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any `add` or `remove` events. Fires `reset` when finished.
    reset: function(models, options) {
      options || (options = {});
      if (options.parse) models = this.parse(models);
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      options.previousModels = this.models;
      this._reset();
      if (models) this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `add: true` is passed, appends the
    // models to the collection instead of resetting.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var collection = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        var method = options.update ? 'update' : 'reset';
        collection[method](resp, options);
        if (success) success(collection, resp, options);
      };
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      var collection = this;
      options = options ? _.clone(options) : {};
      model = this._prepareModel(model, options);
      if (!model) return false;
      if (!options.wait) collection.add(model, options);
      var success = options.success;
      options.success = function(model, resp, options) {
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models);
    },

    // Proxy to _'s chain. Can't be proxied the same way the rest of the
    // underscore methods are proxied because it relies on the underscore
    // constructor.
    chain: function() {
      return _(this.models).chain();
    },

    // Reset all internal state. Called when the collection is reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
      this._byCid = {};
    },

    // Prepare a model or hash of attributes to be added to this collection.
    _prepareModel: function(attrs, options) {
      if (attrs instanceof Model) {
        if (!attrs.collection) attrs.collection = this;
        return attrs;
      }
      options || (options = {});
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model._validate(attrs, options)) return false;
      return model;
    },

    // Internal method to remove a model's ties to a collection.
    _removeReference: function(model) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'sortedIndex', 'toArray', 'size', 'first', 'head', 'take',
    'initial', 'rest', 'tail', 'last', 'without', 'indexOf', 'shuffle',
    'lastIndexOf', 'isEmpty'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy'];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (!callback) callback = this[name];
      Backbone.history.route(route, _.bind(function(fragment) {
        var args = this._extractParameters(route, fragment);
        callback && callback.apply(this, args);
        this.trigger.apply(this, ['route:' + name].concat(args));
        Backbone.history.trigger('route', this, name, args);
      }, this));
      return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, '([^\/]+)')
                   .replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted parameters.
    _extractParameters: function(route, fragment) {
      return route.exec(fragment).slice(1);
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on URL fragments. If the
  // browser does not support `onhashchange`, falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // #1653 - Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Cached regex for removing a trailing slash.
  var trailingSlash = /\/$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          fragment = this.location.pathname;
          var root = this.root.replace(trailingSlash, '');
          if (!fragment.indexOf(root)) fragment = fragment.substr(root.length);
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({}, {root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      if (oldIE && this._wantsHashChange) {
        this.iframe = Backbone.$('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        Backbone.$(window).bind('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Backbone.$(window).bind('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = this.location;
      var atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === this.root;

      // If we've started off with a route from a `pushState`-enabled browser,
      // but we're currently in a browser that doesn't support it...
      if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        this.location.replace(this.root + this.location.search + '#' + this.fragment);
        // Return immediately as browser will do redirect to new url
        return true;

      // Or if we've started out with a hash-based route, but we're currently
      // in a browser where it could be `pushState`-based instead...
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, '');
        this.history.replaceState({}, document.title, this.root + this.fragment + loc.search);
      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      Backbone.$(window).unbind('popstate', this.checkUrl).unbind('hashchange', this.checkUrl);
      clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl() || this.loadUrl(this.getHash());
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragmentOverride) {
      var fragment = this.fragment = this.getFragment(fragmentOverride);
      var matched = _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
      return matched;
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: options};
      fragment = this.getFragment(fragment || '');
      if (this.fragment === fragment) return;
      this.fragment = fragment;
      var url = this.root + fragment;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // #1649 - Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Backbone.View
  // -------------

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be prefered to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
      this.$el.remove();
      this.stopListening();
      return this;
    },

    // For small amounts of DOM Elements, where a full-blown template isn't
    // needed, use **make** to manufacture elements, one at a time.
    //
    //     var el = this.make('li', {'class': 'row'}, this.model.escape('title'));
    //
    make: function(tagName, attributes, content) {
      var el = document.createElement(tagName);
      if (attributes) Backbone.$(el).attr(attributes);
      if (content != null) Backbone.$(el).html(content);
      return el;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save'
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = _.result(this, 'events')))) return;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) throw new Error('Method "' + events[key] + '" does not exist');
        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.bind(eventName, method);
        } else {
          this.$el.delegate(selector, eventName, method);
        }
      }
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.unbind('.delegateEvents' + this.cid);
    },

    // Performs the initial configuration of a View with a set of options.
    // Keys with special meaning *(model, collection, id, className)*, are
    // attached directly to the view.
    _configure: function(options) {
      if (this.options) options = _.extend({}, _.result(this, 'options'), options);
      _.extend(this, _.pick(options, viewOptions));
      this.options = options;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        this.setElement(this.make(_.result(this, 'tagName'), attrs), false);
      } else {
        this.setElement(_.result(this, 'el'), false);
      }
    }

  });

  // Backbone.sync
  // -------------

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    var success = options.success;
    options.success = function(resp, status, xhr) {
      if (success) success(resp, status, xhr);
      model.trigger('sync', model, resp, options);
    };

    var error = options.error;
    options.error = function(xhr, status, thrown) {
      if (error) error(model, xhr, options);
      model.trigger('error', model, xhr, options);
    };

    // Make the request, allowing the user to override any Ajax options.
    var xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

}).call(this);

// BackboneCallbacks.js (c) 2012 Loren West and other contributors
// Node-monitor may be freely distributed under the MIT license.
// For all details and documentation:
// http://lorenwest.github.com/backbone-callbacks
(function(root){

  // Module dependencies
  var _ = root._ || require('underscore')._,
      Backbone = root.Backbone || require('backbone');

  /**
   * Anonymous callback style interface for Backbone.js async methods.
   *
   * Load this after Backbone.js to add an anonymous function callback style
   * interface for fetch(), save(), and destroy() in addition to the built-in
   * success/error style interface.
   *
   * This adds a shim to the existing interface, allowing either style to be
   * used.  If a callback function is provided as the last argument, it will
   * use that callback style.  Otherwise it will use the success/error style.
   *
   * Example:
   *
   *     customer.save(attrs, options, function(error, response) {
   *       if (error) {
   *         return console.log('Error saving customer', error);
   *       }
   *       console.log('Customer save successful.  Response:', response);
   *     });
   *
   * The callback gets two arguments - an error object and response object.
   * One or the other will be set based on an error condition.
   *
   * The motivation for this callback style is to offer Backbone.js clients a
   * common coding style for client-side and server-side applications.
   *
   * @class BackboneCallbacks
   */
  var BackboneCallbacks = function(methodName, method) {
    return function() {

      // Connect the success/error methods for callback style requests.
      // These style callbacks don't need the model or options arguments
      // because they're in the scope of the anonymous callback function.
      var args = _.toArray(arguments), callback = args[args.length - 1];
      if (typeof callback === 'function') {

        // Remove the last element (the callback)
        args.splice(-1, 1);

        // Place options if none were specified.
        if (args.length === 0) {
          args.push({});
        }

        // Place attributes if save and only options were specified
        if (args.length === 1 && methodName === 'save') {
          args.push({});
        }
        var options = args[args.length - 1];

        // Place the success and error methods
        options.success = function(model, response) {
          callback(null, response);
        };
        options.error = function(model, response) {
          // Provide the response as the error.
          callback(response, null);
        };
      }

      // Invoke the original method
      return method.apply(this, args);
    };
  };

  // Expose as the module for CommonJS, and globally for the browser.
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = BackboneCallbacks;
  } else {
    root.BackboneCallbacks = BackboneCallbacks;
  }

  /**
  * Attach the shims to a clean Backbone library
  *
  * Backbone-callbacks works automatically for the global Backbone.  If you have
  * a clean version of Backbone (via Backbone.noConflict()) you can manually
  * attach the backbone-callbacks functionality using this method.
  *
  *     var Backbone = require('backbone').noConflict();
  *     require('backbone-callbacks').attach(Backbone);
  *
  * @static
  * @method attach
  * @param library {Backbone} Backbone library to attach to
  */
  BackboneCallbacks.attach = function(library) {

    // Shim the original methods to allow the alternate calling style
    _.each(['save','destroy','fetch'], function(methodName) {
      library.Model.prototype[methodName] = new BackboneCallbacks(methodName, library.Model.prototype[methodName]);
    });
    _.each(['fetch'], function(methodName) {
      library.Collection.prototype[methodName] = new BackboneCallbacks(methodName, library.Collection.prototype[methodName]);
    });
  };

  // Automatically attach the shims to the global Backbone library
  BackboneCallbacks.attach(Backbone);

}(this));

/*! Socket.IO.js build:0.9.11, development. Copyright(c) 2011 LearnBoost <dev@learnboost.com> MIT Licensed */

var io = ('undefined' === typeof module ? {} : module.exports);
(function() {

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, global) {

  /**
   * IO namespace.
   *
   * @namespace
   */

  var io = exports;

  /**
   * Socket.IO version
   *
   * @api public
   */

  io.version = '0.9.11';

  /**
   * Protocol implemented.
   *
   * @api public
   */

  io.protocol = 1;

  /**
   * Available transports, these will be populated with the available transports
   *
   * @api public
   */

  io.transports = [];

  /**
   * Keep track of jsonp callbacks.
   *
   * @api private
   */

  io.j = [];

  /**
   * Keep track of our io.Sockets
   *
   * @api private
   */
  io.sockets = {};


  /**
   * Manages connections to hosts.
   *
   * @param {String} uri
   * @Param {Boolean} force creation of new socket (defaults to false)
   * @api public
   */

  io.connect = function (host, details) {
    var uri = io.util.parseUri(host)
      , uuri
      , socket;

    if (global && global.location) {
      uri.protocol = uri.protocol || global.location.protocol.slice(0, -1);
      uri.host = uri.host || (global.document
        ? global.document.domain : global.location.hostname);
      uri.port = uri.port || global.location.port;
    }

    uuri = io.util.uniqueUri(uri);

    var options = {
        host: uri.host
      , secure: 'https' == uri.protocol
      , port: uri.port || ('https' == uri.protocol ? 443 : 80)
      , query: uri.query || ''
    };

    io.util.merge(options, details);

    if (options['force new connection'] || !io.sockets[uuri]) {
      socket = new io.Socket(options);
    }

    if (!options['force new connection'] && socket) {
      io.sockets[uuri] = socket;
    }

    socket = socket || io.sockets[uuri];

    // if path is different from '' or /
    return socket.of(uri.path.length > 1 ? uri.path : '');
  };

})('object' === typeof module ? module.exports : (this.io = {}), this);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, global) {

  /**
   * Utilities namespace.
   *
   * @namespace
   */

  var util = exports.util = {};

  /**
   * Parses an URI
   *
   * @author Steven Levithan <stevenlevithan.com> (MIT license)
   * @api public
   */

  var re = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

  var parts = ['source', 'protocol', 'authority', 'userInfo', 'user', 'password',
               'host', 'port', 'relative', 'path', 'directory', 'file', 'query',
               'anchor'];

  util.parseUri = function (str) {
    var m = re.exec(str || '')
      , uri = {}
      , i = 14;

    while (i--) {
      uri[parts[i]] = m[i] || '';
    }

    return uri;
  };

  /**
   * Produces a unique url that identifies a Socket.IO connection.
   *
   * @param {Object} uri
   * @api public
   */

  util.uniqueUri = function (uri) {
    var protocol = uri.protocol
      , host = uri.host
      , port = uri.port;

    if ('document' in global) {
      host = host || document.domain;
      port = port || (protocol == 'https'
        && document.location.protocol !== 'https:' ? 443 : document.location.port);
    } else {
      host = host || 'localhost';

      if (!port && protocol == 'https') {
        port = 443;
      }
    }

    return (protocol || 'http') + '://' + host + ':' + (port || 80);
  };

  /**
   * Mergest 2 query strings in to once unique query string
   *
   * @param {String} base
   * @param {String} addition
   * @api public
   */

  util.query = function (base, addition) {
    var query = util.chunkQuery(base || '')
      , components = [];

    util.merge(query, util.chunkQuery(addition || ''));
    for (var part in query) {
      if (query.hasOwnProperty(part)) {
        components.push(part + '=' + query[part]);
      }
    }

    return components.length ? '?' + components.join('&') : '';
  };

  /**
   * Transforms a querystring in to an object
   *
   * @param {String} qs
   * @api public
   */

  util.chunkQuery = function (qs) {
    var query = {}
      , params = qs.split('&')
      , i = 0
      , l = params.length
      , kv;

    for (; i < l; ++i) {
      kv = params[i].split('=');
      if (kv[0]) {
        query[kv[0]] = kv[1];
      }
    }

    return query;
  };

  /**
   * Executes the given function when the page is loaded.
   *
   *     io.util.load(function () { console.log('page loaded'); });
   *
   * @param {Function} fn
   * @api public
   */

  var pageLoaded = false;

  util.load = function (fn) {
    if ('document' in global && document.readyState === 'complete' || pageLoaded) {
      return fn();
    }

    util.on(global, 'load', fn, false);
  };

  /**
   * Adds an event.
   *
   * @api private
   */

  util.on = function (element, event, fn, capture) {
    if (element.attachEvent) {
      element.attachEvent('on' + event, fn);
    } else if (element.addEventListener) {
      element.addEventListener(event, fn, capture);
    }
  };

  /**
   * Generates the correct `XMLHttpRequest` for regular and cross domain requests.
   *
   * @param {Boolean} [xdomain] Create a request that can be used cross domain.
   * @returns {XMLHttpRequest|false} If we can create a XMLHttpRequest.
   * @api private
   */

  util.request = function (xdomain) {

    if (xdomain && 'undefined' != typeof XDomainRequest && !util.ua.hasCORS) {
      return new XDomainRequest();
    }

    if ('undefined' != typeof XMLHttpRequest && (!xdomain || util.ua.hasCORS)) {
      return new XMLHttpRequest();
    }

    if (!xdomain) {
      try {
        return new window[(['Active'].concat('Object').join('X'))]('Microsoft.XMLHTTP');
      } catch(e) { }
    }

    return null;
  };

  /**
   * XHR based transport constructor.
   *
   * @constructor
   * @api public
   */

  /**
   * Change the internal pageLoaded value.
   */

  if ('undefined' != typeof window) {
    util.load(function () {
      pageLoaded = true;
    });
  }

  /**
   * Defers a function to ensure a spinner is not displayed by the browser
   *
   * @param {Function} fn
   * @api public
   */

  util.defer = function (fn) {
    if (!util.ua.webkit || 'undefined' != typeof importScripts) {
      return fn();
    }

    util.load(function () {
      setTimeout(fn, 100);
    });
  };

  /**
   * Merges two objects.
   *
   * @api public
   */

  util.merge = function merge (target, additional, deep, lastseen) {
    var seen = lastseen || []
      , depth = typeof deep == 'undefined' ? 2 : deep
      , prop;

    for (prop in additional) {
      if (additional.hasOwnProperty(prop) && util.indexOf(seen, prop) < 0) {
        if (typeof target[prop] !== 'object' || !depth) {
          target[prop] = additional[prop];
          seen.push(additional[prop]);
        } else {
          util.merge(target[prop], additional[prop], depth - 1, seen);
        }
      }
    }

    return target;
  };

  /**
   * Merges prototypes from objects
   *
   * @api public
   */

  util.mixin = function (ctor, ctor2) {
    util.merge(ctor.prototype, ctor2.prototype);
  };

  /**
   * Shortcut for prototypical and static inheritance.
   *
   * @api private
   */

  util.inherit = function (ctor, ctor2) {
    function f() {};
    f.prototype = ctor2.prototype;
    ctor.prototype = new f;
  };

  /**
   * Checks if the given object is an Array.
   *
   *     io.util.isArray([]); // true
   *     io.util.isArray({}); // false
   *
   * @param Object obj
   * @api public
   */

  util.isArray = Array.isArray || function (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };

  /**
   * Intersects values of two arrays into a third
   *
   * @api public
   */

  util.intersect = function (arr, arr2) {
    var ret = []
      , longest = arr.length > arr2.length ? arr : arr2
      , shortest = arr.length > arr2.length ? arr2 : arr;

    for (var i = 0, l = shortest.length; i < l; i++) {
      if (~util.indexOf(longest, shortest[i]))
        ret.push(shortest[i]);
    }

    return ret;
  };

  /**
   * Array indexOf compatibility.
   *
   * @see bit.ly/a5Dxa2
   * @api public
   */

  util.indexOf = function (arr, o, i) {

    for (var j = arr.length, i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0;
         i < j && arr[i] !== o; i++) {}

    return j <= i ? -1 : i;
  };

  /**
   * Converts enumerables to array.
   *
   * @api public
   */

  util.toArray = function (enu) {
    var arr = [];

    for (var i = 0, l = enu.length; i < l; i++)
      arr.push(enu[i]);

    return arr;
  };

  /**
   * UA / engines detection namespace.
   *
   * @namespace
   */

  util.ua = {};

  /**
   * Whether the UA supports CORS for XHR.
   *
   * @api public
   */

  util.ua.hasCORS = 'undefined' != typeof XMLHttpRequest && (function () {
    try {
      var a = new XMLHttpRequest();
    } catch (e) {
      return false;
    }

    return a.withCredentials != undefined;
  })();

  /**
   * Detect webkit.
   *
   * @api public
   */

  util.ua.webkit = 'undefined' != typeof navigator
    && /webkit/i.test(navigator.userAgent);

   /**
   * Detect iPad/iPhone/iPod.
   *
   * @api public
   */

  util.ua.iDevice = 'undefined' != typeof navigator
      && /iPad|iPhone|iPod/i.test(navigator.userAgent);

})('undefined' != typeof io ? io : module.exports, this);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.EventEmitter = EventEmitter;

  /**
   * Event emitter constructor.
   *
   * @api public.
   */

  function EventEmitter () {};

  /**
   * Adds a listener
   *
   * @api public
   */

  EventEmitter.prototype.on = function (name, fn) {
    if (!this.$events) {
      this.$events = {};
    }

    if (!this.$events[name]) {
      this.$events[name] = fn;
    } else if (io.util.isArray(this.$events[name])) {
      this.$events[name].push(fn);
    } else {
      this.$events[name] = [this.$events[name], fn];
    }

    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  /**
   * Adds a volatile listener.
   *
   * @api public
   */

  EventEmitter.prototype.once = function (name, fn) {
    var self = this;

    function on () {
      self.removeListener(name, on);
      fn.apply(this, arguments);
    };

    on.listener = fn;
    this.on(name, on);

    return this;
  };

  /**
   * Removes a listener.
   *
   * @api public
   */

  EventEmitter.prototype.removeListener = function (name, fn) {
    if (this.$events && this.$events[name]) {
      var list = this.$events[name];

      if (io.util.isArray(list)) {
        var pos = -1;

        for (var i = 0, l = list.length; i < l; i++) {
          if (list[i] === fn || (list[i].listener && list[i].listener === fn)) {
            pos = i;
            break;
          }
        }

        if (pos < 0) {
          return this;
        }

        list.splice(pos, 1);

        if (!list.length) {
          delete this.$events[name];
        }
      } else if (list === fn || (list.listener && list.listener === fn)) {
        delete this.$events[name];
      }
    }

    return this;
  };

  /**
   * Removes all listeners for an event.
   *
   * @api public
   */

  EventEmitter.prototype.removeAllListeners = function (name) {
    if (name === undefined) {
      this.$events = {};
      return this;
    }

    if (this.$events && this.$events[name]) {
      this.$events[name] = null;
    }

    return this;
  };

  /**
   * Gets all listeners for a certain event.
   *
   * @api publci
   */

  EventEmitter.prototype.listeners = function (name) {
    if (!this.$events) {
      this.$events = {};
    }

    if (!this.$events[name]) {
      this.$events[name] = [];
    }

    if (!io.util.isArray(this.$events[name])) {
      this.$events[name] = [this.$events[name]];
    }

    return this.$events[name];
  };

  /**
   * Emits an event.
   *
   * @api public
   */

  EventEmitter.prototype.emit = function (name) {
    if (!this.$events) {
      return false;
    }

    var handler = this.$events[name];

    if (!handler) {
      return false;
    }

    var args = Array.prototype.slice.call(arguments, 1);

    if ('function' == typeof handler) {
      handler.apply(this, args);
    } else if (io.util.isArray(handler)) {
      var listeners = handler.slice();

      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i].apply(this, args);
      }
    } else {
      return false;
    }

    return true;
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Based on JSON2 (http://www.JSON.org/js.html).
 */

(function (exports, nativeJSON) {
  "use strict";

  // use native JSON if it's available
  if (nativeJSON && nativeJSON.parse){
    return exports.JSON = {
      parse: nativeJSON.parse
    , stringify: nativeJSON.stringify
    };
  }

  var JSON = exports.JSON = {};

  function f(n) {
      // Format integers to have at least two digits.
      return n < 10 ? '0' + n : n;
  }

  function date(d, key) {
    return isFinite(d.valueOf()) ?
        d.getUTCFullYear()     + '-' +
        f(d.getUTCMonth() + 1) + '-' +
        f(d.getUTCDate())      + 'T' +
        f(d.getUTCHours())     + ':' +
        f(d.getUTCMinutes())   + ':' +
        f(d.getUTCSeconds())   + 'Z' : null;
  };

  var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      gap,
      indent,
      meta = {    // table of character substitutions
          '\b': '\\b',
          '\t': '\\t',
          '\n': '\\n',
          '\f': '\\f',
          '\r': '\\r',
          '"' : '\\"',
          '\\': '\\\\'
      },
      rep;


  function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

      escapable.lastIndex = 0;
      return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
          var c = meta[a];
          return typeof c === 'string' ? c :
              '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      }) + '"' : '"' + string + '"';
  }


  function str(key, holder) {

// Produce a string from holder[key].

      var i,          // The loop counter.
          k,          // The member key.
          v,          // The member value.
          length,
          mind = gap,
          partial,
          value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

      if (value instanceof Date) {
          value = date(key);
      }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

      if (typeof rep === 'function') {
          value = rep.call(holder, key, value);
      }

// What happens next depends on the value's type.

      switch (typeof value) {
      case 'string':
          return quote(value);

      case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

          return isFinite(value) ? String(value) : 'null';

      case 'boolean':
      case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

          return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

      case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

          if (!value) {
              return 'null';
          }

// Make an array to hold the partial results of stringifying this object value.

          gap += indent;
          partial = [];

// Is the value an array?

          if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

              length = value.length;
              for (i = 0; i < length; i += 1) {
                  partial[i] = str(i, value) || 'null';
              }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

              v = partial.length === 0 ? '[]' : gap ?
                  '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                  '[' + partial.join(',') + ']';
              gap = mind;
              return v;
          }

// If the replacer is an array, use it to select the members to be stringified.

          if (rep && typeof rep === 'object') {
              length = rep.length;
              for (i = 0; i < length; i += 1) {
                  if (typeof rep[i] === 'string') {
                      k = rep[i];
                      v = str(k, value);
                      if (v) {
                          partial.push(quote(k) + (gap ? ': ' : ':') + v);
                      }
                  }
              }
          } else {

// Otherwise, iterate through all of the keys in the object.

              for (k in value) {
                  if (Object.prototype.hasOwnProperty.call(value, k)) {
                      v = str(k, value);
                      if (v) {
                          partial.push(quote(k) + (gap ? ': ' : ':') + v);
                      }
                  }
              }
          }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

          v = partial.length === 0 ? '{}' : gap ?
              '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
              '{' + partial.join(',') + '}';
          gap = mind;
          return v;
      }
  }

// If the JSON object does not yet have a stringify method, give it one.

  JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

      var i;
      gap = '';
      indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

      if (typeof space === 'number') {
          for (i = 0; i < space; i += 1) {
              indent += ' ';
          }

// If the space parameter is a string, it will be used as the indent string.

      } else if (typeof space === 'string') {
          indent = space;
      }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

      rep = replacer;
      if (replacer && typeof replacer !== 'function' &&
              (typeof replacer !== 'object' ||
              typeof replacer.length !== 'number')) {
          throw new Error('JSON.stringify');
      }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

      return str('', {'': value});
  };

// If the JSON object does not yet have a parse method, give it one.

  JSON.parse = function (text, reviver) {
  // The parse method takes a text and an optional reviver function, and returns
  // a JavaScript value if the text is a valid JSON text.

      var j;

      function walk(holder, key) {

  // The walk method is used to recursively walk the resulting structure so
  // that modifications can be made.

          var k, v, value = holder[key];
          if (value && typeof value === 'object') {
              for (k in value) {
                  if (Object.prototype.hasOwnProperty.call(value, k)) {
                      v = walk(value, k);
                      if (v !== undefined) {
                          value[k] = v;
                      } else {
                          delete value[k];
                      }
                  }
              }
          }
          return reviver.call(holder, key, value);
      }


  // Parsing happens in four stages. In the first stage, we replace certain
  // Unicode characters with escape sequences. JavaScript handles many characters
  // incorrectly, either silently deleting them, or treating them as line endings.

      text = String(text);
      cx.lastIndex = 0;
      if (cx.test(text)) {
          text = text.replace(cx, function (a) {
              return '\\u' +
                  ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
          });
      }

  // In the second stage, we run the text against regular expressions that look
  // for non-JSON patterns. We are especially concerned with '()' and 'new'
  // because they can cause invocation, and '=' because it can cause mutation.
  // But just to be safe, we want to reject all unexpected forms.

  // We split the second stage into 4 regexp operations in order to work around
  // crippling inefficiencies in IE's and Safari's regexp engines. First we
  // replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
  // replace all simple value tokens with ']' characters. Third, we delete all
  // open brackets that follow a colon or comma or that begin the text. Finally,
  // we look to see that the remaining characters are only whitespace or ']' or
  // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

      if (/^[\],:{}\s]*$/
              .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                  .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                  .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

  // In the third stage we use the eval function to compile the text into a
  // JavaScript structure. The '{' operator is subject to a syntactic ambiguity
  // in JavaScript: it can begin a block or an object literal. We wrap the text
  // in parens to eliminate the ambiguity.

          j = eval('(' + text + ')');

  // In the optional fourth stage, we recursively walk the new structure, passing
  // each name/value pair to a reviver function for possible transformation.

          return typeof reviver === 'function' ?
              walk({'': j}, '') : j;
      }

  // If the text is not JSON parseable, then a SyntaxError is thrown.

      throw new SyntaxError('JSON.parse');
  };

})(
    'undefined' != typeof io ? io : module.exports
  , typeof JSON !== 'undefined' ? JSON : undefined
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Parser namespace.
   *
   * @namespace
   */

  var parser = exports.parser = {};

  /**
   * Packet types.
   */

  var packets = parser.packets = [
      'disconnect'
    , 'connect'
    , 'heartbeat'
    , 'message'
    , 'json'
    , 'event'
    , 'ack'
    , 'error'
    , 'noop'
  ];

  /**
   * Errors reasons.
   */

  var reasons = parser.reasons = [
      'transport not supported'
    , 'client not handshaken'
    , 'unauthorized'
  ];

  /**
   * Errors advice.
   */

  var advice = parser.advice = [
      'reconnect'
  ];

  /**
   * Shortcuts.
   */

  var JSON = io.JSON
    , indexOf = io.util.indexOf;

  /**
   * Encodes a packet.
   *
   * @api private
   */

  parser.encodePacket = function (packet) {
    var type = indexOf(packets, packet.type)
      , id = packet.id || ''
      , endpoint = packet.endpoint || ''
      , ack = packet.ack
      , data = null;

    switch (packet.type) {
      case 'error':
        var reason = packet.reason ? indexOf(reasons, packet.reason) : ''
          , adv = packet.advice ? indexOf(advice, packet.advice) : '';

        if (reason !== '' || adv !== '')
          data = reason + (adv !== '' ? ('+' + adv) : '');

        break;

      case 'message':
        if (packet.data !== '')
          data = packet.data;
        break;

      case 'event':
        var ev = { name: packet.name };

        if (packet.args && packet.args.length) {
          ev.args = packet.args;
        }

        data = JSON.stringify(ev);
        break;

      case 'json':
        data = JSON.stringify(packet.data);
        break;

      case 'connect':
        if (packet.qs)
          data = packet.qs;
        break;

      case 'ack':
        data = packet.ackId
          + (packet.args && packet.args.length
              ? '+' + JSON.stringify(packet.args) : '');
        break;
    }

    // construct packet with required fragments
    var encoded = [
        type
      , id + (ack == 'data' ? '+' : '')
      , endpoint
    ];

    // data fragment is optional
    if (data !== null && data !== undefined)
      encoded.push(data);

    return encoded.join(':');
  };

  /**
   * Encodes multiple messages (payload).
   *
   * @param {Array} messages
   * @api private
   */

  parser.encodePayload = function (packets) {
    var decoded = '';

    if (packets.length == 1)
      return packets[0];

    for (var i = 0, l = packets.length; i < l; i++) {
      var packet = packets[i];
      decoded += '\ufffd' + packet.length + '\ufffd' + packets[i];
    }

    return decoded;
  };

  /**
   * Decodes a packet
   *
   * @api private
   */

  var regexp = /([^:]+):([0-9]+)?(\+)?:([^:]+)?:?([\s\S]*)?/;

  parser.decodePacket = function (data) {
    var pieces = data.match(regexp);

    if (!pieces) return {};

    var id = pieces[2] || ''
      , data = pieces[5] || ''
      , packet = {
            type: packets[pieces[1]]
          , endpoint: pieces[4] || ''
        };

    // whether we need to acknowledge the packet
    if (id) {
      packet.id = id;
      if (pieces[3])
        packet.ack = 'data';
      else
        packet.ack = true;
    }

    // handle different packet types
    switch (packet.type) {
      case 'error':
        var pieces = data.split('+');
        packet.reason = reasons[pieces[0]] || '';
        packet.advice = advice[pieces[1]] || '';
        break;

      case 'message':
        packet.data = data || '';
        break;

      case 'event':
        try {
          var opts = JSON.parse(data);
          packet.name = opts.name;
          packet.args = opts.args;
        } catch (e) { }

        packet.args = packet.args || [];
        break;

      case 'json':
        try {
          packet.data = JSON.parse(data);
        } catch (e) { }
        break;

      case 'connect':
        packet.qs = data || '';
        break;

      case 'ack':
        var pieces = data.match(/^([0-9]+)(\+)?(.*)/);
        if (pieces) {
          packet.ackId = pieces[1];
          packet.args = [];

          if (pieces[3]) {
            try {
              packet.args = pieces[3] ? JSON.parse(pieces[3]) : [];
            } catch (e) { }
          }
        }
        break;

      case 'disconnect':
      case 'heartbeat':
        break;
    };

    return packet;
  };

  /**
   * Decodes data payload. Detects multiple messages
   *
   * @return {Array} messages
   * @api public
   */

  parser.decodePayload = function (data) {
    // IE doesn't like data[i] for unicode chars, charAt works fine
    if (data.charAt(0) == '\ufffd') {
      var ret = [];

      for (var i = 1, length = ''; i < data.length; i++) {
        if (data.charAt(i) == '\ufffd') {
          ret.push(parser.decodePacket(data.substr(i + 1).substr(0, length)));
          i += Number(length) + 1;
          length = '';
        } else {
          length += data.charAt(i);
        }
      }

      return ret;
    } else {
      return [parser.decodePacket(data)];
    }
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.Transport = Transport;

  /**
   * This is the transport template for all supported transport methods.
   *
   * @constructor
   * @api public
   */

  function Transport (socket, sessid) {
    this.socket = socket;
    this.sessid = sessid;
  };

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(Transport, io.EventEmitter);


  /**
   * Indicates whether heartbeats is enabled for this transport
   *
   * @api private
   */

  Transport.prototype.heartbeats = function () {
    return true;
  };

  /**
   * Handles the response from the server. When a new response is received
   * it will automatically update the timeout, decode the message and
   * forwards the response to the onMessage function for further processing.
   *
   * @param {String} data Response from the server.
   * @api private
   */

  Transport.prototype.onData = function (data) {
    this.clearCloseTimeout();

    // If the connection in currently open (or in a reopening state) reset the close
    // timeout since we have just received data. This check is necessary so
    // that we don't reset the timeout on an explicitly disconnected connection.
    if (this.socket.connected || this.socket.connecting || this.socket.reconnecting) {
      this.setCloseTimeout();
    }

    if (data !== '') {
      // todo: we should only do decodePayload for xhr transports
      var msgs = io.parser.decodePayload(data);

      if (msgs && msgs.length) {
        for (var i = 0, l = msgs.length; i < l; i++) {
          this.onPacket(msgs[i]);
        }
      }
    }

    return this;
  };

  /**
   * Handles packets.
   *
   * @api private
   */

  Transport.prototype.onPacket = function (packet) {
    this.socket.setHeartbeatTimeout();

    if (packet.type == 'heartbeat') {
      return this.onHeartbeat();
    }

    if (packet.type == 'connect' && packet.endpoint == '') {
      this.onConnect();
    }

    if (packet.type == 'error' && packet.advice == 'reconnect') {
      this.isOpen = false;
    }

    this.socket.onPacket(packet);

    return this;
  };

  /**
   * Sets close timeout
   *
   * @api private
   */

  Transport.prototype.setCloseTimeout = function () {
    if (!this.closeTimeout) {
      var self = this;

      this.closeTimeout = setTimeout(function () {
        self.onDisconnect();
      }, this.socket.closeTimeout);
    }
  };

  /**
   * Called when transport disconnects.
   *
   * @api private
   */

  Transport.prototype.onDisconnect = function () {
    if (this.isOpen) this.close();
    this.clearTimeouts();
    this.socket.onDisconnect();
    return this;
  };

  /**
   * Called when transport connects
   *
   * @api private
   */

  Transport.prototype.onConnect = function () {
    this.socket.onConnect();
    return this;
  };

  /**
   * Clears close timeout
   *
   * @api private
   */

  Transport.prototype.clearCloseTimeout = function () {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  };

  /**
   * Clear timeouts
   *
   * @api private
   */

  Transport.prototype.clearTimeouts = function () {
    this.clearCloseTimeout();

    if (this.reopenTimeout) {
      clearTimeout(this.reopenTimeout);
    }
  };

  /**
   * Sends a packet
   *
   * @param {Object} packet object.
   * @api private
   */

  Transport.prototype.packet = function (packet) {
    this.send(io.parser.encodePacket(packet));
  };

  /**
   * Send the received heartbeat message back to server. So the server
   * knows we are still connected.
   *
   * @param {String} heartbeat Heartbeat response from the server.
   * @api private
   */

  Transport.prototype.onHeartbeat = function (heartbeat) {
    this.packet({ type: 'heartbeat' });
  };

  /**
   * Called when the transport opens.
   *
   * @api private
   */

  Transport.prototype.onOpen = function () {
    this.isOpen = true;
    this.clearCloseTimeout();
    this.socket.onOpen();
  };

  /**
   * Notifies the base when the connection with the Socket.IO server
   * has been disconnected.
   *
   * @api private
   */

  Transport.prototype.onClose = function () {
    var self = this;

    /* FIXME: reopen delay causing a infinit loop
    this.reopenTimeout = setTimeout(function () {
      self.open();
    }, this.socket.options['reopen delay']);*/

    this.isOpen = false;
    this.socket.onClose();
    this.onDisconnect();
  };

  /**
   * Generates a connection url based on the Socket.IO URL Protocol.
   * See <https://github.com/learnboost/socket.io-node/> for more details.
   *
   * @returns {String} Connection url
   * @api private
   */

  Transport.prototype.prepareUrl = function () {
    var options = this.socket.options;

    return this.scheme() + '://'
      + options.host + ':' + options.port + '/'
      + options.resource + '/' + io.protocol
      + '/' + this.name + '/' + this.sessid;
  };

  /**
   * Checks if the transport is ready to start a connection.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  Transport.prototype.ready = function (socket, fn) {
    fn.call(this);
  };
})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports.Socket = Socket;

  /**
   * Create a new `Socket.IO client` which can establish a persistent
   * connection with a Socket.IO enabled server.
   *
   * @api public
   */

  function Socket (options) {
    this.options = {
        port: 80
      , secure: false
      , document: 'document' in global ? document : false
      , resource: 'socket.io'
      , transports: io.transports
      , 'connect timeout': 10000
      , 'try multiple transports': true
      , 'reconnect': true
      , 'reconnection delay': 500
      , 'reconnection limit': Infinity
      , 'reopen delay': 3000
      , 'max reconnection attempts': 10
      , 'sync disconnect on unload': false
      , 'auto connect': true
      , 'flash policy port': 10843
      , 'manualFlush': false
    };

    io.util.merge(this.options, options);

    this.connected = false;
    this.open = false;
    this.connecting = false;
    this.reconnecting = false;
    this.namespaces = {};
    this.buffer = [];
    this.doBuffer = false;

    if (this.options['sync disconnect on unload'] &&
        (!this.isXDomain() || io.util.ua.hasCORS)) {
      var self = this;
      io.util.on(global, 'beforeunload', function () {
        self.disconnectSync();
      }, false);
    }

    if (this.options['auto connect']) {
      this.connect();
    }
};

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(Socket, io.EventEmitter);

  /**
   * Returns a namespace listener/emitter for this socket
   *
   * @api public
   */

  Socket.prototype.of = function (name) {
    if (!this.namespaces[name]) {
      this.namespaces[name] = new io.SocketNamespace(this, name);

      if (name !== '') {
        this.namespaces[name].packet({ type: 'connect' });
      }
    }

    return this.namespaces[name];
  };

  /**
   * Emits the given event to the Socket and all namespaces
   *
   * @api private
   */

  Socket.prototype.publish = function () {
    this.emit.apply(this, arguments);

    var nsp;

    for (var i in this.namespaces) {
      if (this.namespaces.hasOwnProperty(i)) {
        nsp = this.of(i);
        nsp.$emit.apply(nsp, arguments);
      }
    }
  };

  /**
   * Performs the handshake
   *
   * @api private
   */

  function empty () { };

  Socket.prototype.handshake = function (fn) {
    var self = this
      , options = this.options;

    function complete (data) {
      if (data instanceof Error) {
        self.connecting = false;
        self.onError(data.message);
      } else {
        fn.apply(null, data.split(':'));
      }
    };

    var url = [
          'http' + (options.secure ? 's' : '') + ':/'
        , options.host + ':' + options.port
        , options.resource
        , io.protocol
        , io.util.query(this.options.query, 't=' + +new Date)
      ].join('/');

    if (this.isXDomain() && !io.util.ua.hasCORS) {
      var insertAt = document.getElementsByTagName('script')[0]
        , script = document.createElement('script');

      script.src = url + '&jsonp=' + io.j.length;
      insertAt.parentNode.insertBefore(script, insertAt);

      io.j.push(function (data) {
        complete(data);
        script.parentNode.removeChild(script);
      });
    } else {
      var xhr = io.util.request();

      xhr.open('GET', url, true);
      if (this.isXDomain()) {
        xhr.withCredentials = true;
      }
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          xhr.onreadystatechange = empty;

          if (xhr.status == 200) {
            complete(xhr.responseText);
          } else if (xhr.status == 403) {
            self.onError(xhr.responseText);
          } else {
            self.connecting = false;            
            !self.reconnecting && self.onError(xhr.responseText);
          }
        }
      };
      xhr.send(null);
    }
  };

  /**
   * Find an available transport based on the options supplied in the constructor.
   *
   * @api private
   */

  Socket.prototype.getTransport = function (override) {
    var transports = override || this.transports, match;

    for (var i = 0, transport; transport = transports[i]; i++) {
      if (io.Transport[transport]
        && io.Transport[transport].check(this)
        && (!this.isXDomain() || io.Transport[transport].xdomainCheck(this))) {
        return new io.Transport[transport](this, this.sessionid);
      }
    }

    return null;
  };

  /**
   * Connects to the server.
   *
   * @param {Function} [fn] Callback.
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.connect = function (fn) {
    if (this.connecting) {
      return this;
    }

    var self = this;
    self.connecting = true;
    
    this.handshake(function (sid, heartbeat, close, transports) {
      self.sessionid = sid;
      self.closeTimeout = close * 1000;
      self.heartbeatTimeout = heartbeat * 1000;
      if(!self.transports)
          self.transports = self.origTransports = (transports ? io.util.intersect(
              transports.split(',')
            , self.options.transports
          ) : self.options.transports);

      self.setHeartbeatTimeout();

      function connect (transports){
        if (self.transport) self.transport.clearTimeouts();

        self.transport = self.getTransport(transports);
        if (!self.transport) return self.publish('connect_failed');

        // once the transport is ready
        self.transport.ready(self, function () {
          self.connecting = true;
          self.publish('connecting', self.transport.name);
          self.transport.open();

          if (self.options['connect timeout']) {
            self.connectTimeoutTimer = setTimeout(function () {
              if (!self.connected) {
                self.connecting = false;

                if (self.options['try multiple transports']) {
                  var remaining = self.transports;

                  while (remaining.length > 0 && remaining.splice(0,1)[0] !=
                         self.transport.name) {}

                    if (remaining.length){
                      connect(remaining);
                    } else {
                      self.publish('connect_failed');
                    }
                }
              }
            }, self.options['connect timeout']);
          }
        });
      }

      connect(self.transports);

      self.once('connect', function (){
        clearTimeout(self.connectTimeoutTimer);

        fn && typeof fn == 'function' && fn();
      });
    });

    return this;
  };

  /**
   * Clears and sets a new heartbeat timeout using the value given by the
   * server during the handshake.
   *
   * @api private
   */

  Socket.prototype.setHeartbeatTimeout = function () {
    clearTimeout(this.heartbeatTimeoutTimer);
    if(this.transport && !this.transport.heartbeats()) return;

    var self = this;
    this.heartbeatTimeoutTimer = setTimeout(function () {
      self.transport.onClose();
    }, this.heartbeatTimeout);
  };

  /**
   * Sends a message.
   *
   * @param {Object} data packet.
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.packet = function (data) {
    if (this.connected && !this.doBuffer) {
      this.transport.packet(data);
    } else {
      this.buffer.push(data);
    }

    return this;
  };

  /**
   * Sets buffer state
   *
   * @api private
   */

  Socket.prototype.setBuffer = function (v) {
    this.doBuffer = v;

    if (!v && this.connected && this.buffer.length) {
      if (!this.options['manualFlush']) {
        this.flushBuffer();
      }
    }
  };

  /**
   * Flushes the buffer data over the wire.
   * To be invoked manually when 'manualFlush' is set to true.
   *
   * @api public
   */

  Socket.prototype.flushBuffer = function() {
    this.transport.payload(this.buffer);
    this.buffer = [];
  };
  

  /**
   * Disconnect the established connect.
   *
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.disconnect = function () {
    if (this.connected || this.connecting) {
      if (this.open) {
        this.of('').packet({ type: 'disconnect' });
      }

      // handle disconnection immediately
      this.onDisconnect('booted');
    }

    return this;
  };

  /**
   * Disconnects the socket with a sync XHR.
   *
   * @api private
   */

  Socket.prototype.disconnectSync = function () {
    // ensure disconnection
    var xhr = io.util.request();
    var uri = [
        'http' + (this.options.secure ? 's' : '') + ':/'
      , this.options.host + ':' + this.options.port
      , this.options.resource
      , io.protocol
      , ''
      , this.sessionid
    ].join('/') + '/?disconnect=1';

    xhr.open('GET', uri, false);
    xhr.send(null);

    // handle disconnection immediately
    this.onDisconnect('booted');
  };

  /**
   * Check if we need to use cross domain enabled transports. Cross domain would
   * be a different port or different domain name.
   *
   * @returns {Boolean}
   * @api private
   */

  Socket.prototype.isXDomain = function () {

    var port = global.location.port ||
      ('https:' == global.location.protocol ? 443 : 80);

    return this.options.host !== global.location.hostname 
      || this.options.port != port;
  };

  /**
   * Called upon handshake.
   *
   * @api private
   */

  Socket.prototype.onConnect = function () {
    if (!this.connected) {
      this.connected = true;
      this.connecting = false;
      if (!this.doBuffer) {
        // make sure to flush the buffer
        this.setBuffer(false);
      }
      this.emit('connect');
    }
  };

  /**
   * Called when the transport opens
   *
   * @api private
   */

  Socket.prototype.onOpen = function () {
    this.open = true;
  };

  /**
   * Called when the transport closes.
   *
   * @api private
   */

  Socket.prototype.onClose = function () {
    this.open = false;
    clearTimeout(this.heartbeatTimeoutTimer);
  };

  /**
   * Called when the transport first opens a connection
   *
   * @param text
   */

  Socket.prototype.onPacket = function (packet) {
    this.of(packet.endpoint).onPacket(packet);
  };

  /**
   * Handles an error.
   *
   * @api private
   */

  Socket.prototype.onError = function (err) {
    if (err && err.advice) {
      if (err.advice === 'reconnect' && (this.connected || this.connecting)) {
        this.disconnect();
        if (this.options.reconnect) {
          this.reconnect();
        }
      }
    }

    this.publish('error', err && err.reason ? err.reason : err);
  };

  /**
   * Called when the transport disconnects.
   *
   * @api private
   */

  Socket.prototype.onDisconnect = function (reason) {
    var wasConnected = this.connected
      , wasConnecting = this.connecting;

    this.connected = false;
    this.connecting = false;
    this.open = false;

    if (wasConnected || wasConnecting) {
      this.transport.close();
      this.transport.clearTimeouts();
      if (wasConnected) {
        this.publish('disconnect', reason);

        if ('booted' != reason && this.options.reconnect && !this.reconnecting) {
          this.reconnect();
        }
      }
    }
  };

  /**
   * Called upon reconnection.
   *
   * @api private
   */

  Socket.prototype.reconnect = function () {
    this.reconnecting = true;
    this.reconnectionAttempts = 0;
    this.reconnectionDelay = this.options['reconnection delay'];

    var self = this
      , maxAttempts = this.options['max reconnection attempts']
      , tryMultiple = this.options['try multiple transports']
      , limit = this.options['reconnection limit'];

    function reset () {
      if (self.connected) {
        for (var i in self.namespaces) {
          if (self.namespaces.hasOwnProperty(i) && '' !== i) {
              self.namespaces[i].packet({ type: 'connect' });
          }
        }
        self.publish('reconnect', self.transport.name, self.reconnectionAttempts);
      }

      clearTimeout(self.reconnectionTimer);

      self.removeListener('connect_failed', maybeReconnect);
      self.removeListener('connect', maybeReconnect);

      self.reconnecting = false;

      delete self.reconnectionAttempts;
      delete self.reconnectionDelay;
      delete self.reconnectionTimer;
      delete self.redoTransports;

      self.options['try multiple transports'] = tryMultiple;
    };

    function maybeReconnect () {
      if (!self.reconnecting) {
        return;
      }

      if (self.connected) {
        return reset();
      };

      if (self.connecting && self.reconnecting) {
        return self.reconnectionTimer = setTimeout(maybeReconnect, 1000);
      }

      if (self.reconnectionAttempts++ >= maxAttempts) {
        if (!self.redoTransports) {
          self.on('connect_failed', maybeReconnect);
          self.options['try multiple transports'] = true;
          self.transports = self.origTransports;
          self.transport = self.getTransport();
          self.redoTransports = true;
          self.connect();
        } else {
          self.publish('reconnect_failed');
          reset();
        }
      } else {
        if (self.reconnectionDelay < limit) {
          self.reconnectionDelay *= 2; // exponential back off
        }

        self.connect();
        self.publish('reconnecting', self.reconnectionDelay, self.reconnectionAttempts);
        self.reconnectionTimer = setTimeout(maybeReconnect, self.reconnectionDelay);
      }
    };

    this.options['try multiple transports'] = false;
    this.reconnectionTimer = setTimeout(maybeReconnect, this.reconnectionDelay);

    this.on('connect', maybeReconnect);
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.SocketNamespace = SocketNamespace;

  /**
   * Socket namespace constructor.
   *
   * @constructor
   * @api public
   */

  function SocketNamespace (socket, name) {
    this.socket = socket;
    this.name = name || '';
    this.flags = {};
    this.json = new Flag(this, 'json');
    this.ackPackets = 0;
    this.acks = {};
  };

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(SocketNamespace, io.EventEmitter);

  /**
   * Copies emit since we override it
   *
   * @api private
   */

  SocketNamespace.prototype.$emit = io.EventEmitter.prototype.emit;

  /**
   * Creates a new namespace, by proxying the request to the socket. This
   * allows us to use the synax as we do on the server.
   *
   * @api public
   */

  SocketNamespace.prototype.of = function () {
    return this.socket.of.apply(this.socket, arguments);
  };

  /**
   * Sends a packet.
   *
   * @api private
   */

  SocketNamespace.prototype.packet = function (packet) {
    packet.endpoint = this.name;
    this.socket.packet(packet);
    this.flags = {};
    return this;
  };

  /**
   * Sends a message
   *
   * @api public
   */

  SocketNamespace.prototype.send = function (data, fn) {
    var packet = {
        type: this.flags.json ? 'json' : 'message'
      , data: data
    };

    if ('function' == typeof fn) {
      packet.id = ++this.ackPackets;
      packet.ack = true;
      this.acks[packet.id] = fn;
    }

    return this.packet(packet);
  };

  /**
   * Emits an event
   *
   * @api public
   */
  
  SocketNamespace.prototype.emit = function (name) {
    var args = Array.prototype.slice.call(arguments, 1)
      , lastArg = args[args.length - 1]
      , packet = {
            type: 'event'
          , name: name
        };

    if ('function' == typeof lastArg) {
      packet.id = ++this.ackPackets;
      packet.ack = 'data';
      this.acks[packet.id] = lastArg;
      args = args.slice(0, args.length - 1);
    }

    packet.args = args;

    return this.packet(packet);
  };

  /**
   * Disconnects the namespace
   *
   * @api private
   */

  SocketNamespace.prototype.disconnect = function () {
    if (this.name === '') {
      this.socket.disconnect();
    } else {
      this.packet({ type: 'disconnect' });
      this.$emit('disconnect');
    }

    return this;
  };

  /**
   * Handles a packet
   *
   * @api private
   */

  SocketNamespace.prototype.onPacket = function (packet) {
    var self = this;

    function ack () {
      self.packet({
          type: 'ack'
        , args: io.util.toArray(arguments)
        , ackId: packet.id
      });
    };

    switch (packet.type) {
      case 'connect':
        this.$emit('connect');
        break;

      case 'disconnect':
        if (this.name === '') {
          this.socket.onDisconnect(packet.reason || 'booted');
        } else {
          this.$emit('disconnect', packet.reason);
        }
        break;

      case 'message':
      case 'json':
        var params = ['message', packet.data];

        if (packet.ack == 'data') {
          params.push(ack);
        } else if (packet.ack) {
          this.packet({ type: 'ack', ackId: packet.id });
        }

        this.$emit.apply(this, params);
        break;

      case 'event':
        var params = [packet.name].concat(packet.args);

        if (packet.ack == 'data')
          params.push(ack);

        this.$emit.apply(this, params);
        break;

      case 'ack':
        if (this.acks[packet.ackId]) {
          this.acks[packet.ackId].apply(this, packet.args);
          delete this.acks[packet.ackId];
        }
        break;

      case 'error':
        if (packet.advice){
          this.socket.onError(packet);
        } else {
          if (packet.reason == 'unauthorized') {
            this.$emit('connect_failed', packet.reason);
          } else {
            this.$emit('error', packet.reason);
          }
        }
        break;
    }
  };

  /**
   * Flag interface.
   *
   * @api private
   */

  function Flag (nsp, name) {
    this.namespace = nsp;
    this.name = name;
  };

  /**
   * Send a message
   *
   * @api public
   */

  Flag.prototype.send = function () {
    this.namespace.flags[this.name] = true;
    this.namespace.send.apply(this.namespace, arguments);
  };

  /**
   * Emit an event
   *
   * @api public
   */

  Flag.prototype.emit = function () {
    this.namespace.flags[this.name] = true;
    this.namespace.emit.apply(this.namespace, arguments);
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports.websocket = WS;

  /**
   * The WebSocket transport uses the HTML5 WebSocket API to establish an
   * persistent connection with the Socket.IO server. This transport will also
   * be inherited by the FlashSocket fallback as it provides a API compatible
   * polyfill for the WebSockets.
   *
   * @constructor
   * @extends {io.Transport}
   * @api public
   */

  function WS (socket) {
    io.Transport.apply(this, arguments);
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(WS, io.Transport);

  /**
   * Transport name
   *
   * @api public
   */

  WS.prototype.name = 'websocket';

  /**
   * Initializes a new `WebSocket` connection with the Socket.IO server. We attach
   * all the appropriate listeners to handle the responses from the server.
   *
   * @returns {Transport}
   * @api public
   */

  WS.prototype.open = function () {
    var query = io.util.query(this.socket.options.query)
      , self = this
      , Socket


    if (!Socket) {
      Socket = global.MozWebSocket || global.WebSocket;
    }

    this.websocket = new Socket(this.prepareUrl() + query);

    this.websocket.onopen = function () {
      self.onOpen();
      self.socket.setBuffer(false);
    };
    this.websocket.onmessage = function (ev) {
      self.onData(ev.data);
    };
    this.websocket.onclose = function () {
      self.onClose();
      self.socket.setBuffer(true);
    };
    this.websocket.onerror = function (e) {
      self.onError(e);
    };

    return this;
  };

  /**
   * Send a message to the Socket.IO server. The message will automatically be
   * encoded in the correct message format.
   *
   * @returns {Transport}
   * @api public
   */

  // Do to a bug in the current IDevices browser, we need to wrap the send in a 
  // setTimeout, when they resume from sleeping the browser will crash if 
  // we don't allow the browser time to detect the socket has been closed
  if (io.util.ua.iDevice) {
    WS.prototype.send = function (data) {
      var self = this;
      setTimeout(function() {
         self.websocket.send(data);
      },0);
      return this;
    };
  } else {
    WS.prototype.send = function (data) {
      this.websocket.send(data);
      return this;
    };
  }

  /**
   * Payload
   *
   * @api private
   */

  WS.prototype.payload = function (arr) {
    for (var i = 0, l = arr.length; i < l; i++) {
      this.packet(arr[i]);
    }
    return this;
  };

  /**
   * Disconnect the established `WebSocket` connection.
   *
   * @returns {Transport}
   * @api public
   */

  WS.prototype.close = function () {
    this.websocket.close();
    return this;
  };

  /**
   * Handle the errors that `WebSocket` might be giving when we
   * are attempting to connect or send messages.
   *
   * @param {Error} e The error.
   * @api private
   */

  WS.prototype.onError = function (e) {
    this.socket.onError(e);
  };

  /**
   * Returns the appropriate scheme for the URI generation.
   *
   * @api private
   */
  WS.prototype.scheme = function () {
    return this.socket.options.secure ? 'wss' : 'ws';
  };

  /**
   * Checks if the browser has support for native `WebSockets` and that
   * it's not the polyfill created for the FlashSocket transport.
   *
   * @return {Boolean}
   * @api public
   */

  WS.check = function () {
    return ('WebSocket' in global && !('__addTask' in WebSocket))
          || 'MozWebSocket' in global;
  };

  /**
   * Check if the `WebSocket` transport support cross domain communications.
   *
   * @returns {Boolean}
   * @api public
   */

  WS.xdomainCheck = function () {
    return true;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('websocket');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.flashsocket = Flashsocket;

  /**
   * The FlashSocket transport. This is a API wrapper for the HTML5 WebSocket
   * specification. It uses a .swf file to communicate with the server. If you want
   * to serve the .swf file from a other server than where the Socket.IO script is
   * coming from you need to use the insecure version of the .swf. More information
   * about this can be found on the github page.
   *
   * @constructor
   * @extends {io.Transport.websocket}
   * @api public
   */

  function Flashsocket () {
    io.Transport.websocket.apply(this, arguments);
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(Flashsocket, io.Transport.websocket);

  /**
   * Transport name
   *
   * @api public
   */

  Flashsocket.prototype.name = 'flashsocket';

  /**
   * Disconnect the established `FlashSocket` connection. This is done by adding a 
   * new task to the FlashSocket. The rest will be handled off by the `WebSocket` 
   * transport.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.open = function () {
    var self = this
      , args = arguments;

    WebSocket.__addTask(function () {
      io.Transport.websocket.prototype.open.apply(self, args);
    });
    return this;
  };
  
  /**
   * Sends a message to the Socket.IO server. This is done by adding a new
   * task to the FlashSocket. The rest will be handled off by the `WebSocket` 
   * transport.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.send = function () {
    var self = this, args = arguments;
    WebSocket.__addTask(function () {
      io.Transport.websocket.prototype.send.apply(self, args);
    });
    return this;
  };

  /**
   * Disconnects the established `FlashSocket` connection.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.close = function () {
    WebSocket.__tasks.length = 0;
    io.Transport.websocket.prototype.close.call(this);
    return this;
  };

  /**
   * The WebSocket fall back needs to append the flash container to the body
   * element, so we need to make sure we have access to it. Or defer the call
   * until we are sure there is a body element.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  Flashsocket.prototype.ready = function (socket, fn) {
    function init () {
      var options = socket.options
        , port = options['flash policy port']
        , path = [
              'http' + (options.secure ? 's' : '') + ':/'
            , options.host + ':' + options.port
            , options.resource
            , 'static/flashsocket'
            , 'WebSocketMain' + (socket.isXDomain() ? 'Insecure' : '') + '.swf'
          ];

      // Only start downloading the swf file when the checked that this browser
      // actually supports it
      if (!Flashsocket.loaded) {
        if (typeof WEB_SOCKET_SWF_LOCATION === 'undefined') {
          // Set the correct file based on the XDomain settings
          WEB_SOCKET_SWF_LOCATION = path.join('/');
        }

        if (port !== 843) {
          WebSocket.loadFlashPolicyFile('xmlsocket://' + options.host + ':' + port);
        }

        WebSocket.__initialize();
        Flashsocket.loaded = true;
      }

      fn.call(self);
    }

    var self = this;
    if (document.body) return init();

    io.util.load(init);
  };

  /**
   * Check if the FlashSocket transport is supported as it requires that the Adobe
   * Flash Player plug-in version `10.0.0` or greater is installed. And also check if
   * the polyfill is correctly loaded.
   *
   * @returns {Boolean}
   * @api public
   */

  Flashsocket.check = function () {
    if (
        typeof WebSocket == 'undefined'
      || !('__initialize' in WebSocket) || !swfobject
    ) return false;

    return swfobject.getFlashPlayerVersion().major >= 10;
  };

  /**
   * Check if the FlashSocket transport can be used as cross domain / cross origin 
   * transport. Because we can't see which type (secure or insecure) of .swf is used
   * we will just return true.
   *
   * @returns {Boolean}
   * @api public
   */

  Flashsocket.xdomainCheck = function () {
    return true;
  };

  /**
   * Disable AUTO_INITIALIZATION
   */

  if (typeof window != 'undefined') {
    WEB_SOCKET_DISABLE_AUTO_INITIALIZATION = true;
  }

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('flashsocket');
})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/*	SWFObject v2.2 <http://code.google.com/p/swfobject/> 
	is released under the MIT License <http://www.opensource.org/licenses/mit-license.php> 
*/
if ('undefined' != typeof window) {
var swfobject=function(){var D="undefined",r="object",S="Shockwave Flash",W="ShockwaveFlash.ShockwaveFlash",q="application/x-shockwave-flash",R="SWFObjectExprInst",x="onreadystatechange",O=window,j=document,t=navigator,T=false,U=[h],o=[],N=[],I=[],l,Q,E,B,J=false,a=false,n,G,m=true,M=function(){var aa=typeof j.getElementById!=D&&typeof j.getElementsByTagName!=D&&typeof j.createElement!=D,ah=t.userAgent.toLowerCase(),Y=t.platform.toLowerCase(),ae=Y?/win/.test(Y):/win/.test(ah),ac=Y?/mac/.test(Y):/mac/.test(ah),af=/webkit/.test(ah)?parseFloat(ah.replace(/^.*webkit\/(\d+(\.\d+)?).*$/,"$1")):false,X=!+"\v1",ag=[0,0,0],ab=null;if(typeof t.plugins!=D&&typeof t.plugins[S]==r){ab=t.plugins[S].description;if(ab&&!(typeof t.mimeTypes!=D&&t.mimeTypes[q]&&!t.mimeTypes[q].enabledPlugin)){T=true;X=false;ab=ab.replace(/^.*\s+(\S+\s+\S+$)/,"$1");ag[0]=parseInt(ab.replace(/^(.*)\..*$/,"$1"),10);ag[1]=parseInt(ab.replace(/^.*\.(.*)\s.*$/,"$1"),10);ag[2]=/[a-zA-Z]/.test(ab)?parseInt(ab.replace(/^.*[a-zA-Z]+(.*)$/,"$1"),10):0}}else{if(typeof O[(['Active'].concat('Object').join('X'))]!=D){try{var ad=new window[(['Active'].concat('Object').join('X'))](W);if(ad){ab=ad.GetVariable("$version");if(ab){X=true;ab=ab.split(" ")[1].split(",");ag=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}}catch(Z){}}}return{w3:aa,pv:ag,wk:af,ie:X,win:ae,mac:ac}}(),k=function(){if(!M.w3){return}if((typeof j.readyState!=D&&j.readyState=="complete")||(typeof j.readyState==D&&(j.getElementsByTagName("body")[0]||j.body))){f()}if(!J){if(typeof j.addEventListener!=D){j.addEventListener("DOMContentLoaded",f,false)}if(M.ie&&M.win){j.attachEvent(x,function(){if(j.readyState=="complete"){j.detachEvent(x,arguments.callee);f()}});if(O==top){(function(){if(J){return}try{j.documentElement.doScroll("left")}catch(X){setTimeout(arguments.callee,0);return}f()})()}}if(M.wk){(function(){if(J){return}if(!/loaded|complete/.test(j.readyState)){setTimeout(arguments.callee,0);return}f()})()}s(f)}}();function f(){if(J){return}try{var Z=j.getElementsByTagName("body")[0].appendChild(C("span"));Z.parentNode.removeChild(Z)}catch(aa){return}J=true;var X=U.length;for(var Y=0;Y<X;Y++){U[Y]()}}function K(X){if(J){X()}else{U[U.length]=X}}function s(Y){if(typeof O.addEventListener!=D){O.addEventListener("load",Y,false)}else{if(typeof j.addEventListener!=D){j.addEventListener("load",Y,false)}else{if(typeof O.attachEvent!=D){i(O,"onload",Y)}else{if(typeof O.onload=="function"){var X=O.onload;O.onload=function(){X();Y()}}else{O.onload=Y}}}}}function h(){if(T){V()}else{H()}}function V(){var X=j.getElementsByTagName("body")[0];var aa=C(r);aa.setAttribute("type",q);var Z=X.appendChild(aa);if(Z){var Y=0;(function(){if(typeof Z.GetVariable!=D){var ab=Z.GetVariable("$version");if(ab){ab=ab.split(" ")[1].split(",");M.pv=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}else{if(Y<10){Y++;setTimeout(arguments.callee,10);return}}X.removeChild(aa);Z=null;H()})()}else{H()}}function H(){var ag=o.length;if(ag>0){for(var af=0;af<ag;af++){var Y=o[af].id;var ab=o[af].callbackFn;var aa={success:false,id:Y};if(M.pv[0]>0){var ae=c(Y);if(ae){if(F(o[af].swfVersion)&&!(M.wk&&M.wk<312)){w(Y,true);if(ab){aa.success=true;aa.ref=z(Y);ab(aa)}}else{if(o[af].expressInstall&&A()){var ai={};ai.data=o[af].expressInstall;ai.width=ae.getAttribute("width")||"0";ai.height=ae.getAttribute("height")||"0";if(ae.getAttribute("class")){ai.styleclass=ae.getAttribute("class")}if(ae.getAttribute("align")){ai.align=ae.getAttribute("align")}var ah={};var X=ae.getElementsByTagName("param");var ac=X.length;for(var ad=0;ad<ac;ad++){if(X[ad].getAttribute("name").toLowerCase()!="movie"){ah[X[ad].getAttribute("name")]=X[ad].getAttribute("value")}}P(ai,ah,Y,ab)}else{p(ae);if(ab){ab(aa)}}}}}else{w(Y,true);if(ab){var Z=z(Y);if(Z&&typeof Z.SetVariable!=D){aa.success=true;aa.ref=Z}ab(aa)}}}}}function z(aa){var X=null;var Y=c(aa);if(Y&&Y.nodeName=="OBJECT"){if(typeof Y.SetVariable!=D){X=Y}else{var Z=Y.getElementsByTagName(r)[0];if(Z){X=Z}}}return X}function A(){return !a&&F("6.0.65")&&(M.win||M.mac)&&!(M.wk&&M.wk<312)}function P(aa,ab,X,Z){a=true;E=Z||null;B={success:false,id:X};var ae=c(X);if(ae){if(ae.nodeName=="OBJECT"){l=g(ae);Q=null}else{l=ae;Q=X}aa.id=R;if(typeof aa.width==D||(!/%$/.test(aa.width)&&parseInt(aa.width,10)<310)){aa.width="310"}if(typeof aa.height==D||(!/%$/.test(aa.height)&&parseInt(aa.height,10)<137)){aa.height="137"}j.title=j.title.slice(0,47)+" - Flash Player Installation";var ad=M.ie&&M.win?(['Active'].concat('').join('X')):"PlugIn",ac="MMredirectURL="+O.location.toString().replace(/&/g,"%26")+"&MMplayerType="+ad+"&MMdoctitle="+j.title;if(typeof ab.flashvars!=D){ab.flashvars+="&"+ac}else{ab.flashvars=ac}if(M.ie&&M.win&&ae.readyState!=4){var Y=C("div");X+="SWFObjectNew";Y.setAttribute("id",X);ae.parentNode.insertBefore(Y,ae);ae.style.display="none";(function(){if(ae.readyState==4){ae.parentNode.removeChild(ae)}else{setTimeout(arguments.callee,10)}})()}u(aa,ab,X)}}function p(Y){if(M.ie&&M.win&&Y.readyState!=4){var X=C("div");Y.parentNode.insertBefore(X,Y);X.parentNode.replaceChild(g(Y),X);Y.style.display="none";(function(){if(Y.readyState==4){Y.parentNode.removeChild(Y)}else{setTimeout(arguments.callee,10)}})()}else{Y.parentNode.replaceChild(g(Y),Y)}}function g(ab){var aa=C("div");if(M.win&&M.ie){aa.innerHTML=ab.innerHTML}else{var Y=ab.getElementsByTagName(r)[0];if(Y){var ad=Y.childNodes;if(ad){var X=ad.length;for(var Z=0;Z<X;Z++){if(!(ad[Z].nodeType==1&&ad[Z].nodeName=="PARAM")&&!(ad[Z].nodeType==8)){aa.appendChild(ad[Z].cloneNode(true))}}}}}return aa}function u(ai,ag,Y){var X,aa=c(Y);if(M.wk&&M.wk<312){return X}if(aa){if(typeof ai.id==D){ai.id=Y}if(M.ie&&M.win){var ah="";for(var ae in ai){if(ai[ae]!=Object.prototype[ae]){if(ae.toLowerCase()=="data"){ag.movie=ai[ae]}else{if(ae.toLowerCase()=="styleclass"){ah+=' class="'+ai[ae]+'"'}else{if(ae.toLowerCase()!="classid"){ah+=" "+ae+'="'+ai[ae]+'"'}}}}}var af="";for(var ad in ag){if(ag[ad]!=Object.prototype[ad]){af+='<param name="'+ad+'" value="'+ag[ad]+'" />'}}aa.outerHTML='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'+ah+">"+af+"</object>";N[N.length]=ai.id;X=c(ai.id)}else{var Z=C(r);Z.setAttribute("type",q);for(var ac in ai){if(ai[ac]!=Object.prototype[ac]){if(ac.toLowerCase()=="styleclass"){Z.setAttribute("class",ai[ac])}else{if(ac.toLowerCase()!="classid"){Z.setAttribute(ac,ai[ac])}}}}for(var ab in ag){if(ag[ab]!=Object.prototype[ab]&&ab.toLowerCase()!="movie"){e(Z,ab,ag[ab])}}aa.parentNode.replaceChild(Z,aa);X=Z}}return X}function e(Z,X,Y){var aa=C("param");aa.setAttribute("name",X);aa.setAttribute("value",Y);Z.appendChild(aa)}function y(Y){var X=c(Y);if(X&&X.nodeName=="OBJECT"){if(M.ie&&M.win){X.style.display="none";(function(){if(X.readyState==4){b(Y)}else{setTimeout(arguments.callee,10)}})()}else{X.parentNode.removeChild(X)}}}function b(Z){var Y=c(Z);if(Y){for(var X in Y){if(typeof Y[X]=="function"){Y[X]=null}}Y.parentNode.removeChild(Y)}}function c(Z){var X=null;try{X=j.getElementById(Z)}catch(Y){}return X}function C(X){return j.createElement(X)}function i(Z,X,Y){Z.attachEvent(X,Y);I[I.length]=[Z,X,Y]}function F(Z){var Y=M.pv,X=Z.split(".");X[0]=parseInt(X[0],10);X[1]=parseInt(X[1],10)||0;X[2]=parseInt(X[2],10)||0;return(Y[0]>X[0]||(Y[0]==X[0]&&Y[1]>X[1])||(Y[0]==X[0]&&Y[1]==X[1]&&Y[2]>=X[2]))?true:false}function v(ac,Y,ad,ab){if(M.ie&&M.mac){return}var aa=j.getElementsByTagName("head")[0];if(!aa){return}var X=(ad&&typeof ad=="string")?ad:"screen";if(ab){n=null;G=null}if(!n||G!=X){var Z=C("style");Z.setAttribute("type","text/css");Z.setAttribute("media",X);n=aa.appendChild(Z);if(M.ie&&M.win&&typeof j.styleSheets!=D&&j.styleSheets.length>0){n=j.styleSheets[j.styleSheets.length-1]}G=X}if(M.ie&&M.win){if(n&&typeof n.addRule==r){n.addRule(ac,Y)}}else{if(n&&typeof j.createTextNode!=D){n.appendChild(j.createTextNode(ac+" {"+Y+"}"))}}}function w(Z,X){if(!m){return}var Y=X?"visible":"hidden";if(J&&c(Z)){c(Z).style.visibility=Y}else{v("#"+Z,"visibility:"+Y)}}function L(Y){var Z=/[\\\"<>\.;]/;var X=Z.exec(Y)!=null;return X&&typeof encodeURIComponent!=D?encodeURIComponent(Y):Y}var d=function(){if(M.ie&&M.win){window.attachEvent("onunload",function(){var ac=I.length;for(var ab=0;ab<ac;ab++){I[ab][0].detachEvent(I[ab][1],I[ab][2])}var Z=N.length;for(var aa=0;aa<Z;aa++){y(N[aa])}for(var Y in M){M[Y]=null}M=null;for(var X in swfobject){swfobject[X]=null}swfobject=null})}}();return{registerObject:function(ab,X,aa,Z){if(M.w3&&ab&&X){var Y={};Y.id=ab;Y.swfVersion=X;Y.expressInstall=aa;Y.callbackFn=Z;o[o.length]=Y;w(ab,false)}else{if(Z){Z({success:false,id:ab})}}},getObjectById:function(X){if(M.w3){return z(X)}},embedSWF:function(ab,ah,ae,ag,Y,aa,Z,ad,af,ac){var X={success:false,id:ah};if(M.w3&&!(M.wk&&M.wk<312)&&ab&&ah&&ae&&ag&&Y){w(ah,false);K(function(){ae+="";ag+="";var aj={};if(af&&typeof af===r){for(var al in af){aj[al]=af[al]}}aj.data=ab;aj.width=ae;aj.height=ag;var am={};if(ad&&typeof ad===r){for(var ak in ad){am[ak]=ad[ak]}}if(Z&&typeof Z===r){for(var ai in Z){if(typeof am.flashvars!=D){am.flashvars+="&"+ai+"="+Z[ai]}else{am.flashvars=ai+"="+Z[ai]}}}if(F(Y)){var an=u(aj,am,ah);if(aj.id==ah){w(ah,true)}X.success=true;X.ref=an}else{if(aa&&A()){aj.data=aa;P(aj,am,ah,ac);return}else{w(ah,true)}}if(ac){ac(X)}})}else{if(ac){ac(X)}}},switchOffAutoHideShow:function(){m=false},ua:M,getFlashPlayerVersion:function(){return{major:M.pv[0],minor:M.pv[1],release:M.pv[2]}},hasFlashPlayerVersion:F,createSWF:function(Z,Y,X){if(M.w3){return u(Z,Y,X)}else{return undefined}},showExpressInstall:function(Z,aa,X,Y){if(M.w3&&A()){P(Z,aa,X,Y)}},removeSWF:function(X){if(M.w3){y(X)}},createCSS:function(aa,Z,Y,X){if(M.w3){v(aa,Z,Y,X)}},addDomLoadEvent:K,addLoadEvent:s,getQueryParamValue:function(aa){var Z=j.location.search||j.location.hash;if(Z){if(/\?/.test(Z)){Z=Z.split("?")[1]}if(aa==null){return L(Z)}var Y=Z.split("&");for(var X=0;X<Y.length;X++){if(Y[X].substring(0,Y[X].indexOf("="))==aa){return L(Y[X].substring((Y[X].indexOf("=")+1)))}}}return""},expressInstallCallback:function(){if(a){var X=c(R);if(X&&l){X.parentNode.replaceChild(l,X);if(Q){w(Q,true);if(M.ie&&M.win){l.style.display="block"}}if(E){E(B)}}a=false}}}}();
}
// Copyright: Hiroshi Ichikawa <http://gimite.net/en/>
// License: New BSD License
// Reference: http://dev.w3.org/html5/websockets/
// Reference: http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol

(function() {
  
  if ('undefined' == typeof window || window.WebSocket) return;

  var console = window.console;
  if (!console || !console.log || !console.error) {
    console = {log: function(){ }, error: function(){ }};
  }
  
  if (!swfobject.hasFlashPlayerVersion("10.0.0")) {
    console.error("Flash Player >= 10.0.0 is required.");
    return;
  }
  if (location.protocol == "file:") {
    console.error(
      "WARNING: web-socket-js doesn't work in file:///... URL " +
      "unless you set Flash Security Settings properly. " +
      "Open the page via Web server i.e. http://...");
  }

  /**
   * This class represents a faux web socket.
   * @param {string} url
   * @param {array or string} protocols
   * @param {string} proxyHost
   * @param {int} proxyPort
   * @param {string} headers
   */
  WebSocket = function(url, protocols, proxyHost, proxyPort, headers) {
    var self = this;
    self.__id = WebSocket.__nextId++;
    WebSocket.__instances[self.__id] = self;
    self.readyState = WebSocket.CONNECTING;
    self.bufferedAmount = 0;
    self.__events = {};
    if (!protocols) {
      protocols = [];
    } else if (typeof protocols == "string") {
      protocols = [protocols];
    }
    // Uses setTimeout() to make sure __createFlash() runs after the caller sets ws.onopen etc.
    // Otherwise, when onopen fires immediately, onopen is called before it is set.
    setTimeout(function() {
      WebSocket.__addTask(function() {
        WebSocket.__flash.create(
            self.__id, url, protocols, proxyHost || null, proxyPort || 0, headers || null);
      });
    }, 0);
  };

  /**
   * Send data to the web socket.
   * @param {string} data  The data to send to the socket.
   * @return {boolean}  True for success, false for failure.
   */
  WebSocket.prototype.send = function(data) {
    if (this.readyState == WebSocket.CONNECTING) {
      throw "INVALID_STATE_ERR: Web Socket connection has not been established";
    }
    // We use encodeURIComponent() here, because FABridge doesn't work if
    // the argument includes some characters. We don't use escape() here
    // because of this:
    // https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Functions#escape_and_unescape_Functions
    // But it looks decodeURIComponent(encodeURIComponent(s)) doesn't
    // preserve all Unicode characters either e.g. "\uffff" in Firefox.
    // Note by wtritch: Hopefully this will not be necessary using ExternalInterface.  Will require
    // additional testing.
    var result = WebSocket.__flash.send(this.__id, encodeURIComponent(data));
    if (result < 0) { // success
      return true;
    } else {
      this.bufferedAmount += result;
      return false;
    }
  };

  /**
   * Close this web socket gracefully.
   */
  WebSocket.prototype.close = function() {
    if (this.readyState == WebSocket.CLOSED || this.readyState == WebSocket.CLOSING) {
      return;
    }
    this.readyState = WebSocket.CLOSING;
    WebSocket.__flash.close(this.__id);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.addEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) {
      this.__events[type] = [];
    }
    this.__events[type].push(listener);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.removeEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) return;
    var events = this.__events[type];
    for (var i = events.length - 1; i >= 0; --i) {
      if (events[i] === listener) {
        events.splice(i, 1);
        break;
      }
    }
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {Event} event
   * @return void
   */
  WebSocket.prototype.dispatchEvent = function(event) {
    var events = this.__events[event.type] || [];
    for (var i = 0; i < events.length; ++i) {
      events[i](event);
    }
    var handler = this["on" + event.type];
    if (handler) handler(event);
  };

  /**
   * Handles an event from Flash.
   * @param {Object} flashEvent
   */
  WebSocket.prototype.__handleEvent = function(flashEvent) {
    if ("readyState" in flashEvent) {
      this.readyState = flashEvent.readyState;
    }
    if ("protocol" in flashEvent) {
      this.protocol = flashEvent.protocol;
    }
    
    var jsEvent;
    if (flashEvent.type == "open" || flashEvent.type == "error") {
      jsEvent = this.__createSimpleEvent(flashEvent.type);
    } else if (flashEvent.type == "close") {
      // TODO implement jsEvent.wasClean
      jsEvent = this.__createSimpleEvent("close");
    } else if (flashEvent.type == "message") {
      var data = decodeURIComponent(flashEvent.message);
      jsEvent = this.__createMessageEvent("message", data);
    } else {
      throw "unknown event type: " + flashEvent.type;
    }
    
    this.dispatchEvent(jsEvent);
  };
  
  WebSocket.prototype.__createSimpleEvent = function(type) {
    if (document.createEvent && window.Event) {
      var event = document.createEvent("Event");
      event.initEvent(type, false, false);
      return event;
    } else {
      return {type: type, bubbles: false, cancelable: false};
    }
  };
  
  WebSocket.prototype.__createMessageEvent = function(type, data) {
    if (document.createEvent && window.MessageEvent && !window.opera) {
      var event = document.createEvent("MessageEvent");
      event.initMessageEvent("message", false, false, data, null, null, window, null);
      return event;
    } else {
      // IE and Opera, the latter one truncates the data parameter after any 0x00 bytes.
      return {type: type, data: data, bubbles: false, cancelable: false};
    }
  };
  
  /**
   * Define the WebSocket readyState enumeration.
   */
  WebSocket.CONNECTING = 0;
  WebSocket.OPEN = 1;
  WebSocket.CLOSING = 2;
  WebSocket.CLOSED = 3;

  WebSocket.__flash = null;
  WebSocket.__instances = {};
  WebSocket.__tasks = [];
  WebSocket.__nextId = 0;
  
  /**
   * Load a new flash security policy file.
   * @param {string} url
   */
  WebSocket.loadFlashPolicyFile = function(url){
    WebSocket.__addTask(function() {
      WebSocket.__flash.loadManualPolicyFile(url);
    });
  };

  /**
   * Loads WebSocketMain.swf and creates WebSocketMain object in Flash.
   */
  WebSocket.__initialize = function() {
    if (WebSocket.__flash) return;
    
    if (WebSocket.__swfLocation) {
      // For backword compatibility.
      window.WEB_SOCKET_SWF_LOCATION = WebSocket.__swfLocation;
    }
    if (!window.WEB_SOCKET_SWF_LOCATION) {
      console.error("[WebSocket] set WEB_SOCKET_SWF_LOCATION to location of WebSocketMain.swf");
      return;
    }
    var container = document.createElement("div");
    container.id = "webSocketContainer";
    // Hides Flash box. We cannot use display: none or visibility: hidden because it prevents
    // Flash from loading at least in IE. So we move it out of the screen at (-100, -100).
    // But this even doesn't work with Flash Lite (e.g. in Droid Incredible). So with Flash
    // Lite, we put it at (0, 0). This shows 1x1 box visible at left-top corner but this is
    // the best we can do as far as we know now.
    container.style.position = "absolute";
    if (WebSocket.__isFlashLite()) {
      container.style.left = "0px";
      container.style.top = "0px";
    } else {
      container.style.left = "-100px";
      container.style.top = "-100px";
    }
    var holder = document.createElement("div");
    holder.id = "webSocketFlash";
    container.appendChild(holder);
    document.body.appendChild(container);
    // See this article for hasPriority:
    // http://help.adobe.com/en_US/as3/mobile/WS4bebcd66a74275c36cfb8137124318eebc6-7ffd.html
    swfobject.embedSWF(
      WEB_SOCKET_SWF_LOCATION,
      "webSocketFlash",
      "1" /* width */,
      "1" /* height */,
      "10.0.0" /* SWF version */,
      null,
      null,
      {hasPriority: true, swliveconnect : true, allowScriptAccess: "always"},
      null,
      function(e) {
        if (!e.success) {
          console.error("[WebSocket] swfobject.embedSWF failed");
        }
      });
  };
  
  /**
   * Called by Flash to notify JS that it's fully loaded and ready
   * for communication.
   */
  WebSocket.__onFlashInitialized = function() {
    // We need to set a timeout here to avoid round-trip calls
    // to flash during the initialization process.
    setTimeout(function() {
      WebSocket.__flash = document.getElementById("webSocketFlash");
      WebSocket.__flash.setCallerUrl(location.href);
      WebSocket.__flash.setDebug(!!window.WEB_SOCKET_DEBUG);
      for (var i = 0; i < WebSocket.__tasks.length; ++i) {
        WebSocket.__tasks[i]();
      }
      WebSocket.__tasks = [];
    }, 0);
  };
  
  /**
   * Called by Flash to notify WebSockets events are fired.
   */
  WebSocket.__onFlashEvent = function() {
    setTimeout(function() {
      try {
        // Gets events using receiveEvents() instead of getting it from event object
        // of Flash event. This is to make sure to keep message order.
        // It seems sometimes Flash events don't arrive in the same order as they are sent.
        var events = WebSocket.__flash.receiveEvents();
        for (var i = 0; i < events.length; ++i) {
          WebSocket.__instances[events[i].webSocketId].__handleEvent(events[i]);
        }
      } catch (e) {
        console.error(e);
      }
    }, 0);
    return true;
  };
  
  // Called by Flash.
  WebSocket.__log = function(message) {
    console.log(decodeURIComponent(message));
  };
  
  // Called by Flash.
  WebSocket.__error = function(message) {
    console.error(decodeURIComponent(message));
  };
  
  WebSocket.__addTask = function(task) {
    if (WebSocket.__flash) {
      task();
    } else {
      WebSocket.__tasks.push(task);
    }
  };
  
  /**
   * Test if the browser is running flash lite.
   * @return {boolean} True if flash lite is running, false otherwise.
   */
  WebSocket.__isFlashLite = function() {
    if (!window.navigator || !window.navigator.mimeTypes) {
      return false;
    }
    var mimeType = window.navigator.mimeTypes["application/x-shockwave-flash"];
    if (!mimeType || !mimeType.enabledPlugin || !mimeType.enabledPlugin.filename) {
      return false;
    }
    return mimeType.enabledPlugin.filename.match(/flashlite/i) ? true : false;
  };
  
  if (!window.WEB_SOCKET_DISABLE_AUTO_INITIALIZATION) {
    if (window.addEventListener) {
      window.addEventListener("load", function(){
        WebSocket.__initialize();
      }, false);
    } else {
      window.attachEvent("onload", function(){
        WebSocket.__initialize();
      });
    }
  }
  
})();

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   *
   * @api public
   */

  exports.XHR = XHR;

  /**
   * XHR constructor
   *
   * @costructor
   * @api public
   */

  function XHR (socket) {
    if (!socket) return;

    io.Transport.apply(this, arguments);
    this.sendBuffer = [];
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(XHR, io.Transport);

  /**
   * Establish a connection
   *
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.open = function () {
    this.socket.setBuffer(false);
    this.onOpen();
    this.get();

    // we need to make sure the request succeeds since we have no indication
    // whether the request opened or not until it succeeded.
    this.setCloseTimeout();

    return this;
  };

  /**
   * Check if we need to send data to the Socket.IO server, if we have data in our
   * buffer we encode it and forward it to the `post` method.
   *
   * @api private
   */

  XHR.prototype.payload = function (payload) {
    var msgs = [];

    for (var i = 0, l = payload.length; i < l; i++) {
      msgs.push(io.parser.encodePacket(payload[i]));
    }

    this.send(io.parser.encodePayload(msgs));
  };

  /**
   * Send data to the Socket.IO server.
   *
   * @param data The message
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.send = function (data) {
    this.post(data);
    return this;
  };

  /**
   * Posts a encoded message to the Socket.IO server.
   *
   * @param {String} data A encoded message.
   * @api private
   */

  function empty () { };

  XHR.prototype.post = function (data) {
    var self = this;
    this.socket.setBuffer(true);

    function stateChange () {
      if (this.readyState == 4) {
        this.onreadystatechange = empty;
        self.posting = false;

        if (this.status == 200){
          self.socket.setBuffer(false);
        } else {
          self.onClose();
        }
      }
    }

    function onload () {
      this.onload = empty;
      self.socket.setBuffer(false);
    };

    this.sendXHR = this.request('POST');

    if (global.XDomainRequest && this.sendXHR instanceof XDomainRequest) {
      this.sendXHR.onload = this.sendXHR.onerror = onload;
    } else {
      this.sendXHR.onreadystatechange = stateChange;
    }

    this.sendXHR.send(data);
  };

  /**
   * Disconnects the established `XHR` connection.
   *
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.close = function () {
    this.onClose();
    return this;
  };

  /**
   * Generates a configured XHR request
   *
   * @param {String} url The url that needs to be requested.
   * @param {String} method The method the request should use.
   * @returns {XMLHttpRequest}
   * @api private
   */

  XHR.prototype.request = function (method) {
    var req = io.util.request(this.socket.isXDomain())
      , query = io.util.query(this.socket.options.query, 't=' + +new Date);

    req.open(method || 'GET', this.prepareUrl() + query, true);

    if (method == 'POST') {
      try {
        if (req.setRequestHeader) {
          req.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
        } else {
          // XDomainRequest
          req.contentType = 'text/plain';
        }
      } catch (e) {}
    }

    return req;
  };

  /**
   * Returns the scheme to use for the transport URLs.
   *
   * @api private
   */

  XHR.prototype.scheme = function () {
    return this.socket.options.secure ? 'https' : 'http';
  };

  /**
   * Check if the XHR transports are supported
   *
   * @param {Boolean} xdomain Check if we support cross domain requests.
   * @returns {Boolean}
   * @api public
   */

  XHR.check = function (socket, xdomain) {
    try {
      var request = io.util.request(xdomain),
          usesXDomReq = (global.XDomainRequest && request instanceof XDomainRequest),
          socketProtocol = (socket && socket.options && socket.options.secure ? 'https:' : 'http:'),
          isXProtocol = (global.location && socketProtocol != global.location.protocol);
      if (request && !(usesXDomReq && isXProtocol)) {
        return true;
      }
    } catch(e) {}

    return false;
  };

  /**
   * Check if the XHR transport supports cross domain requests.
   *
   * @returns {Boolean}
   * @api public
   */

  XHR.xdomainCheck = function (socket) {
    return XHR.check(socket, true);
  };

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.htmlfile = HTMLFile;

  /**
   * The HTMLFile transport creates a `forever iframe` based transport
   * for Internet Explorer. Regular forever iframe implementations will 
   * continuously trigger the browsers buzy indicators. If the forever iframe
   * is created inside a `htmlfile` these indicators will not be trigged.
   *
   * @constructor
   * @extends {io.Transport.XHR}
   * @api public
   */

  function HTMLFile (socket) {
    io.Transport.XHR.apply(this, arguments);
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(HTMLFile, io.Transport.XHR);

  /**
   * Transport name
   *
   * @api public
   */

  HTMLFile.prototype.name = 'htmlfile';

  /**
   * Creates a new Ac...eX `htmlfile` with a forever loading iframe
   * that can be used to listen to messages. Inside the generated
   * `htmlfile` a reference will be made to the HTMLFile transport.
   *
   * @api private
   */

  HTMLFile.prototype.get = function () {
    this.doc = new window[(['Active'].concat('Object').join('X'))]('htmlfile');
    this.doc.open();
    this.doc.write('<html></html>');
    this.doc.close();
    this.doc.parentWindow.s = this;

    var iframeC = this.doc.createElement('div');
    iframeC.className = 'socketio';

    this.doc.body.appendChild(iframeC);
    this.iframe = this.doc.createElement('iframe');

    iframeC.appendChild(this.iframe);

    var self = this
      , query = io.util.query(this.socket.options.query, 't='+ +new Date);

    this.iframe.src = this.prepareUrl() + query;

    io.util.on(window, 'unload', function () {
      self.destroy();
    });
  };

  /**
   * The Socket.IO server will write script tags inside the forever
   * iframe, this function will be used as callback for the incoming
   * information.
   *
   * @param {String} data The message
   * @param {document} doc Reference to the context
   * @api private
   */

  HTMLFile.prototype._ = function (data, doc) {
    this.onData(data);
    try {
      var script = doc.getElementsByTagName('script')[0];
      script.parentNode.removeChild(script);
    } catch (e) { }
  };

  /**
   * Destroy the established connection, iframe and `htmlfile`.
   * And calls the `CollectGarbage` function of Internet Explorer
   * to release the memory.
   *
   * @api private
   */

  HTMLFile.prototype.destroy = function () {
    if (this.iframe){
      try {
        this.iframe.src = 'about:blank';
      } catch(e){}

      this.doc = null;
      this.iframe.parentNode.removeChild(this.iframe);
      this.iframe = null;

      CollectGarbage();
    }
  };

  /**
   * Disconnects the established connection.
   *
   * @returns {Transport} Chaining.
   * @api public
   */

  HTMLFile.prototype.close = function () {
    this.destroy();
    return io.Transport.XHR.prototype.close.call(this);
  };

  /**
   * Checks if the browser supports this transport. The browser
   * must have an `Ac...eXObject` implementation.
   *
   * @return {Boolean}
   * @api public
   */

  HTMLFile.check = function (socket) {
    if (typeof window != "undefined" && (['Active'].concat('Object').join('X')) in window){
      try {
        var a = new window[(['Active'].concat('Object').join('X'))]('htmlfile');
        return a && io.Transport.XHR.check(socket);
      } catch(e){}
    }
    return false;
  };

  /**
   * Check if cross domain requests are supported.
   *
   * @returns {Boolean}
   * @api public
   */

  HTMLFile.xdomainCheck = function () {
    // we can probably do handling for sub-domains, we should
    // test that it's cross domain but a subdomain here
    return false;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('htmlfile');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports['xhr-polling'] = XHRPolling;

  /**
   * The XHR-polling transport uses long polling XHR requests to create a
   * "persistent" connection with the server.
   *
   * @constructor
   * @api public
   */

  function XHRPolling () {
    io.Transport.XHR.apply(this, arguments);
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(XHRPolling, io.Transport.XHR);

  /**
   * Merge the properties from XHR transport
   */

  io.util.merge(XHRPolling, io.Transport.XHR);

  /**
   * Transport name
   *
   * @api public
   */

  XHRPolling.prototype.name = 'xhr-polling';

  /**
   * Indicates whether heartbeats is enabled for this transport
   *
   * @api private
   */

  XHRPolling.prototype.heartbeats = function () {
    return false;
  };

  /** 
   * Establish a connection, for iPhone and Android this will be done once the page
   * is loaded.
   *
   * @returns {Transport} Chaining.
   * @api public
   */

  XHRPolling.prototype.open = function () {
    var self = this;

    io.Transport.XHR.prototype.open.call(self);
    return false;
  };

  /**
   * Starts a XHR request to wait for incoming messages.
   *
   * @api private
   */

  function empty () {};

  XHRPolling.prototype.get = function () {
    if (!this.isOpen) return;

    var self = this;

    function stateChange () {
      if (this.readyState == 4) {
        this.onreadystatechange = empty;

        if (this.status == 200) {
          self.onData(this.responseText);
          self.get();
        } else {
          self.onClose();
        }
      }
    };

    function onload () {
      this.onload = empty;
      this.onerror = empty;
      self.retryCounter = 1;
      self.onData(this.responseText);
      self.get();
    };

    function onerror () {
      self.retryCounter ++;
      if(!self.retryCounter || self.retryCounter > 3) {
        self.onClose();  
      } else {
        self.get();
      }
    };

    this.xhr = this.request();

    if (global.XDomainRequest && this.xhr instanceof XDomainRequest) {
      this.xhr.onload = onload;
      this.xhr.onerror = onerror;
    } else {
      this.xhr.onreadystatechange = stateChange;
    }

    this.xhr.send(null);
  };

  /**
   * Handle the unclean close behavior.
   *
   * @api private
   */

  XHRPolling.prototype.onClose = function () {
    io.Transport.XHR.prototype.onClose.call(this);

    if (this.xhr) {
      this.xhr.onreadystatechange = this.xhr.onload = this.xhr.onerror = empty;
      try {
        this.xhr.abort();
      } catch(e){}
      this.xhr = null;
    }
  };

  /**
   * Webkit based browsers show a infinit spinner when you start a XHR request
   * before the browsers onload event is called so we need to defer opening of
   * the transport until the onload event is called. Wrapping the cb in our
   * defer method solve this.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  XHRPolling.prototype.ready = function (socket, fn) {
    var self = this;

    io.util.defer(function () {
      fn.call(self);
    });
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('xhr-polling');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {
  /**
   * There is a way to hide the loading indicator in Firefox. If you create and
   * remove a iframe it will stop showing the current loading indicator.
   * Unfortunately we can't feature detect that and UA sniffing is evil.
   *
   * @api private
   */

  var indicator = global.document && "MozAppearance" in
    global.document.documentElement.style;

  /**
   * Expose constructor.
   */

  exports['jsonp-polling'] = JSONPPolling;

  /**
   * The JSONP transport creates an persistent connection by dynamically
   * inserting a script tag in the page. This script tag will receive the
   * information of the Socket.IO server. When new information is received
   * it creates a new script tag for the new data stream.
   *
   * @constructor
   * @extends {io.Transport.xhr-polling}
   * @api public
   */

  function JSONPPolling (socket) {
    io.Transport['xhr-polling'].apply(this, arguments);

    this.index = io.j.length;

    var self = this;

    io.j.push(function (msg) {
      self._(msg);
    });
  };

  /**
   * Inherits from XHR polling transport.
   */

  io.util.inherit(JSONPPolling, io.Transport['xhr-polling']);

  /**
   * Transport name
   *
   * @api public
   */

  JSONPPolling.prototype.name = 'jsonp-polling';

  /**
   * Posts a encoded message to the Socket.IO server using an iframe.
   * The iframe is used because script tags can create POST based requests.
   * The iframe is positioned outside of the view so the user does not
   * notice it's existence.
   *
   * @param {String} data A encoded message.
   * @api private
   */

  JSONPPolling.prototype.post = function (data) {
    var self = this
      , query = io.util.query(
             this.socket.options.query
          , 't='+ (+new Date) + '&i=' + this.index
        );

    if (!this.form) {
      var form = document.createElement('form')
        , area = document.createElement('textarea')
        , id = this.iframeId = 'socketio_iframe_' + this.index
        , iframe;

      form.className = 'socketio';
      form.style.position = 'absolute';
      form.style.top = '0px';
      form.style.left = '0px';
      form.style.display = 'none';
      form.target = id;
      form.method = 'POST';
      form.setAttribute('accept-charset', 'utf-8');
      area.name = 'd';
      form.appendChild(area);
      document.body.appendChild(form);

      this.form = form;
      this.area = area;
    }

    this.form.action = this.prepareUrl() + query;

    function complete () {
      initIframe();
      self.socket.setBuffer(false);
    };

    function initIframe () {
      if (self.iframe) {
        self.form.removeChild(self.iframe);
      }

      try {
        // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
        iframe = document.createElement('<iframe name="'+ self.iframeId +'">');
      } catch (e) {
        iframe = document.createElement('iframe');
        iframe.name = self.iframeId;
      }

      iframe.id = self.iframeId;

      self.form.appendChild(iframe);
      self.iframe = iframe;
    };

    initIframe();

    // we temporarily stringify until we figure out how to prevent
    // browsers from turning `\n` into `\r\n` in form inputs
    this.area.value = io.JSON.stringify(data);

    try {
      this.form.submit();
    } catch(e) {}

    if (this.iframe.attachEvent) {
      iframe.onreadystatechange = function () {
        if (self.iframe.readyState == 'complete') {
          complete();
        }
      };
    } else {
      this.iframe.onload = complete;
    }

    this.socket.setBuffer(true);
  };

  /**
   * Creates a new JSONP poll that can be used to listen
   * for messages from the Socket.IO server.
   *
   * @api private
   */

  JSONPPolling.prototype.get = function () {
    var self = this
      , script = document.createElement('script')
      , query = io.util.query(
             this.socket.options.query
          , 't='+ (+new Date) + '&i=' + this.index
        );

    if (this.script) {
      this.script.parentNode.removeChild(this.script);
      this.script = null;
    }

    script.async = true;
    script.src = this.prepareUrl() + query;
    script.onerror = function () {
      self.onClose();
    };

    var insertAt = document.getElementsByTagName('script')[0];
    insertAt.parentNode.insertBefore(script, insertAt);
    this.script = script;

    if (indicator) {
      setTimeout(function () {
        var iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        document.body.removeChild(iframe);
      }, 100);
    }
  };

  /**
   * Callback function for the incoming message stream from the Socket.IO server.
   *
   * @param {String} data The message
   * @api private
   */

  JSONPPolling.prototype._ = function (msg) {
    this.onData(msg);
    if (this.isOpen) {
      this.get();
    }
    return this;
  };

  /**
   * The indicator hack only works after onload
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  JSONPPolling.prototype.ready = function (socket, fn) {
    var self = this;
    if (!indicator) return fn.call(this);

    io.util.load(function () {
      fn.call(self);
    });
  };

  /**
   * Checks if browser supports this transport.
   *
   * @return {Boolean}
   * @api public
   */

  JSONPPolling.check = function () {
    return 'document' in global;
  };

  /**
   * Check if cross domain requests are supported
   *
   * @returns {Boolean}
   * @api public
   */

  JSONPPolling.xdomainCheck = function () {
    return true;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('jsonp-polling');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

if (typeof define === "function" && define.amd) {
  define([], function () { return io; });
}
})();
// Monitor.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var commonJS = (typeof exports !== 'undefined'),
      Backbone = commonJS ? require('backbone') : root.Backbone,
      _ = commonJS ? require('underscore')._ : root._,
      log = null, stat = null,
      autoStartedMonitors = [],
      Cron = commonJS ? require('cron') : null;

  // Constants
  var DEFAULT_DEEP_COPY_DEPTH = 4;

  /**
  * Monitor a remote probe
  *
  * Monitor objects are the local interface to a remote <a href="Probe.html">Probe</a>.
  * The probe may be running in this process or on a remote server.
  *
  * In a disconnected state, the monitor object contains information about
  * the type, attributes, and location of the probe it will monitor.
  *
  * In a connected state, the monitor object contains the data attributes of
  * the probe it is monitoring, and emits change events as the probe changes
  * state.
  *
  * Many monitors may be attached to a single probe.  When the probe data model
  * changes, changes are broadcast to the connected monitors.
  *
  * Probes can be remotely controlled using the control() method.
  * The control() method acts an RPC in that it accepts input arguments and
  * returns results to the monitor initiating the request.
  *
  * Example:
  *
  *     // Connecting a monitor to a probe
  *     var processMonitor = new Monitor({
  *       probeClass: 'Process'
  *     });
  *     processMonitor.connect();
  *
  *     // Monitoring the probe
  *     processMonitor.on('change', function(){
  *       console.log('Changes:', processMonitor.getChangedAttributes());
  *     });
  *
  *     // Remote control
  *     processMonitor.control('ping', function(error, response) {
  *       console.log('Ping response: ', response);
  *     });
  *
  * Monitoring a probe on a remote server requires the ```hostName``` parameter
  * to be set.
  *
  *     // Connecting to a remote monitor
  *     var processMonitor = new Monitor({
  *       probeClass: 'Process',
  *       hostName: 'remote-server1'
  *     });
  *     processMonitor.connect();
  *
  * Additional parameters can be set to identify a specific server if many
  * servers are running on the specified ```hostName```.
  *
  * @class Monitor
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *     @param [model.id] {String} An optional ID to assign to the monitor
  *     @param [model.name] {String} An optional name to assign to the monitor
  *     @param [model.probeClass] {String} Class name of the probe this is (or will be) monitoring.
  *     @param [model.probeName] {String} External name given to the probe.  If specified, the probe
  *       started by this monitor can be identified by other monitors with this name.
  *     @param [model.initParams] {Object} Initialization parameters passed to the probe during instantiation.
  *     @param [model.hostName] {String} Hostname the probe is (or will) run on.
  *       If not set, the Router will connect with the first host capable of running this probe.
  *     @param [model.appName] {String} Application name the probe is (or will) run within.
  *       If not set, the Router will disregard the appName of the process it is connecting with.
  *     @param [model.appInstance] {String} Application instance ID the probe is (or will) run within.
  *       If not set, the Router will disregard the appInstance of the process it is connecting with.
  *       Application instances can (should) set the $NODE_APP_INSTANCE environment
  *       variable prior to running to uniquely identify their unique instance within a
  *       server or network.  If this variable is not set prior to running the
  *       app, node-monitor will assign a unique ID among other running apps on the host.
  *     @param model.probeId {String} ID of the probe this is monitoring (once connected). READONLY
  *     @param model.writableAttributes {'*' or Array of String} Most probe attributes are readonly.
  *       If a probe allows set() to be called on an attribute, that attribute name is specified
  *       in this array (once connected).  A value of '*' signifies all attributes as writable.  READONLY
  *     @param model.PROBE_PARAMS... {(defined by the probe)} ... all other <strong>```model```</strong> parameters are READONLY parameters of the connected probe
  */
  /**
  * Receive real time notifications from the probe
  *
  * When the probe data model changes, all changed attributes are forwarded
  * to monitors, triggering this event.
  *
  * All probe attributes are available in the monitor, and the
  * getChangedAttributes() method returns the list of attributes changed
  * since the last change event.
  *
  *     myMonitor.on('change', function(){
  *       console.log('Changes:', myMonitor.getChangedAttributes());
  *     });
  *
  * @event change
  */
  var Monitor = Backbone.Model.extend({

    defaults: {
      id: '',
      name: '',
      probeName: '',
      probeClass: '',
      initParams: {},
      hostName: '',
      appName: '',
      appInstance: '',
      probeId: '',
      writableAttributes: []
    },
    initialize: function(params, options) {
      log.info('init', params);
    },

    /**
    * Connect the monitor to the remote probe
    *
    * Upon connection, the monitor data model is a proxy of the current state
    * of the probe.
    *
    * @method connect
    * @param callback {Function(error)} Called when the probe is connected (or error)
    */
    /**
    * The monitor has successfully connected with the probe
    * @event connect
    */
    connect: function(callback) {
      var t = this, startTime = Date.now();
      Monitor.getRouter().connectMonitor(t, function(error) {

        // Monitor changes to writable attributes
        if (!error && t.get('writableAttributes').length > 0) {
          t.on('change', t.onChange, t);
        }

        // Give the caller first crack at knowing we're connected,
        // followed by anyone registered for the connect event.
        if (callback) {callback(error);}

        // Initial data setting into the model was done silently
        // in order for the connect event to fire before the first
        // change event.  Fire the connect / change in the proper order.
        if (!error) {

          // An unfortunate side effect is any change listeners registered during
          // connect will get triggered with the same values as during connect.
          // To get around this, add change listeners from connect on nextTick.
          t.trigger('connect', t);
          t.trigger('change', t);

          log.info('connected', {initParams: t.get('initParams'), probeId: t.get('probeId')});
          stat.time('connect', Date.now() - startTime);
        }
      });
    },

    /**
    * Get the connection to the remote probe
    *
    * This method returns the Connection object that represents the remote
    * server used for communicating with the connected probe.
    *
    * If the probe is running internally or the monitor isn't currently
    * connected, this will return null.
    *
    * @method getConnection
    * @return connection {Connection} The connection object
    */
    getConnection: function() {
      var t = this;
      return (t.probe && t.probe.connection ? t.probe.connection : null);
    },

    /**
    * Is the monitor currently connected?
    *
    * @method isConnected
    * @return {boolean} True if the monitor is currently connected
    */
    isConnected: function() {
      var t = this;
      return (t.probe != null);
    },

    /**
    * Disconnect from the remote probe
    *
    * This should be called when the monitor is no longer needed.
    * It releases resources associated with monitoring the probe.
    *
    * If this was the last object monitoring the probe, the probe will be
    * stopped, releasing resources associated with running the probe.
    *
    * @method disconnect
    * @param callback {Function(error)} Called when disconnected (or error)
    */
    /**
    * The monitor has disconnected from the probe
    * @event disconnect
    * @param reason {String} Reason specified for the disconnect
    * <ul>Known Reasons:
    *   <li>manual_disconnect - A manual call to disconnect() was made.</li>
    *   <li>connect_failed - Underlying transport connection problem.</li>
    *   <li>remote_disconnect - Underlying transport disconnected.</li>
    * </ul>
    */
    disconnect: function(callback) {
      var t = this,
          reason = 'manual_disconnect',
          startTime = Date.now(),
          probeId = t.get('probeId');

      // Stop forwarding changes to the probe
      t.off('change', t.onChange, t);

      // Disconnect from the router
      Monitor.getRouter().disconnectMonitor(t, reason, function(error, reason) {
        if (callback) {callback(error);}
        if (error) {
          log.error('disconnect', {error: error});
        }
        else {
          t.trigger('disconnect', reason);
          log.info('disconnected', {reason: reason, probeId: probeId});
          stat.time('disconnect', Date.now() - startTime);
        }
      });
    },

    /**
    * Forward changes on to the probe, when connected.
    *
    * This is called whenever a change trigger is fired.  It forwards any
    * changes of writable attributes onto the probe using control('set').
    */
    onChange: function() {
      var t = this,
          writableAttributes = t.get('writableAttributes'),
          writableChanges = {};

      // Add any writable changes
      var probeAttrs = t.toProbeJSON();
      delete probeAttrs.id;
      for (var attrName in probeAttrs) {
        var isWritable = writableAttributes === '*' || writableAttributes.indexOf(attrName) >= 0;
        if (isWritable && !(_.isEqual(t.attributes[attrName], t._probeValues[attrName]))) {
          writableChanges[attrName] = t.attributes[attrName];
        }
      }

      // Pass any writable changes on to control.set()
      if (Monitor._.size(writableChanges)) {
        t.control('set', writableChanges, function(error) {
          if (error) {
            log.error('probeSet', 'Problem setting writable value', writableChanges, t.toMonitorJSON());
          }
        });
      }
    },

    /**
    * Send a control message to the probe.
    *
    * Monitors can use this method to send a message and receive a response
    * from a connected probe.
    *
    * The probe must implement the specified control method.  All probes are
    * derived from the base <a href="Probe.html">Probe</a> class, which offers
    * a ping control.
    *
    * To send a ping message to a probe and log the results:
    *
    *     var myMonitor.control('ping', console.log);
    *
    * @method control
    * @param name {String} Name of the control message.
    * @param [params] {Object} Named input parameters specific to the control message.
    * @param [callback] {Function(error, response)} Function to call upon return.
    * <ul>
    *   <li>error (Any) - An object describing an error (null if no errors)</li>
    *   <li>response (Any) - Response parameters specific to the control message.</li>
    * </ul>
    */
    control: function(name, params, callback) {
      var t = this,
          probe = t.probe,
          logId = 'control.' + t.get('probeClass') + '.' + name,
          startTime = Date.now();

      // Switch callback if sent in 2nd arg
      if (typeof params === 'function') {
        callback = params;
        params = null;
      }

      log.info(logId, params);

      var whenDone = function(error, args) {
        if (error) {
          log.error(logId, error);
        }
        else {
          log.info('return.' + logId, args);
          stat.time(logId, Date.now() - startTime);
        }

        if (callback) {
          callback.apply(t, arguments);
        }
      };

      if (!probe) {
        return whenDone('Probe not connected');
      }

      // Send the message internally or to the probe connection
      if (probe.connection) {
        probe.connection.emit('probe:control', {probeId: t.get('probeId'), name: name, params:params}, whenDone);
      } else {
        probe.onControl(name, params, whenDone);
      }
    },

    /**
    * Produce an object without monitor attributes
    *
    * A Monitor object contains a union of the connection attributes required for
    * a Monitor, and the additional attributes defined by the probe it's monitoring.
    *
    * This method produces an object containing only the probe portion of
    * those attributes.
    *
    * The id attribute of the returned JSON is set to the probeId from
    * the monitor.
    *
    * @method toProbeJSON
    * @param [options] {Object} Options to pass onto the model toJSON
    * @return {Object} The probe attributes
    */
    toProbeJSON: function(options) {
      var t = this,
          json = {id: t.get('probeId')};

      // Transfer all non-monitor attrs
      _.each(t.toJSON(options), function(value, key) {
        if (!(key in t.defaults)) {
          json[key] = value;
        }
      });
      return json;
    },

    /**
    * Produce an object with the monitor only attributes.
    *
    * A Monitor object contains a union of the connection attributes required for
    * a Monitor, and the additional attributes defined by the probe it's monitoring.
    *
    * This method produces an object containing only the monitor portion of
    * those attributes.
    *
    * @method toMonitorJSON
    * @param [options] {Object} Options to pass onto the model toJSON
    * @return {Object} The monitor attributes
    */
    toMonitorJSON: function(options) {
      var t = this,
          json = {};

      // Transfer all monitor attrs
      _.each(t.toJSON(options), function(value, key) {
        if (key in t.defaults) {
          json[key] = value;
        }
      });
      return json;
    },

    /**
    * Produce a server string representation of the hostName:appName:appInstance
    *
    * Depending on the presence of the appName and appInstance, this will produce
    * one of the following:
    *
    *     hostName
    *     hostName:appName
    *     hostName:appName:appInstance
    *
    * @method toServerString
    * @return {String} A string representation of the monitor server
    */
    toServerString: function() {
      return Monitor.toServerString(this.toMonitorJSON());
    }

  });

  /////////////////////////
  // Static helper methods
  /////////////////////////

  /**
  * Generate a unique UUID-v4 style string
  *
  * This is a cross-platform UUID implementation used to uniquely identify
  * model instances.  It is a random number based UUID, and as such can't be
  * guaranteed unique.
  *
  * @static
  * @protected
  * @method generateUniqueId
  * @return {String} A globally unique ID
  */
  Monitor.generateUniqueId = function() {
    // Generate a 4 digit random hex string
    stat.increment('generateUniqueId');
    function rhs4() {return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);}
    return (rhs4()+rhs4()+"-"+rhs4()+"-"+rhs4()+"-"+rhs4()+"-"+rhs4()+rhs4()+rhs4());
  };

  /**
  * Generate a unique ID for a collection
  *
  * This generates an ID to be used for new elements of the collection,
  * assuring they don't clash with other elements in the collection.
  *
  * @method Monitor.generateUniqueCollectionId
  * @param collection {Backbone.Collection} The collection to generate an ID for
  * @param [prefix] {String} An optional prefix for the id
  * @return id {String} A unique ID with the specified prefix
  */
  Monitor.generateUniqueCollectionId = function(collection, prefix) {
    var id = '';
    prefix = prefix || '';

    // First time - get the largest idSequence in the collection
    if (!collection.idSequence) {
      collection.idSequence = 0;
      collection.forEach(function(item){
        var id = item.get('id') || '',
            sequence = +id.substr(prefix.length);
        if (collection.idSequence <= sequence) {
          collection.idSequence = sequence + 1;
        }
      });
    }

    return prefix + collection.idSequence++;
  };

  /**
  * Get the default router (an application singleton)
  *
  * This instantiates a Router on first call.
  *
  * @static
  * @protected
  * @method getRouter
  * @return {Router} The default router.
  */
  Monitor.getRouter = function() {

    // Instantiate a router if no default
    if (!Monitor.defaultRouter) {
      Monitor.defaultRouter = new Monitor.Router();

      // If there's a global socket.io server available,
      // then we're running on the browser.  Set the default
      // gateway to the global io socket.
      if (root.io) {
        Monitor.defaultRouter.setGateway({
          socket:root.io.connect()
        });
      }
    }

    // Return the router
    return Monitor.defaultRouter;
  };

  /**
  * Start a monitor server in this process
  *
  * This is a shortand for the following:
  *
  *     var Monitor = require('monitor');
  *     var server = new Monitor.Server();
  *     server.start();
  *
  * It can be chained like this:
  *
  *     var Monitor = require('monitor').start(),
  *         log = Monitor.getLogger('my-app');
  *
  * For more fine-tuned starting, see the <a href="Server.html">Server</a> api.
  *
  * @static
  * @method start
  * @param options {Object} - Server.start() options.  OPTIONAL
  *     @param options.port {Integer} - Port to attempt listening on if server isn't specified.  Default: 42000
  * @param callback {Function(error)} - Called when the server is accepting connections.
  * @return monitor {Monitor} - Returns the static Monitor class (for chaining)
  */
  Monitor.start = function(options, callback) {
    log.info('start', options);
    callback = callback || function(){};

    // Get a default monitor
    if (!Monitor.defaultServer) {
      Monitor.defaultServer = new Monitor.Server();
      Monitor.defaultServer.start(options, callback);
    } else {
      callback();
    }
    return Monitor;
  };

  /**
  * Stop a started monitor server in this process
  *
  * @static
  * @method stop
  * @param callback {Function(error)} - Called when the server is accepting connections.
  */
  Monitor.stop = function(callback) {
    log.info('stop');
    callback = callback || function(){};
    if (Monitor.defaultServer) {
      Monitor.defaultServer.stop(callback);
      delete Monitor.defaultServer;
    } else {
      callback();
    }
  };

  /**
  * Produce a server string representation of the hostName:appName:appInstance
  *
  * Depending on the presence of the appName and appInstance, this will produce
  * one of the following:
  *
  *     hostName
  *     hostName:appName
  *     hostName:appName:appInstance
  *
  * @method toServerString
  * @param monitorJSON [Object] JSON object containing the following
  *     @param hostName {String} The host to monitor
  *     @param [appName] {String} The app name running on the host
  *     @param [appInstance] {String} The application instance ID running on the host
  * @return {String} A string representation of the monitor server
  */
  Monitor.toServerString = function(monitorJSON) {
    var str = monitorJSON.hostName;
    if (monitorJSON.appName) {
      str += ':' + monitorJSON.appName;
      if (monitorJSON.appInstance) {
        str += ':' + monitorJSON.appInstance;
      }
    }
    return str;
  };

  /**
  * Produce a depth-limited copy of the specified object
  *
  * Functions are copied for visual inspection purposes - the fact that
  * they are a function, and any prototype members.  This is so a JSON.stringify
  * of the result will show the functions (normally JSON.stringify doesn't output
  * functions).
  *
  * This method is mostly for debugging - for producing a human-readable stream
  * representation of the object.  It is an exact copy, except for elements of
  * type function.
  *
  * @method deepCopy
  * @param value {Mixed} Object or value to copy
  * @param [depth=4] {Integer} Maximum depth to return.  If the depth exceeds
  *   this value, the string "[Object]" is returned as the value.
  * @return {Mixed} A depth-limited copy of the value
  */
  Monitor.deepCopy = function(value, depth) {

    // Defaults
    depth = typeof(depth) === 'undefined' ? DEFAULT_DEEP_COPY_DEPTH : depth;

    // Simple value - return the raw value
    if (typeof value !== 'object' && typeof value !== 'function') {
      return value;
    }

    // Build a string representation of the type
    var strType = '[Object]';
    if (typeof value === 'function') {
      strType = '[Function]';
    } else if (Array.isArray(value)) {
      strType = '[Array]';
    }

    // Limit reached
    if (depth <= 0) {
      return strType;
    }

    // Create a new object to copy into.
    // Proactively add constructor so it's at the top of a function
    var copy = Array.isArray(value) ? [] : {};

    // Copy all elements (by reference)
    for (var prop in value) {
      if (!value.hasOwnProperty || value.hasOwnProperty(prop)) {
        var elem = value[prop];
        if (typeof elem === 'object' || typeof elem === 'function') {
          copy[prop] = Monitor.deepCopy(elem, depth - 1);
        }
        else {
          copy[prop] = elem;
        }
      }
    }

    // Special string formatting for functions
    if (typeof value === 'function') {
      if (_.isEmpty(copy)) {
        // No sub-elements.  Identify it as a function.
        copy = strType;
      } else {
        // Sub-elements exist.  Identify it as a function by placing
        // a constructor at the top of the object
        copy = _.extend({constructor: strType},copy);
      }
    }

    // Return the copy
    return copy;
  };

  /**
  * Produce a recursion-safe JSON string.
  *
  * This method recurses the specified object to a maximum specified depth
  * (default 4).
  *
  * It also indents sub-objects for debugging output.  The indent level can be
  * specified, or set to 0 for no indentation.
  *
  * This is mostly useful in debugging when the standard JSON.stringify
  * returns an error.
  *
  * @method stringify
  * @param value {Mixed} Object or value to turn into a JSON string
  * @param [depth=4] {Integer} Maximum depth to return.  If the depth exceeds
  *   this value, the string "[Object]" is returned as the value.
  * @param [indent=2] {Integer} Indent the specified number of spaces (0=no indent)
  * @return {String} A JSON stringified value
  */
  Monitor.stringify = function(value, depth, indent) {

    // Defaults
    indent = typeof(indent) === 'undefined' ? 2 : indent;

    // Return a stringified depth-limited deep copy
    return JSON.stringify(Monitor.deepCopy(value, depth), null, indent);
  };

  /**
  * Expose the stat logger class
  *
  * @protected
  * @method setStatLoggerClass
  * @param statLoggerClass {Function} Stat logger class to expose
  */
  Monitor.setStatLoggerClass = function(StatLoggerClass) {

    // Build the getStatLogger function
    Monitor.getStatLogger = function(module) {
      return new StatLoggerClass(module);
    };

    // Get the logger for the Monitor module
    stat = Monitor.getStatLogger('Monitor');
  };

  /**
  * Expose the logger class
  *
  * @protected
  * @method setLoggerClass
  * @param loggerClass {Function} Logger class to expose
  */
  Monitor.setLoggerClass = function(LoggerClass) {

    // Build the getLogger function
    Monitor.getLogger = function(module) {
      return new LoggerClass(module);
    };

    // Get the logger for the Monitor module
    log = Monitor.getLogger('Monitor');
  };

  /**
  * Constructor for a list of Monitor objects
  *
  *     var myList = new Monitor.List(initialElements);
  *
  * @static
  * @method List
  * @param [items] {Array} Initial list items.  These can be raw JS objects or Monitor data model objects.
  * @return {Backbone.Collection} Collection of Monitor data model objects
  */
  Monitor.List = Backbone.Collection.extend({model: Monitor});

  // Monitor configurations.  If running in a commonJS environment, load the
  // configs from the config package.  Otherwise just use the defaults.
  // See config/default.js for more information on these configurations.
  var defaultConfig = {
    appName: 'unknown',
    serviceBasePort: 42000,
    portsToScan: 20,
    allowExternalConnections: false,
    consoleLogListener: {
      pattern: "{trace,warn,error,fatal}.*"
    },
    autoStart: []
  };
  if (commonJS) {
    Monitor.Config = require('config');
    Monitor.Config.setModuleDefaults('Monitor', defaultConfig);
  } else {
    Monitor.Config = {Monitor: defaultConfig};
  }

  // Expose external dependencies
  Monitor._ = _;
  Monitor.Backbone = Backbone;
  Monitor.Cron = Cron;
  Monitor.commonJS = commonJS;

  // Export for both commonJS and the browser
  if (commonJS) {
    module.exports = Monitor;
  } else {
    root.Monitor = Monitor;
  }

  // Auto-start monitors after loading
  var autoStart = Monitor.Config.Monitor.autoStart;
  if (Monitor._.size(autoStart)) {
    setTimeout(function(){
      Monitor._.each(autoStart, function(model) {
        var autoStarted = new Monitor(model);
        autoStarted.connect(function(error) {
          if (error) {
            log.error('autoStart', 'Error auto-starting monitor', model, error);
          }
          autoStartedMonitors.push(autoStarted);
        });
      });
    },0);
  }

}(this));

/*jslint browser: true */
// Stat.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('./Monitor'),
      // Raw events on the server (for speed), backbone events on the browser (for functionality)
      EventEmitter = Monitor.commonJS ? require('events').EventEmitter.prototype : Monitor.Backbone.Events,
      _ = Monitor._,
      emittingNow = false;


  /**
  * A lightweight component for gathering and emitting application statistics
  *
  * This is both a collector and emitter for application stats.
  *
  * It's designed with low development and runtime cost in mind, encouraging
  * usage with minimum concern for overhead.
  *
  * Stat Collector
  * --------------
  *
  * As a collector, it's a place to send application stats as they're discovered.
  *
  * Example for incrementing a stat in your application:
  *
  *     var stat = require('monitor').getStatLogger('myModule');
  *     ...
  *     stat.increment('requests.inbound');
  *
  * The above is a request to increment the ```myModule.requests.inbound``` stat.
  * It peforms work only if someone is listening for that event.
  *
  * Stat Emitter
  * -------------
  * As an emitter, Stat is a place to gather stats as they're collected.
  *
  * When listening for stats, wildcards can be used to register for many stats
  * within a group. For example, the following call:
  *
  *     var Stat = require('monitor').Stat;
  *     Stat.on('myModule.*.timer', myFunction);
  *
  * Will call ```myFunction``` when all ```myModule.*.timer``` stats are emitted.
  *
  * Listeners are invoked with 4 arguments:
  *
  * - module - The statLogger module name
  * - name - The name of the stat that just fired
  * - value - The numeric value passed
  * - type - An enumeration of the types of stats:<br/>
  *   'c'  - Counter.  Add (or subtract) the value to (or from) the prior value<br/>
  *   'g'  - Gague.  Value is to be recorded as provided<br/>
  *   'ms' - Timer.  Millisecond amount of time something took.
  *
  * <h2 id="wildcards">Wildcards</h2>
  *
  * The following wildcards are allowed for registering events.  They're
  * modeled after the graphite wildcard syntax (from the
  * <a href="https://graphite.readthedocs.org/en/latest/render_api.html#paths-and-wildcards">graphite docs</a>):
  *
  * #### Delimiter
  * The period (.) character is literal, and matches name segment separators.
  *
  * #### Asterisk
  * The asterisk (*) matches zero or more characters. It is non-greedy, so you
  * can have more than one within a single path element.
  *
  * Example: servers.ix\*ehssvc\*v.cpu.total.\* will return all total CPU metrics
  * for all servers matching the given name pattern.
  *
  * An asterisk at the far right of the pattern matches everything to the right,
  * including all path segments.  For example, ```servers.*``` matches all
  * names beginning with ```servers.```.
  *
  * #### Character list or range
  * Characters in square brackets ([...]) specify a single character position in
  * the path string, and match if the character in that position matches one of
  * the characters in the list or range.
  *
  * A character range is indicated by 2 characters separated by a dash (-), and
  * means that any character between those 2 characters (inclusive) will match.
  * More than one range can be included within the square brackets, e.g. foo[a-z0-9]bar
  * will match foopbar, foo7bar etc..
  *
  * If the characters cannot be read as a range, they are treated as a
  * list - any character in the list will match, e.g. foo[bc]ar will match
  * foobar and foocar. If you want to include a dash (-) in your list, put
  * it at the beginning or end, so it's not interpreted as a range.
  *
  * #### Value list
  * Comma-separated values within curly braces ({foo,bar,...}) are treated as
  * value lists, and match if any of the values matches the current point in
  * the path. For example, servers.ix01ehssvc04v.cpu.total.{user,system,iowait}
  * will match the user, system and I/O wait total CPU metrics for the specified
  * server.
  *
  * #### Javascript Regex
  * For finer grained expression matching, a javascript style regex can be
  * specified using the ```/.../``` syntax.  This style spans the entire identifier.
  * You can ignore case using the ```/.../i``` syntax.  If the first character of the
  * string is a slash, it considers the string a javascript regular expression.
  *
  * Choosing Good Names
  * -------------------
  * It's a good idea to pick a good naming scheme with each dot-delimited segment
  * having a consistent, well-defined purpose.  Volatile segments should be as deep
  * into the hierarchy (furthest right) as possible.  Keeping the names less
  * volatile makes it easier to turn recording on for all statistics.
  *
  * @class Stat
  * @constructor
  */
  var Stat = Monitor.Stat = function(module) {
    var t = this;
    t.module = module;
  };
  var proto = Stat.prototype;

  // This is a map of registered event names to compiled regexs, for
  // quickly testing if a statistic needs to be emitted.
  Stat.eventRegex = {};

  /**
  * Increment a counter by a specified value
  *
  * Assuming someone is listening to this stat, this is an instruction for that
  * listener to add the specified value (usually 1) to their prior value for this stat.
  *
  * This is known as server-side setting, as the server (listener) is responsible
  * for maintaining the prior and new value for the stat.
  *
  * @method increment
  * @param name {String} Dot.separated name of the counter to increment
  * @param [value=1] {Number} Amount to increment the counter by.
  */
  proto.increment = function(name, value){
    value = _.isNumber(value) ? value : 1;
    Stat._emit(this.module, name, value, 'c');
  };

  /**
  * Decrement a counter by a specified value
  *
  * Assuming someone is listening to this stat, this is an instruction for that
  * listener to subtract the specified value (usually 1) to their prior value for this stat.
  *
  * This is known as server-side setting, as the server (listener) is responsible
  * for maintaining the prior and new value for the stat.
  *
  * @method decrement
  * @param name {String} Dot.separated name of the counter to decrement
  * @param [value=1] {Number} Amount to decrement the counter by.
  */
  proto.decrement = function(name, value){
    value = _.isNumber(value) ? value : 1;
    Stat._emit(this.module, name, value * -1, 'c');
  };

  /**
  * Set the stat to the specified value
  *
  * This is an instruction to any (all) listener(s) to set the stat to a
  * specific value.
  *
  * This is known as client-side setting, because the client determines the value
  * of the stat.
  *
  * @method gauge
  * @param name {String} Dot.separated name of the stat
  * @param value {Number} Number to set the gauge to
  */
  proto.gauge = function(name, value){
    Stat._emit(this.module, name, value, 'g');
  };

  /**
  * Record the specified duration (in milliseconds) for the stat
  *
  * This is like Stat.gauge() in that it is a client-side setting of a
  * specified value.  The difference is the scale of the value is specified
  * as milliseconds.
  *
  * This may be one of the most widely used stat methods.  It can (should?) be
  * used upon callback from asynchronous methods.
  *
  * Pattern:
  *
  *     var stat = require('monitor').getStatLogger('myModule');
  *     ...
  *     var stamp = Date.now();
  *     SomeAsyncFunction(arg1, function(error) {
  *       stat.time('SomeAsyncFunction.time', Date.Now() - stamp);
  *       ...continue with error handling & callback handling
  *     });
  *
  * @method time
  * @param name {String} Dot.separated name of the stat
  * @param duration {Integer} Number of milliseconds this stat took to complete
  */
  proto.time = function(name, duration){
    Stat._emit(this.module, name, duration, 'ms');
  };

  /**
  * Send the stat to all registered listeners
  *
  * @private
  * @static
  * @method emit
  * @param module {String} Module name
  * @param name {String} Stat name
  * @param value {Numeric} Stat value
  * @param type {String} Enumeration.  One of the following:
  *   'c'  - Counter.  + values increment, - values decrement
  *   'g'  - Gague.  Statistic is recorded as provided
  *   'ms' - Timer.  Millisecond amount of time something took
  */
  Stat._emit = function(module, name, value, type) {
    var eventName,
        fullName;

    // Prevent stat recursion. This has the effect of disabling all stats
    // for stat handlers (and their downstream effect), but is necessary to
    // prevent infinite recursion.  If it's desired to stat the output of
    // stat handlers, then delay that processing until nextTick.
    if (emittingNow) {
      return;
    }
    emittingNow = true;

    // Test the name against all registered events
    for (eventName in Stat._events) {

      // Build the full name only if someone is listening
      if (!fullName) {
        fullName = module + '.' + name;
      }

      // Get the regex associated with the name
      var regex = Stat.eventRegex[eventName];
      if (!regex) {
        regex = Stat.eventRegex[eventName] = Stat._buildRegex(eventName);
      }

      // Test the name with the regex, and emit if it matches
      if (regex.test(fullName)) {
        Stat.emit(eventName, module, name, value, type);
      }
    }

    // Turn off recursion prevention
    emittingNow = false;
  };

  /**
  * Build a regex from a user entered string following the pattern described
  * in the class definition.  Loosely:
  *
  *    If it looks like a JS regexp, process it as a regexp
  *    Change all '.' to '\.'
  *    Change all '*' to '[^\.]*' (unless it's at the end, then convert to '.*')
  *    Change all {one,two} to (one|two)
  *    Leave all [...] alone - they work as-is
  *
  *  If an error occurs, throw an exception
  *
  * @private
  * @static
  * @method _buildRegex
  * @param str {String} String to build the regular expression from
  * @return {RegExp}The regular expression object
  *
  */
  Stat._buildRegex = function(str) {
    var regexStr = '',
        modifier = '',
        lastIdx = str.length - 1,
        inSquiggly = false;

    // Javascript regular expressions
    if (/^\/[^\/]*\/i*$/.test(str)) {
      if (/i$/.test(str)) {
        modifier = 'i';
        str = str.replace(/i$/,'');
      }
      regexStr = '^' + str.replace(/^\//,'').replace(/\/$/,'') + '$';
    }

    // Process character by character
    else {
      for (var i = 0, l = str.length; i < l; i++) {
        var c = str.substr(i,1);
        switch (c) {
          case '.':
            c = '\\.';
            break;
          case '*':
            c = (i === lastIdx ? '.*' : '[^\\.]*');
            break;
          case '{':
            c = '(';
            inSquiggly = true;
            break;
          case '}':
            c = ')';
            inSquiggly = false;
            break;
          case ',':
            if (inSquiggly) {
              c = '|';
            }
            break;
        }
        regexStr += c;
      }

      // Force it to match the full string
      regexStr = '^' + regexStr + '$';
    }

    // Now build the regex.  This throws an exception if poorly formed.
    return new RegExp(regexStr, modifier);
  };

  // Mixin event processing for the Stat class
  _.extend(Stat, EventEmitter);

  // Expose this class from the Monitor module
  Monitor.setStatLoggerClass(Stat);

}(this));

/*jslint browser: true */
// Log.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('./Monitor'),
      // Raw events on the server (for speed), backbone events on the browser (for functionality)
      EventEmitter = Monitor.commonJS ? require('events').EventEmitter.prototype : Monitor.Backbone.Events,
      Stat = Monitor.Stat,
      stat = new Stat('Log'),
      _ = Monitor._,
      emittingNow = false;

  /**
  * A lightweight component for gathering and emitting application logs
  *
  * It's designed with low development and runtime cost in mind, encouraging
  * usage with minimum concern for overhead.  Runtime monitoring can be as chatty
  * as desired, outputting every log statement of every type, or finely tuned
  * with regular expressions to monitor specific log statements.
  *
  * Log Collector
  * -------------
  *
  * As a collector, it's a place to send application logs.
  *
  * Example for outputting a log in your application:
  *
  *     var log = require('monitor').getLogger('myModule');
  *     ...
  *     log.info('Credit limit accepted', limit, requestedAmount);
  *
  * The above is a request to output an ```info``` log for ```myModule``` named
  * ```Credit limit accepted```.  The log entry includes all additional parameters,
  * in this case the customer credit limit and the reqeusted amount.
  *
  * The full name for this log entry is: ```"info.myModule.Credit limit accepted"```
  * The name is important, as monitors can be configured to output logs based
  * on this name.
  *
  * Best practices are to include dynamic parameters in extra arguments
  * vs. concatenating strings.  This reduces logging overhead, especially
  * for log statements that aren't currently being watched.
  *
  * Log Emitter
  * -----------
  * As an emitter, the Log module is a place to capture logging output.
  *
  * When listening for log entries, wildcards can be used to register for
  * particular log types and entries.
  *
  *     var Log = require('monitor').Log;
  *     ...
  *     Log.on('info.myModule.*', myFunction);
  *
  * Will call ```myFunction``` when all ```info.myModule.*``` logs are emitted.
  *
  * Listeners are invoked with the following arguments:
  *
  * - type - The log type (trace, debug, info, warn, error, or fatal)
  * - module - The logger module name
  * - name - The log entry name
  * - args... - Additional arguments passed into the log entry are passed on
  *             as additional args to the event listener.
  *
  * Wildcards
  * ---------
  * A flexible and user-oriented wildcard pattern is used for monitoring
  * logs.  The pattern is described in the <a href="Stat.html#wildcards">Wildcard secttion of the Stats class</a>.
  *
  * Choosing Good Names
  * -------------------
  * It's a good idea to pick a good naming scheme with each dot-delimited segment
  * having a consistent, well-defined purpose.  Volatile segments should be as deep
  * into the hierarchy (furthest right) as possible.  Keeping the names less
  * volatile makes it easier to turn statistics recording on for all logs.
  *
  * @class Log
  * @constructor
  */
  var Log = Monitor.Log = function(module) {
    var t = this;
    t.module = module;
  };
  var proto = Log.prototype;

  // This is a map of registered event names to compiled regexs, for
  // quickly testing if a log needs to be emitted.
  Log.eventRegex = {};

  /**
  * Output a ```trace``` log entry
  *
  * @method trace
  * @param name {String} Log entry name
  * @param [...] {Any} Subsequent arguments to add to the log
  */

  /**
  * Output a ```debug``` log entry
  *
  * @method debug
  * @param name {String} Log entry name
  * @param [...] {Any} Subsequent arguments to add to the log
  */

  /**
  * Output a ```info``` log entry
  *
  * @method info
  * @param name {String} Log entry name
  * @param [...] {Any} Subsequent arguments to add to the log
  */

  /**
  * Output a ```warn``` log entry
  *
  * @method warn
  * @param name {String} Log entry name
  * @param [...] {Any} Subsequent arguments to add to the log
  */

  /**
  * Output a ```error``` log entry
  *
  * @method error
  * @param name {String} Log entry name
  * @param [...] {Any} Subsequent arguments to add to the log
  */

  /**
  * Output a ```fatal``` log entry
  *
  * @method fatal
  * @param name {String} Log entry name
  * @param [...] {Any} Subsequent arguments to add to the log
  */

  // Add a method for each log type
  ['trace','debug','info','warn','error','fatal'].forEach(function(method) {
    proto[method] = function(name) {
      Log._emit(method, this.module, name, arguments);
    };
  });

  /**
  * Send the log to all registered listeners
  *
  * @private
  * @static
  * @method emit
  * @param type {string} The log type (trace, debug, info, etc)
  * @param module {String} The log module name
  * @param name {String} The log entry name
  * @param args {any[]} Arguments to the log entry
  */
  Log._emit = function(type, module, name, args) {
    var eventName,
        fullName = type + '.' + module + '.' + name;

    // Prevent log recursion. This has the effect of disabling all logging
    // for log handlers (and their downstream effect), but is necessary to
    // prevent infinite recursion.  If it's desired to log the output of
    // log handlers, then delay that processing until nextTick.
    if (emittingNow) {
      return;
    }
    emittingNow = true;

    // Output a counter stat for this log
    stat.increment(fullName);

    // Test the name against all registered events
    for (eventName in Log._events) {

      // Get the regex associated with the name (using the Stat package)
      var regex = Log.eventRegex[eventName];
      if (!regex) {
        regex = Log.eventRegex[eventName] = Stat._buildRegex(eventName);
      }

      // Test the long name with the regex, and emit if it matches
      if (regex.test(fullName)) {

        // Build the arguments as event name, log type, module, name, [other args...]
        var allArgs = _.toArray(args),
            emitFn = Log.emit || Log.trigger; // NodeJS/server=emit, Backbone/browser=trigger
        allArgs.splice(0, 1, eventName, type, module, name);
        emitFn.apply(Log, allArgs);
      }
    }

    // Turn off recursion prevention
    emittingNow = false;
  };

  // Mixin event processing for the Log class
  _.extend(Log, EventEmitter);

  // Expose this class from the Monitor module
  Monitor.setLoggerClass(Log);

  /**
  * Output log statements to the console
  *
  * This method can be used as a listener to send logs to the console.
  *
  * It uses console.error() for error and fatal log types, and console.log()
  * for all other log types.
  *
  * Example:
  *
  *     var Log = Monitor.Log;
  *     Log.on('*.MyModule.*', Log.console);
  *
  * @static
  * @method consoleLogger
  * @param type {string} The log type (trace, debug, info, etc)
  * @param module {String} The log module name
  * @param name {String} The log entry name
  * @param args {any...} All original, starting with the short name
  */
  Log.console = function(type, module, name) {

    // Build the string to log, in log4js format
    var nowStr = (new Date()).toJSON(),
        args = _.toArray(arguments),
        logStr = '[' + nowStr + '] [' + type.toUpperCase() + '] ' + module;

    // Remove the type, module, name leaving the args to the log
    args.splice(0,3);

    // If no args, then they didn't provide a name
    if (args.length === 0) {
      args = [name];
    }
    else {
      // Add the log entry name
      logStr += '.' + name;
    }

    // If the output is simple, just print it.  Otherwise JSON.stringify it.
    logStr += ' - ';
    if (args.length === 1 && typeof args[0] === 'string') {
      logStr += args[0];
    }
    else {
      try {
        logStr += JSON.stringify(args);
      } catch(e) {
        logStr += Monitor.stringify(args);
      }
    }

    // Send to the console - Log or error
    if (type === 'error' || type === 'fatal') {
      console.error(logStr);
    }
    else {
      console.log(logStr);
    }

  };

  // Attach the console log listener
  var pattern = Monitor.Config.Monitor.consoleLogListener.pattern;
  if (pattern) {
    Log.on(pattern, Log.console);
  }

}(this));

// Probe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('./Monitor'),
      log = Monitor.getLogger('Probe'),
      stat = Monitor.getStatLogger('Probe'),
      Cron = Monitor.Cron, _ = Monitor._, Backbone = Monitor.Backbone;

  /**
  * A software device used to expose real time data to monitors
  *
  * This is the base class from which all probe implementations extend.
  *
  * In order to send probe data to monitors, probe implementations simply set
  * their model data using ```set()```.  Those changes are detected and propagated
  * to all monitors of this probe, firing their change events.
  *
  * In order to allow remote probe control, probes need only provide a method
  * called ```{name}_control()```.  See the ```ping_control()``` method as an example,
  * and the ```Probe.onControl()``` method for more information.
  *
  * @class Probe
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *     @param model.id {String} The probe id.
  *       Assigned by the <a href="Router.html">Router</a> on probe instantiation.
  */
  var Probe = Monitor.Probe = Backbone.Model.extend({

    defaults: {
      id:  null
    },

    /**
    * Initialize the probe
    *
    * This is called on the probe during construction.  It contains
    * the probe initialization attributes and an option to make probe
    * construction asynchronous.
    *
    * Probe implementations can defer the initial response to the monitor until
    * the initial state is loaded.  This allows the callback on
    * <a href="Monitor.html#method_connect">```Monitor.connect()```</a>
    * to have the complete initial state of the probe when called.
    *
    * If the initial probe state cannot be determined in ```initialize```, it should
    * set the ```options.asyncInit``` option to ```true```, and call the
    * ```options.callback(error)``` once the initial state is determined.
    *
    *     // Asynchronous initialization
    *     options.asyncInit = true;
    *     var callback = options.callback
    *
    * If ```asyncInit``` is set to true, the ```callback``` must be called once
    * the initial state of the probe is known (or in an error condition).
    *
    *     // Set the initial state, and call the callback
    *     this.set(...);
    *     callback(null);
    *
    * See the <a href="../files/lib_probes_FileProbe.js.html#l47">```initialize```</a>
    * method of the <a href="FileProbe.html">FileProbe</a> probe for an example.  It defers
    * returning the probe to the monitor until the initial file contents are loaded.
    *
    * @method initialize
    * @param attributes {Object} Initial probe attributes sent in from the Monitor
    * @param options {Object} Initialization options
    *     @param options.asyncInit {boolean} Set this to TRUE if the initial probe
    *         state can't be known immediately.
    *     @param options.callback {function(error)} The callback to call
    *         if asyncInit is set to true.  If an error is passed, the probe
    *         will not be used.
    */
    initialize: function(attributes, options) {
      var t = this;
      log.info('init', t.toJSON(), options);
    },

    /**
    * Release any resources consumed by this probe.
    *
    * This can be implemented by derived classes that need to be informed when
    * they are to be shut down.
    *
    * Probes that listen to events should use this method to remove their
    * event listeners.
    *
    * @method release
    */
    release: function(){
      var t = this;
      log.info('release', t.toJSON());
    },

    /**
    * Dispatch a control message to the appropriate control function.
    *
    * This is called when the
    * <a href="Monitor.html#method_control">```control()```</a>
    * method of a monitor is called.
    * The name determines the method name called on the probe.
    *
    * The probe must implement a method with the name ```{name}_control()```,
    * and that method must accept two parameters - an input params and a callback.
    * The callback must be called, passing an optional error and response object.
    *
    * For example, if the probe supports a control with the name ```go```, then
    * all it needs to do is implement the ```go_control()``` method with the
    * proper signature.  See ```ping_control()``` for an example.
    *
    * @method onControl
    * @param name {String} Name of the control message.
    * @param [params] {Any} Input parameters specific to the control message.
    * @param [callback] {Function(error, response)} Called to send the message (or error) response.
    * <ul>
    *   <li>error (Any) An object describing an error (null if no errors)</li>
    *   <li>response (Any) Response parameters specific to the control message.
    * </ul>
    */
    onControl: function(name, params, callback) {
      var t = this,
          controlFn = t[name + '_control'],
          startTime = Date.now(),
          errMsg,
          logId = 'onControl.' + t.probeClass + '.' + name;

      params = params || {};
      callback = callback || function(){};
      log.info(logId, t.get('id'), params);

      if (!controlFn) {
        errMsg = 'No control function: ' + name;
        log.error(logId, errMsg);
        return callback({msg: errMsg});
      }

      var whenDone = function(error) {
        if (error) {
          log.error(logId + '.whenDone', error);
          return callback(error);
        }
        var duration = Date.now() - startTime;
        log.info(logId, params);
        stat.time(t.logId, duration);
        callback.apply(null, arguments);
      };

      // Run the control on next tick.  This provides a consistent callback
      // chain for local and remote probes.
      setTimeout(function(){
        try {
          controlFn.call(t, params, whenDone);
        } catch (e) {
          errMsg = 'Error calling control: ' + t.probeClass + ':' + name;
          whenDone({msg:errMsg, err: e.toString()});
        }
      }, 0);
    },

    /**
    * Remotely set a probe attribute.
    *
    * This allows setting probe attributes that are listed in writableAttributes.
    * It can be overwritten in derived Probe classes for greater control.
    *
    * @method set_control
    * @param attrs {Object} Name/Value attributes to set.  All must be writable.
    * @param callback {Function(error)} Called when the attributes are set or error
    */
    set_control: function(attrs, callback) {
      var t = this,
          writableAttributes = t.get('writableAttributes') || [];

      // Validate the attributes are writable
      if (writableAttributes !== '*') {
        for (var attrName in attrs) {
          if (writableAttributes.indexOf(attrName) < 0) {
            return callback({code:'NOT_WRITABLE', msg: 'Attribute not writable: ' + attrName});
          }
        }
      }

      // Set the data
      var error = null;
      if (!t.set(attrs)) {
        error = {code:'VALIDATION_ERROR', msg:'Data set failed validation'};
        log.warn('set_control', error);
      }
      return callback(error);
    },

    /**
    * Respond to a ping control sent from a monitor
    *
    * @method ping_control
    * @param params {Object} Input parameters (not used)
    * @param callback {Function(error, response)} Called to send the message (or error) response.
    * <ul>
    *   <li>error (Any) An object describing an error</li>
    *   <li>response (String) The string 'pong' is returned as the response</li>
    * </ul>
    */
    ping_control: function(params, callback) {
      return callback(null, 'pong');
    }

  });

  // Register probe classes when loaded
  Probe.classes = {}; // key = name, data = class definition
  Probe.extend = function(params) {
    var t = this, probeClass = Backbone.Model.extend.apply(t, arguments);
    if (params.probeClass) {Probe.classes[params.probeClass] = probeClass;}
    return probeClass;
  };

  /**
  * Constructor for a list of Probe objects
  *
  *     var myList = new Probe.List(initialElements);
  *
  * @static
  * @method List
  * @param [items] {Array} Initial list items.  These can be raw JS objects or Probe data model objects.
  * @return {Backbone.Collection} Collection of Probe data model objects
  */
  Probe.List = Backbone.Collection.extend({model: Probe});

}(this));

// Connection.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('./Monitor'),
      Cron = Monitor.Cron, _ = Monitor._, Backbone = Monitor.Backbone,
      log = Monitor.getLogger('Connection'),
      stat = Monitor.getStatLogger('Connection'),
      Config = Monitor.Config, SocketIO = root.io || require('socket.io-client'),
      Probe = Monitor.Probe,
      nextConnectionNum = 1;

  /**
  * Core monitor classes
  *
  * Classes in this module represent baseline monitor functionality.  They can
  * be loaded and run in a node.js container as well as within a browser.
  *
  * @module Monitor
  */

  /**
  * Connection with a remote process
  *
  * Instances of this class represent a connection with a remote monitor
  * process.  The remote process is a peer of this process - it may produce
  * and/or consume probe information.
  *
  * This is an internal class created when a connection to a server is
  * requested from a monitor, or when an external connection is made from
  * a <a href="Server.html">Server</a> instance.
  *
  * @class Connection
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *   @param [model.hostName] {String} The host name to connect with. Used if url isn't present.
  *   @param [model.hostPort] {Number} The host port to connect using. Used if url isn't present.
  *   @param [model.url] {String} The URL used to connect. Built if hostName is supplied.
  *   @param [model.socket] {io.socket} Use this pre-connected socket instead of creating a new one.
  *   @param [model.gateway=false] {Boolean} Allow this connection to use me as a gateway?  See <code><a href="Router.html#method_setGateway">Router.setGateway()</a></code>
  *   @param [model.firewall=false] {Boolean} Firewall inbound probe requests on this connection?
  *   @param [model.remoteHostName] {String READONLY} Host name given by the remote server.
  *   @param [model.remoteAppName] {String READONLY} App name given by the remote server.
  *   @param [model.remoteAppInstance] {Integer READONLY} The remote application instance ID running on the host.
  *   @param [model.remotePID] {String READONLY} Remote process ID.
  *   @param [model.remoteProbeClasses] {Array of String READONLY} Array of probe classes available to the remote server.
  *   @param [model.remoteGateway] {Boolean READONLY} Can the remote process act as a gateway?
  *   @param [model.remoteFirewall] {Boolean READONLY} Is the remote side firewalled from inbound probe requests?
  */

  /**
  * Connected to remote monitor process
  *
  * This event is emitted after the two sides of the connection have exchanged
  * information about themselves.
  *
  * @event connect
  */
  var Connection = Monitor.Connection = Backbone.Model.extend({

    defaults:  {
      hostName: '',
      hostPort: null,
      url: null,
      socket: null,
      gateway: false,
      firewall: false,
      remoteHostName: null,
      remoteAppName: null,
      remoteAppInstance: 0,
      remotePID: 0,
      remoteProbeClasses: [],
      remoteGateway: false,
      remoteFirewall: false
    },

    initialize: function(params) {
      var t = this;
      t.connecting = true;          // Currently connecting?
      t.connected = false;          // Currently connected?
      t.socketEvents = null;        // Key = event name, data = handler function
      t.remoteProbeIdsByKey = {};   // Key = probeKey, data = probeId
      t.remoteProbesById = {};      // Key = probeId, data = {Probe proxy}
      t.incomingMonitorsById = {};  // Key = probeId, data = {Monitor proxy}

      // Create a connection ID for logging
      t.logId = (nextConnectionNum++) + '.';

      // Either connect to an URL or with an existing socket
      if (params.socket) {
        t.bindConnectionEvents();
        log.info(t.logId + 'connect', {socketId:params.socket.id});
      }
      else if (params.url || (params.hostName && params.hostPort)) {
        t.connect();
        log.info(t.logId + 'connect', {url:t.get('url')});
      }
      else {
        log.error('init', 'Connection must supply a socket, url, or host name/port');
      }
    },

    // Initiate a connection with a remote server
    connect: function() {
      var t = this, hostName = t.get('hostName'), hostPort = t.get('hostPort'),
      url = t.get('url');

      // Build the URL if not specified
      if (!url) {
        url = t.attributes.url = 'http://' + hostName + ':' + hostPort;
        t.set('url', url);
      }

      // Connect with this url
      var opts = {
        // 'transports': ['websocket', 'xhr-polling', 'jsonp-polling'],
        'force new connection': true,      // Don't re-use existing connections
        'reconnect': false                 // Don't let socket.io reconnect.
                                           // Reconnects are performed by the Router.
      };
      var socket = SocketIO.connect(url, opts);
      t.set({socket:socket}).bindConnectionEvents();
    },

    /**
    * Ping a remote connection
    *
    * @method ping
    * @param callback {Function(error)} Callback when response is returned
    */
    ping: function(callback) {
      var t = this;
      callback = callback || function(){};
      var onPong = function() {
        t.off('pong', onPong);
        callback();
      };
      t.on('pong', onPong);
      t.emit('connection:ping');
    },

    /**
    * Disconnect from the remote process
    *
    * This can be called from the underlying transport if it detects a disconnect,
    * or it can be manually called to force a disconnect.
    *
    * @method disconnect
    * @param reason {String} Reason for the disconnect
    */
    /**
    * <strong>Disconnected from a remote monitor process</strong>
    *
    * This event is emitted after the remote connection is disconnected and
    * resources released.
    *
    * @event disconnect
    * @param reason {String} Reason for the disconnect
    */
    disconnect: function(reason) {
      var t = this, socket = t.get('socket');
      t.connecting = false;
      t.connected = false;

      // Only disconnect once.
      // This method can be called many times during a disconnect (manually,
      // by socketIO disconnect, and/or by the underlying socket disconnect).
      if (t.socketEvents) {
        t.removeAllEvents();
        socket.disconnect();
        t.trigger('disconnect', reason);
        log.info(t.logId + 'disconnect', reason);
      }
    },

    /**
    * Is this connection with the specified host?
    *
    * @method isThisHost
    * @protected
    * @param hostName {String} The host name to check
    * @return withHost {Boolean} True if the connection is with this host
    */
    isThisHost: function(hostName) {
      var t = this, testHost = hostName.toLowerCase(),
          myHostName = t.get('hostName'), remoteHostName = t.get('remoteHostName');
      myHostName = myHostName && myHostName.toLowerCase();
      remoteHostName = remoteHostName && remoteHostName.toLowerCase();
      return (testHost === myHostName || testHost ===  remoteHostName);
    },

    /**
    * Emit the specified message to the socket.
    *
    * The other side of the connection can handle and respond to the message
    * using the 'on' method.
    *
    * @method emit
    * @protected
    * @param name {String} The message name to send
    * @param args... {Mixed} Variable number of arguments to send with the message
    * @param callback {Function} Called when remote sends a reply
    */
    emit: function() {
      var t = this, socket = t.get('socket');
      log.info(t.logId + 'emit', Monitor.deepCopy(arguments, 5));
      socket.emit.apply(socket, arguments);
    },

    /**
    * Bind the specified handler to the remote socket message.
    *
    * Only a single handler (per message name) can be bound using this method.
    *
    * @method addEvent
    * @protected
    * @param eventName {String} The event name to handle
    * @param handler {Function (args..., callback)} Called when the message is received.
    * <ul>
    *   <li>args... {Mixed} Arguments sent in by the remote client</li>
    *   <li>callback {Function} Final arg if the client specified a callback</li>
    * </ul>
    */
    addEvent: function(eventName, handler) {
      var t = this, socket = t.get('socket');
      t.socketEvents = t.socketEvents || {};
      if (t.socketEvents[eventName]) {
        throw new Error('Event already connected: ' + eventName);
      }
      socket.on(eventName, handler);
      t.socketEvents[eventName] = handler;
      return t;
    },

    // Remove the specified event from the socket
    removeEvent: function(eventName) {
      var t = this, socket = t.get('socket');
      if (t.socketEvents && t.socketEvents[eventName]) {
        socket.removeListener(eventName, t.socketEvents[eventName]);
        delete t.socketEvents[eventName];
      }
      return t;
    },

    // Remove all events bound to the socket
    removeAllEvents: function() {
      var t = this, socket = t.get('socket');
      for (var event in t.socketEvents) {
        socket.removeListener(event, t.socketEvents[event]);
      }
      t.socketEvents = null;
      return t;
    },

    /**
    * An error has occurred on the connection
    *
    * This event is triggered when an error occurs on the connection.  Errors
    * may occur when network is unstable, and can be an indication of impending
    * disconnection.
    *
    * @event error
    * @param err {Object} Reason for the error (from underlying transport)
    */
    bindConnectionEvents: function() {
      var t = this, socket = t.get('socket');
      if (t.socketEvents) {throw new Error('Already connected');}
      t.socketEvents = {};  // key = event name, data = handler

      // Failure events
      t.addEvent('connect_failed', function(){
        t.trigger('error', 'connect failed');
        t.disconnect('connect failed');
      });
      t.addEvent('disconnect', function(){t.disconnect('remote_disconnect');});
      t.addEvent('error', function(reason){
        t.trigger('error', reason);
        t.disconnect('connect error');
      });

      // Inbound probe events
      t.addEvent('probe:connect', t.probeConnect.bind(t));
      t.addEvent('probe:disconnect', t.probeDisconnect.bind(t));
      t.addEvent('probe:control', t.probeControl.bind(t));

      // Connection events
      t.addEvent('connection:ping', function(){socket.emit('connection:pong');});
      t.addEvent('connection:pong', function(){t.trigger('pong');});

      // Connected once remote info is known
      t.addEvent('connection:info', function (info) {
        t.set({
          remoteHostName: info.hostName,
          remoteAppName: info.appName,
          remoteAppInstance: info.appInstance,
          remotePID: info.pid,
          remoteProbeClasses: info.probeClasses,
          remoteGateway: info.gateway,
          remoteFirewall: info.firewall
        });
        t.connecting = false;
        t.connected = true;
        t.trigger('connect');
      });

      // Determine the process id
      var pid = typeof process === 'undefined' ? 1 : process.pid;

      // Determine the app instance
      var appInstance = '' + (typeof process === 'undefined' ? pid : process.env.NODE_APP_INSTANCE || pid);

      // Exchange connection information
      socket.emit('connection:info', {
        hostName:Monitor.getRouter().getHostName(),
        appName:Config.Monitor.appName,
        appInstance: appInstance,
        pid: pid,
        probeClasses: _.keys(Probe.classes),
        gateway:t.get('gateway'),
        firewall:t.get('firewall')
      });
    },

    /**
    * Process an inbound request to connect with a probe
    *
    * This will fail if this connection was created as a firewall.
    *
    * @method probeConnect
    * @protected
    * @param monitorJSON {Object} Probe connection parameters, including:
    *     @param monitorJSON.probeClass {String} The probe class
    *     @param monitorJSON.initParams {Object} Probe initialization parameters
    *     @param monitorJSON.hostName {String} Connect with this host (if called as a gateway)
    *     @param monitorJSON.appName {String} Connect with this app (if called as a gateway)
    * @param callback {Function(error, probeJSON)} Callback function
    */
    probeConnect: function(monitorJSON, callback) {
      callback = callback || function(){};
      var t = this,
          errorText = '',
          router = Monitor.getRouter(),
          gateway = t.get('gateway'),
          startTime = Date.now(),
          firewall = t.get('firewall'),
          logCtxt = _.extend({}, monitorJSON);

      // Don't allow inbound requests if this connection is firewalled
      if (firewall) {
        errorText = 'firewalled';
        log.error('probeConnect', errorText, logCtxt);
        return callback(errorText);
      }

      // Determine the connection to use (or internal)
      router.determineConnection(monitorJSON, gateway, function(err, connection) {
        if (err) {return callback(err);}
        if (connection && !gateway) {return callback('Not a gateway');}

        // Function to run upon connection (internal or external)
        var onConnect = function(error, probe) {

          if (error) {
            log.error(t.logId + 'probeConnect', error, logCtxt);
            return callback(error);
          }

          // Get probe info
          var probeId = probe.get('id');
          logCtxt.id = probeId;

          // Check for a duplicate proxy for this probeId.  This happens when
          // two connect requests are made before the first one completes.
          var monitorProxy = t.incomingMonitorsById[probeId];
          if (monitorProxy != null) {
            probe.refCount--;
            logCtxt.dupDetected = true;
            logCtxt.refCount = probe.refCount;
            log.info(t.logId + 'probeConnected', logCtxt);
            return callback(null, monitorProxy.probe.toJSON());
          }

          // Connect the montior proxy
          monitorProxy = new Monitor(monitorJSON);
          monitorProxy.set('probeId', probeId);
          t.incomingMonitorsById[probeId] = monitorProxy;
          monitorProxy.probe = probe;
          monitorProxy.probeChange = function(){
            try {
              t.emit('probe:change:' + probeId, probe.changedAttributes());
            }
            catch (e) {
              log.error('probeChange', e, probe, logCtxt);
            }
          };
          probe.connectTime = Date.now();
          var duration = probe.connectTime - startTime;
          logCtxt.duration = duration;
          logCtxt.refCount = probe.refCount;
          log.info(t.logId + 'probeConnected', logCtxt);
          stat.time(t.logId + 'probeConnected', duration);
          callback(null, probe.toJSON());
          probe.on('change', monitorProxy.probeChange);

          // Disconnect the probe on connection disconnect
          t.on('disconnect', function() {
            t.probeDisconnect({probeId:probeId});
          });
        };

        // Connect internally or externally
        if (connection) {
          router.connectExternal(monitorJSON, connection, onConnect);
        } else {
          router.connectInternal(monitorJSON, onConnect);
        }
      });
    },

    /**
    * Process an inbound request to disconnect with a probe
    *
    * @method probeDisconnect
    * @protected
    * @param params {Object} Disconnect parameters, including:
    *   probeId {String} The unique probe id
    * @param callback {Function(error)} Callback function
    */
    probeDisconnect: function(params, callback) {
      callback = callback || function(){};
      var t = this,
          errorText = '',
          router = Monitor.getRouter(),
          probeId = params.probeId,
          monitorProxy = t.incomingMonitorsById[probeId],
          firewall = t.get('firewall'),
          logCtxt = null,
          probe = null;

      // Already disconnected
      if (!monitorProxy || !monitorProxy.probe) {
        return callback(null);
      }

      // Get a good logging context
      probe = monitorProxy.probe;
      logCtxt = {
        probeClass: monitorProxy.get('probeClass'),
        initParams: monitorProxy.get('initParams'),
        probeId: probeId
      };

      // Called upon disconnect (internal or external)
      var onDisconnect = function(error) {
        if (error) {
          log.error(t.logId + 'probeDisconnect', error);
          return callback(error);
        }
        var duration = logCtxt.duration = Date.now() - probe.connectTime;
        probe.off('change', monitorProxy.probeChange);
        monitorProxy.probe = monitorProxy.probeChange = null;
        delete t.incomingMonitorsById[probeId];
        log.info(t.logId + 'probeDisconnected', logCtxt);
        stat.time(t.logId + 'probeDisconnected', duration);
        return callback(null);
      };

      // Disconnect from an internal or external probe
      if (probe && probe.connection) {
        router.disconnectExternal(probe.connection, probeId, onDisconnect);
      } else {
        router.disconnectInternal(probeId, onDisconnect);
      }
    },

    /**
    * Process an inbound control request to a probe
    *
    * @method probeControl
    * @protected
    * @param params {Object} Control parameters, including:
    *   probeId {String} The unique probe id
    *   name {String} The control message name
    *   params {Object} Any control message parameters
    * @param callback {Function(error, returnParams)} Callback function
    */
    probeControl: function(params, callback) {
      callback = callback || function(){};
      var t = this,
          errorText = '',
          logId = t.logId + 'probeControl',
          startTime = Date.now(),
          router = Monitor.getRouter(),
          firewall = t.get('firewall');

      // Don't allow inbound requests if this connection is firewalled
      if (firewall) {
        errorText = 'firewalled';
        log.error(logId, errorText);
        return callback(errorText);
      }

      // Called upon return
      var onReturn = function(error) {
        if (error) {
          log.error(logId, error);
          return callback(error);
        }
        else {
          var duration = Date.now() - startTime;
          log.info(logId + '.return', {duration:duration, returnArgs: arguments});
          stat.time(logId, duration);
          return callback.apply(null, arguments);
        }
      };

      // Is this an internal probe?
      var probe = router.runningProbesById[params.probeId];
      if (!probe) {

        // Is this a remote (proxied) probe?
        var monitorProxy = t.incomingMonitorsById[params.probeId];
        if (!monitorProxy) {
          errorText = 'Probe id not found: ' + params.probeId;
          log.error(errorText);
          return callback(errorText);
        }

        // Proxying requires this form vs. callback as last arg.
        return monitorProxy.control(params.name, params.params, function(err, returnParams) {
          onReturn(err, returnParams);
        });
      }
      logId = logId + '.' + probe.probeClass + '.' + params.name;
      log.info(logId + '.request', {params:params.params, probeId:params.probeId});
      return probe.onControl(params.name, params.params, onReturn);
    }

  });

  /**
  * Constructor for a list of Connection objects
  *
  *     var myList = new Connection.List(initialElements);
  *
  * @static
  * @method List
  * @param [items] {Array} Initial list items.  These can be raw JS objects or Connection data model objects.
  * @return {Backbone.Collection} Collection of Connection data model objects
  */
  Connection.List = Backbone.Collection.extend({model: Connection});

}(this));

// Server.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('./Monitor'),
      Config = Monitor.Config, _ = Monitor._, Backbone = Monitor.Backbone,
      log = Monitor.getLogger('Server'),
      stat = Monitor.getStatLogger('Server'),
      Connection = Monitor.Connection,
      Http = Monitor.commonJS ? require('http') : null,
      SocketIO = root.io || require('socket.io');

  /**
  * A server for accepting inbound connections from remote monitors
  *
  * Servers are created when a process wants to expose probe data to remote
  * monitors.  Example:
  *
  *     // Accept remote monitors
  *     var server = new Monitor.Server();
  *     server.start();
  *
  * An instance of this class represents a listening server accepting inbound
  * connections.  As inbound connections are detected, a new
  * <a href="Connection.html">Connection</a> object is created to manage
  * traffic on that connection.
  *
  * Security:  Make sure the port range specified in Monitor.Config (starting
  * at 42000) is not exposed outside your internal network.  If you desire a
  * different security model, create your secure server and pass it to the
  * constructor.
  *
  * @class Server
  * @extends Backbone.Model
  * @constructor
  * @param model - Initial data model.  Can be a JS object or another Model.
  *     @param model.gateway {Boolean} - Allow incoming monitors to use me as a gateway (default false)
  *     @param model.server {HttpServer} - The listening node.js server.  Constructed by this class, or specified if a custom server is desired.
  *     @param model.port {Integer} - The connected port.  This is set upon start() if the server isn't specified on construction.
  */
  var Server = Monitor.Server = Backbone.Model.extend({

    initialize: function(params) {
      var t = this;
      t.isListening = false;
      t.connections = new Connection.List();
    },

    /**
    * Start accepting monitor connections
    *
    * This method starts listening for incoming monitor connections on the
    * server.
    *
    * If the server was specified during object creation, this binds the
    * socket.io service to the server.
    *
    * If the server was not specified during object creation, this will create
    * a server on the first available monitor port.
    *
    * @method start
    * @param options {Object} - Start options. OPTIONAL
    *     @param options.port {Integer} - Port to attempt listening on if server isn't specified.  Default: 42000
    *     @param options.attempt {Integer} - Attempt number for internal recursion detection.  Default: 1
    * @param callback {Function(error)} - Called when the server is accepting connections.
    */
    /**
    * The server has started
    *
    * This event is fired when the server has determined the port to accept
    * connections on, and has successfully configured the server to start
    * accepting new monitor connections.
    *
    * @event start
    */
    /**
    * A client error has been detected
    *
    * This event is fired if an error has been detected in the underlying
    * transport.  It may indicate message loss, and may result in a
    * subsequent stop event if the connection cannot be restored.
    *
    * @event error
    */
    start: function(options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = null;
      }
      options = options || {};
      callback = callback || function(){};
      var t = this, server = t.get('server'), error,
          startTime = Date.now(),
          port = options.port || Config.Monitor.serviceBasePort,
          attempt = options.attempt || 1,
          allowExternalConnections = Config.Monitor.allowExternalConnections;

      // Recursion detection.  Only scan for so many ports
      if (attempt > Config.Monitor.portsToScan) {
        error = {err:'connect:failure', msg: 'no ports available'};
        log.error('start', error);
        return callback(error);
      }

      // Bind to an existing server, or create a new server
      if (server) {
        t.bindEvents(callback);
      } else {
        server = Http.createServer();

        // Try next port if a server is listening on this port
        server.on('error', function(err) {
          if (err.code === 'EADDRINUSE') {
            // Error if the requested port is in use
            if (t.get('port')) {
              log.error('portInUse',{host:host, port:port});
              return callback({err:'portInUse'});
            }
            // Try the next port
            log.info('portInUse',{host:host, port:port});
            return t.start({port:port + 1, attempt:attempt + 1}, callback);
          }
          // Unknown error
          callback(err);
        });

        // Allow connections from INADDR_ANY or LOCALHOST only
        var host = allowExternalConnections ? '0.0.0.0' : '127.0.0.1';

        // Start listening, callback on success
        server.listen(port, host, function(){

          // Set a default NODE_APP_INSTANCE based on the available server port
          if (!process.env.NODE_APP_INSTANCE)  {
            process.env.NODE_APP_INSTANCE = '' + (port - Config.Monitor.serviceBasePort + 1);
          }

          // Record the server & port, and bind incoming events
          t.set({server: server, port: port});
          t.bindEvents(callback);
          log.info('listening', {
            appName: Config.Monitor.appName,
            NODE_APP_INSTANCE: process.env.NODE_APP_INSTANCE,
            listeningOn: host,
            port: port
          });
        });
      }
    },

    /**
    * Bind incoming socket events to the server
    *
    * This method binds to the socket events and attaches the socket.io
    * server.  It is called when the connection starts listening.
    *
    * @protected
    * @method bindEvents
    * @param callback {Function(error)} - Called when all events are bound
    */
    bindEvents: function(callback) {

      // Detect server errors
      var t = this, server = t.get('server');
      server.on('clientError', function(err){
        log.error('bindEvents', 'clientError detected on server', err);
        t.trigger('error', err);
      });
      server.on('close', function(err){
        server.hasEmittedClose = true;
        log.info('bindEvents.serverClose', 'Server has closed', err);
        t.stop();
      });

      // Start up the socket.io server.
      var socketIoParams = {
        log: false
      };
      t.socketServer = SocketIO.listen(server, socketIoParams);
      t.socketServer.sockets.on('connection', function (socket) {
        var connection = Monitor.getRouter().addConnection({
          socket: socket, gateway: t.get('gateway')
        });
        t.connections.add(connection);
        var onDisconnect = function(reason) {
          t.connections.remove(connection);
          Monitor.getRouter().removeConnection(connection);
          connection.off('disconnect', onDisconnect);
          log.info('client.disconnect', 'Disconnected client socket');
        };
        connection.on('disconnect', onDisconnect);
        log.info('client.connect', 'Connected client socket');
      });

      // Notify that we've started
      t.isListening = true;
      if (callback) {callback(null);}
      t.trigger('start');
    },

    /**
    * Stop processing inbound monitor traffic
    *
    * This method stops accepting new inbound monitor connections, and closes
    * all existing monitor connections associated with the server.
    *
    * @method stop
    * @param callback {Function(error)} - Called when the server has stopped
    */
    /**
    * The server has stopped
    *
    * This event is fired after the server has stopped accepting inbound
    * connections, and has closed all existing connections and released
    * associated resources.
    *
    * @event stop
    */
    stop: function(callback) {
      var t = this, server = t.get('server'), router = Monitor.getRouter();
      callback = callback || function(){};

      // Call the callback, but don't stop more than once.
      if (!t.isListening) {
        return callback();
      }

      // Release resources
      t.connections.each(router.removeConnection, router);
      t.connections.reset();

      // Shut down the server
      t.isListening = false;
      server.close();

      // Send notices
      t.trigger('stop');
      return callback();
    }
  });

  /**
  * Constructor for a list of Server objects
  *
  *     var myList = new Server.List(initialElements);
  *
  * @static
  * @method List
  * @param [items] {Array} Initial list items.  These can be raw JS objects or Server data model objects.
  * @return {Backbone.Collection} Collection of Server data model objects
  */
  Server.List = Backbone.Collection.extend({model: Server});

}(this));

// Router.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('./Monitor'),
      log = Monitor.getLogger('Router'),
      stat = Monitor.getStatLogger('Router'),
      Cron = Monitor.Cron, _ = Monitor._, Backbone = Monitor.Backbone,
      Config = Monitor.Config, Probe = Monitor.Probe,
      Connection = Monitor.Connection, Server = Monitor.Server,
      SocketIO = root.io || require('socket.io'),

      // Set if server-side
      hostName = Monitor.commonJS ? require('os').hostname() : null;

  // Constants
  var PROBE_TIMEOUT_MS = 10000;

  /**
  * Probe location and message routing
  *
  * The router is a class used internally to locate probes and connect
  * events so messages are correctly routed between probes and their monitors.
  *
  * It is a *singleton* class, designed to run one instance within
  * a monitor process, and accessed via the (protected) `getRouter()`
  * method of the <a href="Monitor.html">Monitor</a> object.
  *
  * It manages all outbound requests to probes, either internally or externally
  * via the <a href="Connection.html">Connection</a> to the remote process.
  *
  * @class Router
  * @extends Backbone.Model
  * @constructor
  */
  /**
  * A new connection has been established
  *
  * @event
  * connection:add
  * @param connection {Connection} The added connection
  */
  /**
  * A connection has been terminated
  *
  * @event
  * connection:remove
  * @param connection {Connection} The removed connection
  */
  var Router = Monitor.Router = Backbone.Model.extend({

    initialize: function() {
      var t = this;
      t.defaultGateway = null;
      t.firewall = false;
      t.connections = new Connection.List();
      t.runningProbesByKey = {}; // key=probeKey, data=probeImpl
      t.runningProbesById = {};  // key=probeId, data=probeImpl
      t.addHostCallbacks = {};  // key=hostName, data=[callbacks]
      log.info('init', 'Router initialized');
    },

    /**
    * Firewall new connections from inbound probe requests
    *
    * When two monitor processes connect, they become peers.  By default each
    * process can request probe connections with the other.
    *
    * If you want to connect with a remote probe, but don't want those servers
    * to connect with probes in this process, call this method to firewall
    * those inbound probe requests.
    *
    * Setting this will change the firewall value for all *new* connections.
    * Any existing connections will still accept incoming probe requests.
    *
    * @static
    * @method setFirewall
    * @param firewall {Boolean} - Firewall new connections?
    */
    setFirewall: function(firewall) {
      var t = Monitor.getRouter(); // This is a static method
      t.firewall = firewall;
      log.info('setFirewall', firewall);
    },

    /**
    * Set the default gateway server
    *
    * The gateway server is used if a monitor cannot connect directly with the
    * server hosting the probe.
    *
    * When a monitor is requested to connect with a probe on a specific server,
    * a direct connection is attempted.  If that direct connection fails, usually
    * due to a firewall or browser restriction, the monitor will attempt the
    * connection to the probe through the gateway server.
    *
    * The server specified in this method must have been started as a gateway
    * like this:
    *
    *     // Start a monitor server and act as a gateway
    *     var server = new Monitor.Server({gateway:true});
    *
    * @method setGateway
    * @param options {Object} - Connection parameters
    *   @param options.hostName {String} - Name of the gateway host
    *   @param options.hostPort {Integer} - Port number to connect with
    *   @param options.url {String} - The URL used to connect (created, or used if supplied)
    *   @param options.socket {io.socket} - Pre-connected socket.io socket to the gateway server.
    * @return connection {Connection} - The connection with the gateway server
    */
    setGateway: function(options) {
      var t = this;
      options.gateway = false;     // New connection can't be an inbound gateway
      options.firewall = true;     // Gateways are for outbound requests only
      return t.defaultGateway = t.addConnection(options);
    },

    /**
    * Return a stable host name.
    *
    * @method getHostName
    * @protected
    * @return hostName {String} - The platform's host name, or an otherwise stable ID
    */
    getHostName: function() {
      var localStorage = root.localStorage;
      if (!hostName) {
        if (localStorage) {hostName = localStorage.hostName;}
        hostName = hostName || Monitor.generateUniqueId();
        if (localStorage) {localStorage.hostName = hostName;}
      }
      return hostName;
    },

    /**
    * Set the current host name.
    *
    * This sets the host name that this router publishes to new connections.
    * It's only useful if the os hostname isn't the name you want to publish.
    *
    * @protected
    * @method setHostName
    * @param hostName {String} - The host name to publish to new connections
    */
    setHostName: function(name) {
      hostName = name;
      log.info('setHostName', name);
    },

    /**
    * Add a connection to a remote Monitor process
    *
    * @method addConnection
    * @protected
    * @param options {Object} - Connection parameters
    *   @param options.hostName {String} - Name of the host to connect with
    *   @param options.hostPort {Integer} - Port number to connect with
    *   @param options.url {String} - The URL used to connect (created, or used if supplied)
    *   @param options.socket {io.socket} - Pre-connected socket.io socket to a Monitor server.
    *   @param options.gateway {Boolean} - Allow this connection to use me as a gateway (default false)
    *   @param options.firewall {Boolean} Firewall inbound probe requests on this connection?
    * @return connection {Connection} - The added connection
    */
    addConnection: function(options) {
      var t = this,
          startTime = Date.now();

      // Default the firewall value
      if (_.isUndefined(options.firewall)) {
        options = _.extend({},options, {firewall: t.firewall});
      }

      // Generate a unique ID for the connection
      options.id = Monitor.generateUniqueCollectionId(t.connections);

      var connStr = 'Conn_' + options.id;
      if (options.hostName) {
        connStr += ' - ' + options.hostName + ':' + options.hostPort;
      }
      log.info('addConnection', connStr);

      // Instantiate and add the connection for use, once connected
      var connection = new Connection(options);

      // Add a connect and disconnect function
      var onConnect = function(){
        t.trigger('connection:add', connection);
        log.info('connected', connStr, (Date.now() - startTime) + 'ms');
      };
      var onDisconnect = function(){
        t.removeConnection(connection);
        connection.off('connect', onConnect);
        connection.off('disconnect', onConnect);
        log.info('disconnected', connStr, (Date.now() - startTime) + 'ms');
      };
      connection.on('connect', onConnect);
      connection.on('disconnect', onDisconnect);

      // Add to the connections
      t.connections.add(connection);
      return connection;
    },

    /**
    * Remove a connection from the router.
    *
    * This is called to remove the connection and associated routes from the router.
    *
    * @method removeConnection
    * @protected
    * @param connection {Connection} - The connection to remove
    */
    removeConnection: function(connection) {
      var t = this;
      log.info('removeConnection', 'Conn_' + connection.id);
      connection.disconnect('connection_removed');
      t.connections.remove(connection);
      t.trigger('connection:remove', connection);
    },

    /**
    * Connect a Monitor object to a remote Probe
    *
    * This accepts an instance of a Monitor and figures out how to connect it
    * to a running Probe.
    *
    * Upon callback the probe data is set into the monitor (unless an error
    * occurred)
    *
    * @method connectMonitor
    * @protected
    * @param monitor {Monitor} - The monitor requesting to connect with the probe
    * @param callback {Function(error)} - (optional) Called when connected
    */
    connectMonitor: function(monitor, callback) {

      callback = callback || function(){};
      var t = this,
          monitorJSON = monitor.toMonitorJSON(),
          probeJSON = null,
          probeName = monitorJSON.probeName,
          probeClass = monitorJSON.probeClass,
          startTime = Date.now(),
          monitorStr = probeClass + '.' + monitor.toServerString().replace(/:/g, '.');

      // Class name must be set
      if (!probeClass && !probeName) {
        var errStr = 'probeName or probeClass must be set';
        log.error('connectMonitor', errStr);
        return callback(errStr);
      }

      // Determine the connection (or internal), and listen for change events
      t.determineConnection(monitorJSON, true, function(err, connection) {
        if (err) {return callback(err);}

        // Function to run on connection (internal or external)
        var onConnect = function(error, probe) {
          if (error) {return callback(error);}
          probeJSON = probe.toJSON();
          probeJSON.probeId = probeJSON.id; delete probeJSON.id;
          monitor.probe = probe;

          // Keep the last known probe state for effective updating
          monitor._probeValues = _.clone(probeJSON);

          // Perform the initial set silently.  This assures the initial
          // probe contents are available on the connect event,
          // but doesn't fire a change event before connect.
          monitor.set(probeJSON, {silent:true});

          // Watch the probe for changes.
          monitor.probeChange = function(){
            var changed = probe.changedAttributes();
            if (changed) {
              monitor._probeValues = _.clone(probe.toJSON());
              monitor.set(probe.changedAttributes());
              log.info('probeChange', {probeId: probeJSON.probeId, changed: probe.changedAttributes()});
            }
          };
          probe.on('change', monitor.probeChange);

          // Call the callback.  This calls the original caller, issues
          // the connect event, then fires the initial change event.
          callback(null);
        };

        // Connect internally or externally
        if (connection) {
          t.connectExternal(monitorJSON, connection, onConnect);
        } else {
          t.connectInternal(monitorJSON, onConnect);
        }
      });
    },

    /**
    * Disconnect a monitor
    *
    * This accepts an instance of a connected monitor, and disconnects it from
    * the remote probe.
    *
    * The probe implementation will be released if this is the only monitor
    * object watching it.
    *
    * @method disconnectMonitor
    * @protected
    * @param monitor {Monitor} - The connected monitor
    * @param reason {String} - Reason for the disconnect
    * @param callback {Function(error)} - (optional) Called when connected
    */
    disconnectMonitor: function(monitor, reason, callback) {
      callback = callback || function(){};
      var t = this, probe = monitor.probe, probeId = monitor.get('probeId');

      // The monitor must be connected
      if (!probe) {return callback('Monitor must be connected');}

      // Called upon disconnect (internal or external)
      var onDisconnect = function(error) {
        if (error) {
          return callback(error);
        }
        probe.off('change', monitor.probeChange);
        monitor.set({probeId:null});
        monitor.probe = monitor.probeChange = null;
        return callback(null, reason);
      };

      // Disconnect from an internal or external probe
      if (probe.connection) {
        t.disconnectExternal(probe.connection, probeId, onDisconnect);
      } else {
        t.disconnectInternal(probeId, onDisconnect);
      }
    },

    /**
    * Build a probe key from the probe data
    *
    * @method buildProbeKey
    * @protected
    * @param probeJSON {Object} - An object containing:
    *     @param probeJSON.probeName {String} - The client-defined probe name
    *     -or-
    *     @param probeJSON.probeClass {String} - The probe class name (required)
    *     @param probeJSON.initParams {Object} - Probe initialization parameters (if any)
    * @return probeKey {String} - A string identifying the probe
    */
    buildProbeKey: function(probeJSON) {
      var probeKey = probeJSON.probeClass,
          initParams = probeJSON.initParams;

      // Allow probes to be externally identified by name
      if (probeJSON.probeName) {
        return probeJSON.probeName;
      }

      if (initParams) {
        _.keys(initParams).sort().forEach(function(key){
          probeKey += ':' + key + '=' + initParams[key];
        });
      }
      return probeKey;
    },

    /**
    * Determine the connection to use for a probe
    *
    * This uses the connection parameters of the specified monitor to determine
    * (or create) the connection to use for the probe.
    *
    * If the probe can be instantiated internally, a null is returned as the
    * connection.
    *
    * This attempts to use an existing connection if available.  If not, a
    * connection attempt will be made with the host. If the host cannot be
    * reached directly, it returns a connection with the gateway.
    *
    * @method determineConnection
    * @protected
    * @param monitorJSON {Object} - The connection attributes of the monitor
    * @param makeNewConnections {Boolean} - Establish a new connection if one doesn't exist?
    * @param callback {Function(error, connection)} - Called when the connection is known
    * <ul>
    *   <li>error - Set if any errors</li>
    *   <li>connection - The connection object, or null to run in this process</li>
    * <ul>
    */
    determineConnection: function(monitorJSON, makeNewConnections, callback) {
      var t = this,
          connection = null,
          probeName = monitorJSON.probeName,
          probeClass = monitorJSON.probeClass,
          errStr = '',
          hostName = monitorJSON.hostName,
          appName = monitorJSON.appName,
          appInstance = monitorJSON.appInstance,
          thisHostName = t.getHostName().toLowerCase(),
          thisAppName = Config.Monitor.appName  || 'unknown',
          thisAppInstance = typeof process !== 'undefined' ? process.env.NODE_APP_INSTANCE : '1';

      // Return a found connection immediately if it's connected.
      // If connecting, wait for connection to complete.
      // If not connected (and not connecting) re-try the connection.
      var connectedCheck = function(isGateway) {

        // Remove the host/app/instance params if connecting directly.
        if (!isGateway) {
          delete monitorJSON.hostName;
          delete monitorJSON.appName;
          delete monitorJSON.appInstance;
        }

        // Define the connect/error listeners
        var onConnect = function() {
          removeListeners();
          callback(null, connection);
        };
        var onError = function(err) {
          removeListeners();
          log.error('connect.error', err);
          callback({msg: 'connection error', err:err});
        };
        var removeListeners = function() {
          connection.off('connect', onConnect);
          connection.off('error', onError);
        };

        // Wait if the connection is still awaiting connect
        if (connection && connection.connecting) {
          connection.on('connect', onConnect);
          connection.on('error', onError);
          return;
        }

        // Re-try if disconnected
        if (connection && !connection.connected) {
          connection.on('connect', onConnect);
          connection.on('error', onError);
          return connection.connect();
        }

        // Verified connection
        return callback(null, connection);
      };

      // Connect with this process (internally)?
      hostName = hostName ? hostName.toLowerCase() : null;
      var thisHost = (!hostName || hostName === thisHostName);
      var thisApp = (!appName || appName === thisAppName);
      var thisInstance = (!appInstance || appInstance === thisAppInstance);
      if (thisHost && thisApp && thisInstance) {

        // Connect internally if the probe is available
        if (t.runningProbesByKey[probeName] || Probe.classes[probeClass] != null) {
          return callback(null, null);
        }

        // Give named auto-start probes time to start up
        var autoStarts = Monitor.Config.Monitor.autoStart;
        if (probeName && !probeClass && autoStarts.length) {
          var autoStart = Monitor._.find(autoStarts, function(probeDef) {
            return probeDef.probeName === probeName;
          });
          if (autoStart) {
            setTimeout(function() {
              t.determineConnection(monitorJSON, makeNewConnections, callback);
            },10);
            return;
          }
        }

        // No probe with that name in this process.
        // Fallback to the default gateway.
        if (!t.defaultGateway) {
          errStr = 'Probe class "' + probeClass + '" not available in this process';
          log.error('connect.internal', errStr);
          return callback({err:errStr});
        }
        connection = t.defaultGateway;
        return connectedCheck(true);
      }

      // Return if connection is known
      connection = t.findConnection(hostName, appName, appInstance);
      if (connection) {
        return connectedCheck();
      }

      // Prefer the gateway if it exists
      if (t.defaultGateway) {
        connection = t.defaultGateway;
        return connectedCheck(true);
      }

      // See if we can establish new connections with the host
      if (hostName && makeNewConnections) {
        t.addHostConnections(hostName, function(err) {
          if (err) {
            log.error('connect.toHost', err);
            return callback(err);
          }

          // Try finding now that new connections have been made
          connection = t.findConnection(hostName, appName, appInstance);
          if (!connection) {
            errStr = 'No route to host: ' + Monitor.toServerString(monitorJSON);
            log.error('connect.toHost', errStr);
            return callback({err:errStr});
          }

          return connectedCheck();
        });

        // Wait for addHostConnections to complete
        return;
      }

      // We tried...
      if (!hostName) {
        // App name was specified, it wasn't this process, and no hostname
        errStr = 'No host specified for app: ' + appName;
        log.error('connect', errStr);
        return callback({msg:errStr},null);
      } else {
        // Not allowed to try remote hosts
        errStr = 'Not a gateway to remote monitors';
        log.error('connect', errStr);
        return callback({msg:errStr});
      }
    },

    /**
    * Find an existing connection to use
    *
    * This method looks into the existing known connections to find one
    * that matches the specified parameters.
    *
    * Firewalled connections are not returned.
    *
    * @method findConnection
    * @protected
    * @param hostName {String} - Host name to find a connection for (null = any host)
    * @param appName {String} - App name to find a connection with (null = any app)
    * @param appInstance {Any} - Application instance running on this host (null = any instance)
    * @return connection {Connection} - A Connection object if found, otherwise null
    */
    findConnection: function(hostName, appName, appInstance) {
      var t = this, thisInstance = 0;
      return t.connections.find(function(conn) {

        // Host or app matches if not specified or if specified and equal
        var matchesHost = !hostName || conn.isThisHost(hostName);
        var matchesApp = !appName || appName === conn.get('remoteAppName');
        var matchesInstance = !appInstance || appInstance === conn.get('remoteAppInstance');
        var remoteFirewall = conn.get('remoteFirewall');

        // This is a match if host + app + instance matches, and it's not firewalled
        return (!remoteFirewall && matchesHost && matchesApp && matchesInstance);
      });
    },

    /**
    * Find all connections matching the selection criteria
    *
    * This method looks into the existing known connections to find all
    * that match the specified parameters.
    *
    * Firewalled connections are not returned.
    *
    * @method findConnections
    * @protected
    * @param hostName {String} - Host name to search for (null = any host)
    * @param appName {String} - App name to search for (null = any app)
    * @return connections {Array of Connection} - An array of Connection objects matching the criteria
    */
    findConnections: function(hostName, appName) {
      var t = this;
      return t.connections.filter(function(conn) {

        // Host or app matches if not specified or if specified and equal
        var matchesHost = !hostName || conn.isThisHost(hostName);
        var matchesApp = !appName || appName === conn.get('remoteAppName');
        var remoteFirewall = conn.get('remoteFirewall');

        // This is a match if host + app matches, and it's not firewalled
        return (!remoteFirewall && matchesHost && matchesApp);
      });
    },

    /**
    * Add connections for the specified host
    *
    * This performs a scan of monitor ports on the server, and adds connections
    * for newly discovered servers.
    *
    * It can take a while to complete, and if called for the same host before
    * completion, it will save the callback and call all callbacks when the
    * original task is complete.
    *
    * @method addHostConnections
    * @protected
    * @param hostName {String} - The host to add connections with
    * @param callback {Function(error)} - Called when complete
    */
    addHostConnections: function(hostName, callback) {
      var t = this,
          errStr = '',
          connectedPorts = [],
          portStart = Config.Monitor.serviceBasePort,
          portEnd = Config.Monitor.serviceBasePort + Config.Monitor.portsToScan - 1;

      // Create an array to hold callbacks for this host
      if (!t.addHostCallbacks[hostName]) {
        t.addHostCallbacks[hostName] = [];
      }

      // Remember this callback and return if we're already adding connections for this host
      if (t.addHostCallbacks[hostName].push(callback) > 1) {
        return;
      }

      // Called when done
      var doneAdding = function(error) {
        t.addHostCallbacks[hostName].forEach(function(cb) {
          cb(error);
        });
        delete t.addHostCallbacks[hostName];
      };

      // Build the list of ports already connected
      t.connections.each(function(connection){
        var host = connection.get('hostName').toLowerCase();
        var port = connection.get('hostPort');
        if (host === hostName && port >= portStart && port <= portEnd) {
          connectedPorts.push(port);
        }
      });

      // Scan non-connected ports
      var portsToScan = Config.Monitor.portsToScan - connectedPorts.length;
      if (portsToScan === 0) {
        errStr = 'All monitor ports in use.  Increase the Config.Monitor.portsToScan configuration';
        log.error('addHostConnections', errStr);
        return doneAdding(errStr);
      }
      var doneScanning = function() {
        var conn = this; // called in the context of the connection
        conn.off('connect disconnect error', doneScanning);
        if (--portsToScan === 0) {
          return doneAdding();
        }
      };
      for (var i = portStart; i <= portEnd; i++) {
        if (connectedPorts.indexOf(i) < 0) {
          var connection = t.addConnection({hostName:hostName, hostPort:i});
          connection.on('connect disconnect error', doneScanning, connection);
        }
      }
    },

    /**
    * Connect to an internal probe implementation
    *
    * This connects with a probe running in this process.  It will instantiate
    * the probe if it isn't currently running.
    *
    * @method connectInternal
    * @protected
    * @param monitorJSON {Object} - The monitor toJSON data.  Containing:
    *     @param monitorJSON.probeClass {String} - The probe class name to connect with (required)
    *     @param monitorJSON.initParams {Object} - Probe initialization parameters.
    * @param callback {Function(error, probeImpl)} - Called when connected
    */
    connectInternal: function(monitorJSON, callback) {

      // Build a key for this probe from the probeClass and initParams
      var t = this,
          probeKey = t.buildProbeKey(monitorJSON),
          probeName = monitorJSON.probeName,
          probeClass = monitorJSON.probeClass,
          initParams = monitorJSON.initParams,
          probeImpl = null;

      var whenDone = function(error) {

        // Wait one tick before firing the callback.  This simulates a remote
        // connection, making the client callback order consistent, regardless
        // of a local or remote connection.
        setTimeout(function() {

          // Dont connect the probe on error
          if (error) {
            if (probeImpl) {
              delete t.runningProbesByKey[probeKey];
              delete t.runningProbesById[probeImpl.id];
              try {
                // This may fail depending on how many resources were created
                // by the probe before failure.  Ignore errors.
                probeImpl.release();
              } catch (e){}
            }
            return callback(error);
          }

          // Probes are released based on reference count
          probeImpl.refCount++;
          log.info('connectInternal', {probeKey: probeKey, probeId: probeImpl.id});
          callback(null, probeImpl);
        }, 0);
      };

      // Get the probe instance
      probeImpl = t.runningProbesByKey[probeKey];
      if (!probeImpl) {

        // Instantiate the probe
        var ProbeClass = Probe.classes[probeClass];
        if (!ProbeClass) {
          return whenDone({msg:'Probe not available: ' + probeClass});
        }
        var initOptions = {asyncInit: false, callback: whenDone};
        try {
          // Deep copy the init params, because Backbone mutates them.  This
          // is bad if the init params came in from defaults of another object,
          // because those defaults will get mutated.
          var paramCopy = Monitor.deepCopy(initParams);

          // Extend the probe name into the probe if known
          if (probeName) {
            paramCopy.probeName = probeName;
          }

          // Instantiate a new probe
          probeImpl = new ProbeClass(paramCopy, initOptions);
          probeImpl.set({
            id: Monitor.generateUniqueId(),
            writableAttributes: ProbeClass.prototype.writableAttributes || []
          });
          probeImpl.refCount = 0;
          probeImpl.probeKey = probeKey;
          t.runningProbesByKey[probeKey] = probeImpl;
          t.runningProbesById[probeImpl.id] = probeImpl;
        } catch (e) {
          var error = {msg: 'Error instantiating probe ' + probeClass, error: e.message};
          return whenDone(error);
        }

        // Return early if the probe constructor transferred responsibility
        // for calling the callback.
        if (initOptions.asyncInit) {
          return;
        }
      }

      // The probe impl is found, and instantiated if necessary
      whenDone();
    },

    /**
    * Disconnect with an internal probe implementation.
    *
    * @method disconnectInternal
    * @protected
    * @param probeId {String} - The probe implementation ID to disconnect
    * @param callback {Function(error, probeImpl)} - Called when disconnected
    */
    disconnectInternal: function(probeId, callback) {
      var t = this, probeImpl = t.runningProbesById[probeId];
      if (!probeImpl) {return callback('Probe not running');}
      if (--probeImpl.refCount === 0) {

        // Release probe resources & internal references if still no references after a while
        setTimeout(function() {
          if (probeImpl.refCount === 0) {
            try {
              probeImpl.release();
            } catch (e){}
            delete t.runningProbesByKey[probeImpl.probeKey];
            delete t.runningProbesById[probeId];
          }
        }, PROBE_TIMEOUT_MS);
      }
      callback(null, probeImpl);
    },

    /**
    * Connect to an external probe implementation.
    *
    * This connects with a probe running in another process.  It will
    * coordinate the remote instantiation of the probe if it's not running.
    *
    * @method connectExternal
    * @protected
    * @param monitorJSON {Object} - An object containing:
    *     @param monitorJSON.probeClass {String} - The probe class name (required)
    *     @param monitorJSON.initParams {Object} - Probe initialization parameters (if any)
    * @param connection {Connection} - The connection to use
    * @param callback {Function(error, probeProxy)} - Called when connected
    */
    connectExternal: function(monitorJSON, connection, callback) {

      // Build a key for this probe from the probeClass and initParams
      var t = this,
          errStr = '',
          probeKey = t.buildProbeKey(monitorJSON);

      // Get the probe proxy
      var probeId = connection.remoteProbeIdsByKey[probeKey];
      var probeProxy = connection.remoteProbesById[probeId];

      if (!probeProxy) {

        // Connect with the remote probe
        connection.emit('probe:connect', monitorJSON, function(error, probeJSON){
          if (error) {
            errStr = "probe:connect returned an error for probeClass '" + monitorJSON.probeClass +
              "' on " + Monitor.toServerString(monitorJSON);
            return callback({err: error, msg: errStr});
          }
          probeId = probeJSON.id;

          // See if the proxy was created while waiting for return
          probeProxy = connection.remoteProbesById[probeId];
          if (probeProxy) {
            probeProxy.refCount++;
            log.info('connectExternal.connected.existingProxy', {probeId: probeId, refCount: probeProxy.refCount, whileWaiting: true});
            return callback(null, probeProxy);
          }

          // Create the probe proxy
          probeProxy = new Probe(probeJSON);
          probeProxy.refCount = 1;
          probeProxy.connection = connection;
          connection.remoteProbeIdsByKey[probeKey] = probeId;
          connection.remoteProbesById[probeId] = probeProxy;
          connection.addEvent('probe:change:' + probeId, function(attrs){probeProxy.set(attrs);});
          log.info('connectExternal.connected.newProxy', {probeId: probeId});
          return callback(null, probeProxy);
        });
        return;
      }

      // Probes are released based on reference count
      probeProxy.refCount++;
      log.info('connectExternal.connected.existingProxy', {probeId: probeId, refCount: probeProxy.refCount});
      return callback(null, probeProxy);
    },

    /**
    * Disconnect with an external probe implementation.
    *
    * @method disconnectExternal
    * @protected
    * @param connection {Connection} - The connection to use
    * @param probeId {String} - Probe ID
    * @param callback {Function(error)} - Called when disconnected
    */
    disconnectExternal: function(connection, probeId, callback) {
      var t = this, proxy = connection.remoteProbesById[probeId];
      if (!proxy) {return callback('Probe not running');}
      if (--proxy.refCount === 0) {
        // Release probe resources
        proxy.release();
        proxy.connection = null;
        delete connection.remoteProbesById[probeId];
        delete connection.remoteProbeIdsByKey[proxy.probeKey];
        connection.removeEvent('probe:change:' + probeId);
        return connection.emit('probe:disconnect', {probeId:probeId}, function(error){
          return callback(error);
        });
      }
      callback(null);
    }

  });

}(this));

// Sync.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('./Monitor'),
      logger = Monitor.getLogger('Sync'),
      Backbone = Monitor.Backbone,
      _ = Monitor._;

  // Constants
  var METHOD_CREATE = 'create',
      METHOD_READ = 'read',
      METHOD_UPDATE = 'update',
      METHOD_DELETE = 'delete';

  /**
  * Probe based data synchronization with server-side storage.
  *
  * This method returns a function conforming to the Backbone
  * <a href="http://documentcloud.github.com/backbone/#Sync">Sync</a>
  * API, offering
  * <a href="http://documentcloud.github.com/backbone/#Model-fetch">```fetch```</a>,
  * <a href="http://documentcloud.github.com/backbone/#Model-save">```save```</a>, and
  * <a href="http://documentcloud.github.com/backbone/#Model-destroy">```destroy```</a>
  * functionality to any Backbone data model.
  *
  * The returned function can be assigned to the ```sync``` element when defining the
  * data model:
  *
  *     var BlogEntry = Backbone.Model.extend({
  *       ...
  *       sync: Monitor.Sync('BlogEntry'),
  *       ...
  *     });
  *
  * The sync function can also be assigned to any Backbone model after construction:
  *
  *     var myBook = new Book({id:"44329"});
  *     myBook.sync = Monitor.Sync('Book');
  *     myBook.fetch();
  *
  * In addition to providing the standard ```fetch```, ```save```, and ```destroy```
  * functionality, Sync offers *live data synchronization*, updating the data model
  * as changes are detected on the server.
  *
  *     // Turn on live data synchronization
  *     myBook.fetch({liveSync:true});
  *
  * This fetches the ```myBook``` instance with the contents of the Book class
  * id ```44329```, persists local changes to ```myBook```, and keeps ```myBook```
  * up to date with changes detected on the server.
  *
  * Live data synchronization consumes resources on both the client and server.
  * To release those resources, make sure to call the ```clear()``` method on
  * the data model. Otherwise, resources are released when the server connection
  * is terminated.
  *
  *     // Clear the object, turning off live synchronization
  *     myBook.clear();
  *
  * See the <a href="http://documentcloud.github.com/backbone/#Sync">Backbone documentation</a>
  * for more information about the Backbone.sync functionality.
  *
  * @static
  * @method Sync
  * @param className {String} Name of the class to synchronize with
  * @param [options] {Object} Additional sync options
  *     @param options.hostName {String} Host name to use for the Sync probe.
  *       If not specified, the closest server hosting Sync probe will be
  *       determined (this server, or the default gateway)
  *     @param options.appName {String} Server appName (see Monitor.appName)
  *     @param options.appInstance {String} Application instance (see Monitor.appInstance)
  * @return {sync} A sync method to assign to a Backbone class or instance.
  */
  Monitor.Sync = function(className, options) {
    if (!className) {
      throw new Error('Sync class name must be provided');
    }

    // Get a Sync object and bind it to the sync function
    var syncObj = new Sync(className, options);
    return function(method, model, options) {
      logger.info('sync', {className: className, method:method, model:model.toJSON(), options:options});
      return syncObj._sync(method, model, options);
    };
  };

  /**
  * Live data model synchronization.
  *
  * This class can be attached to Backbone models to synchronize backend data using the
  * <a href="http://documentcloud.github.com/backbone/#Model-fetch">```fetch```</a>,
  * <a href="http://documentcloud.github.com/backbone/#Model-save">```save```</a>, and
  * <a href="http://documentcloud.github.com/backbone/#Model-destroy">```destroy```</a>
  * Backbone API methods.
  *
  * It also provides two-way change based synchronization, updating data on the server as
  * changes are made to the model, and updating the client model as changes are detected
  * on the server.
  *
  * Communication is <a href="Probe.html">Probe</a> based, leveraging the built-in
  * connection, routing, and socket-io functionality.  The <a href="FileSyncProbe.html">FileSyncProbe</a>
  * is provided for file-based model persistence, and others can be written to
  * implement alternate persistence mechanisms.
  *
  * @private
  * @class Sync
  */
  var Sync = function(className, options) {
    var t = this;
    logger.info('syncInit', className, options);
    t.className = className;
    t.options = options || {};
  };

  /**
  * Provide the sync API to a backbone data model
  *
  * See the <a href="http://documentcloud.github.com/backbone/#Sync">Backbone documentation</a>
  * for more information on this method.
  *
  * @private
  * @method _sync
  * @param method {String} A CRUD enumeration of "create", "read", "update", or "delete"
  * @param model {Backbone.Model or Backbone.Collection} The model or collection to act upon
  * @param [options] {Object} Success and error callbacks, and additional options to
  *   pass on to the sync implementation.
  *     @param [options.liveSync] - Turn on the live update functionality
  *     @param [options.silenceErrors] - Silence the logging of errors (they're expected)
  *     @param [options.success] - The method to call on method success
  *     @param [options.error] - The method to call on method error
  */
  Sync.prototype._sync = function(method, model, options) {
    var t = this;
    options = options || {};

    // Cannot liveSync with a collection (too many issues)
    if (options.liveSync && model instanceof Backbone.Collection) {
      return options.error(null, 'Cannot liveSync with a collection');
    }

    // Generate an ID if necessary
    if (!model.has('id')) {
      if (method === METHOD_CREATE) {
        model.set({id: Monitor.generateUniqueId()}, {silent: true});
        logger.info('_sync.generateUniqueId', t.className, model.toJSON(), options);
      } else {
        return options.error(null, 'ID element must be set.');
      }
    }

    // Special case: LiveSync on CREATE.  LiveSync requires a persisted object,
    // so if requesting liveSync on a create, we have to use the class monitor
    // for the create, then get an instance monitor for the liveSync.
    if (method === METHOD_CREATE && options.liveSync) {
      // Call this method again without liveSync (this uses the class monitor)
      t._sync(method, model, {error: options.error, success: function(params){
        // Now connect w/liveSync using a fetch
        t._sync(METHOD_READ, model, options);
      }});
      return;
    }

    // Create a function to run once complete
    var onComplete = function(error, params) {
      if (error) {
        if (!options.silenceErrors) {
          logger.error('_sync.onComplete', t.className, error);
        }
        options.error(null, error);
      } else {
        logger.info('_sync.onComplete', t.className, model.get('id'));
        options.success(params);
      }
    };

    // Is the proper syncMonitor already connected?
    if (model.syncMonitor || (t.syncMonitor && !options.liveSync)) {

      // Send the control message to the connected monitor
      var syncMonitor = model.syncMonitor || t.syncMonitor;
      var opts = t._getOpts(method, model);
      syncMonitor.control(method, opts, onComplete);

    } else {

      // Connect an instance level syncMonitor to the model if liveSync
      // is specified, otherwise create a class level syncMonitor
      if (options.liveSync) {
        t._connectInstanceMonitor(method, model, options, onComplete);
      } else {
        t._connectClassMonitor(method, model, options, onComplete);
      }
    }

  };

  /**
  * Connect and send the control message to a Sync probe for this class.
  *
  * This creates a monitor to a Sync probe with the specified className.
  * The monitor is used to send CRUD control messages for any ID within
  * the class.
  *
  * Once connected, it sends the specified control message to the probe.
  *
  * This monitor is used for non-liveSync interactions.
  *
  * @private
  * @method _connectClassMonitor
  * @param method {String} The requested CRUD method
  * @param model {Backbone.Model} The data model to perform the operation on
  * @param [options] {Object} Options
  *     @param [options.silenceErrors] - Silence the logging of errors (they're expected)
  * @param callback {function(error, params)} - Called when connected
  *     @param callback.error {Mixed} - Set if it couldn't connect
  *     @param callback.params {Object} - Updated data model parameters
  */
  Sync.prototype._connectClassMonitor = function(method, model, options, callback) {
    var t = this;

    // Connect a syncMonitor for the class
    logger.info('connectClassMonitor', t.className, method, model.toJSON());
    var monitorParams = t._getMonitorParams(null);
    var syncMonitor = new Monitor(monitorParams);
    syncMonitor.connect(function(error){
      if (error) {
        if (!options.silenceErrors) {
          logger.error('connectClassMonitor', error);
        }
        return callback(error);
      }

      // Attach the syncMonitor and forward the initial control message
      t.syncMonitor = syncMonitor;
      var opts = t._getOpts(method, model);
      syncMonitor.control(method, opts, callback);
    });
  };

  /**
  * Connect and send the control message to a liveSync monitor for the model
  *
  * This creates a monitor to a Sync probe for the model instance, and
  * attaches event listeners onto the monitor and the data model.
  *
  * Once connected, it sends the specified control message to the probe.
  *
  * Changes on the server are automatically propagated to the local
  * data model, and local changes to the data model are automatically
  * propagated to the server.
  *
  * @private
  * @method _connectInstanceMonitor
  * @param method {String} The requested CRUD method
  * @param model {Backbone.Model} The data model to perform the operation on
  * @param callback {function(error, params)} - Called when connected
  *     @param callback.error {Mixed} - Set if it couldn't connect
  *     @param callback.params {Object} - Updated data model parameters
  */
  Sync.prototype._connectInstanceMonitor = function(method, model, options, callback) {
    var t = this, syncMonitor, modelId = model.get('id');

    // Called when done connecting
    var whenDone = function(error) {

      // Don't connect the instance monitor if errors
      if (error) {
        return callback(error);
      }

      // Called to disconnect the listeners
      var disconnectListeners = function() {
        logger.info('disconnectLiveSync', t.className, model.toJSON());
        model.off('change', modelListener);
        model.syncMonitor.off('change', monitorListener);
        model.syncMonitor.disconnect();
        model.syncMonitor = null;
      };

      // Client-side listener - for persisting changes to the server
      var modelListener = function(changedModel, options) {
        options = options || {};

        // Don't persist unless the model is different
        if (_.isEqual(JSON.parse(JSON.stringify(model)), JSON.parse(JSON.stringify(model.syncMonitor.get('model'))))) {
          logger.info('modelListener.noChanges', t.className, model.toJSON());
          return;
        }

        // Disconnect listeners if the ID changes
        if (model.get('id') !== modelId) {
          logger.info('modelListener.alteredId', t.className, model.toJSON());
          return disconnectListeners();
        }

        // Persist changes to the server (unless the changes originated from there)
        if (!options.isSyncChanging) {
          logger.info('modelListener.saving', t.className, model.toJSON());
          model.save();
        }
      };

      // Server-side listener - for updating server changes into the model
      var monitorListener = function(changedModel, options) {

        // Don't update unless the model is different
        var newModel = model.syncMonitor.get('model');
        if (_.isEqual(JSON.parse(JSON.stringify(model)), JSON.parse(JSON.stringify(newModel)))) {
          logger.info('monitorListener.noChanges', t.className, newModel);
          return;
        }

        // Disconnect if the model was deleted or the ID isn't the same
        var isDeleted = (_.size(newModel) === 0);
        if (isDeleted || newModel.id !== modelId)  {
          logger.info('modelListener.deleted', t.className, newModel);
          disconnectListeners();
        }

        // Forward changes to the model (including server-side delete)
        var newOpts = {isSyncChanging:true};
        if (isDeleted) {
          logger.info('modelListener.deleting', t.className, newModel);
          model.clear(newOpts);
        } else {
          // Make sure the model is set to exactly the new contents (vs. override)
          logger.info('modelListener.setting', t.className, newModel);
          model.clear({silent:true});
          model.set(newModel, newOpts);
        }
      };

      // Connect the listeners
      model.on('change', modelListener);
      model.syncMonitor.on('change', monitorListener);

      // Send back the initial data model
      logger.info('connectInstanceMonitor.done', t.className, model.toJSON());
      callback(null, model.syncMonitor.get('model'));
    };

    // Create a liveSync monitor for the model
    var monitorParams = t._getMonitorParams(modelId);
    syncMonitor = new Monitor(monitorParams);
    syncMonitor.connect(function(error){
      if (error) {
        if (!options.silenceErrors) {
          logger.error('connectInstanceMonitor.monitorConnect', error);
        }
        return whenDone(error);
      }

      // Attach the connected syncMonitor to the model
      model.syncMonitor = syncMonitor;

      // If the initial method is read, then the monitor already
      // contains the results.  Otherwise, another round-trip is
      // necessary for the initial control request.
      if (method === METHOD_READ) {
        return whenDone();
      }

      // Forward the initial control
      var opts = t._getOpts(method, model);
      logger.info('connectInstanceMonitor.forwarding', method, t.className, model.toJSON());
      syncMonitor.control(method, opts, whenDone);
    });
  };

  /**
  * Prepare the control options
  *
  * This prepares the control options to include the ID element
  * on a fetch or delete, and the entire model on a create or
  * update.
  *
  * @private
  * @method _getOpts
  * @param method {Enum} One of the CRUD methods
  * @param model {Backbone.Model} The model to prepare the opts from
  * @return {Object} The options object to pass to the probe
  */
  Sync.prototype._getOpts = function(method, model) {
    var opts = {};
    switch (method) {
      case METHOD_READ:
      case METHOD_DELETE:
        opts.id = model.get('id');
        break;
      case METHOD_CREATE:
      case METHOD_UPDATE:
        opts.model = model.toJSON();
        break;
    }
    return opts;
  };

  /**
  * Prepare the init parameters for a monitor to a Sync probe
  *
  * The monitor init params for the class monitor and the liveSync
  * model monitor only differ in the modelId, so this method was
  * broken out to reduce code duplication.
  *
  * @private
  * @method _getMonitorParams
  * @param [modelId] {String} Id to the data model.  If set, then params
  *   will be built for liveSync to a data model with that id.
  *   params for the class.
  * @return {Object} The monitor parameters
  */
  Sync.prototype._getMonitorParams = function(modelId) {

    // Build server connection parameters from this instance of Sync
    var t = this;
    var params = _.pick(t.options, 'hostName', 'appName', 'appInstance');

    // Add probe and class parameters
    params.probeClass = 'Sync';
    params.initParams = {
      className: t.className
    };

    // Add the model id if this is a liveSync probe
    if (modelId) {
      params.initParams.modelId = modelId;
    }

    return params;
  };


}(this));

// DataModelProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor

(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor');

  /**
  * Probe representation of a simple data model
  *
  * This probe allows remote creation, manipulation, and change moitoring for
  * arbitrary data. It is useful for monitor applications needing to maintain
  * a small amount of state on the system being monitored.
  *
  * @class DataModelProbe
  * @extends Probe
  * @constructor
  * @param [initParams] - Initialization parameters.  An object containing the
  *   initial state of the data model.  All properties become data model
  *   elements, readable and writable by all monitors connected to the probe.
  */
  var DataModelProbe = Monitor.DataModelProbe = Monitor.Probe.extend({

    // These are required for Probes
    probeClass: 'DataModel',
    writableAttributes: '*'

  });

}(this));

// RecipeProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor

/* This class is evil.  You probably shouldn't use it. Or drink. Or drink while using it. */
/*jslint evil: true */

(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor'),
      _ = Monitor._,
      Cron = Monitor.Cron,
      logger = Monitor.getLogger('RecipeProbe'),
      vm = Monitor.commonJS ? require('vm') : null,
      Probe = Monitor.Probe;

  /**
  * Monitor automation probe
  *
  * The Recipe probe monitors other probes and runs instructions when the
  * probes change, and controls other probes based on these instructions.
  *
  * It contains a list of monitors to instantiate, and a script to run when the
  * monitor ```change``` event is fired.
  *
  * When the script fires, the monitors are available to the script by name.
  * The script can ```get()``` monitor values, ```set()``` writable monitor
  * values, and control the monitor using the ```control()`` method.
  *
  * The ```this``` variable is consistent between script runs, so state can be
  * maintained by setting attributes in ```this```.
  *
  * @class RecipeProbe
  * @extends Probe
  * @constructor
  * @param monitors {Object} - Named list of monitors to instantiate
  *   Key: monitor variable name, Value: Monitor model parameters
  * @param script {String} - JavaScript script to run.
  *   The script has access to ```console```, ```logger```, and all defined
  *   monitors by name.
  * @param [recipeName] {String} - Recipe name for logging
  * @param [autoStart=false] {boolean} - Call the start control on instantiation?
  * @param [triggeredBy] {Object} - Trigger the recipe by the items in the object.
  *        Items can include: 'interval', 'cron', and/or monitorName(s)
  *        If 'interval' is the key, the value is the interval in milliseconds
  *        If 'cron' is the key, the value is a string representing the cron pattern
  *        If any monitor name is the key, the value is the monitor event to trigger on.
  *        Example:
  *        triggeredBy: {
  *          interval: 5000,      // This triggers the recipe every 5 seconds
  *          cron: '* * * * * *', // [second] [minute] [hour] [day of month] [month] [day of week]
  *          myMonitor: 'change:someAttribute change:someOtherAttribute'
  *        }
  *        If triggeredBy isn't specified, any monitor change will trigger the recipe.
  * @param [started] {boolean} - Is the recipe started and currently active?
  */
  var RecipeProbe = Monitor.RecipeProbe = Probe.extend({

    probeClass: 'Recipe',
    writableAttributes: [],
    defaults: {
      recipeName: '',
      monitors: {},
      script: '',
      autoStart: false,
      started: false,
      triggeredBy: null
    },

    initialize: function(attributes, options){
      var t = this;

      // Periodic triggers
      t.interval = null;
      t.cronJob = null;

      // Precondition test
      if (_.size(t.get('monitors')) === 0) {
        logger.error('initialize', 'No monitors defined in the recipe');
        return;
      }

      // This is a list of monitors (vs. monitor definitions)
      t.monitors = {};

      // Auto start, calling the callback when started
      if (t.get('autoStart')) {
        options.asyncInit = true;
        t.start_control({}, options.callback);
      }
    },

    release: function() {
      var t = this,
          args = arguments;
      t.stop_control({}, function(){
        Probe.prototype.release.apply(t, args);
      });
    },

    /**
    * Start the recipe
    *
    * This connects to each monitor and sets up the recipe triggers
    *
    * @method start_control
    */
    start_control: function(params, callback) {
      var t = this,
          connectError = false,
          monitors = t.get('monitors');

      if (t.get('started')) {
        var err = {code:'RUNNING', msg:'Cannot start - the recipe is already running.'};
        logger.warn(err);
        return callback(err);
      }

      // Called when a monitor has connected
      var onConnect = function(error) {
        if (connectError) {return;}
        if (error) {
          var err = {code:'CONNECT_ERROR', err: error};
          connectError = true;
          logger.error('start', err);
          return callback(err);
        }
        for (var name1 in t.monitors) {
          if (!t.monitors[name1].isConnected()) {
            return;
          }
        }
        t.set({started:true});
        t.connectListeners(true);
        callback();
      };

      // Connect all monitors
      for (var name2 in monitors) {
        t.monitors[name2] = new Monitor(monitors[name2]);
        t.monitors[name2].connect(onConnect);
      }

    },

    /**
    * Stop the recipe
    *
    * This disconnects each monitor
    *
    * @method stop_control
    */
    stop_control: function(params, callback) {
      var t = this,
          disconnectError = false;

      if (!t.get('started')) {
        var err = {code:'NOT_RUNNING', msg:'The recipe is already stopped.'};
        logger.warn('precondition', err);
        return callback(err);
      }

      // Called when a monitor has disconnected
      var onDisconnect = function(error) {
        if (disconnectError) {return;}
        if (error) {
          var err = {code:'DISONNECT_ERROR', err: error};
          disconnectError = true;
          logger.error('onDisconnect', err);
          return callback(err);
        }
        for (var name1 in t.monitors) {
          if (t.monitors[name1].isConnected()) {
            return;
          }
        }
        t.set({started:false});
        t.compiledScript = null;
        callback();
      };

      // Disconnect all monitors
      t.connectListeners(false);
      t.context = null;
      for (var name2 in t.monitors) {
        t.monitors[name2].disconnect(onDisconnect);
      }
    },

    /**
    * Connect the change listeners
    *
    * @private
    * @method connectListeners
    */
    connectListeners: function(connect) {
      var t = this,
          triggeredBy = t.get('triggeredBy'),
          onTrigger = t.onTrigger.bind(t);

      // Default to listen on changes to all monitors
      if (!triggeredBy) {
        for (var monitorName in t.monitors) {
          t.monitors[monitorName][connect ? 'on' : 'off']('change', t.onTrigger, t);
        }
        return;
      }

      // Process the elements in triggeredBy
      for (var name in triggeredBy) {
        var value = triggeredBy[name];

        // Construct a new cron job
        if (name === 'cron') {
          if (connect) {
            t.cronJob = new Cron.CronJob(value, onTrigger);
          }
          else {
            if (t.cronJob.initiated) {
              clearInterval(t.CronJob.timer);
            }
            else {
              setTimeout(function(){clearInterval(t.cronJob.timer);}, 1000);
            }
          }
        }

        // Set a polling interval
        else if (name === 'interval') {
          if (connect) {
            t.interval = setInterval(onTrigger, value);
          }
          else {
            clearInterval(t.interval);
            t.interval = null;
          }
        }

        // Must be a monitor name
        else {
          t.monitors[name][connect ? 'on' : 'off'](value, onTrigger);
        }
      }
    },

    /**
    * Called when a trigger is fired
    *
    * @private
    * @method onTrigger
    */
    onTrigger: function() {
      var t = this;
      t.run_control({}, function(error){
        if (error) {
          logger.error('onTrigger', error);
        }
      });
    },

    /**
    * Run the recipe script
    *
    * This manually runs a started recipe.  The callback is called immediately
    * after executing the script.
    *
    * @method run_control
    */
    run_control: function(params, callback) {
      var t = this,
          error = null;
      if (!t.get('started')) {
        error = {code:'NOT_RUNNING', msg:'Cannot run - recipe not started.'};
        logger.warn(error);
        return callback(error);
      }

      // Name the probe
      t.name = t.get('probeName') || t.get('id');

      // Build a context to pass onto the script.  The context contains
      // a console, a logger, and each monitor by name.
      if (!t.context) {
        t.context = vm ? vm.createContext({}) : {};
        t.context.console = console;
        t.context.logger = Monitor.getLogger('Recipe.run.' + t.name);
        for (var monitorName in t.monitors) {
          t.context[monitorName] = t.monitors[monitorName];
        }
      }

      // Run the script
      try {
        t.run(t.context);
      } catch(e) {
        error = "Error running script: " + e.toString();
        logger.error('run_control', error);
      }
      callback(error);
    },

    /**
    * Execute the recipe.  This is a private method that can be overridden
    * in derived recipe classes that contain the recipe.
    *
    * @private
    * @method run
    */
    run: function(context) {
      var t = this,
          script = t.get('script');

      // Run in a VM or exec (if running in a browser)
      if (vm) {
        // Compile the script on first run.  This throws an exception if
        // the script has a problem compiling.
        if (!t.compiledScript) {
          t.compiledScript = vm.createScript(script);
        }

        // Execute the compiled script
        t.compiledScript.runInContext(context, t.name);
      }
      else {
        // Bring all context variables local, then execute the script
        eval(t.bringLocal(context));
        eval(script);
      }
    },

    /**
    * Generate a script that brings context members into local scope
    *
    * @private
    * @method bringLocal
    */
    bringLocal: function(context) {
      var varName,
          localVars = [];
      for (varName in context) {
        localVars.push('var ' + varName + ' = context.' + varName + ';');
      }
      return localVars.join('\n');
    }

  });


}(this));

// PollingProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('../Monitor'),
      _ = Monitor._,
      Cron = Monitor.Cron,
      Probe = Monitor.Probe,
      Backbone = Monitor.Backbone;

  // Constants
  var DEFAULT_POLL_INTERVAL = 1000;
  var DEFAULT_CRON_PATTERN = "* * * * * *";

  /**
  * ## Base class for probes that require polling to detect and set model changes.
  *
  * The probe wakes up every polling interval and executes the poll() method
  * in the derived class.
  *
  * PollingProbes are instantiated with either a polling interval (in milliseconds)
  * or a cron pattern.  If the polling interval is set, that's what will be used.
  *
  * The cronPattern isn't available in browser-side probes.
  *
  * To disable polling, set the pollInterval to 0.
  *
  * More about cron formats, with examples
  * <ul>
  *   <li><a href="http://crontab.org/">http://crontab.org/</a></li>
  *   <li><a href="http://en.wikipedia.org/wiki/Cron">http://en.wikipedia.org/wiki/Cron</a></li></li>
  *   <li><a href="http://www.adminschoice.com/crontab-quick-reference">http://www.adminschoice.com/crontab-quick-reference</a></li></li>
  * </ul>
  *
  * @class PollingProbe
  * @extends Probe
  * @constructor
  * @param [initParams] {Object} Probe initialization parameters
  *     @param [initParams.pollInterval] {Integer} Polling interval in milliseconds. Default: null
  *     @param [initParams.cronPattern] {String} Crontab syle polling pattern. Default once per second: "* * * * * *"
  *
  *   The format is: <i>[second] [minute] [hour] [day of month] [month] [day of week]</i>.<br>
  */
  var PollingProbe = Monitor.PollingProbe = Probe.extend({
    defaults: _.extend({}, Probe.prototype.defaults, {
      pollInterval: null,
      cronPattern: DEFAULT_CRON_PATTERN
    }),
    initialize: function(){
      var t = this,
          pollInterval = t.get('pollInterval'),
          cronPattern = t.get('cronPattern'),
          poll = function(){t.poll();};
      Probe.prototype.initialize.apply(t, arguments);

      // Override cron for the default 1-second interval
      // (this allows the default to work when Cron isn't available)
      if (pollInterval == null && cronPattern === DEFAULT_CRON_PATTERN) {
        pollInterval = DEFAULT_POLL_INTERVAL;
      }

      // Poll once, then set up the interval
      t.poll();
      if (pollInterval !== 0) {
        if (pollInterval) {
          t.timer = setInterval(poll, pollInterval);
        } else {
          if (!Cron) {
            throw new Error("Cron is not available in this client");
          }
          t.cronJob = new Cron.CronJob(cronPattern, poll);
        }
      }
    },
    release: function(){
      var t = this, timer = (t.cronJob ? t.cronJob.timer : t.timer);
      if (t.cronJob && !t.cronJob.initiated) {
        // If cron isn't initiated we've been asked to shut down within the
        // first second, and the timer hasn't been set (but will be soon).
        setTimeout(function(){clearInterval(t.cronJob.timer);}, 1000);
      } else if (t.timer) {
        clearInterval(timer);
      }
      t.timer = t.cron = null;
      Probe.prototype.release.apply(t, arguments);
    }

  });

}(this));

// StreamProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root){

  // Module loading
  var Monitor = root.Monitor || require('../Monitor'),
      Probe = Monitor.Probe,
      _ = Monitor._;

  // Constants
  var DEFAULT_BUNDLE_INTERVAL = 1000;

  /**
  * Base class for probes that stream data
  *
  * Offering real time data streaming can result in degraded performance due
  * to the I/O overhead of sending individual stream elements to remote monitors.
  *
  * This class eases that overhead by bundling stream elements, and sending those
  * bundles in scheduled intervals.  The monitor gets to decide the interval based
  * on the stream volume, and their needs.
  *
  * Derived classes output their stream data as elements of the ```bundle```
  * attribute.
  *
  * A ```sequence``` attribute is incremented sequentially to assure change
  * events are fired, and to allow clients to insure stream ordering and
  * completeness.
  *
  * @class StreamProbe
  * @extends Probe
  * @constructor
  * @param [initParams] {Object} Probe initialization parameters
  *     @param [initParams.interval=1000] {Numeric} Number of milliseconds
  *         to wait between bundles.
  */
  var StreamProbe = Monitor.StreamProbe = Probe.extend({


    defaults: _.extend({}, Probe.prototype.defaults, {
      bundle: [],
      interval: DEFAULT_BUNDLE_INTERVAL,
      sequence: 0
    }),

    initialize: function(){
      var t = this;

      // Initialize parent
      Probe.prototype.initialize.apply(t, arguments);

      // Moving the interval into an instance variable for performance
      t.interval = t.get('interval');

      // Set up for the first bundle
      t.queue = [];
      t.timer = null;
      t.lastSendTime = 0;
    },

    /**
    * Queue an item in the stream
    *
    * This method places the item into the stream and outputs it to the
    * monitor, or queues it up for the next bundle.
    *
    * @method queueItem
    * @param item {Any} Item to place into the queue
    */
    queueItem: function(item) {
      var t = this,
          now = Date.now(),
          msSinceLastSend = now - t.lastSendTime;

      // Queue the item
      t.queue.push(item);

      // Send the bundle?
      if (msSinceLastSend > t.interval) {
        // It's been a while since the last send.  Send it now.
        t._send();
      }
      else {
        // Start the timer if it's not already running
        if (!t.timer) {
          t.timer = setTimeout(function(){
            t._send();
          }, t.interval - msSinceLastSend);
        }
      }
    },

    /**
    * Send the bundle to the montitor
    *
    * @private
    * @method _send
    */
    _send: function() {
      var t = this,
          now = Date.now();

      // This kicks off the send
      t.lastSendTime = now;
      t.set({
        bundle: t.queue,
        sequence: t.get('sequence') + 1
      });

      // Reset
      t.queue = [];
      if (t.timer) {
        clearTimeout(t.timer);
        t.timer = null;
      }
    }

  });

}(this));

// InspectProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor

/* This class is evil.  You probably shouldn't use it.  Or drink.  Or drink while using it. */
/*jslint evil: true */

(function(root){

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor'),
      _ = Monitor._,
      logger = Monitor.getLogger('InspectProbe'),
      Backbone = Monitor.Backbone,
      PollingProbe = Monitor.PollingProbe;

  // Constants
  var DEFAULT_DEPTH = 2;

  /**
  * Inspect and manipulate variables on the monitored server.
  *
  * This class monitors the variable specified by the key.
  *
  * The key is evaluated to determine the variable to monitor, so it may
  * be a complex key starting at global scope.  If the key isn't
  * specified, it monitors all variables in the global scope.
  *
  * If the key points to an object of type Backbone.Model, this probe
  * will update the value in real time, triggered on the *change* event.
  * Otherwise it will update the value as it notices changes, while polling
  * on the specified polling interval (default: 1 second).
  *
  * @class InspectProbe
  * @extends PollingProbe
  * @constructor
  * @param [initParams] - Initialization parameters
  *     @param [initParams.key=null] {String} A global variable name or expression
  *     @param [initParams.depth=2] {Integer} If the key points to an object, this
  *       is the depth to traverse the object for changes.  Default=2, or 1 if
  *       key='window'.
  *     @param [initParams.pollInterval] {Integer} (from <a href="PollingProbe.html">PollingProbe</a>) Polling interval in milliseconds. Default: null
  *     @param [initParams.cronPattern] {String} (from <a href="PollingProbe.html">PollingProbe</a>) Crontab syle polling pattern. Default once per second: "* * * * * *"
  * @param model - Monitor data model elements
  *     @param model.value - The value of the element being inspected
  *     @param model.isModel - Is the value a Backbone.Model?
  */
  var InspectProbe = Monitor.InspectProbe = PollingProbe.extend({

    // These are required for Probes
    probeClass: 'Inspect',
    writableAttributes: ['value'],

    initialize: function(initParams){
      var t = this;

      // Get the global object if the key isn't specified
      t.key = initParams.key;
      if (typeof initParams.key === 'undefined') {
        t.key = typeof window === 'undefined' ? 'global' : 'window';
      }

      // Get a good depth default.  Default unless key = window.
      if (typeof initParams.depth === 'undefined') {
        if (!initParams.key && t.key === 'window') {
          t.depth = 1;
        } else {
          t.depth = DEFAULT_DEPTH;
        }
      } else {
        t.depth = initParams.depth;
      }

      // Evaluate the expression to see if it's a Backbone.Model
      // This will throw an exception if the key is a bad expression
      t.value = t._evaluate(t.key);
      t.isModel = t.value instanceof Backbone.Model;

      // Set the initial values
      t.set({
        value: Monitor.deepCopy(t.value, t.depth),
        isModel: t.isModel
      });

      // Watch for backbone model changes, or initialize the polling probe
      if (t.isModel) {
        t.value.on('change', t.poll, t);
      } else {
        PollingProbe.prototype.initialize.apply(t, arguments);
      }
    },

    /**
    * Remotely set the inspected variable's value
    *
    * @method set_control
    * @param attrs {Object} Name/Value attributes to set.  All must be writable.
    * @param callback {Function(error)} Called when the attributes are set or error
    */
    set_control: function(attrs, callback) {
      var t = this;

      // Value is the only thing to set
      if (typeof attrs.value === 'undefined') {
        return callback({code:'NO_VALUE'});
      }

      // Set the model elements.  These cause change events to fire
      if (t.isModel) {
        t.value.set(attrs.value);
      }
      else {
        // Set the variable directly
        var jsonValue = JSON.stringify(attrs.value);
        t._evaluate(t.key + ' = ' + jsonValue);
        t.set('value', attrs.value);
      }
      return callback();
    },

    // Stop watching for change events or polling
    release: function() {
      var t = this;
      if (t.isModel) {
        t.value.off('change', t.poll, t);
      } else {
        PollingProbe.prototype.release.apply(t, arguments);
      }
    },

    /**
    * Evaluate an expression, returning the depth-limited results
    *
    * @method eval_control
    * @param expression {String} Expression to evaluate
    * @param [depth=2] {Integer} Depth of the object to return
    * @return value {Mixed} Returns the depth-limited value
    */
    eval_control: function(expression, depth){
      var t = this;

      // Determine a default depth
      depth = typeof depth === 'undefined' ? DEFAULT_DEPTH : depth;

      // Get the raw value
      var value = t._evaluate(expression);

      // Return the depth limited results
      return Monitor.deepCopy(value, depth);
    },

    /**
    * Evaluate an expression, returning the raw results
    *
    * @protected
    * @method _evaluate
    * @param expression {String} Expression to evaluate
    * @return value {Mixed} Returns the expression value
    */
    _evaluate: function(expression){
      var t = this,
          value = null;

      // Evaluate the expression
      try {
        value = eval(expression);
      } catch (e) {
        var err = 'Unable to evaluate expression: "' + expression + '"';
        logger.error('evaluate', err);
        throw new Error(err);
      }

      // Return the value
      return value;
    },

    /**
    * Poll for changes in the evaluation
    *
    * @method poll
    */
    poll: function() {
      var t = this,
          newValue = t.eval_control(t.key, t.depth);

      // Set the new value if it has changed from the current value
      if (!_.isEqual(newValue, t.get('value'))) {
        t.set({value: newValue});
      }
    }
  });

}(this));

// StatProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root) {

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor'),
      _ = Monitor._,
      StreamProbe = Monitor.StreamProbe,
      Stat = Monitor.Stat;

  // Constants
  var DEFAULT_PATTERN = '*';

  /**
  * Remote application statistics monitoring
  *
  * This probe forwards application statistics to the monitor.
  *
  * @class StatProbe
  * @extends StreamProbe
  * @constructor
  * @param [initParams] {Object} Probe initialization parameters
  *     @param [initParams.pattern=*] {String} Stat name pattern to monitor (see <a href="Stat.html">Stat</a>)
  *     @param [initParams.interval=1000] {Numeric} Queue interval (see <a href="StreamProbe.html">StreamProbe</a>)
  * @param model {Object} Monitor data model elements
  *     @param model.bundle {Stat array} Array of Stat elements.
  *         @param model.bundle.timestamp {String} Timestamp of the stat entry
  *         @param model.bundle.module {String} Stat module
  *         @param model.bundle.name {String} Stat name
  *         @param model.bundle.value {Numeric} Stat value
  *         @param model.bundle.type {String} 'c'ounter, 'g'ague, or 'ms'timer
  *     @param model.sequence {Integer} A numeric incrementer causing a change event
  */
  var StatProbe = Monitor.StatProbe = StreamProbe.extend({

    probeClass: 'Stat',

    defaults: _.extend({}, StreamProbe.prototype.defaults, {
      pattern: DEFAULT_PATTERN
    }),

    initialize: function(){
      var t = this;

      // Call parent constructor
      StreamProbe.prototype.initialize.apply(t, arguments);

      // The watcher just forwards all args to queueItem as an array
      t.watcher = function() {
        // Add timestamp as the first element
        var logElems = _.toArray(arguments);
        logElems.splice(0,0,JSON.stringify(new Date()).substr(1,24));
        t.queueItem.call(t, logElems);
      };
      Stat.on(t.get('pattern'), t.watcher);
    },

    release: function() {
      var t = this;
      Stat.off(t.get('pattern'), t.watcher);
    }

  });

}(this));

// LogProbe.js (c) 2010-2014 Loren West and other contributors
// May be freely distributed under the MIT license.
// For further details and documentation:
// http://lorenwest.github.com/node-monitor
(function(root) {

  // Module loading - this runs server-side only
  var Monitor = root.Monitor || require('../Monitor'),
      _ = Monitor._,
      StreamProbe = Monitor.StreamProbe,
      Log = Monitor.Log;

  // Constants
  var DEFAULT_PATTERN = '*';

  /**
  * Remote application log monitoring
  *
  * This probe forwards application logs to the monitor.
  *
  * @class LogProbe
  * @extends StreamProbe
  * @constructor
  * @param [initParams] {Object} Probe initialization parameters
  *     @param [initParams.pattern=*] {String} Log name pattern to monitor (see <a href="Log.html">Log</a>)
  *     @param [initParams.interval=1000] {Numeric} Queue interval (see <a href="StreamProbe.html">StreamProbe</a>)
  * @param model {Object} Monitor data model elements
  *     @param model.bundle {Log array} Array of Log elements.
  *         @param model.bundle.timestamp {String} Timestamp of the log statement
  *         @param model.bundle.logType {String} Log type (error, info, etc)
  *         @param model.bundle.module {String} Module that emitted the log
  *         @param model.bundle.name {String} Log entry name
  *         @param model.bundle.args {any[]} Arguments to the log statement
  *     @param model.sequence {Integer} A numeric incrementer causing a change event
  */
  var LogProbe = Monitor.LogProbe = StreamProbe.extend({

    probeClass: 'Log',

    defaults: _.extend({}, StreamProbe.prototype.defaults, {
      pattern: DEFAULT_PATTERN
    }),

    initialize: function(){
      var t = this;

      // Call parent constructor
      StreamProbe.prototype.initialize.apply(t, arguments);

      // The watcher just forwards all args to queueItem as an array
      t.watcher = function() {
        // Add timestamp as the first element
        var logElems = _.toArray(arguments);
        logElems.splice(0,0,JSON.stringify(new Date()).substr(1,24));
        t.queueItem.call(t, logElems);
      };
      Log.on(t.get('pattern'), t.watcher);
    },

    release: function() {
      var t = this;
      Log.off(t.get('pattern'), t.watcher);
    }

  });

}(this));
