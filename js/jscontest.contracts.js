/* Version: 0.2.0 */
/* author: Phillip Heidegger */

"use strict";
(function(P) {
	var C = {};
	P.contracts = C;
	
	/* Contract Types */
	/*
	 * Each contract must have a type that is one of these. They will be used in a
	 * further version to implement rewriting of complex contracts, e.g.
	 * intersections.
	 */
	/* No type is given */
	var ctNoType = 0;
	/* Basic Contracts: Singletons, String, Bool, Number, ... */
	var ctBasic = 1;
	/* Objects */
	var ctObject = 2;
	/* Arrays */
	var ctArray = 3;
	/* Functions */
	var ctFunction = 4;
	/* Union, Intersection, ... */
	var ctComplex = 5;
	/* Names */
	var ctName = 6;
	function makeContractType(ct) {
		if (P.check.isInt(ct) && (ct >= 0) && (ct < 7)) {
			return ct;
		} else {
			return 0;
		}
	}
	function fire(msg) {
		var slice = Array.prototype.slice, args = slice.apply(arguments);
		if (P.events && P.events.fire && (typeof P.events.fire === 'function')) {
			P.events.fire.apply(this, args);
		}
	}

	/* contractType: 
	 * check: 
	 * generate: 
	 * initcdes:
	 * simplValue: 
	 * getcdes: 
	 * setcdes: 
	 * genNeeded:
	 */
	function Contract(p) {
		var ct = makeContractType(p.contractType), cdes = p.initcdes, gen = P.utils
		    .getFun(p.generate, function() {
			    return p.generate;
		    }), check = P.utils.getFun(p.check, function(v) {
			if (p.check === v) {
				return true;
			} else {
				return false;
			}
		}), sv = P.utils.getFun(p.simplValue, function(v) {
			return v;
		}), ce;

		this.check = function() {
			return check.apply(this, arguments);
		};
		this.gen = function() {
			var i;
			var g = gen.apply(this, arguments);
			var args = [];
			args.push(g);
			for (i = 0; i < arguments.length; i = i + 1) {
				args.push(arguments[i]);
			}
			if (this.check.apply(this, args)) {
				return g;
			} else {
				throw ("Implemenation of Generator is not valid. Please ensure "
				       + "that each value that is generated by the "
				       + "do_generate function passes the do_check function.");
			}
		};
		this.simpl = function(v) {
			var r = sv.call(this, v);
		};
		this.failToString = function(v) {
			var r = ("Contract '" + this.getcdes()
			         + "' is <em>not</em> fulfilled by the value: " + v + ".");
			return r;
		};
		this.okToString = function(v) {
			var r = "Contract '" + this.getcdes() + "' is fulfilled by value: " + v
			        + ".";
			return r;
		};
		this.getcdes = P.utils.getFun(p.getcdes, function() {
			return cdes;
		});
		this.setcdes = P.utils.getFun(p.setcdes, function(s) {
			cdes = s;
		});
		this.genNeeded = P.utils.getFun(p.genNeeded, function(v) {
			return false;
		});
		this.getCExp = function() {
			return ce;
		};
		this.registerCExp = function(setce) {
			ce = setce;
		};
		this.toString = this.getcdes;
		this.getContractType = function() {
			return ct;
		};
	}
	function SContract(check, generate, cdes, ct, genNeeded) {
		var p = {
		  contractType : ct,
		  initcdes : cdes,
		  generate : generate,
		  check : check,
		  genNeeded : genNeeded
		};
		return Contract.call(this, p);
	}
	function PContract(ct, check, pl, p, gen, cdes, genNeeded) {
		if (!p) {
			p = 0.5;
		}
		var p = {
		  contractType : ct,
		  check : check,
		  generate : function() {
			  return pickOrF(pl, p, gen);
		  },
		  genNeeded : genNeeded,
		  initcdes : cdes
		};
		if (P.check.isSArray(pl)) {
			return Contract.call(this, p);
		} else {
			throw "PContract needs array as parameter";
		}
	}
	function SingletonContract(value, cdes, genNeeded) {
		return Contract.call(this, {
		  contractType : ctBasic,
		  check : value,
		  generate : value,
		  genNeeded : genNeeded,
		  initcdes : cdes
		});
	}
	
	/** ******** Null, Undefined, Boolean, String, Number ********* */
	C.Top = new SContract(function() {
		return true;
	}, P.gen.genTop, "top");
	C.TopOUndef = new SContract(function(v) {
		return (v !== undefined);
	}, P.gen.genTopOUndef, "utop");
	C.PTop = function(a, p) {
		return new PContract(ctNoType, function() {
			return true;
		}, a, p, P.gen.genTop, "top");
	};
	C.SingletonContract = function(v, s) {
		return new SingletonContract(v, s);
	};
	C.Null = new SingletonContract(null, "null");
	C.Undefined = new SingletonContract(undefined, "undefined");
	C.Boolean = new SContract(P.check.isBoolean, P.gen.genBoolean, "boolean",
	                          ctBasic);
	C.True = new SingletonContract(true, 'true');
	C.False = new SingletonContract(false, 'false');
	C.String = new SContract(P.check.isString, P.gen.genString, 'string', ctBasic);
	C.Number = new SContract(P.check.isNumber, P.gen.genNumber, "number", ctBasic);
	C.Integer = new SContract(P.check.isInt, P.gen.genInt, "integer", ctBasic);
	C.PInteger = function(iA, p) {
		return new PContract(ctBasic, P.check.isInt, iA, p, P.gen.genInt,
		                     "PInteger{" + P.utils.valueToString(iA) + "}");
	};
	C.AInteger = function(iList, fList) {
		if (!iList) {
			iList = [ 0, 1 ];
		}
		iList = P.utils.sadd(0, iList);
		iList = P.utils.sadd(1, iList);
		if (!fList) {
			fList = C.ABasicFuns;
		}
		return new SContract(P.check.isInt, function() {
			return P.gen.genAInt(iList, fList);
		}, "AInteger{" + P.utils.valueToString(iList) + "; "
		   + P.utils.valueToString(fList) + "}", ctBasic);
	};
	C.Id = new SContract(function(x, y) {
		return x === y;
	}, function(x) {
		return x;
	}, "Id", ctBasic);
	C.ABasicFuns = [ {
	  getcdes : function() {
		  return "+";
	  },
	  arity : 2,
	  f : function(x, y) {
		  return x + y;
	  }
	}, {
	  getcdes : function() {
		  return "-";
	  },
	  arity : 2,
	  f : function(x, y) {
		  return x - y;
	  }
	}, {
	  getcdes : function() {
		  return "*";
	  },
	  arity : 2,
	  f : function(x, y) {
		  return x * y;
	  }
	}, {
	  getcdes : function() {
		  return "/";
	  },
	  arity : 2,
	  f : function(x, y) {
		  return x / y;
	  }
	} ];
	C.IIntervall = function(low, high) {
		if (P.check.isInt(low) && P.check.isInt(high)) {
			var o = new SContract(function(v) {
				return P.check.isIInt(low, high, v);
			}, function() {
				return P.gen.genIInt(low, high);
			}, "[" + low + "..." + high + "]", ctBasic);
			return o;
		} else {
			if ((!isNumber(low)) || (!isNumber(high))) {
				throw "Intervall needs numbers as bounds";
			} else {
				throw "An Integer Intervall needs Integers as bounds, not floats.";
			}
		}
	};
	C.NIntervall = function(low, high) {
		if (P.check.isNumber(low) && P.check.isNumber(high)) {
			var o = new SContract(function(v) {
				return P.check.isNInt(low, high, v);
			}, function() {
				return P.gen.genNInt(low, high);
			}, "[/" + low + "..." + high + "]", ctBasic);
			return o;
		} else {
			throw "Invervall needs number as bounds";
		}
	};

	/** ******** Objects ********* */
	// Object without additional informations
	C.Object = new SContract(P.check.isObject, P.gen.genObject, "object",
	                         ctObject);
	/*
	 * Object with properties, that are simple. Property names only contains
	 * characters and digits.
	 */
	C.SObject = new SContract(P.check.isObject, P.gen.genSObject, "sobject",
	                          ctObject);
	/*
	 * Object like "Object", but with additional information about properties that
	 * are important. If a property name is generated randomly, p is the
	 * probability that a name from the list pl of property names is choose. If no
	 * name is choose from pl, a simple property, only containing characters and
	 * digits is generated.
	 */
	C.PObject = function(pl, p) {
		return new SContract(P.check.isObject, function() {
			return P.gen.genPObject(pl, p);
		}, "pobject{" + P.utils.valueToString(pl) + "}", ctObject);
	};
	/*
	 * Objects with an exact property list. pl is a list of objects which contains
	 * property names (as name) and contracts (as contract). The checker ensures
	 * that each property given by pl exists and that the value of the property
	 * fulfills the suitable contract. The generator creates objects randomly with
	 * exactly the given set of properties, calling gen() for each contract given
	 * in pl for each property.
	 */
	C.EObject = function(pl) {
		var p = {
		  contractType : ctObject,
		  check : function(v) {
			  return P.check.isObject(v, pl);
		  },
		  generate : function() {
			  return P.gen.genObject(pl);
		  },
		  getcdes : function() {
			  var s = "eobject{";
			  var pls = [];
			  var random = false;
			  for (j in pl) {
				  var p = pl[j];
				  if (p.name && p.contract) {
					  pls.push(p.name + ":" + p.contract.getcdes());
				  } else {
					  if (p.random) {
						  random = true;
					  } else {
						  pls.push(P.utils.valueToString(p));
					  }
					  ;
				  }
				  ;
			  }
			  ;
			  s += concat(pls, ",", "", "", false);
			  if (random) {
				  s += ",...";
			  }
			  ;
			  return s + "}";
		  }
		};
		var o = new Contract();
		return o;
	};
	/* An Array. t is the type of the elements. */
	C.Array = function(t) {
		var p = {
		  contractType : ctArray,
		  check : function(v) {
			  return P.check.isArray(v, t);
		  },
		  generate : function() {
			  return P.gen.genArray(t);
		  },
		  getcdes : function() {
			  return "array[" + t.getcdes() + "]";
		  }
		};
		return new Contract(p);
	};

	/** ********* FUNCTION ********* */
	/*
	 * A function contract. pl is a list of contracts for the parameters of the
	 * function, while rt describes the result value of the function. eff is an
	 * array representing the effects of a function. The effect can be omited.
	 * C.Function([C.Boolean,C.String], C.String) states: (boolean, string) ->
	 * string The check for a function is done by generating a value for each
	 * parameter, then call the function and checking, if the result value
	 * fulfills rt.
	 */
	C.Function = function(pl, rt, eff) {
		function check(v) {
			var pvl = [];
			for ( var i in pl) {
				pvl[i] = pl[i].gen();
			}
			;
			return this.checkWithParams(v, pvl);
		}
		function checkWithParams(v, pvl) {
			var t = typeof (v), res, cres, lcvc;
			if (t !== 'function') {
				return false;
			}
			lcvs = P.utils.valueToString(pvl);
			res = v.apply(null, pvl);
			cres = rt.check(res);
			if (!cres) {
				/* collect counterexample */
				this.registerCExp(new P.cexp.CExp(v, this, pvl, res));
				return false;
			} else {
				return true;
			}
		}
		function getcdes() {
			return pldes + "->" + rt.getcdes();
		}
		function setcdes() {
			throw "Setting description for function contract not supported";
		}

		var lcvs;
		var pldes = "";
		for ( var i in pl) {
			if (i > 0)
				pldes += ", ";
			pldes += pl[i].getcdes();
		}
		;
		var p = {
		  contractType : ctFunction,
		  check : check,
		  generate : gen,
		  getcdes : getcdes,
		  setcdes : setcdes,
		  genNeeded : P.check.isFunction
		};
		// var c = new Contract(ctFunction, check, gen, getcdes, setcdes,
		// P.check.isFunction);
		var c = new Contract(p);
		function gen() {
			return function() {
				if (c.checkParams(arguments))
					return rt.gen();

				// TODO: What should happen, if the arguments
				// did not pass the check?
			};
		}
		c.checkWithParams = checkWithParams;
		c.checkParams = function(plv) {
			var v, c;
			for ( var i in pl) {
				v = plv[i];
				c = pl[i];
				if (!(c.check(v))) {
					return false;
				}
			}
			return true;
		};
		c.checkReturn = function(v) {
			var ok = rt.check(v);
			if (!ok) {
				fire.call(P, 'assertReturn', c, v);
			}
		};
		c.get_last_created_values = function() {
			return lcvs;
		};
		c.registerEffects = function(pl, fname) {
			if (P.tests.callback.registerEffect) {
				// call registerEffect, which will return a uid
				// create new object, that has a method called
				// unregisterEffect, that is able to call
				// the callback function unregisterEffect with
				// the uid gernerated by registerEffect.
				// FIXME: where to put callbacks?
				var uid = P.tests.callback.registerEffect(eff, pl, fname);
				if (P.tests.callback.unregisterEffect) {
					var o = {
						unregisterEffect : function() {
							P.tests.callback.unregisterEffect(uid);
							return c;
						}
					};
					return o;
				}
			}
			return c;
		};
		return c;
	};

	C.Depend = function(order, dl) {
		var dparam = {};
		function getDepend(i) {
			if (i < dl.length - 1)
				return dl[i];
		}
		function getDependResult() {
			return dl[dl.length - 1];
		}
		function getOrder() {
			return order;
		}
		dparam.getDepend = getDepend;
		dparam.getDependResult = getDependResult;
		dparam.getOrder = getOrder;
		return dparam;
	};
	C.DFunction = function(pl, rt, dparam) {
		function DValues() {
			var scope = [ [] ];
			var as = 0;
			this.getValue = function(s, p) {
				return scope[s - 1][p - 1];
			};
			this.setValue = function(param, value) {
				scope[as][param] = value;
			};
		}
		;
		var lsvs = "";
		var pldes = "";
		for ( var i in pl) {
			if (i > 0) {
				pldes += ", ";
			}
			pldes += pl[i].getcdes();
		}
		;
		function getValues(dvalues, dpl) {
			var dvl = [];
			for ( var i in dpl) {
				dvl.push(dvalues.getValue.apply(dvalues, dpl[i]));
			}
			return dvl;
		}
		;
		function check(v, dvalues) {
			var t = typeof (v);
			if (t !== 'function') {
				return false;
			}
			if (dvalues === undefined) {
				dvalues = new DValues();
			}
			var pvl = [];

			var order = dparam.getOrder();
			for ( var i in order) {
				/* index of parameter, that should be generated */
				var p = order[i];

				/* list of ($,anz) tuppels, from which the parameter depends */
				var dpl = dparam.getDepend(p);

				/* collected values, corresponding to the ($,anz) list */
				var dvl = getValues(dvalues, dpl);

				/* call the generator, this = pl[p], other parameters dvl */
				var value = pl[p].gen.apply(pl[p], dvl);
				pvl[p] = value;

				dvalues.setValue(p, value);
			}
			lcvs = P.utils.valueToString(pvl);
			var res = v.apply(null, pvl);
			var cres = rt.check(res);
			if (!cres) {
				/* collect counterexample */
				this.registerCExp(new P.cexp.CExp(v, this, pvl, res));
				return false;
			} else {
				return true;
			}
			;
		}
		;
		function getcdes() {
			return pldes + "-D>" + rt.getcdes();
		}
		;
		function setcdes() {
			throw "Setting description for function contract not supported";
		}
		;
		var p = {
		  contractType : ctFunction,
		  check : check,
		  generate : {},
		  getcdes : getcdes,
		  setcdes : setcdes,
		  genNeeded : P.check.isFunction
		};
		// var c = new Contract(ctFunction,check,{},getcdes,setcdes,
		// P.check.isFunction);
		var c = new Contract(p);
		c.checkParams = function(plv) {
			for ( var i in pl) {
				v = plv[i];
				c = pl[i];
				if (!(c.check(v))) {
					return false;
				}
			}
			;
			return true;
		};
		c.checkReturn = function(v) {
			var ok = rt.check(v);
			if (!ok) {
				fire.call(P, 'assertReturn', c, v);
			}
			;
		};
		c.get_last_created_values = function() {
			return lcvs;
		};
		return c;
	};

	/** ********* UNION ********* */
	var Union, UnionAddSimplRule;
	(function() {
		var simplRules = [];
		function addSimpl(sr) {
			if (P.check.isFunction(sr)) {
				simplRules.push(sr);
			}
		}
		;
		function createUnion(c1, c2) {
			function check(v) {
				var c1r = c1.check(v);
				if (c1r) {
					return true;
				} else {
					var c2r = c2.check(v);
					if (!c2r) {
						// TODO: Is this the intended semantics?
						var ce1 = c1.getCExp();
						var ce2 = c2.getCExp();
						if (ce1 && ce2) {
							this.registerCExp(new P.cexp.CExpUnion(this, ce1, ce2));
						} else {
							if (ce1) {
								this.registerCExp(ce1);
							} else {
								if (ce2) {
									this.registerCExp(ce2);
								}
								;
							}
							;
						}
						;
						return false;
					} else {
						return true;
					}
					;
				}
			}
			;
			function generate() {
				var r = Math.random();
				if (r < 0.5) {
					return c1.gen();
				} else {
					return c2.gen();
				}
			}
			;
			function getcdes() {
				return ("(" + c1.getcdes() + " or " + c2.getcdes() + ")");
			}
			;
			for ( var i in simplRules) {
				var sr = simplRules[i];
				var c = sr(c1, c2);
				if (c)
					return c;
			}
			;
			var p = {
			  contractType : ctComplex,
			  check : check,
			  generate : generate,
			  getcdes : getcdes
			};
			// return new Contract(ctComplex,check,generate,getcdes);
			return new Contract(p);
		}
		;
		Union = createUnion;
		UnionAddSimplRule = addSimpl;

		function simplTrueFalseBool(c1, c2) {
			if (((c1 === C.True) && (c2 === C.Boolean))
			    || ((c1 === C.Boolean) && (c2 === C.True))
			    || ((c1 === C.False) && (c2 === C.Boolean))
			    || ((c1 === C.Boolean) && (c2 === C.False))) {
				return C.Boolean;
			} else {
				return false;
			}
			;
		}
		;
		function simplIntervall(c1, c2) {

		}
		;

		addSimpl(simplTrueFalseBool);
	})();

	/** ******** Intersection ********* */
	C.Intersection = function(c1, c2) {
		if (c1.getContractType && (c1.getContractType() == ctFunction)
		    && c2.getContractType && (c2.getContractType() == ctFunction)) {

		} else {
			throw "Intersections are only allowed for two function contracts";
		}
	};

	/** ******** NAMES ********* */
	(function() {
		var names = {};
		C.names = names;
		var ntable = {};
		var cnames = [];
		var testTable = function(name, f, g, err) {
			var c = ntable[name];
			if (c) {
				if (!(c.marked)) {
					c.marked = true;
					var r = f(c.contract);
					c.marked = false;
					return r;
				} else {
					return g(c.contract);
				}
			} else {
				throw ("Invalid contract! There exists no contract with name: '" + name
				       + "'. " + err);
			}
			;

		};
		names.Name = function(name) {
			var gcdes = function(i) {
				return "Name: " + name + ", Image: " + i;
			};
			function throwRecError(cstr) {
				throw ("Invalid Contract '" + cstr + "'! Recursion, but no function contract visted");
			}
			;
			function check(v) {
				var r = testTable(name, function(c) {
					var tmp = c.check(v);
					return tmp;
				}, function(c) {
					throwRecError(gcdes(c.getcdes()));
				}, "Invalid call of check.");
				return r;
			}
			;
			function generate() {
				var r = testTable(name, function(c) {
					var tmp = c.gen();
					return tmp;
				}, function(c) {
					throwRecError(gcdes(c.getcdes()));
				}, "Invalid call of generate.");

				return r;
			}
			;
			function getcdes() {
				var r = testTable(name, function(c) {
					var tmp = c.getcdes();
					return gcdes(tmp);
				}, function(c) {
					return "Name: " + name;
				}, "Name: " + name + "(no Image)");
				return r;
			}
			;
			var p = {
			  contractType : ctName,
			  check : check,
			  generate : generate,
			  getcdes : getcdes
			};
			// var o = new Contract(ctName,check,generate,getcdes);
			var o = new Contract(p);
			cnames.push({
			  name : name,
			  contract : o,
			  marked : false
			});
			return o;
		};

		names.Let = function(name, c) {
			ntable[name] = {
			  name : name,
			  contract : c
			};
		};
		names.resetMarked = function() {
			for ( var i in ntable) {
				var o = ntable[i];
				o.marked = false;
			}
		};
	})();


	/********************************* */
	/* Interface */
	/********************************* */

	/* Contract */
	/**
	 * Contract Interface: { Checks if the parameter fulfills the value. check:
	 * value -> boolean;
	 * 
	 * generate parameters for functions gen: void -> vlaue;
	 * 
	 * simplify counterexamples simpl: value -> value;
	 * 
	 * Tests if we need to generate value to check function This will be true if
	 * value is a function, or an object that does provide methods. Otherwise we
	 * can do the check without generating examples. genNeeded : value -> boolean
	 * 
	 * Returns the counterexample that breaks the contraint if a test find a
	 * counterexample. getCExp: void -> CExp
	 * 
	 * Register a counterexample for a contract registerCExp: CExp -> void
	 * 
	 * String methods, to generate logging infos failToString: value -> string;
	 * okToString: value -> string; getcdes: void -> string; setcdes: string ->
	 * void; toString: void -> string; }
	 */
	C.Name = C.names.Name;
	C.Let = C.names.Let;
	C.Union = Union;

	/** TODO: needs type signature and docu */
	C.Contract = Contract;

	/**
	 * newSContract: (check, generate, cdes, ctype, genNeeded) -> Contract The
	 * function newSContract creates a new Contract. It takes 5 parameters, but
	 * you can omit the last two of them. check is a predicate for the contract,
	 * generate is a generator and cdes is a string representation for a contract.
	 */
	C.SContract = SContract;




}(JSConTest));