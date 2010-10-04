module Test = struct

  open Etc
  open AST
  open Annotation
  open ProglangUtils
  open ExtList
  open Contract
  open BaseContract
  open Test    

  let init () =
    let parse s =
      (ContractParse.contractl_top ContractLexer.token 
           (Ulexing.from_utf8_string s))
    in
    let b_to_c b = CBase (b,[],[]) in
    let ci = b_to_c BInteger in
    let csb b = b_to_c (BSBool b) in
    let cb = b_to_c BBool in
    let cs = b_to_c BString in
    let b_to_c_dep b depl = CBase (b,[],depl) in

    let tc_fun pl r = Contract.create_tgI 
      [CFunction (pl,r,(),Csseff.create ()),
       GenInfo.create ()]
      (None) in
    let tc_cl cl = Contract.create_tgI 
      (List.map (fun c -> (c,GenInfo.create ())) cl)
      (None)
    in

    let so_t = Contract.string_of 
      BaseContract.string_of 
      Analyse.string_of 
      Depend.string_of
    in

    let t1 () =
      let s = "/** int -> int */" in
      let tc = parse s in
        assert_equal
          ~printer:so_t
          (tc_cl [CFunction ([ci],ci,(),Csseff.create ())])
          tc;
        match Contract.get_clgI tc with
          | [c,gi] -> 
              assert_bool
                "Effects does not exists, but GenInfo.getEffects returns true"
                (not (GenInfo.getEffects gi))
          | _ -> assert_failure "get_clgI does not work correct"
    in
    let t2 () =
      let s = "/** (true,false) -> bool */" in
      let tc = parse s in
        assert_equal
          ~printer:so_t
          (tc_fun [csb true; csb false] cb)
          tc
    in
    let t3 () =
      let s = "/** (int -> int, int) -> \"bla\" */" in
      let tc = parse s in
        assert_equal 
          ~printer:so_t
          (tc_fun 
             [CFunction ([ci],ci,(),Csseff.create ());ci]
             (b_to_c (BSString "bla"))
          )
          tc;
        match Contract.get_clgI tc with
          | [c,gi] -> 
              assert_bool
                "Effects does not exists, but GenInfo.getEffects returns true"
                (not (GenInfo.getEffects gi))
          | _ -> assert_failure "get_clgI does not work correct"

    in
    let t4 () =
      let s = "/** */" in
      let tc = parse s in
        assert_equal
          ~printer:so_t
          (tc_cl [])
          tc

    in
    let t5 () =
      let s = "/** int -> int -> int */" in
      let tc = parse s in
        assert_equal 
          ~printer:so_t
          (tc_fun [ci] (CFunction ([ci],ci,(),Csseff.create ())))
          tc
    in
    let t6 () =
      let s = "/** (false,bool) -> (true-> string) */" in
      let tc = parse s in
        assert_equal
          ~printer:so_t
          (tc_fun [csb false; cb] 
             (CFunction ([csb true],cs,(),Csseff.create ())) )
          tc
    in
    let t7 () =
      let s = "/** (int@numbers, js:intn@numbers) -> bool */" in
      let tc = parse s in
        assert_equal
          ~printer:so_t
          (tc_fun 
             [CBase (BInteger,[Analyse.Numbers],[]);
              CBase (BJavaScriptVar "intn",[Analyse.Numbers],[])] 
             cb)
          tc
    in
    let t8 () =
      let s = "/** int -> bool($$3) | true($$$13) -> false($1) */" in
      let tc = parse s in
        assert_equal
          ~printer:so_t
          (tc_cl 
             [CFunction ([ci],CBase (BBool,[],[Depend.create 2 3]),
                         (),Csseff.create ()); 
              CFunction ([b_to_c_dep (BSBool true) [Depend.create 3 13]],
                         b_to_c_dep (BSBool false) 
                           [Depend.create 1 1],(),Csseff.create ())])
          tc
    in


    let t9 () =
      let s = "/** (int,int($1)) -> bool($2) */" in
      let tc = parse s in
        assert_equal
          ~printer:so_t
          (tc_fun 
             [ci; b_to_c_dep BInteger [Depend.create 1 1]]
             (b_to_c_dep BBool [Depend.create 1 2]))
          tc

    in
    let t10 () =
      let s = "/** { name : int } -> int */" in
      let tc = parse s in
        assert_equal
          ~printer:so_t
          (tc_fun
             [BObjectPL (["name",ci],false,[],[])]
             ci)
          tc
    in
    let t11 () =
      let s = "/** { name : 1, contract1: {getCount: int -> int} } -> object */" in
      let tc = parse s in
        assert_equal
          ~printer:so_t
          (tc_fun
             [BObjectPL 
                (["name",b_to_c (BSInteger 1);
                  ("contract1",
                   BObjectPL (["getCount", 
                               CFunction ([ci],ci,(),Csseff.create ())],
                              false,
                              [],
                              [])
                  )],
                 false,
                 [],
                 [])]
             (b_to_c BObject))
          tc
    in
    let t12 () =
      let s = "/** int -> int ~noAsserts | int -> bool #Tests:10 */" in 
      let c1 = CFunction ([ci],ci,(),Csseff.create ()) in
      let c2 = CFunction ([ci],cb,(),Csseff.create ()) in
      let gi1,gi2 = GenInfo.create (),GenInfo.create () in
      let _ = GenInfo.noAsserts gi1 in
      let _ = GenInfo.setTestNumber gi2 10 in
      let tc = parse s in
        assert_equal
          ~printer:so_t
          (Contract.create_tgI [c1,gi1; c2,gi2] None)
          tc
    in
    let t13 () =
      let s = "/** { name: int, ...} -> object */" in
      let tc = parse s in
        assert_equal
          ~printer:so_t
          (tc_fun 
             [BObjectPL (["name",ci],true,[],[])]
             (b_to_c BObject))
          tc;
        match Contract.get_clgI tc with
          | [c,gi] -> 
              assert_bool
                "Effects does not exists, but GenInfo.getEffects returns true"
                (not (GenInfo.getEffects gi))
          | _ -> assert_failure "get_clgI does not work correct"
    in
    let t14 () =
      let s = "/** {a:int} -> int  with [ $1.a ] */" in
      let tc = parse s in
        assert_equal
          ~printer:so_t
          (tc_cl [CFunction ([BObjectPL (["a",ci],false,[],[])],ci,(),
			     Csseff.create_effect_list ([
							Csseff.Prop(Csseff.Parameter 1,"a")
						      ]))])
          tc;
        match Contract.get_clgI tc with
          | [c,gi] -> 
              assert_bool
                "#noEffects does not exists, but GenInfo.getEffects returns true"
                (not (GenInfo.getEffects gi))
          | _ -> assert_failure "get_clgI does not work correct"

    in 
    let t15 () =
      let s = "/** {b:int} -> int  with [ $1.b ] */" in
      let tc = parse s in
        assert_equal
          ~printer:so_t
          (tc_cl [CFunction ([BObjectPL (["b",ci],false,[],[])],ci,(),
			     Csseff.create_effect_list ([
							Csseff.Prop(Csseff.Parameter 1,"b")
						      ]))])
          tc;
        match Contract.get_clgI tc with
          | [c,gi] -> 
              assert_bool
                "#noEffects does not exists, but GenInfo.getEffects returns true"
                (not (GenInfo.getEffects gi))
          | _ -> assert_failure "get_clgI does not work correct"
              
    in 
    let t16 () =
      let s = "/** {a:int, b:int} -> int  with [ $1.b, $1.a ] */" in
      let tc = parse s in
        assert_equal
          ~printer:so_t
          (tc_cl [CFunction 
                    ([BObjectPL ([("a",ci);("b",ci)],false,[],[])],ci,(),
			         Csseff.create_effect_list 
                       ([Csseff.Prop(Csseff.Parameter 1,"b");
						 Csseff.Prop(Csseff.Parameter 1,"a")
						]))])
          tc;
        match Contract.get_clgI tc with
          | [c,gi] -> 
              assert_bool
                "#noEffects exists, but GenInfo.getEffects returns true"
                (not (GenInfo.getEffects gi))
          | _ -> assert_failure "get_clgI does not work correct"
    in 
    let t17 () =
      let s = "/** object -> int  with [ $1.a.?.c ] */" in
      let tc = parse s in
        assert_equal
          ~printer:so_t
          (tc_cl [CFunction ([b_to_c BObject],ci,(),
			     Csseff.create_effect_list 
                   ([Csseff.Prop 
                       (Csseff.Question 
                          (Csseff.Prop (Csseff.Parameter 1,"a")),"c")
					]))])
          tc;
        match Contract.get_clgI tc with
          | [c,gi] -> 
              assert_bool
                "#noEffects does not exists, but GenInfo.getEffects returns true"
                (not (GenInfo.getEffects gi))
          | _ -> assert_failure "get_clgI does not work correct"
    in 
    let t18 () =
      let s = "/** object -> int  with [ $1.a.* ] */" in
      let tc = parse s in
        assert_equal
          ~printer:so_t
          (tc_cl [CFunction ([b_to_c BObject],ci,(),
			     Csseff.create_effect_list 
                   ([Csseff.Star (Csseff.Prop (Csseff.Parameter 1,"a"))
					]))])
          tc;
        match Contract.get_clgI tc with
          | [c,gi] -> 
              assert_bool
                "#noEffects does not exists, but GenInfo.getEffects returns true"
                (not (GenInfo.getEffects gi))
          | _ -> assert_failure "get_clgI does not work correct"
    in 


      ["Parse int -> int", t1;
       "Parse (true,false) -> bool", t2;
       "Parse (int -> int, int) -> \"bla\" */", t3;
       "Parse /** */", t4;
       "Parse int -> int -> int",t5;
       "Parse (false,bool) -> (true -> string)",t6;
       "Parse (int@numbers, js:intn@numbers) -> bool",t7;
       "Parse int -> bool($$3) | true($$$13) -> false($1)",t8;
       "Parse /** (int,int($1)) -> bool($2) | true -> false($1)",t9;
       "Parse /** {name: int} -> int */", t10;
       "Parse /** { name : 1, contract1: {getCount: int -> int} } -> object */", t11;
       "Parse ~NoAsserts Test", t12;
       "Parse { ... } Test", t13;
       "Parse {a: int} -> int with $1.a",t14;
       "Parse {b : int} -> int with $1.b",t15;
       "Parse {a : int, b : int} -> int with [$1.a, $1.b]",t16;
       "Parse object -> int with [$1.a.?.c]",t17;
       "Parse object -> int with [$1.*]",t18;
      ]
        
  let _ = 
    install_tests
      "Contract Parser"
      init

end
