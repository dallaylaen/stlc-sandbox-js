'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const stlc = require( '../src/stlc.js' );

describe ('DSL', () => {
    const u = new stlc.Universe;
    u.addType('Bool').addCons('true').addCons('false');
    u.addType('Nat').addCons('zero').addCons('next', 'Nat');

    const uTrue  = u.create('Bool', 'true');
    const uFalse = u.create('Bool', 'false');
    const uZero  = u.create('Nat',  'zero');
    const uOne   = u.create('Nat',  'next', uZero );
    const uTwo   = u.create('Nat',  'next', uOne );

    it ('generates free vars', done => {
        expect( u.expr( 'foo: Nat' ).eval({foo : uZero}) ).to.deep.equal( uZero );
        done();
    });

    it( 'generates const', done => {
        expect( u.expr([
            'Nat.next', [ 'Nat.zero' ]
        ]).eval({}) ).to.deep.equal( uOne );

        done();
    });

    it( 'generate dependent constructor', done => {
        expect( u.expr([ 'Nat.next', 'foo:Nat' ]).eval({ foo: uZero }) )
            .to.deep.equal( uOne );

        done();
    });

    it( 'generates functions', done => {
        const json = [ [ 'x:Nat' ], [ 'Nat.next', 'x:Nat' ] ];

        const expr = u.expr(json);
        expect( roundTrip(expr) ).to.deep.equal(json);

        done();
    });

    it ('generates pattern matches', done => {
        // isZero function
        const json = [
            'Bool<-match',
            'x:Nat', {
                zero: [ [], [ 'Bool.true' ] ],
                next: [ [ 'n:Nat' ], [ 'Bool.false' ] ],
            },
        ];

        const expr = u.expr(json);
        expect( roundTrip(expr) ).to.deep.equal(json);

        expect( expr.eval( { x: uZero } ) ).to.deep.equal( uTrue );
        expect( expr.eval( { x: uOne } ) ).to.deep.equal( uFalse );

        done();
    });

    it ('generates applications, too', done => {
        const json = [
            'Bool<-apply',
            [
                ['n:Nat'],
                [
                    'Bool<-match',
                    'n:Nat',
                    {
                        zero: [[], ['Bool.true']],
                        next: [['n:Nat'], ['Bool.false']],
                    },
                ]
            ],
            'x:Nat',
        ];

        const expr = u.expr(json);
        expect( roundTrip(expr) ).to.deep.equal(json);

        expect( expr.eval( { x: uZero } ) ).to.deep.equal( uTrue );

        done();
    });
});

function roundTrip(arg) {
    return JSON.parse(JSON.stringify(arg));
};
