'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const stlc = require( '../src/stlc.js' );

describe ('Expr', () => {
    const u = new stlc.Universe;
    u.addType('Bool').addCons('true').addCons('false');
    u.addType('Nat').addCons('zero').addCons('next', 'Nat');

    const uTrue  = u.create('Bool', 'true');
    const uFalse = u.create('Bool', 'false');
    const uZero  = u.create('Nat',  'zero');
    const uOne   = u.create('Nat',  'next', uZero );
    const uTwo   = u.create('Nat',  'next', uOne );

    it( 'can json constants', done => {
        expect( roundTrip(uZero) ).to.deep.equal([ 'Nat.zero' ]);
        expect( roundTrip(uTwo) ).to.deep.equal(
            [ 'Nat.next', [ 'Nat.next', [ 'Nat.zero' ]]] );

        done();
    });

    it( 'can eval with empty context', done => {
        const expr = new stlc.ExprCons( u, 'Bool', 'true' );

        expect( expr.deps ).to.deep.equal( {} );

        expect( expr.eval({foo: uOne}).eq(uTrue) ).to.equal(true);
        expect( expr.eval({foo: uOne}).eq(uFalse) ).to.equal(false);

        expect( expr.toJSON() ).to.deep.equal([ 'Bool.true' ]);

        done();
    } );

    it( 'can eval a free variable to itself', done => {
        const expr = new stlc.ExprFree( u, 'Nat', 'foo');

        expect( expr.toString() ).to.equal('foo:Nat');

        expect( () => { expr.eval({}) } ).to.throw(/Unsatisfied/);
        const one = expr.eval( { foo : uOne } );
        expect( one.eq(uOne) ).to.equal( true );

        done();
    });

    it( 'can eval an expr dependent on free var', done => {
        const foo = new stlc.ExprFree( u, 'Nat', 'foo' );
        const expr = new stlc.ExprCons( u, 'Nat', 'next', foo );

        expect(expr.toString()).to.equal('Nat{foo:Nat}<...>');
        expect(expr.deps).to.deep.equal({ foo : u.type('Nat') });

        expect( () => { expr.eval({}) } ).to.throw(/Unsatisfied/);
        const one = expr.eval( { foo : uZero } );
        expect( one.eq(uOne) ).to.equal( true );

        done();
    });

    it ('can pattern-match', done => {
        const free = u.freeVar( 'foo', 'Nat' );
        const nonzero = new stlc.ExprMatch( u, 'Nat', free, {
            zero: new stlc.Func( [], uFalse ),
            next: new stlc.Func( [u.freeVar('unused', 'Nat')], uTrue )
        });

        expect( nonzero.eval( { foo: uZero } ).eq(uFalse) ).to.equal(true);
        expect( nonzero.eval( { foo: uOne } ).eq(uTrue) ).to.equal(true);
        expect( nonzero.eval( { foo: uTwo } ).eq(uTrue) ).to.equal(true);

        done();
    });

    it ('can pattern-match even better', done => {
        const prev = u.func( [u.freeVar('x', 'Nat')], new stlc.ExprMatch(
            u,
            'Nat',
            u.freeVar( 'x', 'Nat' ),
            {
                zero: u.func([], uZero),
                next: u.func([u.freeVar('n', 'Nat')], u.freeVar('n', 'Nat')),
            }
        ));

        // important! function has no external free vars in it
        expect( prev.deps ).to.deep.equal({});

        expect( _=>prev.apply({}, uZero) ).to.throw(/Bad arguments/);
        expect( _=>prev.apply([uZero]) ).to.throw(/Bad arguments/);
        expect( _=>prev.apply(uZero) ).to.throw(/Bad arguments/);

        expect( prev.apply({}, [uZero]) ).to.deep.equal( uZero );
        expect( prev.apply({}, [uOne])  ).to.deep.equal( uZero );
        expect( prev.apply({}, [uTwo])  ).to.deep.equal( uOne );

        const apply = new stlc.ExprApply( u, 'Nat', prev, [u.freeVar('x', 'Nat')]);

        expect( apply.eval({x : uTwo}) ).to.deep.equal( uOne );

        expect( JSON.parse(JSON.stringify( apply )) ).to.deep.equal( [
            'Nat<-apply', [
                [ 'x:Nat'],
                [
                    'Nat<-match', 'x:Nat', {
                        "zero": [ [], [ 'Nat.zero' ] ],
                        "next": [ ['n:Nat'], 'n:Nat' ],
                    },
                ],
            ],
            'x:Nat',
        ] );

        done();
    });

    it ('handles errors', done => {
        expect( _ => new stlc.ExprMatch( u, 'Nat', u.freeVar( 'x', 'Nat' ), {} ) )
            .to.throw(/No mapping.*in pattern match/);

        expect( _ => new stlc.Func(['foo', 'bar'], u.freeVar('foo', 'Nat')))
            .to.throw(/Array of free vars expected/);
        expect( _ => new stlc.Func([['foo', 'bar']], u.freeVar('foo', 'Nat')))
            .to.throw(/Array of free vars expected/);

        done();
    });
});

function roundTrip(arg) {
    return JSON.parse(JSON.stringify(arg));
};
