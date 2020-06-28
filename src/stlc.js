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


module.exports.Universe = Universe;
module.exports.Type = Type;
