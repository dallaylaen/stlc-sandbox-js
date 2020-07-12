'use strict';

class Type {
    constructor(name) {
        this.name = name;
        this.subtypes = {};
        this.type = this; // hack to allow foo.type
    };
    addCons(sub, ...args) {
        this.subtypes[sub] = args;
        return this;
    };
    cons(sub) {
        if( !this.subtypes[sub] )
            throw new Error('Unknown cons '+this.name+'.'+sub);
        return this.subtypes[sub];
    };
    list() {
        return Object.keys( this.subtypes ).sort();
    };
    check(sub, args) {
        const types = this.cons(sub);
        if (args.length !== types.length)
            throw new Error("Unexpected argument list length");

        for( let i in types ) {
            if (args[i].type.name !== types[i])
                throw new Error("Arg type "+args[i].type.name+" != "+types[i]+" in "+this.name+"."+sub+"["+i+"]");
        };
    };
    eq (other) {
        if (!(other instanceof Type))
            throw "Attempt to compare Type with a non-type";
        return this.name === other.name; // silly
    };
    toString() {
        return this.name;
    };
};

class Var {
    constructor( type, sub, args ) {
        type.check( sub, args );

        this.type = type;
        this.sub  = sub;
        this.args = args;
    };
    toJSON() {
        return [ this.type+"."+this.sub, ...this.args ];
    };
    toString() {
        const args = this.args.map( x => x.toString() );
        return this.type+"."+this.sub
            +(args.length ? "<"+args.join(", ")+">" : "");
    };
    eq (other) {
        if (!(other instanceof Var))
            throw new Error("can't compare Var to a non-Var");
        if (this.type !== other.type)
            return false;
        if (this.sub !== other.sub)
            return false;
        for (let i in this.args) {
            if (!this.args[i].eq(other.args[i]))
                return false;
        };
        return true;
    };
    eval(context) {
        return this;
    };
};

class Universe {
    constructor() {
        this.types = {};
    };
    addType( name ) {
        if (this.types[name])
            throw new Error("Duplicate type name: "+name);
        return this.types[name] = new Type(name);
    };
    type(name) {
        if (!this.types[name])
            throw new Error("Unknown type name: "+name);
        return this.types[name];
    };
    check() {
        for( let name in this.types ) {
            const type = this.types[name];
            for( let sub of type.list() ) {
                for( let arg of type.cons(sub) ) {
                    if ( !this.types[arg] )
                        throw new Error("Unknown type '"+arg+"' used in constructor '"+name+"."+sub+"'");
                };
            };
        };
    };
    create(type, sub, ...args) {
        return new Var( this.types[type], sub, args );
    };
    freeVar(name, type) {
        return new ExprFree( this, type, name );
    };
    func(args, impl) {
        return new Func(args, impl);
    };
    expr(arg) {
        return new ExpressionParse( this ).parse(arg);
    };
};

function fetchDeps(list) {
    const deps = {};
    for (let item of list) {
        for (let i in item.deps) {
            if (deps[i]) {
                if (deps[i] !== item.deps[i])
                    throw new Error("Inconsistent free var types!");
            } else {
                deps[i] = item.deps[i];
            };
        };
    };
    return deps;
};

class Expr {
    constructor(u, type) {
        this.u    = u;
        this.type = u.type(type);
        this.deps = {};
    };
    check(context) {
        for( let i in this.deps ) {
            if (!context[i] || context[i].type !== this.deps[i] )
                throw new Error("Unsatisfied dependency "+i);
        };
    };
    depStr() {
        const list = Object.keys( this.deps );
        const deps = list.sort().map( i=>i+":"+this.deps[i] ).join(",");
        return this.type + (deps ? "{"+deps+"}" : "");
    };
    eval() {
        throw new Error("unimplemented eval in Expr");
    };
    toString() {
        return this.depStr() + "<...>";
    };
    toJSON () {
        throw new Error("toJSON unimplemented in "+typeof this);
    };
};

class ExprFree extends Expr {
    constructor( u, type, name ) {
        super( u, type );
        this.name = name;
        this.deps[name] = u.type(type);
    };
    eval(context) {
        this.check(context);
        return context[ this.name ];
    };
    toString() {
        return this.name + ":" + this.type;
    };
    toJSON() {
        return this.name + ":" + this.type;
    };
};

class ExprCons extends Expr{
    constructor( u, type, sub, ...args ) {
        super( u, type );
        this.sub = sub;
        // TODO check type! (universe?)
        this.args = args;
        this.deps = fetchDeps( args );
    };

    eval(context) {
        this.check(context);
        return new Var( this.type, this.sub, this.args.map( x=>x.eval(context) ) );
    };
    toJSON () {
        // What about deps? Deducible from the arg list!
        return [ this.type + "." + this.sub, ...this.args ];
    };
};

class Func {
    constructor( args, impl ) {
        for( let arg of args ) {
            if (!(arg instanceof ExprFree))
                throw new Error("Array of free vars expected");
        };

        this.args = args;
        this.impl = impl;
        this.type = impl.type; // TODO wrong!!!

        const deps = fetchDeps([impl]);
        for (let i of args) {
            delete deps[i.name];
        };
        this.deps = deps;
    };
    signature() {
        return this.args.map( x => x.type );
    };

    apply(prevContext, args) {
        // TODO better args checking
        if (!Array.isArray(args))
            throw new Error("Bad arguments, must be Func.apply( {...context}, [...args] )");
        const context = { ...prevContext };
        for ( let i in this.args ) {
            // TODO compare types
            context[ this.args[i].name ] = args[i];
        };
        return this.impl.eval( context );
    };

    toJSON() {
        return [this.args, this.impl];
    };
};

class ExprApply extends Expr {
    constructor( u, type, func, args ) {
        super( u, type );
        this.func = func;
        this.args = args;
        this.deps = fetchDeps( [func, ...args] );
    };
    eval (context) {
        return this.func.apply( context, this.args.map( x => x.eval(context) ) )
    };
    toJSON() {
        return [ this.type + '<-' + 'apply', this.func, ...this.args ];
    };
};

class ExprMatch extends Expr {
    constructor( u, type, arg, mapping ) {
        super( u, type );

        const T = arg.type;
        for (let sub of T.list()) {
            if (!mapping[sub] || !(mapping[sub] instanceof Func))
                throw new Error("No mapping found in pattern match for sub "+sub);
            T.check( sub, mapping[sub].signature() );
        };
        this.mapping = mapping;
        this.arg = arg;
        const funclist = Object.keys(mapping).map( x => mapping[x] );
        this.deps = fetchDeps( [ arg, ...funclist ] );
    };

    eval(context) {
        const cond = this.arg.eval( context );
        return this.mapping[ cond.sub ].apply( context, cond.args );
    };

    toJSON() {
        return [ this.type + '<-' + 'match', this.arg, this.mapping ];
    };
};

class ExpressionParse {
    constructor( u ) {
        this.u = u;
    };
    freeVar( arg ) {
        const got = arg.match(/^(\w+)\s*:\s*(\w+)$/);
        if (!got)
            throw new Error("argument does not manch 'name: Type': "+arg);
        const type = got[2];
        const name = got[1];
        return new ExprFree(this.u, type, name);
    };
    parse(json) {
        if (!Array.isArray(json))
            return this.freeVar(json);

        // array
        const [how, ...tail] = json;

        if (Array.isArray(how)) {
            // A function
            if (tail.length !== 1)
                throw new Error("Function body must have 1 element");
            const args = how.map( x => this.freeVar(x) );
            return new Func( args, this.parse(tail[0]) );
        };

        const maybeCons = how.match( /^(\w+)\.(\w+)$/ );
        if (maybeCons) {
            const type = maybeCons[1];
            const sub  = maybeCons[2];
            return new ExprCons(this.u, type, sub, ...tail.map(x=>this.parse(x)));
        };

        throw new Error ("Don't know how to parse "+how);
    };
};

module.exports = {
    Expr,
    ExprApply,
    ExprCons,
    ExprFree,
    ExprMatch,
    Func,
    Type,
    Universe,
    Var,
};
