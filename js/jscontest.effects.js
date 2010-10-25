/* Version: 0.2.0 */
/* author: Phillip Heidegger */

/* This library will not change the global namespace in any sense. 
   But it assumes that the global variable JSConTest exists and 
   register all its methods in JSConTest.effects.
   
   In order to change this behavior, please go to the end of the
   file and pass another object to the function. 
*/

"use strict";
(function (P) {
  // Effect Paths
  var PARAMETER = 1,
      VARIABLE = 2,
      PROP = 3,
      QUESTIONMARK = 4,
      STAR = 5,
      ALL = 6,
      noPROP = 7;

  
  var E = {},
    // Formal: uid -> (Read,Write)
    // Implementation: uid -> effect attached to function
    // Initially the empty map
    effect_store = {},  
    checkEffect = true;  // should effects be checked?
  
  /* use the new object E and register it in the
     namespace JSConTest */
  P.effects = E;

  function cfire() {
    var slice = Array.prototype.slice,
        args  = slice.apply( arguments);
    
    if (P.events && P.events.create_fire_function 
        && (typeof P.events.create_fire_function === 'function')) {
      return P.events.create_fire_function.apply(this, args );
    }
  }

  var getUid = function () { 
    return undefined; 
  };
  var getActiveFunName = function () {
    return undefined;
  };
  var registerEffect = (function () {
      var i = 0;
      function getGlobalObject() { 
        return this;
      }
      function registerEffect(effl, pl, thisC, fname) {
        var uid = i;
        i += 1;
        effect_store[uid] = effl;
        getUid = (function(uid) {
          return (function () { 
                    return uid; 
                  });
        }(uid));
        getActiveFunName = (function(fname) {
          return (function () {
                    return fname;
                  });
        }(fname));
        return uid;
      };
      return registerEffect;
  }());
  function unregisterEffect(uid) {
    delete effect_store[uid];
  }
  
  // eff is an entry of an entry in the effect store
  // context_for_uid is the first path to the object, 
  // that was used to read it for the corresponding context
  // our task here is, to check if a read access is valid here
  function isAllowedEff(access_path, eff) {
    switch (eff.type) {
    case PARAMETER:
      return ((access_path.type === PARAMETER) && 
              (eff.number === access_path.number));
    case VARIABLE:
    	return ((access_path.type === VARIABLE) &&
    					(eff.name === access_path.name));
    case PROP:
      if ((access_path.type === PROP) && 
          (access_path.property === eff.property)) {
        return isAllowedEff(access_path.effect, eff.effect);
      } else {
        return false;
      }
    case QUESTIONMARK:
      if (access_path.type === PROP) {
        return isAllowedEff(access_path.effect, eff.effect);
      } else {
        return false;
      }
    case STAR: 
      if (access_path.type === PROP) {
        if (isAllowedEff(access_path.effect, eff.effect)) {
          return true;
        }
        return isAllowedEff(access_path.effect, eff);
      }
    default: return false;
    }
  }

  function isAllowedEffAllPrefixes(access_path, eff) {
    if (isAllowedEff(access_path, eff)) {
      return true;
    } else {
      if (eff.effect) {
        return isAllowedEffAllPrefixes(access_path, eff.effect);
      } else {
        return false;
      }
    }
  }

  
  function isAllowedEffl(uid, access_pathl, effl, isAllow) {
  	function isAllowedEffl(access_path) {
    	// each entry in the effect store, that is 
      // not younger then the object itself, is allowed
      if (access_path && (access_path.alloc >= uid)) {
        return true;
      }
      if ((typeof effl === 'object') && (effl.type === ALL)) {
        return true;
      }
      // if the object is older then the entry in the effect store
      // check the access. Here, one of them must allow the access
      for (var i = 0; i < effl.length; i += 1) {
        var eff = effl[i];
        if (isAllow(access_path, eff)) {
          return true;
        }
      }
      return false;  		
  	}
  	var j;
  	// if one access path is valid, the access is allowed
  	for (j = 0; j < access_pathl.length; j += 1) {
  		if (isAllowedEffl(access_pathl[j])) {
  			return true;
  		}
  	}
  	return false;
  }
  
  function checkReadWrite(uid, access_pathl, isAllow) {
    if (!checkEffect) {
      return true;
    }
    var effl = effect_store[uid];
    // if there exists not entry for this uid, access is allowed
    if (!effl) {
      return true;
    }
    // there exists an entry for the uid, hence check if access is
    // forbidden.
    return isAllowedEffl(uid, access_pathl, effl, isAllow);
  }

  function checkRead(uid, access_pathl) { 
    return checkReadWrite(uid, access_pathl, isAllowedEffAllPrefixes);
  }

  function checkWrite(uid, access_pathl) { 
    return checkReadWrite(uid, access_pathl, isAllowedEff);
  }

  /** { obj: object,
        object_pmap: uid -> access_path,
        property: string,
        check: ... -> ..., 
        eventHandler: ... -> void } -> void */
  function check_obj_access(param) {
    var o            = param.obj,
        opm          = param.object_pmap,
        p            = param.property,
        check        = param.check,
        eventHandler = param.eventHandler,
        obj_context, new_context, uid;
    for (uid in opm) {
      obj_context = opm[uid];
      new_context = { type : PROP,
                      property : p,
                      effect : obj_context
      };
      if (!check(uid, new_context)) {
        eventHandler(o, p,
                     P.utils.valueToString(effStoreToString(effect_store)), 
                     P.utils.valueToString(efflToString(effect_store[uid])));
      }
    }
  }

  function propAcc(wo,wp) {
    function read(o, p, apo, app) {
      // checks if read is allowed using apo
      check_obj_access({ obj: o,
                         object_pmap: apo,
                         property: p, 
                         check: checkRead, 
                         eventHandler: cfire('assertEffectsRead')
                       });
      
      // box the result, and add the new access path
      // to the wrapper.
      // uses informations stored in o.__infos__ to
      // create correct box, if needed.
      var result = o[p];
      if (result && result.THIS_IS_A_WAPPER_b3006670bc29b646dc0d6f2975f3d685) {
        // the property value is already boxed
        return result;
      } else {
        if (apo) {
          // information found in the wrapper of o
          // TODO: extend apo with p, create new wrapper
          // return the new wrapper
        	var napo = extend_path(apo, p);
          return new Create_wrapper_with_pmap(result,napo);
        } else {
          if (o && (o.__infos__) && (o.__infos__)[p]) {
            // information is found in host object
            return new Create_wrapper_with_pmap(result,(o.__infos__)[p]);
          } else {
            // no information in the property and in the host object,
            // and no wrapper ==> this should never happen
            throw "No box info for property value!";
          }
        }
      }
    }
    return doWithUnwrap2(wo, wp, read);    
  }

  function propAss(wo,wp,wv) {
    function write(o, p, v, apo, app, apv) {
      // checks if read is allowed using apo
      check_obj_access({ obj: o,
                         object_pmap: apo,
                         property: p, 
                         check: checkWrite, 
                         eventHandler: cfire('assertEffectsWrite')
                       });

      // store unboxed value in the object
      o[p] = v;
      
      // store in o the information about the access
      // path of the property p (which is apv)
      // reading will extract the access path and
      // create a correct box for the value if needed
      if (!(o.__infos__)) {
        o.__infos__ = {};
      }
      o.__infos__[p] = apv;      
      return undefined;
    }
    return doWithUnwrap3(wo, wp, wv, write);
  }

  var mCall, getBoxes, returnBox;
  (function () {
		var wrapper_exits = false,
			boxes = { },
			return_box = { };
		
		getBoxes = (function () {
			var b = boxes;
			boxes = { };
			return b;
		});
		
		returnBox = (function (rv){
			return_box.box = rv;
			return_box.box_exists = true;
			return unbox(rv);
		});
		
		mCall = (function mCall(o,m,pl) {
	    var i, plub = [], rv;
			// FIXME: deal with the situation, that m is also a box
			//       take the value of m, convert it to a string, do
			//       the method call with this string
			// unbox everything, and put the boxes into the global box space
			boxes.this_box = o;
			boxes.pl_box = [];
			for (i = 0; i < pl.length; i += 1) {
				boxes.pl_box.push(pl[i]);
				plub.push(unbox(pl[i]));
			}
			// now every original parameter is stored inside of boxes, 
			// hence we can do the call with the values (not with the boxes)
			// transformed functions will ask for the boxes of their own,
			// and native functions will work correctly with the original 
			// unboxed value
			// the return value of the function is always the unboxed return value,
			// since native functions always return unboxed values.
			// tranformed functions does also return unboxed values (since they need 
			// to work in callbacks of native functions), but also stores the box
			// for the return value into the return_box object by using the function
			// returnBox.
			if (o && o.THIS_IS_A_WAPPER_b3006670bc29b646dc0d6f2975f3d685) {
	      rv = ((o.value)[m]).apply(o.value,plub);  
	    } else {
	      rv = o[m].apply(o,plub);
	    }			
			// if we called a tranformed function with mcall, we should return the
			// boxed value, not the unboxed one.
			if (return_box.box_exists) {
				rv = return_box.box;
				return_box = { };
			}
			return rv;
		});
	});

  var isWrapperObj = {
    THIS_IS_A_WAPPER_b3006670bc29b646dc0d6f2975f3d685: true
  };
  function Create_wrapper_with_pmap(value, pmap) {
    this.reference = value;
    if (pmap) {
      this.p_map = pmap;
    } else {
      this.p_map = {};
    }
  }
  Create_wrapper_with_pmap.prototype = isWrapperObj;

  function extend_path(p_map, property) {
  	var result = {}, uid, j;
  	for (uid in p_map) {
  		result[uid] = [];
  		for (j = 0; j < p_map[uid].length; j += 1) {
	  		result[uid].push({
	  		  effect: p_map[uid],
	  		  type: PROP,
	  		  property: property
	  		});
  		}
  	}
  	return result;
  }

  function add_access_path(b, prop) {
    var uid   = getUid(),
        fname = getActiveFunName(),
        p,
        path;
    if (b && b.p_map) {
      path = { fname : fname };
      for (p in prop) {
        path[p] = prop[p];
      }
      if (!b.p_map[uid]) {
      	b.p_map[uid] = [path];
      } else {
      	b.p_map[uid].push(path);
      }
    } else {
      throw "Internal box error";
    }
    return b;
  }

  function with_box(value) {
    if (value && value.THIS_IS_A_WAPPER_b3006670bc29b646dc0d6f2975f3d685) {
      return value;
    } else {
      return new Create_wrapper_with_pmap(value);
    }
  }

  function isBox(value) {
  	return (value && value.THIS_IS_A_WAPPER_b3006670bc29b646dc0d6f2975f3d685);
  }
  
  function box_this(value) {
  	var b = with_box(value);
  	return add_access_path(b, { name: "this", type: VARIABLE } );
  }
  
  function box(vname, value) {
    var b = with_box(value);
    return add_access_path(b, { name: vname, type: VARIABLE} );
  }

  function box_param(index, value) {
    var b = with_box(value);
    return add_access_path(b, { number: index, type: PARAMETER });
  }

  function unbox(value) {
    if (value && value.THIS_IS_A_WAPPER_b3006670bc29b646dc0d6f2975f3d685) {
      return unbox(value.reference);
    } else {
      return value;
    }
  }

  function doWithUnwrap(w,f) {
    var v1,ap1;
    if (w1 && w1.THIS_IS_A_WAPPER_b3006670bc29b646dc0d6f2975f3d685) {
      v1 = w1.reference;
      ap1 = w1.p_map;
    } else {
      v1 = w1;
    }
    return f(v1, ap1);
  }
  function doWithUnwrap2(w1, w2, f) {
    var v1,v2,ap1,ap2;
    if (w1 && w1.THIS_IS_A_WAPPER_b3006670bc29b646dc0d6f2975f3d685) {
      v1 = w1.reference;
      ap1 = w1.p_map;
    } else {
      v1 = w1;
    }
    if (w2 && w2.THIS_IS_A_WAPPER_b3006670bc29b646dc0d6f2975f3d685) {
      v2 = w2.reference;
      ap2 = p_map;
    } else {
      v2 = w2;
    }
    return f (v1, v2, ap1, ap2);
  }
  function doWithUnwrap3(w1, w2, w3, f) {
    var v1,v2,v3,ap1,ap2,ap3;
    if (w1 && w1.THIS_IS_A_WAPPER_b3006670bc29b646dc0d6f2975f3d685) {
      v1 = w1.reference;
      ap1 = w1.p_map;
    } else {
      v1 = w1;
    }
    if (w2 && w2.THIS_IS_A_WAPPER_b3006670bc29b646dc0d6f2975f3d685) {
      v2 = w2.reference;
      ap2 = w2.p_map;
    } else {
      v2 = w2;
    }
    if (w3 && w3.THIS_IS_A_WAPPER_b3006670bc29b646dc0d6f2975f3d685) {
      v3 = w3.reference;
      ap3 = w3.p_map;
    } else {
      v3 = w3;
    }
    return f (v1, v2, v3, ap1, ap2, ap3);
  }

  function effToString(eff) {
    if (!eff) {
      return "NO VALID EFFECT";
    }
    switch (eff.type) {
    case PARAMETER:
      return (eff.fname + ": $" + eff.number);
    case VARIABLE:
      return eff.name;
    case PROP:
      return effToString(eff.effect) + "." + eff.property;
    case QUESTIONMARK:
      return effToString(eff.effect) + ".?";
    case STAR: 
      return effToString(eff.effect) + ".*";
    default: return "NO KNOWN EFFECT TYPE";
    }
  }

  function efflToString(effl) {
    if ((typeof effl === 'object') && (effl.type === ALL)) {
      return "*";
    }
    var a = new Array();
    for (var i = 0; i < effl.length; ++i) {
      a.push(effToString(effl[i]));
    }
    return a;
  }
  function effStoreToString(eff_store) {
    var obj = {};
    for (var uid in eff_store) {
      if (eff_store[uid]) {
        obj[uid] = efflToString(eff_store[uid]);
      }
    }
    return obj;
  }

  function enableWrapper(f, pnames) {
  	// first version, just do nothing
  	return (function () {
  		var i, pl = [];
  		// mark parameters with names and numbers
  		for (i = 0; i < pnames.length; i += 1) {
  			pl.push(box_param(i + 1, box(pnames[i], arguments[i])));
  		}
  		// mark the rest of the parameters with numbers, only,
  		// since there does not exists any name for them
  		for (; i < arguments.length; i += 1) {
  			pl.push(box_param(i, arguments[i]));
  		}
  		// FIXME: store box for return value into box_return,
  		// and return the unboxed value.
  		return f.apply(this, pl);
  	});
  }

  E.box = box;
  E.box_param = box_param;
  E.isBox = isBox;
  E.unbox = unbox;
  E.mCall = mCall;
  //E.box_this = box_this;
  //E.returnBox = returnBox;
  //E.getBoxes = getBoxes;
  E.propAss = propAss;
  E.propAcc = propAcc;
  E.enableWrapper = enableWrapper;
  
  if (P.tests && P.tests.callback) {
    P.tests.callback.registerEffect = registerEffect;
    P.tests.callback.unregisterEffect = unregisterEffect;
  }

 })(JSConTest);
