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
};

module.exports.Universe = Universe;
module.exports.Type = Type;
