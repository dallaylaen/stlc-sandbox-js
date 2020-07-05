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
        u.addType('Nat').addCons('zero').addCons('next', 'Nat');

        const Nat = u.type('Nat');

        expect( Nat.cons( 'zero' ) ).to.deep.equal([]);
        expect( Nat.cons( 'next' ) ).to.deep.equal(['Nat']);

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
        u.addType( 'Nat' ).addCons('zero').addCons('next', 'Nat');

        const zero = u.create( 'Nat', 'zero' );
        const one  = u.create( 'Nat', 'next', zero );

        done();
    });

    it( 'can compare vars', done => {
        const u = new Universe();
        u.addType( 'Nat' ).addCons('zero').addCons('next', 'Nat');

        const zero = u.create( 'Nat', 'zero' );
        const one  = u.create( 'Nat', 'next', zero );
        const two  = u.create( 'Nat', 'next', one );
        const zwei = u.create( 'Nat', 'next', one );

        expect( zero.eq(one) ).to.equal( false );
        expect(  one.eq(one) ).to.equal( true );
        expect( zwei.eq(two) ).to.equal( true );

        done();
    });

    it ('has printable vars', done => {
        const u = new Universe();
        u.addType( 'Nat' ).addCons('zero').addCons('next', 'Nat');

        const zero = u.create( 'Nat', 'zero' );
        const one  = u.create( 'Nat', 'next', zero );

        expect( zero.toString() ).to.equal('Nat.zero');
        expect( one.toString() ).to.equal('Nat.next<Nat.zero>');

        done();
    });
});
