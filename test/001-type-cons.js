'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const { Universe, Type, Var } = require( '../src/stlc.js' );

describe( 'Universe', () => {
    it( 'allows to create types', done => {
        const u = new Universe();
        u.addType('bool').addCons('true').addCons('false');
        expect( Object.keys( u.types )).to.deep.equal( ['bool'] );

        const bool = u.type('bool');

        expect( bool ).to.be.instanceof( Type );
        expect( bool.list() ).to.deep.equal( ['false', 'true'] );

        u.check();
        done();
    });

    it( 'allows to create recursive types', done => {
        const u = new Universe();
        u.addType('nat').addCons('zero').addCons('next', 'nat');

        const nat = u.type('nat');

        expect( nat.cons( 'zero' ) ).to.deep.equal([]);
        expect( nat.cons( 'next' ) ).to.deep.equal(['nat']);

        u.check();
        done();
    });

    it( 'has consistency check', done => {
        const u = new Universe();
        u.addType('complex').addCons('z', 'double', 'double');
        expect( _ => { u.check() } ).to.throw(/Unknown.*double.*complex.z/);

        done();
    });

    it( 'can create vars', done => {
        const u = new Universe();
        u.addType( 'nat' ).addCons('zero').addCons('next', 'nat');

        const zero = u.create( 'nat', 'zero' );
        const one  = u.create( 'nat', 'next', zero );

        

        done();
    });
});
