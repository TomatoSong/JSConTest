/* Version: 0.2.0 */
/* author: Phillip Heidegger */

"use strict";
(function (P) {
	var R = {}, 
		module;

	if (!P.events) {
		P.events = {};
	}
	if (!P.events.handler) {
		P.events.handler = {};
	}
	P.events.handler.console = R;

	function fail(c, v, anz) {
		if (!anz) {
			console.error("contract failed: " + c.failToString(v));		  		
		} else {
			console.error("contract failed: " + c.failToString(v) + "Tests run: " + anz);		  		
		}		
	}
	
	function success(c, v, anz) {
		var s = c.okToString(v);
		if (!anz) {
			console.info(s);
		} else {
			console.info(s + " Tests run: " + anz);
		}		
	}
	
	function error(e, c) {
  	// this is the test case
		console.error("While testing contract " + c.getcdes() + ", an error happens: " + e);
		if (c.get_last_created_values) {
			console.error("object.[parameter1,...]: " + c.get_last_created_values());		  		
		}		
	}
	
	function moduleChange(m) {
		module = m;
		console.info("Module: " + m);
	}
	
	function CExpStart() {
	  console.info("Start of counter example section.");		
	}
	
	function CExp(ce) {		
	  console.info(ce);		
	}
	
	function assertParam(cl, pl, str) {
		console.warn(str + ": " + "Parameters passed to function not valid: " +
		             cl + ", " + P.utils.valueToString(pl));
	}
	
	function strEffect(obj, prop, effl_str, eff_str, kind) {		
		return "Effect Error, " + kind + " access not allowed! " +
		       "You try to read the property " + prop + 
		       " of object " + P.utils.valueToString(obj) + ". " +
		       "Permissions you have to respect: " + effl_str + ". " +
		       "The following was not respected: " + eff_str + ".";
	}

	function assertEffectsRead(o, p, effl_str, eff_str) {
		console.warn(module + ": " + strEffect(o, p, effl_str, eff_str, "read"));
	}

	function assertEffectsWrite(o, p, effl_str, eff_str) {
		console.warn(module + ": " + strEffect(o, p, effl_str, eff_str, "write"));
	}

	function create(divId, enType) {
		var o = 
		  { fail: fail,
        success: success,
			  error: error,
			  moduleChange: moduleChange,
			  CExpStart: CExpStart,
			  CExp: CExp,
			  assertParam: assertParam,
			  assertEffectsRead: assertEffectsRead,
			  assertEffectsWrite: assertEffectsWrite
			};
		return o;
	}

	R.create = create;

})(JSConTest);
