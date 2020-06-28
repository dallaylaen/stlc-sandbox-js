'use strict';

class Type {
    constructor(name) {
        this.name = name;
        this.subtypes = {};
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
        if (!other instanceof Type)
            throw "Attempt to compare Type with a non-type";
        return this.name === other.name; // silly
    };
};

class Var {
    constructor( type, sub, args ) {
        type.check( sub, args );

        this.type = type;
        this.sub  = sub;
        this.args = args;
    };
    toString() {
        return this.type+"."+this.subtype
            +args.length ? "<"+args.map( x => x.toString() ).join(", ")+">" : "";
    };
    eq (other) {
        if (!other instanceof Var)
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
};

class Expr {
    constructor(u, type) {
        this.u    = u;
        this.type = u.type(type);
        this.deps = {};
    };
    fetchDeps(list) {
        for (let item of list) {
            for (let i in item.deps) {
                if (this.deps[i]) {
                    if (this.deps[i] != item.deps[i])
                        throw new Error("Inconsistent free var types!");
                } else {
                    this.deps[i] = item.deps[i];
                };
            };
        };
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
        return depStr() + "<...>";
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
};

class ExprCons extends Expr{
    constructor( u, type, sub, ...args ) {
        super( u, type );
        this.sub = sub;
        // TODO check type! (universe?)
        this.args = args;
    };

    eval(context) {
        this.check(context);
        return new Var( this.type, this.sub, this.args.map( x=>x.eval(context) ) );
    };
};

class Func {
    constructor( args, impl ) {
        this.args = args;
        this.impl = impl;
    };

    apply(prevContext, args) {
        // TODO check args
        const context = { ...prevContext };
        for ( let i in this.args ) {
            context[ this.args[i][0] ] = args[i];
        };
        return this.impl.eval( context );
    };
};

class ExprApply extends Expr {
    constructor( u, type, func, args ) {
        super( u, type );
        this.func = func;
        this.args = args;
    };
    eval (context) {
        return this.func.apply( context, this.args.map( x => x.eval(context) ) )
    };
};

class ExprMatch extends Expr {
    constructor( u, type, mapping, arg ) {
        super( u, type );
        // TODO check type, mapping keys == arg.type subs
        // mapping values == functions with needed args
        this.mapping = mapping;
        this.arg = arg;
    };

    eval(context) {
        const cond = this.arg.eval( context );
        this.mapping[ cond.sub ].apply( context, cond.args );
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
